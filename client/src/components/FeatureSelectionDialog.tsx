import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

// Import feature icons
import towerIcon from '../assets/tower-removebg-preview_1750282584510.svg';
import manholeIcon from '../assets/manhole-removebg-preview_1750282584509.svg';
import fibercableIcon from '../assets/fibercable-removebg-preview_1750282584507.svg';
import parcelIcon from '../assets/land-removebg-preview_1750282584509.svg';

interface FeatureSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeatureSelect: (featureType: string, drawingType: 'point' | 'line' | 'polygon') => void;
  userRole?: string;
  featureTemplates?: any[];
}

const FeatureSelectionDialog = ({
  open,
  onOpenChange,
  onFeatureSelect,
  userRole,
  featureTemplates = [],
}: FeatureSelectionDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Default infrastructure features available to all users
  const defaultFeatureTypes = [
    {
      id: 'Tower',
      name: 'Tower',
      icon: towerIcon,
      drawingType: 'point' as const,
      description: 'Communication tower',
      color: '#E91E63'
    },
    {
      id: 'Manhole',
      name: 'Manhole',
      icon: manholeIcon,
      drawingType: 'point' as const,
      description: 'Access manhole',
      color: '#2196F3'
    },
    {
      id: 'FiberCable',
      name: 'Fiber Cable',
      icon: fibercableIcon,
      drawingType: 'line' as const,
      description: 'Fiber optic cable',
      color: '#4CAF50'
    },
    {
      id: 'Parcel',
      name: 'Parcel',
      icon: parcelIcon,
      drawingType: 'polygon' as const,
      description: 'Land parcel area',
      color: '#9C27B0'
    }
  ];

  // Additional feature types for supervisors
  const supervisorFeatureTypes = [
    ...defaultFeatureTypes,
    {
      id: 'Boundary',
      name: 'Boundary',
      icon: parcelIcon,
      drawingType: 'polygon' as const,
      description: 'Work area boundary',
      color: '#FF9800'
    }
  ];

  // Convert feature templates to the format expected by the dialog (for supervisors)
  const templateTypes = featureTemplates.map((template: any) => ({
    id: template.name,
    name: template.name,
    icon: template.geometryType === 'Point' ? manholeIcon : 
          template.geometryType === 'LineString' ? fibercableIcon : parcelIcon,
    drawingType: template.geometryType === 'Point' ? 'point' as const :
                 template.geometryType === 'LineString' ? 'line' as const : 'polygon' as const,
    description: `${template.geometryType} feature template`,
    color: template.geometryType === 'Point' ? '#E91E63' :
           template.geometryType === 'LineString' ? '#3F51B5' : '#009688'
  }));

  // Use default features for field teams, supervisor features + templates for supervisors
  const availableFeatures = userRole === 'Field' ? defaultFeatureTypes : supervisorFeatureTypes;

  const handleFeatureSelect = (feature: typeof templateTypes[0]) => {
    const instructions = {
      point: 'Click on the map to place the feature',
      line: 'Click points on the map to draw a line. Double-click to finish (minimum 2 points)',
      polygon: 'Click points on the map to draw a polygon. Double-click to finish (minimum 4 points)'
    };

    toast({
      title: `${feature.name} Drawing Mode`,
      description: instructions[feature.drawingType],
    });

    // Close the dialog first so its overlay doesn't swallow the first map click
    onOpenChange(false);
    // Defer enabling drawing until after the dialog unmounts
    setTimeout(() => {
      onFeatureSelect(feature.id, feature.drawingType);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Features</DialogTitle>
          <DialogDescription className="text-center">
            Choose the type of feature you want to create
          </DialogDescription>
        </DialogHeader>
        
        {/* Warning for field teams about boundary restrictions */}
        {userRole === 'Field' && (
          <div className="mx-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-orange-600 mt-0.5 flex-shrink-0">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <div className="text-sm text-orange-700">
              <p className="font-medium">Boundary Restriction</p>
              <p className="text-xs">Features can only be created within your assigned boundary areas</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {availableFeatures.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <div className="text-sm">No feature types available</div>
              <div className="text-xs mt-1">Contact your administrator</div>
            </div>
          ) : (
            availableFeatures.map((feature) => (
              <Button
                key={feature.id}
                variant="outline"
                className="h-auto flex flex-col items-center gap-3 p-4 hover:shadow-md transition-all duration-200"
                style={{ borderColor: feature.color }}
                onClick={() => handleFeatureSelect(feature)}
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <img 
                    src={feature.icon} 
                    alt={feature.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{feature.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {feature.description}
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
        
        <div className="text-xs text-center text-muted-foreground mt-2">
          {userRole === "Field" ? (
            "⚠️ Features can only be created within your assigned boundary areas"
          ) : (
            "You can create features anywhere on the map"
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureSelectionDialog;