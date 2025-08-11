import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getAllFeatures } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, MapPin, Cable, Building, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FEATURE_TYPES = [
  { type: "Tower", icon: MapPin, label: "Towers", color: "bg-red-500" },
  { type: "Manhole", icon: Building, label: "Manholes", color: "bg-blue-500" },
  { type: "FiberCable", icon: Cable, label: "Fiber Cables", color: "bg-green-500" },
  { type: "Parcel", icon: Square, label: "Parcels", color: "bg-purple-500" }
];

export default function FeaturesTab() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });

  const deleteMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const response = await fetch(`/api/features/${featureId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete feature");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete feature", variant: "destructive" });
    },
  });

  const filteredFeatures = selectedType 
    ? features.filter(feature => feature.feaType === selectedType)
    : features;

  const getFeatureCount = (type: string) => 
    features.filter(feature => feature.feaType === type).length;

  if (selectedType) {
    const typeConfig = FEATURE_TYPES.find(ft => ft.type === selectedType);
    const Icon = typeConfig?.icon || MapPin;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setSelectedType(null)}
            className="mb-4"
          >
            ← Back to Features
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Icon className="h-6 w-6" />
            {typeConfig?.label} ({filteredFeatures.length})
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredFeatures.map((feature) => (
            <Card key={feature._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                    <p className="text-sm text-gray-600">ID: {feature.feaNo}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/map?feature=${feature._id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteMutation.mutate(feature._id.toString())}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {feature.specificType}
                  </div>
                  <div>
                    <span className="font-medium">State:</span> 
                    <Badge variant="outline" className="ml-2">{feature.feaState}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge variant="outline" className="ml-2">{feature.feaStatus}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Maintenance:</span> {feature.maintenance}
                  </div>
                  {feature.remarks && (
                    <div className="col-span-2">
                      <span className="font-medium">Remarks:</span> {feature.remarks}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredFeatures.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Icon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No {typeConfig?.label.toLowerCase()} found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Features Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURE_TYPES.map((featureType) => {
          const Icon = featureType.icon;
          const count = getFeatureCount(featureType.type);
          
          return (
            <Card 
              key={featureType.type}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedType(featureType.type)}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 ${featureType.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-lg">{featureType.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-blue-600">{count}</div>
                <p className="text-sm text-gray-600">Total {featureType.label.toLowerCase()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {features.slice(0, 5).map((feature) => (
              <div key={feature._id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <span className="font-medium">{feature.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({feature.feaType})</span>
                </div>
                <Badge variant="outline">{feature.feaState}</Badge>
              </div>
            ))}
            {features.length === 0 && (
              <p className="text-gray-500 text-center py-4">No features created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}