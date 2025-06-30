import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Building, Cable, Square, Radio, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { IFeature } from "@shared/schema";

export default function FeatureList() {
  const { featureType } = useParams<{ featureType: string }>();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all features
  const { data: features = [], isLoading } = useQuery<IFeature[]>({
    queryKey: ["/api/features"],
    queryFn: async () => {
      const response = await fetch("/api/features");
      if (!response.ok) throw new Error("Failed to fetch features");
      return response.json();
    },
  });

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'Tower':
        return <Radio className="h-5 w-5" />;
      case 'Manhole':
        return <Building className="h-5 w-5" />;
      case 'FiberCable':
        return <Cable className="h-5 w-5" />;
      case 'Parcel':
        return <Square className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFeatureTypeLabel = (type: string) => {
    switch (type) {
      case 'towers':
        return 'Towers';
      case 'manholes':
        return 'Manholes';
      case 'fiber cables':
        return 'Fiber Cables';
      case 'parcels':
        return 'Parcels';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getFeatureTypeFromUrl = (urlType: string) => {
    switch (urlType.toLowerCase()) {
      case 'towers':
        return 'Tower';
      case 'manholes':
        return 'Manhole';
      case 'fiber cables':
        return 'FiberCable';
      case 'parcels':
        return 'Parcel';
      default:
        return urlType;
    }
  };

  // Filter features by type and search term
  const filteredFeatures = features.filter(feature => {
    const matchesType = feature.feaType === getFeatureTypeFromUrl(featureType || '');
    const matchesSearch = !searchTerm || 
      feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.feaNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.specificType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const featureTypeLabel = getFeatureTypeLabel(featureType || '');
  const featureTypeKey = getFeatureTypeFromUrl(featureType || '');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-blue-600">
              {getFeatureIcon(featureTypeKey)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{featureTypeLabel}</h1>
              <p className="text-gray-600">{filteredFeatures.length} features found</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder={`Search ${featureTypeLabel.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Features Grid */}
      {filteredFeatures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => (
            <Card key={feature._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600">
                      {getFeatureIcon(feature.feaType)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {feature.name || `${feature.feaType} #${feature.feaNo}`}
                      </CardTitle>
                      <p className="text-sm text-gray-600">ID: {feature.feaNo}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <Badge className={`${getStatusColor(feature.feaStatus)} text-xs`}>
                    {feature.feaStatus}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">State:</span>
                  <Badge variant="outline" className="text-xs">
                    {feature.feaState}
                  </Badge>
                </div>

                {feature.specificType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Type:</span>
                    <span className="text-sm font-medium">{feature.specificType}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Maintenance:</span>
                  <Badge variant="outline" className="text-xs">
                    {feature.maintenance}
                  </Badge>
                </div>

                {feature.images && Array.isArray(feature.images) && feature.images.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Images:</span>
                    <span className="text-sm text-blue-600">
                      {feature.images.length} uploaded
                    </span>
                  </div>
                )}

                {feature.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Created:</span>
                    <span className="text-sm">
                      {new Date(feature.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <Link href={`/features/${featureType}/${feature._id}`}>
                    <Button className="w-full" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-600 mb-4">
              {getFeatureIcon(featureTypeKey)}
            </div>
            <h3 className="text-lg font-semibold mb-2">No {featureTypeLabel} Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `No ${featureTypeLabel.toLowerCase()} match your search criteria.`
                : `No ${featureTypeLabel.toLowerCase()} have been created yet.`
              }
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}