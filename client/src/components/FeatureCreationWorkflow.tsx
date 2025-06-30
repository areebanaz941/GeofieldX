import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface FeatureCreationWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeatureCreated: (feature: any) => void;
}

const featureTypes = [
  { id: 'Tower', name: 'Tower', geometryType: 'Point', description: 'Communication or observation towers' },
  { id: 'Manhole', name: 'Manhole', geometryType: 'Point', description: 'Underground access points' },
  { id: 'FiberCable', name: 'Fiber Cable', geometryType: 'LineString', description: 'Fiber optic cable lines' },
  { id: 'Parcel', name: 'Land Parcel', geometryType: 'Polygon', description: 'Land boundary areas' }
];

const specificTypes = {
  Tower: ['Communication Tower', 'Observation Tower', 'Mobillink', 'Ptcl'],
  Manhole: ['2-way', '4-way', '6-way', '8-way'],
  FiberCable: ['10F', '24F'],
  Parcel: ['Commercial', 'Residential', 'Utility Pole', 'Street Light']
};

export default function FeatureCreationWorkflow({ open, onOpenChange, onFeatureCreated }: FeatureCreationWorkflowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  console.log("FeatureCreationWorkflow render - open:", open);
  
  const [step, setStep] = useState<'name' | 'type' | 'geometry' | 'details'>('name');
  const [formData, setFormData] = useState({
    name: '',
    feaType: '',
    geometryType: '',
    specificType: '',
    feaNo: '',
    description: '',
    maintenance: 'None',
    feaState: 'Plan',
    feaStatus: 'New'
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (featureData: any) => {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(featureData)
      });
      if (!response.ok) {
        throw new Error('Failed to create feature');
      }
      return response.json();
    },
    onSuccess: (newFeature) => {
      toast({
        title: "Feature Created",
        description: `${formData.feaType} "${formData.name}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      onFeatureCreated(newFeature);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create feature",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setStep('name');
    setFormData({
      name: '',
      feaType: '',
      geometryType: '',
      specificType: '',
      feaNo: '',
      description: '',
      maintenance: 'None',
      feaState: 'Plan',
      feaStatus: 'New'
    });
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step === 'name' && formData.name.trim()) {
      setStep('type');
    } else if (step === 'type' && formData.feaType) {
      setStep('geometry');
    } else if (step === 'geometry' && formData.geometryType) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'details') setStep('geometry');
    else if (step === 'geometry') setStep('type');
    else if (step === 'type') setStep('name');
  };

  const handleFeatureTypeSelect = (type: string) => {
    const featureType = featureTypes.find(ft => ft.id === type);
    setFormData(prev => ({
      ...prev,
      feaType: type,
      geometryType: featureType?.geometryType || '',
      specificType: '' // Reset specific type when feature type changes
    }));
  };

  const handleCreateFeature = () => {
    if (!formData.name.trim() || !formData.feaType || !formData.geometryType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Create feature data with default geometry based on type
    let geometry;
    if (formData.geometryType === 'Point') {
      // Default point location (can be updated later via map)
      geometry = {
        type: 'Point',
        coordinates: [67.0011, 24.8607] // Default Karachi coordinates
      };
    } else if (formData.geometryType === 'LineString') {
      // Default line (can be updated later via map)
      geometry = {
        type: 'LineString',
        coordinates: [[67.0011, 24.8607], [67.0021, 24.8617]]
      };
    } else if (formData.geometryType === 'Polygon') {
      // Default polygon (can be updated later via map)
      geometry = {
        type: 'Polygon',
        coordinates: [[
          [67.0011, 24.8607],
          [67.0021, 24.8607],
          [67.0021, 24.8617],
          [67.0011, 24.8617],
          [67.0011, 24.8607]
        ]]
      };
    }

    const featureData = {
      name: formData.name.trim(),
      feaType: formData.feaType,
      feaNo: formData.feaNo.trim() || `${formData.feaType}-${Date.now()}`,
      feaState: formData.feaState,
      feaStatus: formData.feaStatus,
      specificType: formData.specificType || formData.feaType,
      maintenance: formData.maintenance,
      description: formData.description.trim(),
      geometry,
      createdBy: user?._id,
      teamId: user?.teamId || undefined,
      images: []
    };

    createFeatureMutation.mutate(featureData);
  };

  const canProceed = () => {
    if (step === 'name') return formData.name.trim().length > 0;
    if (step === 'type') return formData.feaType.length > 0;
    if (step === 'geometry') return formData.geometryType.length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'name' && 'Create New Feature - Name'}
            {step === 'type' && 'Create New Feature - Type'}
            {step === 'geometry' && 'Create New Feature - Geometry'}
            {step === 'details' && 'Create New Feature - Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'name' && 'Enter a name for your new feature'}
            {step === 'type' && 'Select the type of feature you want to create'}
            {step === 'geometry' && 'Confirm the geometry type for this feature'}
            {step === 'details' && 'Add additional details for your feature'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="featureName">Feature Name *</Label>
                <Input
                  id="featureName"
                  placeholder="Enter feature name (e.g., Main Tower, North Cable)"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {step === 'type' && (
            <div className="space-y-4">
              <div>
                <Label>Feature Type *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {featureTypes.map((type) => (
                    <Button
                      key={type.id}
                      variant={formData.feaType === type.id ? "default" : "outline"}
                      className="h-auto p-3 text-left"
                      onClick={() => handleFeatureTypeSelect(type.id)}
                    >
                      <div>
                        <div className="font-medium text-sm">{type.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'geometry' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    {formData.geometryType === 'Point' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                    {formData.geometryType === 'LineString' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14"/>
                      </svg>
                    )}
                    {formData.geometryType === 'Polygon' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12,2 22,20 2,20"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">
                      {formData.feaType} - {formData.geometryType}
                    </div>
                    <div className="text-sm text-blue-700">
                      This feature will be created as a {formData.geometryType.toLowerCase()} geometry
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                The geometry type is automatically determined by the feature type. You can adjust the exact location and shape on the map after creation.
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feaNo">Feature Number</Label>
                  <Input
                    id="feaNo"
                    placeholder="Auto-generated"
                    value={formData.feaNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, feaNo: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="specificType">Specific Type</Label>
                  <Select 
                    value={formData.specificType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, specificType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(specificTypes[formData.feaType as keyof typeof specificTypes] || []).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feaState">State</Label>
                  <Select 
                    value={formData.feaState} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, feaState: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plan">Plan</SelectItem>
                      <SelectItem value="Under Construction">Under Construction</SelectItem>
                      <SelectItem value="As-Built">As-Built</SelectItem>
                      <SelectItem value="Abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maintenance">Maintenance</Label>
                  <Select 
                    value={formData.maintenance} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add any additional details about this feature..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={step === 'name' ? handleClose : handleBack}
          >
            {step === 'name' ? 'Cancel' : 'Back'}
          </Button>
          
          {step !== 'details' ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateFeature}
              disabled={createFeatureMutation.isPending || !formData.name.trim()}
            >
              {createFeatureMutation.isPending ? 'Creating...' : 'Create Feature'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}