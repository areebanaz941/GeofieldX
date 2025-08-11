import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Home, Layers, Users } from 'lucide-react';

interface MapLegendProps {
  onBoundariesClick?: () => void;
}

const MapLegend: React.FC<MapLegendProps> = ({ onBoundariesClick }) => {
  const statusItems = [
    { status: 'assigned', label: 'Assigned', color: '#3B82F6' },
    { status: 'unassigned', label: 'Unassigned', color: '#000000' },
    { status: 'complete', label: 'Complete', color: '#10B981' },
    { status: 'delayed', label: 'Delayed', color: '#EF4444' }
  ];

  // Create the exact same SVG icons used in the OpenLayersMap
  const createMapIcon = (featureType: string, size: number = 16): JSX.Element => {
    const color = '#6B7280'; // Grey color for legend
    
    switch (featureType) {
      case 'Tower':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
            <path d="M7 2L12 7L17 2V4L12 9L7 4V2Z"/>
            <path d="M6 10H18V12H16V20H8V12H6V10Z"/>
            <path d="M10 14H14V16H10V14Z"/>
            <path d="M11 18H13V19H11V18Z"/>
          </svg>
        );
        
      case 'Manhole':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" fill="none" stroke={color} strokeWidth="1"/>
            <rect x="10" y="10" width="4" height="4" fill={color}/>
            <path d="M12 2V6M12 18V22M22 12H18M6 12H2" stroke={color} strokeWidth="1"/>
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

  // ✅ SAFE NAVIGATION HANDLERS - Direct window navigation to avoid routing conflicts
  const handleDashboardNavigation = (tab: string) => {
    console.log(`🚀 Navigating to dashboard ${tab} section`);
    // Use direct window navigation to avoid any routing conflicts
    window.location.href = `/dashboard?tab=${tab}`;
  };

  // ✅ BOUNDARIES BUTTON HANDLER - Uses prop or fallback
  const handleBoundariesClick = () => {
    if (onBoundariesClick) {
      console.log('🎯 Using provided onBoundariesClick handler');
      onBoundariesClick();
    } else {
      console.log('🎯 Using fallback navigation for boundaries');
      handleDashboardNavigation('boundaries');
    }
  };

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

        {/* ✅ NAVIGATION SECTION - Added while keeping your existing design */}
        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Navigation</h4>
          <div className="space-y-2">
            <Button
              onClick={() => handleDashboardNavigation('overview')}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 border-gray-300 hover:bg-[#1E5CB3] hover:text-white hover:border-[#1E5CB3] transition-colors"
            >
              <Home className="h-3 w-3 mr-2" />
              Dashboard
            </Button>
            
            <Button
              onClick={() => handleDashboardNavigation('features')}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 border-gray-300 hover:bg-[#1E5CB3] hover:text-white hover:border-[#1E5CB3] transition-colors"
            >
              <Layers className="h-3 w-3 mr-2" />
              Features
            </Button>
            
            {/* ✅ BOUNDARIES BUTTON - The main button that was causing issues */}
            <Button
              onClick={handleBoundariesClick}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 border-gray-300 hover:bg-[#1E5CB3] hover:text-white hover:border-[#1E5CB3] transition-colors"
            >
              <MapPin className="h-3 w-3 mr-2" />
              Boundaries
            </Button>
            
            <Button
              onClick={() => handleDashboardNavigation('teams')}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 border-gray-300 hover:bg-[#1E5CB3] hover:text-white hover:border-[#1E5CB3] transition-colors"
            >
              <Users className="h-3 w-3 mr-2" />
              Teams
            </Button>
          </div>
        </div>

        {/* Additional Info - Kept your existing style */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Feature colors change based on assignment and completion status
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapLegend;
