import React from 'react';
import { Address360AppleStyle } from './Address360AppleStyle';

interface Address360SectionProps {
  address: string;
  postalCode: string;
  city: string;
  lat?: number;
  lon?: number;
  codeInsee?: string;
  projectId?: string;
  onRefreshStateChange?: (isRefreshing: boolean, refreshFn: () => void) => void;
}

export const Address360Section: React.FC<Address360SectionProps> = ({
  address,
  postalCode,
  city,
  lat,
  lon,
  codeInsee,
  projectId,
  onRefreshStateChange
}) => {
  return (
    <Address360AppleStyle
      address={address}
      postalCode={postalCode}
      city={city}
      lat={lat}
      lon={lon}
      codeInsee={codeInsee}
      projectId={projectId}
      onRefreshStateChange={onRefreshStateChange}
    />
  );
};

export default Address360Section;
