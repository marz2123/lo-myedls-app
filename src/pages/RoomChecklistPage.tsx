import { useNavigate, useParams } from 'react-router-dom';
import { RoomSmartChecklist } from '@/components/visit/room-checklist';

export default function RoomChecklistPage() {
  const navigate = useNavigate();
  const { id: projectId, roomId } = useParams();

  const handleBack = () => {
    if (projectId) {
      navigate(`/project/${projectId}/storyline`);
    } else {
      navigate(-1);
    }
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <RoomSmartChecklist
      projectId={projectId}
      roomId={roomId}
      onBack={handleBack}
      onSettings={handleSettings}
    />
  );
}
