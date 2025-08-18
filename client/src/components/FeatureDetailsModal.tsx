import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, Settings, Edit, Trash2 } from "lucide-react";
import { IFeature, ITeam } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface FeatureDetailsModalProps {
  open: boolean;
  onClose: () => void;
  feature: IFeature | null;
  onEdit?: (feature: IFeature) => void;
}

export function FeatureDetailsModal({ open, onClose, feature, onEdit }: FeatureDetailsModalProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Fetch fresh feature data with images to ensure we have latest data
  const { data: freshFeature } = useQuery<IFeature>({
    queryKey: ['/api/features', feature?._id],
    queryFn: async () => {
      const response = await fetch(`/api/features/${feature?._id}`);
      if (!response.ok) throw new Error('Failed to fetch feature details');
      return response.json();
    },
    enabled: !!feature?._id && open,
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete feature');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: "Success",
        description: "Feature deleted successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete feature",
        variant: "destructive",
      });
    },
  });

  // Use fresh feature data if available, otherwise use prop data
  const displayFeature = freshFeature || feature;

  if (!displayFeature) return null;

  const handleDelete = async () => {
    if (!displayFeature?._id) return;
    
    setIsDeleting(true);
    try {
      await deleteFeatureMutation.mutateAsync(displayFeature._id.toString());
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (onEdit && displayFeature) {
      onEdit(displayFeature);
      onClose();
    }
  };

  // Debug logging for images
  console.log('Feature data in popup:', displayFeature);
  console.log('Feature images:', displayFeature.images);
  console.log('Images length:', displayFeature.images?.length);
  console.log('Feature teamId:', displayFeature.teamId);
  console.log('Creator team data:', creatorTeam);

  const isParcel = feature?.feaType === 'Parcel';
  const isAssigned = !!feature?.assignedTo;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {feature?.name || `${feature?.feaType} #${feature?.feaNo}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Feature Images */}
          {displayFeature.images && Array.isArray(displayFeature.images) && displayFeature.images.length > 0 && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm font-medium">
                  Feature Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {displayFeature.images.length} image{displayFeature.images.length !== 1 ? 's' : ''} uploaded
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-60 overflow-y-auto">
                    {displayFeature.images.map((imagePath, index) => {
                      // Debug each image path
                      console.log(`Image ${index + 1}:`, imagePath);
                      
                      // Handle different path formats - ensure proper URL construction
                      let imageUrl = imagePath;
                      if (typeof imagePath === 'string') {
                        if (!imagePath.startsWith('http') && !imagePath.startsWith('/uploads/')) {
                          // Remove leading slash if present and prepend /uploads/
                          const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
                          imageUrl = `/uploads/${cleanPath}`;
                        } else if (imagePath.startsWith('uploads/')) {
                          // Add leading slash if missing
                          imageUrl = `/${imagePath}`;
                        }
                      }
                      
                      console.log(`Final image URL ${index + 1}:`, imageUrl);
                      
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`${displayFeature.name} - Image ${index + 1}`}
                            className="w-full h-20 sm:h-24 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              window.open(imageUrl, '_blank');
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image ${index + 1}:`, imageUrl);
                              console.error('Original path:', imagePath);
                              console.error('Constructed URL:', imageUrl);
                              // Show a placeholder instead of hiding
                              const img = e.target as HTMLImageElement;
                              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5QzEwLjMgOSA5IDEwLjMgOSAxMkM5IDEzLjcgMTAuMyAxNSAxMiAxNUMxMy43IDE1IDE1IDEzLjcgMTUgMTJDMTUgMTAuMyAxMy43IDkgMTIgOVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyIDdDMTQuMiA3IDE2IDguOCAxNiAxMUMxNiAxMy4yIDE0LjIgMTUgMTIgMTVDOS44IDE1IDggMTMuMiA4IDExQzggOC44IDkuOCA3IDEyIDdaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K';
                              img.alt = 'Image failed to load';
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
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Type:</span>
                <Badge variant="secondary" className="w-fit">{feature?.feaType}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Number:</span>
                                  <span className="text-xs sm:text-sm font-medium">{feature?.feaNo}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Status:</span>
                <Badge variant={feature?.feaStatus === 'Active' ? 'default' : 'outline'} className="w-fit">
                  {feature?.feaStatus}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">State:</span>
                <Badge variant="outline" className="w-fit">{feature?.feaState}</Badge>
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
              {feature?.specificType && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Specific Type:</span>
                                      <span className="text-xs sm:text-sm font-medium">{feature?.specificType}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Maintenance:</span>
                <Badge variant="outline" className="w-fit">{feature?.maintenance}</Badge>
              </div>
              {feature?.createdAt && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Created:</span>
                  <span className="text-xs sm:text-sm">
                    {new Date(feature?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Team Information */}
          {displayFeature.teamId && (
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


        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
          <div className="flex gap-2 justify-end w-full">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Feature
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || deleteFeatureMutation.isPending}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting || deleteFeatureMutation.isPending ? "Deleting..." : "Delete Feature"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}