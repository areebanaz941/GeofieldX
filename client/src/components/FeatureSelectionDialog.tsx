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
import towerIcon from '@assets/tower-removebg-preview_1750282584510.png';
import manholeIcon from '@assets/manhole-removebg-preview_1750282584509.png';
import fibercableIcon from '@assets/fibercable-removebg-preview_1750282584507.png';
import parcelIcon from '@assets/land-removebg-preview_1750282584509.png';

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

  // Convert feature templates to the format expected by the dialog
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

    onFeatureSelect(feature.id, feature.drawingType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Select Feature Type</DialogTitle>
          <DialogDescription className="text-center">
            Choose the type of feature you want to create
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {templateTypes.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <div className="text-sm">No feature templates available</div>
              <div className="text-xs mt-1">Create templates using the + button in the sidebar first</div>
            </div>
          ) : (
            templateTypes.map((feature) => (
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