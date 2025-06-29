import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, Calendar, Settings } from "lucide-react";
import { IFeature, ITeam } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface FeatureDetailsModalProps {
  open: boolean;
  onClose: () => void;
  feature: IFeature | null;
}

export function FeatureDetailsModal({ open, onClose, feature }: FeatureDetailsModalProps) {
  // Fetch team details if feature has a teamId
  const { data: creatorTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.teamId],
    enabled: !!feature?.teamId && open,
  });

  // Fetch team details if feature is assigned to a team
  const { data: assignedTeam } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.assignedTo],
    enabled: !!feature?.assignedTo && open,
  });

  if (!feature) return null;

  // Debug logging for images
  console.log('Feature data in popup:', feature);
  console.log('Feature images:', feature.images);
  console.log('Images length:', feature.images?.length);

  const isParcel = feature.feaType === 'Parcel';
  const isAssigned = !!feature.assignedTo;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {feature.name || `${feature.feaType} #${feature.feaNo}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Type:</span>
                <Badge variant="secondary" className="w-fit">{feature.feaType}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Number:</span>
                <span className="text-xs sm:text-sm font-medium">{feature.feaNo}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Status:</span>
                <Badge variant={feature.feaStatus === 'Active' ? 'default' : 'outline'} className="w-fit">
                  {feature.feaStatus}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">State:</span>
                <Badge variant="outline" className="w-fit">{feature.feaState}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information for Parcels */}
          {isParcel && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAssigned && assignedTeam ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Assigned to:</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {assignedTeam.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Team Status:</span>
                      <Badge variant={assignedTeam.status === 'Approved' ? 'default' : 'outline'}>
                        {assignedTeam.status}
                      </Badge>
                    </div>
                    {assignedTeam.description && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <span className="text-sm font-medium">{assignedTeam.description}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Unassigned
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      This parcel area is not assigned to any team yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feature.specificType && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Specific Type:</span>
                  <span className="text-xs sm:text-sm font-medium">{feature.specificType}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Maintenance:</span>
                <Badge variant="outline" className="w-fit">{feature.maintenance}</Badge>
              </div>
              {feature.createdAt && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Created:</span>
                  <span className="text-xs sm:text-sm">
                    {new Date(feature.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Team Information */}
          {feature.teamId && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  Creator Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-2">
                  {creatorTeam ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs sm:text-sm">
                      {creatorTeam.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs sm:text-sm">
                      Loading team...
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Created by this team
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Images */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm font-medium">
                Feature Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feature.images && Array.isArray(feature.images) && feature.images.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {feature.images.length} image{feature.images.length !== 1 ? 's' : ''} uploaded
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-60 overflow-y-auto">
                    {feature.images.map((imagePath, index) => {
                      // Debug each image path
                      console.log(`Image ${index + 1}:`, imagePath);
                      
                      // Handle different path formats
                      let imageUrl = imagePath;
                      if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                        imageUrl = `/uploads/${imagePath}`;
                      } else if (!imagePath.startsWith('http') && !imagePath.startsWith('/uploads/')) {
                        imageUrl = `/uploads/${imagePath}`;
                      }
                      
                      console.log(`Final image URL ${index + 1}:`, imageUrl);
                      
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`${feature.name} - Image ${index + 1}`}
                            className="w-full h-20 sm:h-24 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              window.open(imageUrl, '_blank');
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image ${index + 1}:`, imageUrl);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log(`Successfully loaded image ${index + 1}:`, imageUrl);
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to enlarge
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
                  No images uploaded for this feature
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}