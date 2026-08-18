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
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ratio = ASPECT_RATIOS[project.aspectRatio] || 16 / 9;

  // Replace Video Audio only has a real videoRef-attached <video> element to sync against in
  // 'single'/'pip' mode (images/split/sequential preview their own internal <video> elements).
  const hasSyncedAudio = (project.sourceMode === 'single' || project.sourceMode === 'pip') && !!project.customAudio?.assetUrl;

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
    // The native <video controls> mute toggle would otherwise let the original sound sneak back
    // in alongside the replacement track — re-force it muted for as long as replacement is active.
    function keepMuted() {
      if (!video.muted) video.muted = true;
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', syncTime);
    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('volumechange', keepMuted);

    return () => {
      video.muted = false;
      audio.pause();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', syncTime);
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('volumechange', keepMuted);
    };
  }, [hasSyncedAudio, project.customAudio?.assetUrl, project.sourceVideo?.url, videoRef]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/40 p-6">
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-lg bg-black shadow-2xl"
        style={{ aspectRatio: ratio, height: '100%' }}
      >
        <div ref={containerRef} className="absolute inset-0">
          {hasSyncedAudio && <audio ref={audioRef} src={project.customAudio.assetUrl} preload="auto" />}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
