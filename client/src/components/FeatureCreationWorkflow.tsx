import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface FeatureCreationWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeatureCreated: (feature: any) => void;
}

export default function FeatureCreationWorkflow({ open, onOpenChange, onFeatureCreated }: FeatureCreationWorkflowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [featureName, setFeatureName] = useState('');
  const [geometryType, setGeometryType] = useState<'Point' | 'LineString' | 'Polygon' | ''>('');

  const createFeatureTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch('/api/feature-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create feature template');
      }
      
      return response.json();
    },
    onSuccess: (newTemplate) => {
      toast({
        title: "Feature Template Created",
        description: `"${newTemplate.name}" template is ready to use on the map.`,
      });
      onFeatureCreated(newTemplate);
      onOpenChange(false);
      // Reset form
      setFeatureName('');
      setGeometryType('');
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create feature template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!featureName.trim() || !geometryType) {
      toast({
        title: "Missing Information",
        description: "Please provide feature name and geometry type.",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      name: featureName.trim(),
      geometryType: geometryType,
      createdBy: user?._id,
      createdAt: new Date().toISOString()
    };

    createFeatureTemplateMutation.mutate(templateData);
  };

  const handleCancel = () => {
    setFeatureName('');
    setGeometryType('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Feature Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="featureName">Feature Name</Label>
            <Input
              id="featureName"
              placeholder="Enter feature name"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="geometryType">Geometry Type</Label>
            <Select value={geometryType} onValueChange={(value: 'Point' | 'LineString' | 'Polygon') => setGeometryType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select geometry type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Point">Point</SelectItem>
                <SelectItem value="LineString">Line</SelectItem>
                <SelectItem value="Polygon">Polygon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createFeatureTemplateMutation.isPending}
            >
              {createFeatureTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}