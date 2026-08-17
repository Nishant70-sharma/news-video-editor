/**
 * Entrance-animation options shared by the headline banner, text layers, and (a fade-only
 * subset of) the ticker. Kept to effects FFmpeg can reproduce identically at export time —
 * see server/src/services/filterGraph.service.js's ENTRANCE_DURATION and entrance overlay-
 * position expressions, which share this same 0.6s duration and enter-from-offscreen direction.
 */
export const ENTRANCE_DURATION = 0.6;

export const ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade In' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'slide-down', label: 'Slide Down' },
  { id: 'slide-left', label: 'Slide In From Right' },
  { id: 'slide-right', label: 'Slide In From Left' }
];

// The ticker's own text already scrolls continuously via its own transform; a directional
// slide entrance would fight that motion, so only a fade-in is offered for it.
export const TICKER_ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade In' }
];

/**
 * `targetOpacity` is threaded through as the CSS custom property --entrance-opacity so the
 * animation's final keyframe lands on the element's actual configured opacity instead of
 * permanently overriding it back to 1 once the entrance finishes (see index.css keyframes).
 */
export function entranceAnimationStyle(animation, targetOpacity = 1) {
  if (!animation || animation === 'none') return {};
  return {
    animation: `anim-${animation} ${ENTRANCE_DURATION}s ease-out both`,
    '--entrance-opacity': targetOpacity
  };
}
