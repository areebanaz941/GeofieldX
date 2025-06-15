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
import { Boundary } from "@shared/schema";

interface BoundaryAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boundary: Boundary | null;
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
                {teams
                  .filter((team: any) => team.status === "approved")
                  .map((team: any) => (
                    <SelectItem key={team._id.toString()} value={team._id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{team.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {team.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
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