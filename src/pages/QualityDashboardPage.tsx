import { useParams, Navigate } from 'react-router-dom';
import { QualityDashboard } from '@/components/quality-dashboard';

export default function QualityDashboardPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return <QualityDashboard projectId={id} />;
}
