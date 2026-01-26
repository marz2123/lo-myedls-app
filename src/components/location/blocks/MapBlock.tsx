import { Navigation } from 'lucide-react';
import { SmartBlock } from './SmartBlock';
import { MyHomeMap } from '../MyHomeMap';

interface MapBlockProps {
  latitude: number;
  longitude: number;
  address?: string;
}

export const MapBlock = ({
  latitude,
  longitude,
  address,
}: MapBlockProps) => {
  return (
    <SmartBlock
      icon={<Navigation className="h-5 w-5" />}
      title="MyHome Map"
      subtitle="Vue satellite enrichie du bien"
    >
      <MyHomeMap
        latitude={latitude}
        longitude={longitude}
        address={address}
        height="350px"
        zoom={18}
        showControls={true}
      />
    </SmartBlock>
  );
};
