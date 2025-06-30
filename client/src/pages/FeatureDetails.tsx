import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Settings, Calendar, User, Building, Cable, Square, Radio, Edit, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import type { IFeature, ITeam, IUser } from "@shared/schema";

export default function FeatureDetails() {
  const { featureType, featureId } = useParams<{ featureType: string; featureId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<IFeature>>({});

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

  // Fetch all teams to get team details
  const { data: teams = [] } = useQuery<ITeam[]>({
    queryKey: ['/api/teams'],
  });

  // Fetch all users to get creator details
  const { data: users = [] } = useQuery<IUser[]>({
    queryKey: ['/api/users'],
  });

  // Find relevant team and creator
  const assignedTeam = teams.find(team => team._id?.toString() === feature?.teamId?.toString());
  const createdByUser = users.find(user => user._id?.toString() === feature?.createdBy?.toString());

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete feature');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feature deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      setLocation(`/features/${featureType.toLowerCase()}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete feature",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedFeature: Partial<IFeature>) => {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFeature),
      });
      if (!response.ok) throw new Error('Failed to update feature');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feature updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/features', featureId] });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      });
    },
  });

  // Handle edit form submission
  const handleUpdateFeature = () => {
    updateMutation.mutate(editForm);
  };

  // Handle view on map
  const handleViewOnMap = () => {
    // Navigate to map with feature highlighted
    setLocation(`/map?feature=${featureId}`);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this feature? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  // Initialize edit form when feature loads
  useEffect(() => {
    if (feature && !editForm.name) {
      setEditForm({
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState,
        feaStatus: feature.feaStatus,
        specificType: feature.specificType,
        maintenance: feature.maintenance,
        teamId: feature.teamId,
      });
    }
  }, [feature]);

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

        {/* Action Buttons - Supervisor Only */}
        {user?.role === 'Supervisor' && (
          <div className="flex items-center gap-2">
            <Button onClick={handleViewOnMap} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View on Map
            </Button>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Feature</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Feature Name</Label>
                    <Input
                      id="name"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feaNo">Feature Number</Label>
                    <Input
                      id="feaNo"
                      value={editForm.feaNo || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, feaNo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feaStatus">Status</Label>
                    <Select value={editForm.feaStatus} onValueChange={(value) => setEditForm(prev => ({ ...prev, feaStatus: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="feaState">State</Label>
                    <Select value={editForm.feaState} onValueChange={(value) => setEditForm(prev => ({ ...prev, feaState: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="As-Built">As-Built</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Proposed">Proposed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="specificType">Specific Type</Label>
                    <Input
                      id="specificType"
                      value={editForm.specificType || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, specificType: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenance">Maintenance</Label>
                    <Select value={editForm.maintenance} onValueChange={(value) => setEditForm(prev => ({ ...prev, maintenance: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Required">Required</SelectItem>
                        <SelectItem value="Not Required">Not Required</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="teamId">Assigned Team</Label>
                    <Select value={editForm.teamId?.toString()} onValueChange={(value) => setEditForm(prev => ({ ...prev, teamId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team._id?.toString()} value={team._id?.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateFeature} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
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
                  {feature.images.map((imagePath: string, index: number) => {
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
          {(assignedTeam || createdByUser) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Team Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedTeam && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned Team</label>
                    <p className="font-medium">{assignedTeam.name}</p>
                    {assignedTeam.city && (
                      <p className="text-sm text-gray-600">{assignedTeam.city}</p>
                    )}
                  </div>
                )}
                {createdByUser && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="font-medium">{createdByUser.username}</p>
                    <p className="text-sm text-gray-600">{createdByUser.role}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}