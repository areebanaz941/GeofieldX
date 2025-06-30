import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Settings, Calendar, User, Building, Cable, Square, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { IFeature, ITeam } from "@shared/schema";

export default function FeatureDetails() {
  const { featureType, featureId } = useParams<{ featureType: string; featureId: string }>();

  // Fetch individual feature details
  const { data: feature, isLoading, error } = useQuery<IFeature>({
    queryKey: ['/api/features', featureId],
    queryFn: async () => {
      const response = await fetch(`/api/features/${featureId}`);
      if (!response.ok) throw new Error('Failed to fetch feature details');
      return response.json();
    },
    enabled: !!featureId,
  });

  // Fetch team details if feature has a teamId
  const { data: creatorTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.teamId],
    enabled: !!feature?.teamId,
  });

  // Fetch team details if feature is assigned to a team
  const { data: assignedTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.assignedTo],
    enabled: !!feature?.assignedTo,
  });

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'Tower':
        return <Radio className="h-6 w-6" />;
      case 'Manhole':
        return <Building className="h-6 w-6" />;
      case 'FiberCable':
        return <Cable className="h-6 w-6" />;
      case 'Parcel':
        return <Square className="h-6 w-6" />;
      default:
        return <MapPin className="h-6 w-6" />;
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-red-600 mb-4">Failed to load feature details</p>
            <Link href={`/features/${featureType}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {featureType}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/features/${featureType.toLowerCase()}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {featureType}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-blue-600">
              {getFeatureIcon(feature.feaType)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {feature.name || `${feature.feaType} #${feature.feaNo}`}
              </h1>
              <p className="text-gray-600">Feature Details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Feature Type</label>
                  <p className="text-lg font-semibold">{feature.feaType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Feature Number</label>
                  <p className="text-lg font-semibold">{feature.feaNo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={`${getStatusColor(feature.feaStatus)} mt-1`}>
                    {feature.feaStatus}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">State</label>
                  <Badge variant="outline" className="mt-1">
                    {feature.feaState}
                  </Badge>
                </div>
              </div>
              {feature.specificType && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Specific Type</label>
                  <p className="font-medium">{feature.specificType}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feature.geometry && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Geometry Type</label>
                    <p className="font-medium">{feature.geometry.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Coordinates</label>
                    <div className="bg-gray-50 p-3 rounded-md font-mono text-sm">
                      {feature.geometry.type === 'Point' 
                        ? `[${feature.geometry.coordinates.join(', ')}]`
                        : JSON.stringify(feature.geometry.coordinates, null, 2)
                      }
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Images */}
          {feature.images && Array.isArray(feature.images) && feature.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Feature Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feature.images.map((imagePath, index) => {
                    let imageUrl = imagePath;
                    if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                      imageUrl = `/uploads/${imagePath}`;
                    } else if (!imagePath.startsWith('http') && !imagePath.startsWith('/uploads/')) {
                      imageUrl = `/uploads/${imagePath}`;
                    }

                    return (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={`Feature image ${index + 1}`}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden bg-gray-100 h-48 flex items-center justify-center text-gray-500">
                          Image not available
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Maintenance</label>
                <Badge variant="outline" className="mt-1 block w-fit">
                  {feature.maintenance}
                </Badge>
              </div>
              {feature.createdAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(feature.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Information */}
          {(creatorTeam || assignedTeam) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Team Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creatorTeam && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created by Team</label>
                    <p className="font-medium">{creatorTeam.name}</p>
                    {creatorTeam.city && (
                      <p className="text-sm text-gray-600">{creatorTeam.city}</p>
                    )}
                  </div>
                )}
                {assignedTeam && assignedTeam._id !== creatorTeam?._id && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assigned to Team</label>
                      <p className="font-medium">{assignedTeam.name}</p>
                      {assignedTeam.city && (
                        <p className="text-sm text-gray-600">{assignedTeam.city}</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Edit Feature
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}