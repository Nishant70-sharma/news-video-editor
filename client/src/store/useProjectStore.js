import { create } from 'zustand';
import { getTemplate } from '../templates/newsTemplates';

// Which source modes each format supports — Short unlocks Images-to-Video; both formats
// support Split Screen (stacked for Short, side-by-side for Long) and Sequential (Clip A
// plays fully, then Clip B — no orientation concern since only one clip shows at a time).
export const SOURCE_MODES_BY_FORMAT = {
  '9:16': ['single', 'images', 'split', 'sequential', 'pip'],
  '16:9': ['single', 'split', 'sequential', 'pip']
};

function blankSplitClip() {
  return { sourceVideo: null, trim: { startSec: 0, endSec: 0 } };
}

export function createBlankProject() {
  const template = getTemplate('breaking-news');
  return {
    id: null,
    name: 'Untitled Project',
    sourceVideo: null,
    aspectRatio: '16:9',
    sourceMode: 'single',
    images: [],
    splitClips: [blankSplitClip(), blankSplitClip()],
    splitMarginPct: 0,
    splitMarginPosition: 'bottom',
    splitAlternate: false,
    stinger: { enabled: false, text: 'BREAKING NEWS', durationSec: 1.5 },
    outro: { enabled: true, channelText: '', durationSec: 5 },
    liveBadge: { enabled: false },
    dateTimeStamp: { enabled: false, position: 'top-right' },
    subscribeBar: { enabled: false, text: 'Subscribe, Like & Share!' },
    music: { assetUrl: '', kind: '', volume: 0.3, duckingEnabled: true },
    colorGrade: 'none',
    imagesKenBurns: false,
    transitionStyle: 'cut',
    pipClip: { sourceVideo: null, trim: { startSec: 0, endSec: 0 }, position: 'bottom-right', sizePct: 0.3 },
    template: template.id,
    headline: {
      main: '',
      sub: '',
      location: '',
      reporter: '',
      ...template.headline
    },
    ticker: { text: '', ...template.ticker },
    logo: { assetUrl: '', kind: '', widthPct: 0.1, opacity: 1, marginPx: 24, ...template.logo },
    watermark: {
      assetUrl: '',
      kind: '',
      position: 'bottom-right',
      widthPct: 0.08,
      opacity: 0.6,
      text: '',
      textColor: '#ffffff',
      fontSize: 36,
      textSpeedPxPerSec: 90,
      textDirection: 'ltr'
    },
    textLayers: [],
    trim: { startSec: 0, endSec: 0 },
    exportSettings: { codec: 'h264', resolution: '1080p', fps: 30, format: 'mp4' }
  };
}

export const useProjectStore = create((set, get) => ({
  project: createBlankProject(),
  dirty: false,

  loadProject(project) {
    set({ project, dirty: false });
  },

  newProject() {
    set({ project: createBlankProject(), dirty: false });
  },

  setSourceVideo(sourceVideo) {
    set((s) => ({
      project: { ...s.project, sourceVideo, trim: { startSec: 0, endSec: sourceVideo.metadata.duration } },
      dirty: true
    }));
  },

  /** Sets Format (Short=9:16 / Long=16:9); resets sourceMode to 'single' if it's not valid there. */
  setFormat(aspectRatio) {
    set((s) => {
      const allowed = SOURCE_MODES_BY_FORMAT[aspectRatio] || ['single'];
      const sourceMode = allowed.includes(s.project.sourceMode) ? s.project.sourceMode : 'single';
      return { project: { ...s.project, aspectRatio, sourceMode }, dirty: true };
    });
  },

  setSourceMode(sourceMode) {
    set((s) => ({ project: { ...s.project, sourceMode }, dirty: true }));
  },

  applyTemplate(templateId) {
    const template = getTemplate(templateId);
    set((s) => ({
      project: {
        ...s.project,
        template: template.id,
        headline: { ...s.project.headline, ...template.headline },
        ticker: { ...s.project.ticker, ...template.ticker },
        logo: { ...s.project.logo, ...template.logo }
      },
      dirty: true
    }));
  },

  updateField(path, value) {
    set((s) => {
      const next = structuredClone(s.project);
      const keys = path.split('.');
      let node = next;
      for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
      node[keys[keys.length - 1]] = value;
      return { project: next, dirty: true };
    });
  },

  addTextLayer(layer) {
    set((s) => ({ project: { ...s.project, textLayers: [...s.project.textLayers, layer] }, dirty: true }));
  },

  updateTextLayer(id, patch) {
    set((s) => ({
      project: {
        ...s.project,
        textLayers: s.project.textLayers.map((l) => (l.id === id ? { ...l, ...patch } : l))
      },
      dirty: true
    }));
  },

  removeTextLayer(id) {
    set((s) => ({
      project: { ...s.project, textLayers: s.project.textLayers.filter((l) => l.id !== id) },
      dirty: true
    }));
  },

  addImages(images) {
    set((s) => ({
      project: {
        ...s.project,
        images: [...s.project.images, ...images.map((img) => ({ ...img, id: crypto.randomUUID(), durationSec: 3 }))]
      },
      dirty: true
    }));
  },

  updateImage(id, patch) {
    set((s) => ({
      project: { ...s.project, images: s.project.images.map((img) => (img.id === id ? { ...img, ...patch } : img)) },
      dirty: true
    }));
  },

  removeImage(id) {
    set((s) => ({ project: { ...s.project, images: s.project.images.filter((img) => img.id !== id) }, dirty: true }));
  },

  moveImage(id, direction) {
    set((s) => {
      const images = [...s.project.images];
      const idx = images.findIndex((img) => img.id === id);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= images.length) return s;
      [images[idx], images[swapWith]] = [images[swapWith], images[idx]];
      return { project: { ...s.project, images }, dirty: true };
    });
  },

  setSplitClipVideo(index, sourceVideo) {
    set((s) => {
      const splitClips = s.project.splitClips.map((clip, i) =>
        i === index ? { sourceVideo, trim: { startSec: 0, endSec: sourceVideo.metadata.duration } } : clip
      );
      return { project: { ...s.project, splitClips }, dirty: true };
    });
  },

  setSplitClipTrim(index, patch) {
    set((s) => {
      const splitClips = s.project.splitClips.map((clip, i) =>
        i === index ? { ...clip, trim: { ...clip.trim, ...patch } } : clip
      );
      return { project: { ...s.project, splitClips }, dirty: true };
    });
  },

  setPipClipVideo(sourceVideo) {
    set((s) => ({
      project: {
        ...s.project,
        pipClip: { ...s.project.pipClip, sourceVideo, trim: { startSec: 0, endSec: sourceVideo.metadata.duration } }
      },
      dirty: true
    }));
  },

  setPipClipTrim(patch) {
    set((s) => ({
      project: { ...s.project, pipClip: { ...s.project.pipClip, trim: { ...s.project.pipClip.trim, ...patch } } },
      dirty: true
    }));
  },

  markSaved(saved) {
    set({ project: saved, dirty: false });
  }
}));
