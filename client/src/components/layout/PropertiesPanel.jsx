import MediaPanel from '../sidebar/MediaPanel';
import TemplatesPanel from '../sidebar/TemplatesPanel';
import HeadlinePanel from '../sidebar/HeadlinePanel';
import TickerPanel from '../sidebar/TickerPanel';
import LogoPanel from '../sidebar/LogoPanel';
import WatermarkPanel from '../sidebar/WatermarkPanel';
import TextLayersPanel from '../sidebar/TextLayersPanel';
import BrandingPanel from '../sidebar/BrandingPanel';
import MusicPanel from '../sidebar/MusicPanel';
import ExportPanel from '../sidebar/ExportPanel';

const PANELS = {
  media: MediaPanel,
  templates: TemplatesPanel,
  headline: HeadlinePanel,
  ticker: TickerPanel,
  logo: LogoPanel,
  watermark: WatermarkPanel,
  text: TextLayersPanel,
  branding: BrandingPanel,
  music: MusicPanel,
  export: ExportPanel
};

export default function PropertiesPanel({ section, videoRef }) {
  const Panel = PANELS[section] || MediaPanel;
  return (
    <div className="w-full shrink-0 overflow-y-auto border-t border-news-border bg-news-panel p-4 md:h-full md:w-80 md:border-t-0 md:border-l">
      <Panel videoRef={videoRef} />
    </div>
  );
}
