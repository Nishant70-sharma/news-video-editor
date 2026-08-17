const sharp = require('sharp');
const path = require('path');

/**
 * Clips an image (or every frame of an animated GIF) to a circle using sharp's `dest-in`
 * composite blend against a circular SVG mask — `dest-in` keeps only the parts of the base
 * image that overlap the mask's opaque area, which correctly INTERSECTS the two alpha sources
 * (unlike naively replacing the base's alpha with the mask's, which would reveal any
 * transparent-but-non-white padding the base image already had as a solid ring). Sharp applies
 * composite operations per-frame automatically when `{ animated: true }` is set, so this covers
 * animated GIF logos too, not just static PNG/SVG ones.
 */
async function applyCircularMask(sourcePath, sizePx, outPath, isAnimated) {
  const size = Math.max(1, Math.round(sizePx));
  const circleSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );

  let image = sharp(sourcePath, { animated: isAnimated }).resize(size, size, { fit: 'cover' });
  image = image.composite([{ input: circleSvg, blend: 'dest-in' }]);
  await (isAnimated ? image.gif() : image.png()).toFile(outPath);
}

/**
 * Resolve a user-uploaded logo/watermark asset (png/svg/gif) into a file FFmpeg can consume
 * as an input, rasterizing SVGs at the exact on-screen pixel size (from widthPx) so the export
 * isn't softer than the browser's native vector rendering, then optionally circular-masking it
 * (see applyCircularMask above). Once masked, the result is just a normal (possibly animated)
 * image asset — no special FFmpeg filter-graph handling is needed downstream.
 */
async function prepareImageAsset(sourcePath, kind, widthPx, tmpDir, tmpName, shape) {
  let resolvedPath = sourcePath;
  let isAnimated = kind === 'gif';

  if (kind === 'svg') {
    resolvedPath = path.join(tmpDir, `${tmpName}.png`);
    await sharp(sourcePath, { density: 300 })
      .resize({ width: Math.max(1, Math.round(widthPx)) })
      .png()
      .toFile(resolvedPath);
    isAnimated = false;
  }

  if (shape === 'circle') {
    const maskedPath = path.join(tmpDir, `${tmpName}-circle.${isAnimated ? 'gif' : 'png'}`);
    await applyCircularMask(resolvedPath, widthPx, maskedPath, isAnimated);
    resolvedPath = maskedPath;
  }

  return { path: resolvedPath, isAnimated };
}

module.exports = { prepareImageAsset };
