import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { DeepConsistencyEngine } from '@/components/deep-consistency';

export default function DeepConsistencyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return (
    <DeepConsistencyEngine 
      projectId={id} 
      onBack={() => navigate(`/project/${id}`)}
    />
  );
}
