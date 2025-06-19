import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, Calendar, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { IFeature, FeatureStatus } from "@shared/schema";

interface ParcelDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  parcel: IFeature;
  teamName?: string;
}

export default function ParcelDetailsModal({
  open,
  onClose,
  onOpenChange,
  parcel,
  teamName
}: ParcelDetailsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus>(parcel.feaStatus);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateParcelStatusMutation = useMutation({
    mutationFn: async (data: { status: string }) => {
      return apiRequest(`/api/features/${parcel._id}/status`, "PATCH", { status: data.status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parcel status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update parcel status",
        variant: "destructive",
      });
    },
  });

  const deleteParcelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/features/${parcel._id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parcel deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete parcel",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (selectedStatus !== parcel.feaStatus) {
      updateParcelStatusMutation.mutate({ status: selectedStatus });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this parcel? This action cannot be undone.")) {
      deleteParcelMutation.mutate();
    }
  };

  const statusOptions = [
    "New",
    "InProgress",
    "Completed",
    "In-Completed",
    "Submit-Review",
    "Review_Accepted",
    "Review_Reject",
    "Review_inprogress",
    "Active"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Parcel Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Parcel Name</label>
              <p className="text-lg font-semibold">{parcel.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Feature Number</label>
              <p className="text-lg font-semibold">#{parcel.feaNo}</p>
            </div>
          </div>

          {/* Status and Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Current Status</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm">
                  {parcel.feaStatus}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Assigned Team</label>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4" />
                <span className="font-medium">{teamName || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Geometry Information */}
          <div>
            <label className="text-sm font-medium text-gray-500">Geometry Type</label>
            <p className="mt-1">{parcel.geometry.type}</p>
          </div>

          {/* Coordinates (simplified display) */}
          <div>
            <label className="text-sm font-medium text-gray-500">Location</label>
            <p className="text-sm text-gray-600 mt-1">
              {parcel.geometry.type === 'Point' 
                ? `Lat: ${parcel.geometry.coordinates[1]}, Lng: ${parcel.geometry.coordinates[0]}`
                : `${parcel.geometry.type} with ${Array.isArray(parcel.geometry.coordinates[0]) ? parcel.geometry.coordinates.length : 1} points`
              }
            </p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{new Date(parcel.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{new Date(parcel.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Update Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as FeatureStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={selectedStatus === parcel.feaStatus || updateParcelStatusMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateParcelStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between border-t pt-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteParcelMutation.isPending}
            >
              {deleteParcelMutation.isPending ? "Deleting..." : "Delete Parcel"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}