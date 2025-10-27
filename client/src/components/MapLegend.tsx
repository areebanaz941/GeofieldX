import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURE_STATUSES } from '@shared/schema';

const MapLegend: React.FC = () => {
  // Map all feature status options to legend items (no yellow hues)
  const statusLabelMap: Record<string, string> = {
    New: 'New',
    InProgress: 'In Progress',
    Completed: 'Completed',
    'In-Completed': 'In-Completed',
    'Submit-Review': 'Submit Review',
    Review_Accepted: 'Review Accepted',
    Review_Reject: 'Review Rejected',
    Review_inprogress: 'Review In Progress',
    Active: 'Active',
  };

  const statusColorMap: Record<string, string> = {
    // Updated per requested palette
    // New - Red
    New: '#FF0000',
    // In Progress - Orange
    InProgress: '#FFA500',
    // Completed - Sea Green
    Completed: '#2E8B57',
    // In-Completed - Dark Blue
    'In-Completed': '#00008B',
    // Submit Review - Black
    'Submit-Review': '#000000',
    // Review Accepted - Cyan
    Review_Accepted: '#00FFFF',
    // Review Rejected - Magenta
    Review_Reject: '#FF00FF',
    // Review In Progress - Purple
    Review_inprogress: '#800080',
    // Active - Dark Green
    Active: '#006400',
  };

  const statusItems = FEATURE_STATUSES.map((status) => ({
    status,
    label: statusLabelMap[status] ?? status,
    color: statusColorMap[status] ?? '#6B7280',
  }));

  // Create the exact same SVG icons used in the OpenLayersMap
  const createMapIcon = (featureType: string, size: number = 16): JSX.Element => {
    const color = '#6B7280'; // Grey color for legend
    
    switch (featureType) {
      case 'Tower':
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
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="5" y1="0.5" x2="5" y2="1" />
            <path d="M3 9 L5 1 L7 9" />
            <line x1="3" y1="9" x2="7" y2="9" />
            <line x1="3.5" y1="7" x2="6.5" y2="7" />
            <line x1="4" y1="5" x2="6" y2="5" />
            <line x1="4.5" y1="3" x2="5.5" y2="3" />
          </svg>
        );
        
      case 'Manhole':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="9" height="9" stroke={color} fill="none" strokeWidth={1} strokeLinecap="square" />
            <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke={color} strokeWidth={1} strokeLinecap="square" />
            <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke={color} strokeWidth={1} strokeLinecap="square" />
          </svg>
        );
        
      case 'FiberCable':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12C3 7.03 7.03 3 12 3S21 7.03 21 12 16.97 21 12 21" fill="none" stroke={color} strokeWidth="2"/>
            <path d="M8 12C8 9.79 9.79 8 12 8S16 9.79 16 12 14.21 16 12 16" fill="none" stroke={color} strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill={color}/>
            <path d="M2 18L6 14M18 6L22 2" stroke={color} strokeWidth="1"/>
          </svg>
        );
        
      case 'Parcel':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H21V21H3V3Z" fill="none" stroke={color} strokeWidth="2"/>
            <path d="M8 8H16V16H8V8Z" fill={color} fillOpacity="0.3"/>
            <path d="M6 6L10 10M18 6L14 10M6 18L10 14M18 18L14 14" stroke={color} strokeWidth="1"/>
          </svg>
        );
    }
  };

  const featureTypes = [
    { type: 'Tower', label: 'Communication Tower' },
    { type: 'Manhole', label: 'Manhole' },
    { type: 'FiberCable', label: 'Fiber Cable' },
    { type: 'Parcel', label: 'Land Parcel' }
  ];

  return (
    <Card className="w-64 bg-white/95 backdrop-blur-sm shadow-lg border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#1E5CB3]">Map Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Legend */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
          <div className="space-y-2">
            {statusItems.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Types Legend */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
          <div className="space-y-2">
            {featureTypes.map((feature) => (
              <div key={feature.type} className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {createMapIcon(feature.type, 16)}
                </div>
                <span className="text-sm text-gray-600">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">Legend shows all feature statuses</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapLegend;
