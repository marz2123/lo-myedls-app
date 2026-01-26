import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useEmbeddedMode = () => {
  const [searchParams] = useSearchParams();
  
  const isEmbedded = useMemo(() => {
    return searchParams.get('embedded') === 'true';
  }, [searchParams]);

  return { isEmbedded };
};
