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
      {/* Modern telecommunication tower design */}
      <path
        d="M12 2L12 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Tower cross beams */}
      <path
        d="M7 6L17 6M8 10L16 10M9 14L15 14M10 18L14 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Diagonal support beams */}
      <path
        d="M9 6L12 10L15 6M9 10L12 14L15 10M9 14L12 18L15 14"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal waves at top */}
      <path
        d="M8 2C8 2 10 0 12 0C14 0 16 2 16 2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Base */}
      <path
        d="M6 22L18 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const ManholeIcon: React.FC<FeatureIconProps> = ({ status, size = 24 }) => {
  const color = getStatusColor(status);
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer circle with thick border */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={color}
        stroke={color}
        strokeWidth="1"
      />
      {/* Inner circle */}
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      {/* Manhole cover pattern - diamond grid */}
      <path
        d="M12 4L20 12L12 20L4 12Z"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      {/* Cross pattern */}
      <path
        d="M12 6V18M6 12H18"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Corner dots for realistic manhole look */}
      <circle cx="8" cy="8" r="0.5" fill="white" />
      <circle cx="16" cy="8" r="0.5" fill="white" />
      <circle cx="8" cy="16" r="0.5" fill="white" />
      <circle cx="16" cy="16" r="0.5" fill="white" />
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