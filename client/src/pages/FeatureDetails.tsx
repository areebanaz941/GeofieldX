import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, User, Settings, Image as ImageIcon, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getFeature } from "@/lib/api";
import { IFeature, ITeam } from "../../../shared/schema";

export default function FeatureDetails() {
  const { featureType, featureId } = useParams();
  const [, setLocation] = useLocation();

  const { data: feature, isLoading, error } = useQuery({
    queryKey: ['/api/features', featureId],
    queryFn: () => getFeature(featureId!),
    enabled: !!featureId,
  });

  // Debug logging for feature data
  if (feature) {
    console.log('🎯 Feature data in FeatureDetails:', feature);
    console.log('🖼️ Feature images:', feature.images);
  }

  // Fetch team details if feature has a teamId
  const { data: creatorTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.teamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${feature?.teamId}`);
      if (!response.ok) throw new Error('Failed to fetch team details');
      return response.json();
    },
    enabled: !!feature?.teamId,
  });

  // Fetch team details if feature is assigned to a team
  const { data: assignedTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.assignedTo],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${feature?.assignedTo}`);
      if (!response.ok) throw new Error('Failed to fetch assigned team details');
      return response.json();
    },
    enabled: !!feature?.assignedTo,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Plan': return 'bg-orange-100 text-orange-800';
      case 'Under Construction': return 'bg-amber-100 text-amber-800';
      case 'As-Built': return 'bg-emerald-100 text-emerald-800';
      case 'Abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCoordinates = (geometry: any) => {
    if (!geometry) return 'N/A';
    
    switch (geometry.type) {
      case 'Point':
        const [lng, lat] = geometry.coordinates;
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      case 'LineString':
        return `Line with ${geometry.coordinates.length} points`;
      case 'Polygon':
        return `Polygon with ${geometry.coordinates[0].length} vertices`;
      default:
        return 'Unknown geometry';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">Error loading feature details.</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/features/all')}
              className="mt-4"
            >
              Back to Features
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/features/${featureType || 'all'}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Features
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{feature.name}</h1>
          <p className="text-gray-600">{feature.feaType} Feature Details</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" />
            View on Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Feature Number</label>
                  <p className="text-lg font-semibold">{feature.feaNo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Feature Type</label>
                  <p className="text-lg font-semibold">{feature.feaType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Specific Type</label>
                  <p className="text-lg font-semibold">{feature.specificType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Maintenance Status</label>
                  <p className="text-lg font-semibold">{feature.maintenance}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex space-x-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(feature.feaStatus)}>
                      {feature.feaStatus}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">State</label>
                  <div className="mt-1">
                    <Badge className={getStateColor(feature.feaState)}>
                      {feature.feaState}
                    </Badge>
                  </div>
                </div>
              </div>

              {feature.color && feature.feaType === 'Parcel' && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Parcel Color</label>
                    <div className="flex items-center space-x-3 mt-2">
                      <div 
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: feature.color }}
                      ></div>
                      <span className="text-lg font-semibold">{feature.color}</span>
                    </div>
                  </div>
                </>
              )}

              {feature.remarks && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Remarks</label>
                    <p className="mt-1 text-gray-900">{feature.remarks}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Geometry Type</label>
                <p className="text-lg font-semibold">{feature.geometry?.type || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Coordinates</label>
                <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                  {formatCoordinates(feature.geometry)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Images ({feature.images?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feature.images && feature.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {feature.images.map((imagePath, index) => {
                    // Handle different image path formats
                    let imageUrl = imagePath;
                    if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                      imageUrl = `/uploads/${imagePath}`;
                    } else if (!imagePath.startsWith('http') && !imagePath.startsWith('/uploads/')) {
                      imageUrl = `/uploads/${imagePath}`;
                    }
                    
                    return (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={`Feature image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(imageUrl, '_blank')}
                          onError={(e) => {
                            console.error(`Failed to load image ${index + 1}:`, imageUrl);
                            // Show placeholder on error
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDNWMjFIM1YzSDIxWk0xOSA1SDVWMTZMMTI1IDEwSDEzTDE2IDE0SDE5VjVaIiBmaWxsPSIjOTk5OTk5Ii8+CjwvcGF0aD4KPC9zdmc+';
                          }}
                          onLoad={() => {
                            console.log(`Successfully loaded image ${index + 1}:`, imageUrl);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No images attached to this feature</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">{formatDate(feature.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">{formatDate(feature.lastUpdated)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Modified</label>
                <p className="text-sm text-gray-900">{formatDate(feature.updatedAt)}</p>
              </div>
              {feature.maintenanceDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Maintenance Date</label>
                  <p className="text-sm text-gray-900">{formatDate(feature.maintenanceDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned To</label>
                <div className="mt-1">
                  {feature.assignedTo && assignedTeam ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {assignedTeam.name}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      Unassigned
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <p className="text-sm text-gray-900">
                  {feature.createdBy ? 'Supervisor' : 'System'}
                </p>
              </div>
              {feature.teamId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Creator Team</label>
                  <div className="mt-1">
                    {creatorTeam ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        {creatorTeam.name}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">
                        Loading team...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                Edit Feature
              </Button>
              <Button variant="outline" className="w-full">
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Images
              </Button>
              <Button variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </Button>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Feature
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}