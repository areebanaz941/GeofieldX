import React from 'react';

export type FeatureType = 'Tower' | 'Manhole' | 'FiberCable' | 'Parcel';
export type FeatureStatus = 'Assigned' | 'UnAssigned' | 'Completed' | 'Delayed' | 'assigned' | 'unassigned' | 'complete' | 'delayed';

interface FeatureIconProps {
  type: FeatureType;
  status: FeatureStatus;
  size?: number;
  className?: string;
}

// Status color mapping - supports both capitalized and lowercase status values
const getStatusColor = (status: FeatureStatus | string): string => {
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case 'assigned':
      return '#3B82F6'; // Blue
    case 'unassigned':
      return '#FCD34D'; // Yellow/Gold for unassigned
    case 'completed':
    case 'complete':
      return '#10B981'; // Green
    case 'delayed':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Default gray
  }
};

// SVG icon components
const TowerIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2L12 7L17 2V4L12 9L7 4V2Z"/>
    <path d="M6 10H18V12H16V20H8V12H6V10Z"/>
    <path d="M10 14H14V16H10V14Z"/>
    <path d="M11 18H13V19H11V18Z"/>
  </svg>
);

const ManholeIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="96" height="96" stroke="#FF0000" fill="none" strokeWidth="4" strokeLinecap="square"/>
    <line x1="2" y1="2" x2="98" y2="98" stroke="#FF0000" strokeWidth="4" strokeLinecap="square"/>
    <line x1="98" y1="2" x2="2" y2="98" stroke="#FF0000" strokeWidth="4" strokeLinecap="square"/>
  </svg>
);

const FiberCableIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12C3 7.03 7.03 3 12 3S21 7.03 21 12 16.97 21 12 21" fill="none" stroke={color} strokeWidth="2"/>
    <path d="M8 12C8 9.79 9.79 8 12 8S16 9.79 16 12 14.21 16 12 16" fill="none" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
    <path d="M2 18L6 14M18 6L22 2" stroke={color} strokeWidth="1"/>
  </svg>
);

const ParcelIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3H21V21H3V3Z" fill="none" stroke={color} strokeWidth="2"/>
    <path d="M8 8H16V16H8V8Z" fill={color} fillOpacity="0.3"/>
    <path d="M6 6L10 10M18 6L14 10M6 18L10 14M18 18L14 14" stroke={color} strokeWidth="1"/>
  </svg>
);

// Get icon component by feature type
const getIconComponent = (type: FeatureType) => {
  switch (type) {
    case 'Tower':
      return TowerIcon;
    case 'Manhole':
      return ManholeIcon;
    case 'FiberCable':
      return FiberCableIcon;
    case 'Parcel':
      return ParcelIcon;
    default:
      return TowerIcon;
  }
};

export default function FeatureIcon({ 
  type, 
  status, 
  size = 24, 
  className = '' 
}: FeatureIconProps) {
  const IconComponent = getIconComponent(type);
  const color = getStatusColor(status);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <IconComponent color={color} size={size} />
    </div>
  );
}

// Utility function to create SVG data URI for OpenLayers
export const createSVGDataURI = (type: FeatureType, status: FeatureStatus, size: number = 24): string => {
  const IconComponent = getIconComponent(type);
  const color = getStatusColor(status);
  
  // Create a temporary div to render the SVG and get its outerHTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `<div></div>`;
  
  // For now, return the same SVG strings as inline data
  let svgContent = '';
  
  switch (type) {
    case 'Tower':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2L12 7L17 2V4L12 9L7 4V2Z"/>
        <path d="M6 10H18V12H16V20H8V12H6V10Z"/>
        <path d="M10 14H14V16H10V14Z"/>
        <path d="M11 18H13V19H11V18Z"/>
      </svg>`;
      break;
    case 'Manhole':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FF0000" stroke-width="4" stroke-linecap="square">
        <rect x="2" y="2" width="96" height="96" fill="none" />
        <line x1="2" y1="2" x2="98" y2="98" />
        <line x1="98" y1="2" x2="2" y2="98" />
      </svg>`;
      break;
    case 'FiberCable':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12C3 7.03 7.03 3 12 3S21 7.03 21 12 16.97 21 12 21" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="M8 12C8 9.79 9.79 8 12 8S16 9.79 16 12 14.21 16 12 16" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="2" fill="${color}"/>
        <path d="M2 18L6 14M18 6L22 2" stroke="${color}" stroke-width="1"/>
      </svg>`;
      break;
    case 'Parcel':
    default:
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H21V21H3V3Z" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="M8 8H16V16H8V8Z" fill="${color}" fill-opacity="0.3"/>
        <path d="M6 6L10 10M18 6L14 10M6 18L10 14M18 18L14 14" stroke="${color}" stroke-width="1"/>
      </svg>`;
      break;
  }
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
};

// Export utility functions for use in other components
export { getStatusColor, getIconComponent };