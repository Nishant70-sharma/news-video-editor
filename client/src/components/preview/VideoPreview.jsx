import { useEffect, useRef, useState } from 'react';
import HeadlineBannerOverlay from './HeadlineBannerOverlay';
import TickerOverlay from './TickerOverlay';
import LogoOverlay from './LogoOverlay';
import WatermarkOverlay from './WatermarkOverlay';
import WatermarkTextOverlay from './WatermarkTextOverlay';
import TextLayerOverlay from './TextLayerOverlay';
import ImagesSlideshowPreview from './ImagesSlideshowPreview';
import SplitScreenPreview from './SplitScreenPreview';
import SequentialPreview from './SequentialPreview';
import LiveBadgeOverlay from './LiveBadgeOverlay';
import DateTimeStampOverlay from './DateTimeStampOverlay';
import SubscribeBarOverlay from './SubscribeBarOverlay';
import PipPreview from './PipPreview';
import NameplateOverlay from './NameplateOverlay';
import { getFontScale } from '../../utils/overlayGeometry';

const ASPECT_RATIOS = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5
};

export default function VideoPreview({ project, videoRef }) {
  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const musicAudioRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ratio = ASPECT_RATIOS[project.aspectRatio] || 16 / 9;

  // Replace Video Audio only has a real videoRef-attached <video> element to sync against in
  // 'single'/'pip' mode (images/split/sequential preview their own internal <video> elements).
  const hasSyncedAudio = (project.sourceMode === 'single' || project.sourceMode === 'pip') && !!project.customAudio?.assetUrl;
  const hasMusicPreview = (project.sourceMode === 'single' || project.sourceMode === 'pip') && !!project.music?.assetUrl;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Mirrors what the export actually does (mute the original audio, substitute this track) so
  // the preview isn't misleading — the video and replacement audio are two independently decoded
  // elements, so play/pause/seek on the video have to be manually mirrored onto the audio, with
  // a periodic snap-to-sync since their clocks drift apart over time otherwise.
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!hasSyncedAudio || !video || !audio) {
      if (video) video.muted = false;
      return undefined;
    }

    video.muted = true;

    function syncTime() {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.15) {
        audio.currentTime = video.currentTime;
      }
    }
    function onPlay() {
      syncTime();
      audio.play().catch(() => {});
    }
    function onPause() {
      audio.pause();
    }
    // 'ended' isn't guaranteed to also fire 'pause' in every browser, so it gets its own explicit
    // handler rather than relying on onPause to catch it — otherwise the replacement audio could
    // keep playing past the point the (now-stopped) video has visibly finished.
    function onEnded() {
      audio.pause();
    }
    // The native <video controls> mute toggle would otherwise let the original sound sneak back
    // in alongside the replacement track — re-force it muted for as long as replacement is active.
    function keepMuted() {
      if (!video.muted) video.muted = true;
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeked', syncTime);
    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('volumechange', keepMuted);

    return () => {
      video.muted = false;
      audio.pause();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeked', syncTime);
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('volumechange', keepMuted);
    };
  }, [hasSyncedAudio, project.customAudio?.assetUrl, project.sourceVideo?.url, videoRef]);

  // Background Music previously only ever played in the exported file — silent in-app, with no
  // way to check "does this actually sound right" before exporting. Unlike Replace Video Audio,
  // this LAYERS on top of (doesn't mute) the video's own sound, same as the real export mixes it
  // in, so both elements just play simultaneously and the browser mixes them naturally. Timing
  // only needs to be roughly in the right place (it's ambient background, not something that
  // needs frame-accurate sync) — `loop` handles wraparound the same way `-stream_loop -1` does
  // in the export.
  useEffect(() => {
    const video = videoRef.current;
    const audio = musicAudioRef.current;
    if (!hasMusicPreview || !video || !audio) return undefined;

    audio.volume = Math.min(1, Math.max(0, project.music.volume ?? 0.3));
    audio.loop = true;

    function resync() {
      if (audio.duration) audio.currentTime = video.currentTime % audio.duration;
    }
    function onPlay() {
      resync();
      audio.play().catch(() => {});
    }
    function onPause() {
      audio.pause();
    }
    function onEnded() {
      audio.pause();
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeked', resync);

    return () => {
      audio.pause();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeked', resync);
    };
  }, [hasMusicPreview, project.music?.assetUrl, project.music?.volume, project.sourceVideo?.url, videoRef]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/40 p-6">
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-lg bg-black shadow-2xl"
        style={{ aspectRatio: ratio, height: '100%' }}
      >
        <div ref={containerRef} className="absolute inset-0">
          {hasSyncedAudio && <audio ref={audioRef} src={project.customAudio.assetUrl} preload="auto" />}
          {hasMusicPreview && <audio ref={musicAudioRef} src={project.music.assetUrl} preload="auto" />}
          {project.sourceMode === 'images' ? (
            <ImagesSlideshowPreview images={project.images} />
          ) : project.sourceMode === 'split' ? (
            <SplitScreenPreview
              splitClips={project.splitClips}
              aspectRatio={project.aspectRatio}
              marginPct={project.splitMarginPct}
              marginPosition={project.splitMarginPosition}
              alternate={project.splitAlternate}
            />
          ) : project.sourceMode === 'sequential' ? (
            <SequentialPreview splitClips={project.splitClips} />
          ) : project.sourceVideo ? (
            <video
              ref={videoRef}
              src={project.sourceVideo.url}
              className="h-full w-full object-contain"
              controls
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              Upload a video to begin
            </div>
          )}

          {size.width > 0 && (
            <>
              <HeadlineBannerOverlay
                headline={project.headline}
                canvasW={size.width}
                canvasH={size.height}
                fontScale={getFontScale(project.aspectRatio, size.width)}
              />
              <TickerOverlay
                ticker={project.ticker}
                canvasW={size.width}
                canvasH={size.height}
                fontScale={getFontScale(project.aspectRatio, size.width)}
              />
              <NameplateOverlay
                nameplate={project.nameplate}
                templateBgColor={project.headline?.bgColor}
                canvasW={size.width}
                canvasH={size.height}
                fontScale={getFontScale(project.aspectRatio, size.width)}
              />
              {project.textLayers.map((layer) => (
                <TextLayerOverlay
                  key={layer.id}
                  layer={layer}
                  canvasW={size.width}
                  canvasH={size.height}
                  fontScale={getFontScale(project.aspectRatio, size.width)}
                />
              ))}
              <LogoOverlay logo={project.logo} canvasW={size.width} canvasH={size.height} />
              <WatermarkOverlay watermark={project.watermark} canvasW={size.width} canvasH={size.height} />
              <WatermarkTextOverlay
                watermark={project.watermark}
                bandColor={project.headline?.bgColor}
                canvasW={size.width}
                canvasH={size.height}
                fontScale={getFontScale(project.aspectRatio, size.width)}
              />
              <SubscribeBarOverlay subscribeBar={project.subscribeBar} canvasW={size.width} canvasH={size.height} />
              <LiveBadgeOverlay liveBadge={project.liveBadge} canvasW={size.width} canvasH={size.height} />
              <DateTimeStampOverlay dateTimeStamp={project.dateTimeStamp} canvasW={size.width} canvasH={size.height} />
              {project.sourceMode === 'pip' && (
                <PipPreview pipClip={project.pipClip} canvasW={size.width} canvasH={size.height} />
              )}
              {hasSyncedAudio && (
                <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                  🎙️ Custom Audio Active
                </div>
              )}
              {hasMusicPreview && (
                <div
                  className="absolute rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-sky-400"
                  style={{ right: 12, top: hasSyncedAudio ? 40 : 12 }}
                >
                  🎵 Background Music Active — click Play to hear it
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
