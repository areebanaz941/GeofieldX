import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFeatureIcon } from './FeatureIcons';

const MapLegend: React.FC = () => {
  const statusItems = [
    { status: 'assigned', label: 'Assigned', color: '#3B82F6' },
    { status: 'unassigned', label: 'Unassigned', color: '#000000' },
    { status: 'complete', label: 'Complete', color: '#10B981' },
    { status: 'delayed', label: 'Delayed', color: '#EF4444' }
  ];

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
                  {getFeatureIcon(feature.type, 'unassigned', 16)}
                </div>
                <span className="text-sm text-gray-600">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
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