import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { getFeature, deleteFeature } from "@/lib/api";

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
      if (!feature?._id) throw new Error('Missing feature id');
      return await getFeature(feature._id.toString());
    },
    enabled: !!feature?._id && open,
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => deleteFeature(featureId),
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
          <DialogDescription>View details, images, and teams for the selected feature.</DialogDescription>
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
                        if (imagePath.startsWith('http')) {
                          imageUrl = imagePath;
                        } else if (imagePath.startsWith('/uploads/')) {
                          imageUrl = imagePath;
                        } else if (imagePath.startsWith('uploads/')) {
                          imageUrl = `/${imagePath}`;
                        } else {
                          const cleanPath = imagePath.replace(/^\/+/, '');
                          imageUrl = `/uploads/${cleanPath}`;
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
              <CardContent className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Assigned To:</span>
                  <Badge variant={isAssigned ? 'default' : 'outline'} className="w-fit">
                    {isAssigned ? `Team #${feature?.assignedTo}` : 'Unassigned'}
                  </Badge>
                </div>
                {creatorTeam && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-muted-foreground">Created by Team:</span>
                    <Badge variant="outline" className="w-fit">{creatorTeam?.name || creatorTeam?._id}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || deleteFeatureMutation.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting || deleteFeatureMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}