import React from 'react';

interface FeatureIconProps {
  type: 'Tower' | 'Manhole' | 'FiberCable' | 'Parcel';
  status: 'assigned' | 'unassigned' | 'complete' | 'delayed';
  size?: number;
}

const getStatusColor = (status: string): string => {
  const normalized = (status || '').toString().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'new' || normalized === 'unassigned') return '#FF0000'; // New - Red
  if (normalized === 'inprogress' || normalized === 'assigned') return '#FFA500'; // In Progress - Orange
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'reviewaccepted') return '#2E8B57'; // Completed - Sea Green
  if (normalized === 'incompleted' || normalized === 'incomplete' || normalized === 'delayed') return '#00008B'; // In-Completed - Dark Blue
  if (normalized === 'submitreview') return '#000000'; // Submit Review - Black
  if (normalized === 'reviewaccepted') return '#00FFFF'; // Review Accepted - Cyan
  if (normalized === 'reviewreject' || normalized === 'rejected') return '#FF00FF'; // Review Rejected - Magenta
  if (normalized === 'reviewinprogress') return '#800080'; // Review In Progress - Purple
  if (normalized === 'active') return '#006400'; // Active - Dark Green
  return '#6B7280';
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
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <rect x="0.5" y="0.5" width="9" height="9" stroke={color} fill="none" strokeWidth={1} strokeLinecap="square" />
      <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke={color} strokeWidth={1} strokeLinecap="square" />
      <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke={color} strokeWidth={1} strokeLinecap="square" />
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