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
  // Fetch team details if feature is assigned to a team
  const { data: team } = useQuery<ITeam>({
    queryKey: ['/api/teams', feature?.assignedTo],
    enabled: !!feature?.assignedTo && open,
  });

  if (!feature) return null;

  const isParcel = feature.feaType === 'Parcel';
  const isAssigned = !!feature.assignedTo;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {feature.name || `${feature.feaType} #${feature.feaNo}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant="secondary">{feature.feaType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Number:</span>
                <span className="text-sm font-medium">{feature.feaNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={feature.feaStatus === 'Active' ? 'default' : 'outline'}>
                  {feature.feaStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">State:</span>
                <Badge variant="outline">{feature.feaState}</Badge>
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
                {isAssigned && team ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Assigned to:</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {team.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Team Status:</span>
                      <Badge variant={team.status === 'Approved' ? 'default' : 'outline'}>
                        {team.status}
                      </Badge>
                    </div>
                    {team.description && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <span className="text-sm font-medium">{team.description}</span>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feature.specificType && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Specific Type:</span>
                  <span className="text-sm font-medium">{feature.specificType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Maintenance:</span>
                <Badge variant="outline">{feature.maintenance}</Badge>
              </div>
              {feature.createdAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">
                    {new Date(feature.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Team Information */}
          {feature.createdBy && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Creator Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Team {feature.createdBy.toString()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created by this team
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Images */}
          {feature.images && feature.images.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Feature Images ({feature.images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {feature.images.map((imagePath, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`/uploads/${imagePath}`}
                        alt={`${feature.name} - Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          // Open image in new window for full view
                          window.open(`/uploads/${imagePath}`, '_blank');
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to enlarge
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}