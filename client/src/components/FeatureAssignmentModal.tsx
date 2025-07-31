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
import { getAllTeams, assignFeatureToTeam } from "@/lib/api";
import { IFeature } from "@shared/schema";

interface FeatureAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: IFeature | null;
}

export default function FeatureAssignmentModal({
  open,
  onOpenChange,
  feature,
}: FeatureAssignmentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: getAllTeams,
  });

  const assignMutation = useMutation({
    mutationFn: ({ featureId, teamId }: { featureId: string; teamId: string }) =>
      assignFeatureToTeam(featureId, teamId),
    onSuccess: () => {
      toast({
        title: "Feature Assigned",
        description: "Feature has been successfully assigned to the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign feature to team.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!feature || !selectedTeamId) return;
    
    assignMutation.mutate({
      featureId: feature._id.toString(),
      teamId: selectedTeamId,
    });
  };

  if (!feature) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
            Assign Feature to Team
          </DialogTitle>
          <DialogDescription>
            Select a team to assign this feature for field operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">
              {feature.name || `${feature.feaType} #${feature.feaNo}`}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div>Type: {feature.specificType}</div>
              <div>Status: <Badge variant="outline">{feature.feaStatus}</Badge></div>
              {feature.description && (
                <div className="mt-2">Description: {feature.description}</div>
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
                  .filter(team => team.status === "approved")
                  .map((team) => (
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
              {assignMutation.isPending ? "Assigning..." : "Assign Feature"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}