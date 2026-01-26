import { useNavigate, useParams } from 'react-router-dom';
import { CaptureHub } from '@/components/visit/capture-hub';

export default function CaptureHubPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const handleBack = () => {
    if (projectId) {
      navigate(`/project/${projectId}/reportage`);
    } else {
      navigate(-1);
    }
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <CaptureHub
      projectId={projectId}
      onBack={handleBack}
      onSettings={handleSettings}
    />
  );
}
