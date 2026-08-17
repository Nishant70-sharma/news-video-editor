const HEADLINE_MAX_CHARS = 60;
const SUB_MAX_CHARS = 90;
const RESOLUTION_PX = { '720p': 1280, '1080p': 1920, '1440p': 2560, '4k': 3840 };

/** Pure, non-blocking pre-export checks. Returns a list of { level, message }. */
export function getComplianceWarnings(project) {
  const warnings = [];

  if (project.headline?.main && project.headline.main.length > HEADLINE_MAX_CHARS) {
    warnings.push({
      level: 'warn',
      message: `Headline is ${project.headline.main.length} characters — keep it under ${HEADLINE_MAX_CHARS} so it doesn't wrap or get cut off.`
    });
  }
  if (project.headline?.sub && project.headline.sub.length > SUB_MAX_CHARS) {
    warnings.push({
      level: 'warn',
      message: `Sub-headline is long (${project.headline.sub.length} chars) — consider shortening for readability.`
    });
  }

  (project.textLayers || []).forEach((layer, i) => {
    const outOfBounds = layer.xPct < 0 || layer.xPct > 1 || layer.yPct < 0 || layer.yPct > 1;
    if (outOfBounds) {
      warnings.push({ level: 'error', message: `Text layer #${i + 1} is positioned outside the visible frame.` });
    }
  });

  const sourceWidth = project.sourceVideo?.metadata?.width || 0;
  const targetWidth = RESOLUTION_PX[project.exportSettings?.resolution] || 0;
  if (sourceWidth && targetWidth && sourceWidth < targetWidth) {
    warnings.push({
      level: 'warn',
      message: `Source video is ${sourceWidth}px wide but you're exporting at ${project.exportSettings.resolution} (${targetWidth}px) — footage will be upscaled and may look soft.`
    });
  }

  const mode = project.sourceMode || 'single';
  if (mode === 'images' && !(project.images || []).length) {
    warnings.push({ level: 'error', message: 'No images added to this slideshow yet.' });
  } else if ((mode === 'split' || mode === 'sequential') && !(project.splitClips || []).every((c) => c.sourceVideo)) {
    warnings.push({ level: 'error', message: 'Both Clip A and Clip B need a video before you can export.' });
  } else if (mode === 'single' && !project.sourceVideo) {
    warnings.push({ level: 'error', message: 'No source video attached to this project yet.' });
  }

  return warnings;
}
