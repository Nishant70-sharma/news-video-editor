/**
 * Normalized-position -> pixel-box math. This file is intentionally duplicated (byte-for-byte)
 * in client/src/utils/overlayGeometry.js so the browser preview and the FFmpeg export both solve
 * the same equation at their own canvas size. Keep the two copies in sync.
 */

const ANCHOR_PRESETS = {
  'top-left': { xPct: 0, yPct: 0 },
  'top-right': { xPct: 1, yPct: 0 },
  'bottom-left': { xPct: 0, yPct: 1 },
  'bottom-right': { xPct: 1, yPct: 1 }
};

/**
 * Resolve an overlay's top-left pixel position for a given canvas size.
 * `box` = { xPct, yPct, widthPct, heightPct, marginPx, position }
 * `position` (if set) is one of the ANCHOR_PRESETS keys and takes precedence over xPct/yPct,
 * anchoring the box's corresponding corner to that side of the canvas, inset by marginPx.
 */
function resolveBoxPx(box, canvasW, canvasH) {
  const widthPx = Math.round((box.widthPct ?? 0) * canvasW);
  const heightPx = Math.round((box.heightPct ?? 0) * canvasH);
  const margin = box.marginPx ?? 0;

  if (box.position && ANCHOR_PRESETS[box.position]) {
    const anchor = ANCHOR_PRESETS[box.position];
    const x = anchor.xPct === 0 ? margin : canvasW - widthPx - margin;
    const y = anchor.yPct === 0 ? margin : canvasH - heightPx - margin;
    return { x, y, width: widthPx, height: heightPx };
  }

  const x = Math.round((box.xPct ?? 0) * canvasW);
  const y = Math.round((box.yPct ?? 0) * canvasH);
  return { x, y, width: widthPx, height: heightPx };
}

/**
 * Headline banner position presets -> a normalized box (xPct/yPct/widthPct/heightPct).
 * `headline.widthPct`/`headline.heightPct`, when set by the user, override the preset's size
 * so the banner box itself can be resized independently of its anchor position. For the
 * lower-third preset the BOTTOM edge stays pinned (at 0.88) rather than the top, so growing
 * the box taller extends it upward into frame instead of pushing its bottom off-screen.
 */
function headlineBannerBox(headline) {
  const position = headline?.position;
  const widthPct = headline?.widthPct ?? (position === 'top' ? 0.86 : 1);
  const heightPct = headline?.heightPct ?? 0.16;

  if (position === 'top') {
    return { xPct: 0, yPct: 0.04, widthPct, heightPct };
  }

  const bottomEdge = 0.88; // lower-third default: 0.72 + 0.16
  return { xPct: 0, yPct: Math.max(0, bottomEdge - heightPct), widthPct, heightPct };
}

/** Ticker bar is always a full-width strip pinned to the bottom. */
function tickerBox() {
  return { xPct: 0, yPct: 0.92, widthPct: 1, heightPct: 0.08 };
}

/** Subscribe bar sits just above where the news ticker would be, full width. */
function subscribeBarBox() {
  return { xPct: 0, yPct: 0.84, widthPct: 1, heightPct: 0.07 };
}

/** Moving watermark text scrolls through a thin band across the vertical middle of the frame. */
function watermarkTextBox() {
  return { xPct: 0, yPct: 0.46, widthPct: 1, heightPct: 0.08 };
}

/**
 * Lower-third nameplate (reporter/expert name + title) sits just above the headline banner's
 * lower-third band (0.72-0.88) and the subscribe bar (0.84-0.91), in the clear 0.58-0.70 strip,
 * so the two never overlap regardless of which are enabled together.
 */
function nameplateBox(nameplate) {
  const widthPct = 0.34;
  const heightPct = 0.09;
  const xPct = nameplate?.position === 'bottom-right' ? 1 - widthPct - 0.02 : 0.02;
  return { xPct, yPct: 0.6, widthPct, heightPct };
}

/**
 * Font sizes/padding/stroke widths in project JSON are literal pixel numbers tuned by eye
 * against a "reference" canvas width for each aspect ratio (its 1080p width). The live preview
 * renders at whatever pixel size its container happens to be (often much smaller than export),
 * and export can run at anything from 720p to 4K — without rescaling by canvasW/referenceWidth,
 * the same literal pixel value looks correct only at the reference size and wrong everywhere
 * else (e.g. tiny relative to a 4K frame, oversized in a small preview panel). This must be
 * applied identically on both sides so preview and export agree on how large text looks.
 */
const REFERENCE_WIDTH_BY_ASPECT = {
  '16:9': 1920,
  '9:16': 1080,
  '1:1': 1080,
  '4:5': 1080
};

function getFontScale(aspectRatio, canvasW) {
  const referenceWidth = REFERENCE_WIDTH_BY_ASPECT[aspectRatio] || 1920;
  return canvasW / referenceWidth;
}

module.exports = {
  ANCHOR_PRESETS,
  resolveBoxPx,
  headlineBannerBox,
  tickerBox,
  subscribeBarBox,
  watermarkTextBox,
  nameplateBox,
  getFontScale
};
