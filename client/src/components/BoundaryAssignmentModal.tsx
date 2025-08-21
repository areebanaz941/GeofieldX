import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAllTeams, assignBoundaryToTeam } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import type { IBoundary } from "@shared/schema";

interface BoundaryAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boundary: IBoundary | null;
}

export default function BoundaryAssignmentModal({
  open,
  onOpenChange,
  boundary,
}: BoundaryAssignmentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: getAllTeams,
    enabled: open, // Only fetch when modal is open
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const assignMutation = useMutation({
    mutationFn: ({ boundaryId, teamId }: { boundaryId: string; teamId: string }) =>
      assignBoundaryToTeam(boundaryId, teamId),
    onSuccess: () => {
      toast({
        title: "Area Assigned",
        description: "Area has been successfully assigned to the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/boundaries"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign area to team.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!boundary || !selectedTeamId) return;
    
    assignMutation.mutate({
      boundaryId: boundary._id.toString(),
      teamId: selectedTeamId,
    });
  };

  const handleUnassign = async () => {
    if (!boundary) return;
    try {
      await apiRequest('DELETE', `/api/boundaries/${boundary._id.toString()}/assign`);
      toast({ title: 'Area Unassigned', description: 'Area assignment has been cleared.' });
      queryClient.invalidateQueries({ queryKey: ["/api/boundaries"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Unassign Failed', description: error.message || 'Failed to unassign area.', variant: 'destructive' });
    }
  };

  if (!boundary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
            Assign Area to Team
          </DialogTitle>
          <DialogDescription>
            Select a team to assign this area for field operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Boundary Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">
              {boundary.name || `Area #${boundary._id.toString().slice(-6)}`}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div>Type: Area/Boundary</div>
              <div>Status: <Badge variant="outline">{boundary.status}</Badge></div>
              {boundary.description && (
                <div className="mt-2">Description: {boundary.description}</div>
              )}
            </div>
          </div>

          {/* Team Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select Team
            </label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team..." />
              </SelectTrigger>
              <SelectContent>
                {teams && teams.length > 0 ? (
                  teams
                    .filter((team: any) => team.status?.toLowerCase() === "approved")
                    .map((team: any) => (
                      <SelectItem key={team._id.toString()} value={team._id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{team.name}</span>
                            {team.city && (
                              <span className="text-xs text-gray-500">{team.city}</span>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Badge variant="secondary" className="text-xs">
                              {team.type || 'Field'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${team.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : ''}`}
                            >
                              {team.status}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="no-teams" disabled>
                    No active teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-between space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleUnassign}
              disabled={assignMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Unassign
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedTeamId || assignMutation.isPending}
              className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] hover:from-[#0D2E5A] hover:to-[#1E5CB3]"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Area"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}