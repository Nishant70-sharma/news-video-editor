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
import { getFontScale } from '../../utils/overlayGeometry';

const ASPECT_RATIOS = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5
};

export default function VideoPreview({ project, videoRef }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ratio = ASPECT_RATIOS[project.aspectRatio] || 16 / 9;

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

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/40 p-6">
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-lg bg-black shadow-2xl"
        style={{ aspectRatio: ratio, height: '100%' }}
      >
        <div ref={containerRef} className="absolute inset-0">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
