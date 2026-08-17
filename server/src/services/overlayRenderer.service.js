const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { resolveBoxPx, headlineBannerBox, tickerBox, subscribeBarBox, watermarkTextBox } = require('../utils/overlayGeometry');

/** Blends a hex color with black at the given alpha, for a translucent (not fully opaque) fill. */
function hexToRgba(hex, alpha) {
  const clean = (hex || '#000000').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(config.fonts.display, 'NewsDisplay');
  GlobalFonts.registerFromPath(config.fonts.displayAlt, 'NewsDisplayAlt');
  fontsRegistered = true;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawStyledText(ctx, text, x, y, { font, color, shadow, stroke, scale = 1 }) {
  ctx.font = font;
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  if (stroke) {
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Render the headline banner (background box + up to 4 text lines) to a transparent PNG
 * sized to the full export canvas, ready to be composited with a simple `overlay=x=0:y=0`.
 */
async function renderHeadlineBanner(headline, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const box = resolveBoxPx(headlineBannerBox(headline), canvasW, canvasH);
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.globalAlpha = headline.opacity ?? 0.85;
  ctx.fillStyle = headline.bgColor || '#c1121f';
  roundRectPath(ctx, box.x, box.y, box.width, box.height, (headline.borderRadius ?? 8) * scale);
  ctx.fill();
  ctx.restore();

  // Clip text to the box so a user-shrunk banner crops its contents instead of
  // spilling text outside the colored background (matches the client preview's overflow-hidden).
  ctx.save();
  roundRectPath(ctx, box.x, box.y, box.width, box.height, (headline.borderRadius ?? 8) * scale);
  ctx.clip();

  const padding = (headline.padding ?? 18) * scale;
  const fontFamily = headline.fontFamily === 'alt' ? 'NewsDisplayAlt' : 'NewsDisplay';
  const mainSize = (headline.fontSize || 40) * scale;
  let cursorY = box.y + padding + mainSize * 0.5;
  const textX = box.x + padding;

  if (headline.main) {
    drawStyledText(ctx, headline.main.toUpperCase(), textX, cursorY, {
      font: `${mainSize}px "${fontFamily}"`,
      color: '#ffffff',
      shadow: true,
      stroke: false,
      scale
    });
    cursorY += mainSize * 0.9;
  }
  if (headline.sub) {
    const subSize = Math.round(mainSize * 0.5);
    drawStyledText(ctx, headline.sub, textX, cursorY, {
      font: `${subSize}px "${config.fonts.body}"`,
      color: '#f1f1f1',
      shadow: false,
      stroke: false
    });
    cursorY += subSize * 1.1;
  }

  const tagSize = Math.round(mainSize * 0.4);
  const tags = [headline.location, headline.reporter].filter(Boolean);
  if (tags.length) {
    drawStyledText(ctx, tags.join('   |   '), textX, cursorY, {
      font: `italic ${tagSize}px "${config.fonts.body}"`,
      color: '#e5e5e5',
      shadow: false,
      stroke: false
    });
  }

  ctx.restore();

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box };
}

/**
 * Render the scrolling ticker to a wide transparent PNG. Width is 2x the canvas width so the
 * FFmpeg overlay x-expression (W - mod(t*speed, W+w)) has a full strip's worth of text to
 * scroll through before needing to repeat.
 */
async function renderTicker(ticker, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const box = resolveBoxPx(tickerBox(), canvasW, canvasH);
  const fontSize = (ticker.fontSize || 28) * scale;
  const canvas = createCanvas(canvasW, box.height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = ticker.bgColor || '#111111';
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 0, canvasW, box.height);
  ctx.globalAlpha = 1;

  ctx.font = `bold ${fontSize}px "${config.fonts.body}"`;
  ctx.fillStyle = ticker.textColor || '#ffffff';
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(ticker.text || '').width;
  ctx.fillText(ticker.text || '', 24, box.height / 2);

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box, textWidth };
}

/**
 * Render a single freeform text layer (with rotation/shadow/stroke/background baked in) to a
 * transparent PNG sized to the full canvas, so it can be overlaid at (0,0) with the rotation
 * already applied — drawtext has no rotation support, so every text layer goes through here.
 */
async function renderTextLayer(layer, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  const fontSize = (layer.fontSize || 32) * scale;
  const x = Math.round((layer.xPct ?? 0.5) * canvasW);
  const y = Math.round((layer.yPct ?? 0.5) * canvasH);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(((layer.rotationDeg || 0) * Math.PI) / 180);
  // The client preview centers the text box on (x,y) via `translate(-50%,-50%)` — textAlign
  // must match that here, or a centered layer (the default) renders starting AT the anchor and
  // growing only rightward, which looks fine over one continuous video but visibly lands on only
  // one side in Split Screen mode, where the canvas midpoint is the seam between the two clips.
  ctx.textAlign = 'center';

  if (layer.bgColor) {
    ctx.font = `${fontSize}px "${config.fonts.body}"`;
    const w = ctx.measureText(layer.text || '').width;
    const pad = 12 * scale;
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.fillStyle = layer.bgColor;
    roundRectPath(ctx, -w / 2 - pad, -fontSize / 2 - pad, w + pad * 2, fontSize + pad * 2, 6 * scale);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawStyledText(ctx, layer.text || '', 0, 0, {
    font: `${fontSize}px "${config.fonts.body}"`,
    color: layer.color || '#ffffff',
    shadow: !!layer.shadow,
    stroke: !!layer.stroke,
    scale
  });
  ctx.restore();

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

/**
 * Renders the "LIVE" badge (dark pill + red dot + text) to a full-canvas transparent PNG,
 * always the same visual whether it's currently visible or not — the blink itself is done by
 * FFmpeg's `enable` expression on the overlay compositing this PNG, not baked into the image.
 */
async function renderLiveBadge(canvasW, canvasH, outPath) {
  ensureFontsRegistered();
  const box = resolveBoxPx({ position: 'top-left', widthPct: 0.14, heightPct: 0.055, marginPx: 24 }, canvasW, canvasH);
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#111111';
  roundRectPath(ctx, box.x, box.y, box.width, box.height, box.height * 0.3);
  ctx.fill();
  ctx.restore();

  const dotRadius = box.height * 0.24;
  const dotX = box.x + box.height * 0.55;
  const dotY = box.y + box.height * 0.5;
  ctx.fillStyle = '#ff1a1a';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  const fontSize = box.height * 0.5;
  drawStyledText(ctx, 'LIVE', dotX + dotRadius * 2.2, dotY, {
    font: `bold ${fontSize}px "${config.fonts.body}"`,
    color: '#ffffff',
    shadow: false,
    stroke: false
  });

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box };
}

/** Renders a date/time card (current date/time, captured at export time) to a full-canvas PNG. */
async function renderDateTimeStamp(dateTimeStamp, canvasW, canvasH, outPath) {
  ensureFontsRegistered();
  const position = dateTimeStamp.position || 'top-right';
  const box = resolveBoxPx({ position, widthPct: 0.28, heightPct: 0.05, marginPx: 24 }, canvasW, canvasH);
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#000000';
  roundRectPath(ctx, box.x, box.y, box.width, box.height, box.height * 0.25);
  ctx.fill();
  ctx.restore();

  const text = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const fontSize = box.height * 0.4;
  ctx.textAlign = 'center';
  drawStyledText(ctx, text, box.x + box.width / 2, box.y + box.height / 2, {
    font: `${fontSize}px "${config.fonts.body}"`,
    color: '#ffffff',
    shadow: false,
    stroke: false
  });

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box };
}

/**
 * Renders the persistent "Subscribe, Like & Share" bar — same bar+text layout as the news
 * ticker, sized to a strip rather than the full canvas (filterGraph.service.js positions it
 * with an explicit y, matching how the ticker is positioned).
 */
async function renderSubscribeBar(subscribeBar, canvasW, canvasH, outPath) {
  ensureFontsRegistered();
  const box = resolveBoxPx(subscribeBarBox(), canvasW, canvasH);
  const fontSize = box.height * 0.45;
  const canvas = createCanvas(canvasW, box.height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b91c1c';
  ctx.globalAlpha = 0.88;
  ctx.fillRect(0, 0, canvasW, box.height);
  ctx.globalAlpha = 1;

  ctx.font = `bold ${fontSize}px "${config.fonts.body}"`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  const text = subscribeBar.text || 'Subscribe, Like & Share!';
  ctx.fillText(text, 24, box.height / 2);

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box };
}

/**
 * Renders a full-frame "Breaking News" intro stinger card — an opaque standalone frame (not an
 * overlay composited on the main video, unlike everything else in this file), since it becomes
 * its own segment in the intro/outro concat built by introOutro.service.js.
 */
async function renderStingerCard(stinger, canvasW, canvasH, outPath) {
  ensureFontsRegistered();
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const barH = canvasH * 0.28;
  const barY = (canvasH - barH) / 2;
  ctx.fillStyle = '#c1121f';
  ctx.fillRect(0, barY, canvasW, barH);

  const borderW = Math.round(canvasH * 0.012);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, barY, canvasW, borderW);
  ctx.fillRect(0, barY + barH - borderW, canvasW, borderW);

  const fontSize = barH * 0.42;
  ctx.textAlign = 'center';
  drawStyledText(ctx, (stinger.text || 'BREAKING NEWS').toUpperCase(), canvasW / 2, barY + barH / 2, {
    font: `${fontSize}px "NewsDisplay"`,
    color: '#ffffff',
    shadow: true,
    stroke: false
  });

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

/** Draws a simple thumbs-up glyph (rounded rect fist + rect thumb) centered at (x, y). */
function drawThumbsUpIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  roundRectPath(ctx, -size * 0.5, -size * 0.35, size * 0.85, size * 0.7, size * 0.12);
  ctx.fill();
  ctx.save();
  ctx.translate(-size * 0.15, -size * 0.35);
  ctx.rotate(-0.5);
  roundRectPath(ctx, -size * 0.12, -size * 0.55, size * 0.24, size * 0.55, size * 0.1);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Draws a simple "share" glyph — three connected nodes — centered at (x, y). */
function drawShareIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  const nodeR = size * 0.14;
  const pts = [
    [-size * 0.35, 0],
    [size * 0.35, -size * 0.35],
    [size * 0.35, size * 0.35]
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.stroke();
  pts.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, nodeR, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Draws a simple bell glyph (rounded body + base) centered at (x, y). */
function drawBellIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -size * 0.05, size * 0.4, Math.PI, 0);
  ctx.lineTo(size * 0.48, size * 0.35);
  ctx.lineTo(-size * 0.48, size * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, size * 0.45, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders a full-frame Subscribe/Like/Share outro card — an opaque standalone frame appended
 * after the main video via introOutro.service.js's concat, matching the classic YouTube
 * end-of-video call-to-action layout (logo badge + bell/subscribe, like, share).
 * `logoAsset` is `{ path, isAnimated }` from assetPreprocess.service.js, or null if no logo is
 * configured — when animated (GIF), only its first frame is drawn since this card is a single
 * static frame.
 */
async function renderOutroCard(outro, logoAsset, canvasW, canvasH, outPath) {
  ensureFontsRegistered();
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const centerX = canvasW / 2;
  let logoBottomY = canvasH * 0.18;

  if (logoAsset) {
    try {
      const img = await loadImage(logoAsset.path);
      const logoSize = canvasH * 0.22;
      const logoY = canvasH * 0.08;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(centerX, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, centerX - logoSize / 2, logoY, logoSize, logoSize);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, canvasH * 0.004);
      ctx.beginPath();
      ctx.arc(centerX, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      logoBottomY = logoY + logoSize;
    } catch {
      // Malformed/unsupported source image — the card still works fine without the logo badge.
    }
  }

  const centerY = logoBottomY + canvasH * 0.16;
  const iconSize = canvasH * 0.15;
  const spacing = canvasW * 0.22;

  const items = [
    { icon: drawBellIcon, label: 'SUBSCRIBE', color: '#ff3b3b' },
    { icon: drawThumbsUpIcon, label: 'LIKE', color: '#3b82f6' },
    { icon: drawShareIcon, label: 'SHARE', color: '#22c55e' }
  ];

  items.forEach((item, i) => {
    const x = centerX + (i - 1) * spacing;
    item.icon(ctx, x, centerY, iconSize, item.color);
    ctx.textAlign = 'center';
    drawStyledText(ctx, item.label, x, centerY + iconSize * 0.85, {
      font: `bold ${iconSize * 0.32}px "${config.fonts.body}"`,
      color: '#ffffff',
      shadow: false,
      stroke: false
    });
  });

  const titleSize = canvasH * 0.06;
  ctx.textAlign = 'center';
  drawStyledText(ctx, outro.channelText || 'Thanks for watching!', centerX, centerY + iconSize * 1.9, {
    font: `${titleSize}px "NewsDisplay"`,
    color: '#ffffff',
    shadow: false,
    stroke: false
  });

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

/**
 * Renders the moving text watermark to a canvas-width transparent strip — same drift-across
 * technique as the news ticker (the whole strip, band included, scrolls via the FFmpeg overlay
 * x-expression in filterGraph.service.js), so it periodically crosses the middle of the frame
 * rather than sitting fixed in place like the corner image watermark. `bandColor` is the current
 * template's accent color (headline.bgColor) so the watermark reads as branded rather than a
 * plain gray bar, per the user's "bg color bhi le template ka" ask.
 */
async function renderWatermarkText(watermark, bandColor, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const box = resolveBoxPx(watermarkTextBox(), canvasW, canvasH);
  const fontSize = (watermark.fontSize || 36) * scale;
  const canvas = createCanvas(canvasW, box.height);
  const ctx = canvas.getContext('2d');

  if (bandColor) {
    ctx.fillStyle = hexToRgba(bandColor, 0.28);
    ctx.fillRect(0, 0, canvasW, box.height);
  }

  ctx.font = `bold ${fontSize}px "${config.fonts.body}"`;
  ctx.fillStyle = watermark.textColor || '#ffffff';
  ctx.globalAlpha = watermark.opacity ?? 0.6;
  ctx.textBaseline = 'middle';
  ctx.fillText(watermark.text || '', 24, box.height / 2);
  ctx.globalAlpha = 1;

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  return { box };
}

module.exports = {
  renderHeadlineBanner,
  renderTicker,
  renderTextLayer,
  renderLiveBadge,
  renderDateTimeStamp,
  renderSubscribeBar,
  renderWatermarkText,
  renderStingerCard,
  renderOutroCard,
  ensureFontsRegistered
};
