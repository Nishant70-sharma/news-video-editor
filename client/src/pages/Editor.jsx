import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Sidebar from '../components/layout/Sidebar';
import PropertiesPanel from '../components/layout/PropertiesPanel';
import Timeline from '../components/timeline/Timeline';
import VideoPreview from '../components/preview/VideoPreview';
import { useProjectStore } from '../store/useProjectStore';
import { getProject, saveProject } from '../api/projects';

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  const newProject = useProjectStore((s) => s.newProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const updateField = useProjectStore((s) => s.updateField);
  const markSaved = useProjectStore((s) => s.markSaved);

  const [section, setSection] = useState('media');
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (projectId === 'new') {
      newProject();
    } else {
      getProject(projectId).then(loadProject).catch(() => navigate('/'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveProject(project);
      markSaved(saved);
      if (projectId === 'new') navigate(`/editor/${saved.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      projectName={project.name}
      onNameChange={(v) => updateField('name', v)}
      onSave={handleSave}
      saving={saving}
    >
      <Sidebar active={section} onSelect={setSection} />
      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <div className="h-[50vh] shrink-0 md:h-auto md:flex-1 md:overflow-hidden">
          <VideoPreview project={project} videoRef={videoRef} />
        </div>
        <Timeline videoRef={videoRef} />
      </div>
      <PropertiesPanel section={section} videoRef={videoRef} />
    </DashboardLayout>
  );
}
