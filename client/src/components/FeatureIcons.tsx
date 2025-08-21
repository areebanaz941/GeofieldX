import React from 'react';

interface FeatureIconProps {
  type: 'Tower' | 'Manhole' | 'FiberCable' | 'Parcel';
  status: 'assigned' | 'unassigned' | 'complete' | 'delayed';
  size?: number;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'assigned':
      return '#3B82F6'; // blue
    case 'unassigned':
      return '#6B7280'; // GREY (changed from yellow)
    case 'complete':
      return '#10B981'; // green
    case 'delayed':
      return '#EF4444'; // red
    default:
      return '#000000';
  }
};

export const TowerIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L8 6V10L10 12V22H14V12L16 10V6L12 2Z"
        fill={color}
        stroke={color}
        strokeWidth="1"
      />
      <circle cx="12" cy="4" r="1" fill={color} />
      <path
        d="M6 18H18M8 20H16"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const ManholeIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={color}
        stroke={color}
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      <path
        d="M8 8L16 16M16 8L8 16"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const FiberCableIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12C2 12 6 8 12 8C18 8 22 12 22 12C22 12 18 16 12 16C6 16 2 12 2 12Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M4 12H8M16 12H20"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
        fill={color}
      />
    </svg>
  );
};

export const ParcelIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M3 9H21M9 3V21"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="6"
        cy="6"
        r="1"
        fill={color}
      />
      <circle
        cx="15"
        cy="6"
        r="1"
        fill={color}
      />
      <circle
        cx="6"
        cy="15"
        r="1"
        fill={color}
      />
      <circle
        cx="15"
        cy="15"
        r="1"
        fill={color}
      />
    </svg>
  );
};

export const getFeatureIcon = (type: string, status: string, size?: number) => {
  const props = { 
    type: type as 'Tower' | 'Manhole' | 'FiberCable' | 'Parcel', 
    status: status as 'assigned' | 'unassigned' | 'complete' | 'delayed', 
    size 
  };

  switch (type) {
    case 'Tower':
      return <TowerIcon {...props} />;
    case 'Manhole':
      return <ManholeIcon {...props} />;
    case 'FiberCable':
      return <FiberCableIcon {...props} />;
    case 'Parcel':
      return <ParcelIcon {...props} />;
    default:
      return <ParcelIcon {...props} />;
  }
};