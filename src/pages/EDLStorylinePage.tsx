import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EDLStoryline } from '@/components/visit/storyline';

const EDLStorylinePage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Projet non trouvé</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <EDLStoryline 
        projectId={projectId}
        onClose={() => navigate(`/project/${projectId}`)}
      />
    </div>
  );
};

export default EDLStorylinePage;
