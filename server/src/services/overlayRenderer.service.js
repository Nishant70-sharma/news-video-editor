const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const {
  resolveBoxPx,
  headlineBannerBox,
  tickerBox,
  subscribeBarBox,
  watermarkTextBox,
  nameplateBox
} = require('../utils/overlayGeometry');

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
 * Renders ONLY the scrolling text, on a fully transparent canvas — the ticker's colored
 * background bar is a separate, STATIONARY overlay (built directly in filterGraph.service.js via
 * a plain `color=` source, no PNG needed) so scrolling only moves the text, not the bar underneath
 * it. Baking the background into this same scrolling image would drag the whole bar left/right
 * with the text, which reads as the bar's color itself sliding across the screen.
 */
async function renderTicker(ticker, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const box = resolveBoxPx(tickerBox(), canvasW, canvasH);
  const fontSize = (ticker.fontSize || 28) * scale;
  const canvas = createCanvas(canvasW, box.height);
  const ctx = canvas.getContext('2d');

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

  // Sized off barH alone, this overflowed badly on a portrait (9:16) canvas — barH scales with
  // canvasH, which is the SMALLER dimension on landscape video but the LARGER one on portrait,
  // so the same formula produced a font far wider than the (narrow) canvas. Shrink-to-fit against
  // the actual canvas width instead, which is correct regardless of aspect ratio or text length.
  let fontSize = barH * 0.42;
  const text = (stinger.text || 'BREAKING NEWS').toUpperCase();
  ctx.font = `${fontSize}px "NewsDisplay"`;
  const maxTextWidth = canvasW * 0.88;
  const measuredWidth = ctx.measureText(text).width;
  if (measuredWidth > maxTextWidth) {
    fontSize *= maxTextWidth / measuredWidth;
  }
  ctx.textAlign = 'center';
  drawStyledText(ctx, text, canvasW / 2, barY + barH / 2, {
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
 * Renders the outro as SEPARATE layers (background, one badge per Subscribe/Like/Share, channel
 * text) instead of one flat card — introOutro.service.js composites them with staggered "pop in"
 * timing (scale-up + fade, one after another) so the outro plays like a small animated bumper
 * clip rather than a static card that just zooms as a whole. The logo isn't rendered here at all:
 * it's overlaid directly from its own already-prepared asset file in introOutro.service.js, same
 * technique (and circular masking) as the corner logo elsewhere, just with its own pop-in timing.
 */
async function renderOutroAssets(outro, canvasW, canvasH, tmpDir) {
  ensureFontsRegistered();
  // Sized off canvasH alone, the three badges were wide enough to badly overlap on a portrait
  // (9:16) canvas — canvasH is the SMALLER dimension on landscape video but the LARGER one on
  // portrait, so a formula tuned against it produced icons/badges far too big for the (narrow)
  // width. minDim keeps the base icon size sane in either orientation; the shrink-to-fit check
  // below additionally guarantees the three badges plus gaps never exceed the actual canvas width.
  const minDim = Math.min(canvasW, canvasH);
  let iconSize = minDim * 0.15;
  let badgeW = Math.round(iconSize * 1.9);
  let badgeH = Math.round(iconSize * 1.7);

  const GAP_RATIO = 0.15;
  const maxAllowedWidth = canvasW * 0.92;
  const totalWidthNeeded = 3 * badgeW * (1 + GAP_RATIO);
  if (totalWidthNeeded > maxAllowedWidth) {
    const shrink = maxAllowedWidth / totalWidthNeeded;
    iconSize *= shrink;
    badgeW = Math.round(iconSize * 1.9);
    badgeH = Math.round(iconSize * 1.7);
  }

  function renderBadge(drawIcon, label, color, filePath) {
    const canvas = createCanvas(badgeW, badgeH);
    const ctx = canvas.getContext('2d');
    const cx = badgeW / 2;
    drawIcon(ctx, cx, badgeH * 0.38, iconSize, color);
    ctx.textAlign = 'center';
    drawStyledText(ctx, label, cx, badgeH * 0.82, {
      font: `bold ${iconSize * 0.32}px "${config.fonts.body}"`,
      color: '#ffffff',
      shadow: false,
      stroke: false
    });
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
  }

  const backgroundPath = path.join(tmpDir, 'outro-bg.png');
  const bgCanvas = createCanvas(canvasW, canvasH);
  const bgCtx = bgCanvas.getContext('2d');
  bgCtx.fillStyle = '#111318';
  bgCtx.fillRect(0, 0, canvasW, canvasH);
  fs.writeFileSync(backgroundPath, bgCanvas.toBuffer('image/png'));

  const subscribePath = path.join(tmpDir, 'outro-subscribe.png');
  renderBadge(drawBellIcon, 'SUBSCRIBE', '#ff3b3b', subscribePath);
  const likePath = path.join(tmpDir, 'outro-like.png');
  renderBadge(drawThumbsUpIcon, 'LIKE', '#3b82f6', likePath);
  const sharePath = path.join(tmpDir, 'outro-share.png');
  renderBadge(drawShareIcon, 'SHARE', '#22c55e', sharePath);

  let titleSize = minDim * 0.06;
  const channelText = outro.channelText || 'Thanks for watching!';
  const measureCtx = createCanvas(1, 1).getContext('2d');
  measureCtx.font = `${titleSize}px "NewsDisplay"`;
  const maxTitleWidth = canvasW * 0.88;
  const measuredTitleWidth = measureCtx.measureText(channelText).width;
  if (measuredTitleWidth > maxTitleWidth) {
    titleSize *= maxTitleWidth / measuredTitleWidth;
  }
  const textH = Math.round(titleSize * 1.6);
  const textPath = path.join(tmpDir, 'outro-text.png');
  const textCanvas = createCanvas(canvasW, textH);
  const textCtx = textCanvas.getContext('2d');
  textCtx.textAlign = 'center';
  drawStyledText(textCtx, channelText, canvasW / 2, textH / 2, {
    font: `${titleSize}px "NewsDisplay"`,
    color: '#ffffff',
    shadow: false,
    stroke: false
  });
  fs.writeFileSync(textPath, textCanvas.toBuffer('image/png'));

  const centerX = canvasW / 2;
  const centerY = canvasH * 0.44;
  // Center-to-center spacing derived from the (already width-fitted) badgeW itself, rather than
  // a separate canvasW-based formula — guarantees the badges never overlap by construction,
  // regardless of aspect ratio, since it's directly tied to how wide they actually ended up.
  const spacing = badgeW * (1 + GAP_RATIO);
  const logoSize = minDim * 0.22;

  return {
    backgroundPath,
    badgeW,
    badgeH,
    badges: [
      { path: subscribePath, cx: centerX - spacing, cy: centerY },
      { path: likePath, cx: centerX, cy: centerY },
      { path: sharePath, cx: centerX + spacing, cy: centerY }
    ],
    textPath,
    textW: canvasW,
    textH,
    textCy: centerY + iconSize * 1.9,
    logo: { cx: centerX, cy: canvasH * 0.08 + logoSize / 2, size: logoSize }
  };
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

/**
 * Renders the lower-third nameplate (reporter/expert name + title) — a colored card with a
 * left accent stripe, matching classic broadcast lower-thirds. Sized to just its own box (not
 * the full canvas) since it's positioned via a plain overlay=x:y, same as the ticker/subscribe bar.
 * `templateBgColor` (the current template's headline.bgColor) is the default fill when the user
 * hasn't picked a specific nameplate color, so it reads as branded out of the box.
 */
async function renderNameplate(nameplate, templateBgColor, canvasW, canvasH, outPath, scale = 1) {
  ensureFontsRegistered();
  const box = resolveBoxPx(nameplateBox(nameplate), canvasW, canvasH);
  const canvas = createCanvas(box.width, box.height);
  const ctx = canvas.getContext('2d');

  const bgColor = nameplate.bgColor || templateBgColor || '#1e3a8a';
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = bgColor;
  roundRectPath(ctx, 0, 0, box.width, box.height, 6 * scale);
  ctx.fill();
  ctx.restore();

  const stripeW = box.width * 0.02;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, stripeW, box.height);
  ctx.globalAlpha = 1;

  const padding = box.width * 0.06;
  const nameSize = box.height * 0.34;
  const titleSize = box.height * 0.24;

  drawStyledText(ctx, nameplate.name || '', padding, box.height * 0.36, {
    font: `bold ${nameSize}px "${config.fonts.body}"`,
    color: '#ffffff',
    shadow: true,
    stroke: false
  });

  if (nameplate.title) {
    drawStyledText(ctx, nameplate.title, padding, box.height * 0.72, {
      font: `${titleSize}px "${config.fonts.body}"`,
      color: '#e5e7eb',
      shadow: false,
      stroke: false
    });
  }

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
  renderNameplate,
  renderStingerCard,
  renderOutroAssets,
  ensureFontsRegistered
};
