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
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      stroke={color}
      fill="none"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="0.5" x2="5" y2="1" />
      <path d="M3 9 L5 1 L7 9" />
      <line x1="3" y1="9" x2="7" y2="9" />
      <line x1="3.5" y1="7" x2="6.5" y2="7" />
      <line x1="4" y1="5" x2="6" y2="5" />
      <line x1="4.5" y1="3" x2="5.5" y2="3" />
    </svg>
  );
};

export const ManholeIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="2" y="2" width="96" height="96" stroke="#FF0000" fill="none" strokeWidth="4" strokeLinecap="square" />
      <line x1="2" y1="2" x2="98" y2="98" stroke="#FF0000" strokeWidth="4" strokeLinecap="square" />
      <line x1="98" y1="2" x2="2" y2="98" stroke="#FF0000" strokeWidth="4" strokeLinecap="square" />
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