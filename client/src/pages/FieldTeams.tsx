import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  getFieldUsers, 
  getAllTasks, 
  getAllTeams, 
  getTeamMembers, 
  createTeam, 
  updateTeamStatus, 
  assignUserToTeam,
  unassignUserFromTeam,
  deleteTeam
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { IUser, ITask, ITeam, InsertTeam } from "../../../shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function getInitials(name: string | undefined) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// TeamCard component for displaying team information
interface TeamCardProps {
  team: any;
  fieldUsers: any[];
  tasks: any[];
  handleTeamStatusChange: (teamId: string, status: string) => void;
  onDelete?: (teamId: string) => void;
  onManageMembers?: (team: any) => void;
}

function TeamCard({ team, fieldUsers, tasks, handleTeamStatusChange, onDelete, onManageMembers }: TeamCardProps) {
  // Find members of this team using MongoDB IDs
  const teamMembers = fieldUsers.filter(user => user.teamId === team._id);
  
  // Filter tasks assigned to this team
  const teamTasks = tasks.filter((task: any) => task.assignedTo === team._id);
  const completedTasks = teamTasks.filter((task: any) => task.status === "Completed");
  const inProgressTasks = teamTasks.filter((task: any) => task.status === "In Progress");
  const pendingTasks = teamTasks.filter((task: any) => task.status === "Assigned");
  
  return (
    <Card key={team._id} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{team.name}</CardTitle>
          <Badge
            className={`
              ${team.status === "Approved" ? "bg-green-100 text-green-700 border-green-200" : ""}
              ${team.status === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : ""}
              ${team.status === "Rejected" ? "bg-red-100 text-red-700 border-red-200" : ""}
            `}
          >
            {team.status}
          </Badge>
        </div>
        <CardDescription className="mt-2">
          {team.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Created:</span>{" "}
            {new Date(team.createdAt).toLocaleDateString()}
          </div>
          {team.city && (
            <div className="text-sm">
              <span className="font-medium">City:</span>{" "}
              {team.city}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">Members:</span>{" "}
            {teamMembers.length}
          </div>
        </div>
        
        {teamMembers.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Team Members</h4>
            <div className="space-y-2">
              {teamMembers.slice(0, 3).map((member) => (
                <div key={member._id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 bg-primary-100 text-primary-600">
                    <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{teamMembers.length - 3} more members
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Assignment Summary */}
        {teamTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Task Status</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-sm font-medium text-blue-600">{pendingTasks.length}</div>
                <div className="text-xs text-blue-500">Assigned</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <div className="text-sm font-medium text-yellow-600">{inProgressTasks.length}</div>
                <div className="text-xs text-yellow-500">In Progress</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="text-sm font-medium text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-green-500">Completed</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 flex justify-end gap-2 pt-2">
        {onManageMembers && (
          <Button 
            size="sm"
            variant="default"
            onClick={() => onManageMembers(team)}
          >
            Manage Members
          </Button>
        )}
        {team.status === "Pending" && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-50"
              onClick={() => handleTeamStatusChange(team._id, "Rejected")}
            >
              Reject
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-green-500 text-green-500 hover:bg-green-50"
              onClick={() => handleTeamStatusChange(team._id, "Approved")}
            >
              Approve
            </Button>
          </>
        )}
        {team.status === "Rejected" && (
          <Button 
            size="sm" 
            variant="outline" 
            className="border-green-500 text-green-500 hover:bg-green-50"
            onClick={() => handleTeamStatusChange(team._id, "Approved")}
          >
            Approve
          </Button>
        )}
        {onManageMembers && team.status === "Approved" && (
          <Button 
            size="sm" 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50"
            onClick={() => handleTeamStatusChange(team._id, "Rejected")}
          >
            Deactivate
          </Button>
        )}
        {onDelete && (
          <Button 
            size="sm"
            variant="destructive"
            onClick={() => onDelete(team._id)}
          >
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Form schema for creating a new team
const teamFormSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
  description: z.string().optional(),
  city: z.string().optional(),
});

export default function FieldTeams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Mutation for deleting a team
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      toast({ title: "Team deleted", description: "The team was removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: () => {
      toast({ title: "Failed to delete team", description: "An error occurred while deleting the team", variant: "destructive" });
    }
  });

  const handleDeleteTeam = (teamId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this team? This will unassign members and related items.");
    if (!confirmed) return;
    deleteTeamMutation.mutate(teamId);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ITeam | null>(null);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  
  // Create a form for team creation
  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
      city: "",
    },
  });
  
  // Query for field users
  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });
  
  // Query for tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });
  
  // Query for teams
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: getAllTeams,
  });
  
  // Mutation for creating a new team
  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      toast({
        title: "Team created successfully",
        description: user?.role === "Supervisor" 
          ? "The team is now available for field team members to join" 
          : "The team request has been submitted for approval",
      });
      setCreateTeamOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create team",
        description: "An error occurred while creating the team",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating team status
  const updateTeamStatusMutation = useMutation({
    mutationFn: ({ teamId, status }: { teamId: number, status: string }) => 
      updateTeamStatus(teamId, status),
    onSuccess: () => {
      toast({
        title: "Team status updated",
        description: "The team status has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update team status",
        description: "An error occurred while updating the team status",
        variant: "destructive",
      });
    }
  });

  // Mutation for assigning user to team
  const assignUserToTeamMutation = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string, teamId: string }) => 
      assignUserToTeam(userId, teamId),
    onSuccess: () => {
      toast({
        title: "Member added",
        description: "The user has been added to the team",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/field"] });
    },
    onError: () => {
      toast({
        title: "Failed to add member",
        description: "An error occurred while adding the user to the team",
        variant: "destructive",
      });
    }
  });

  // Mutation for unassigning user from team
  const unassignUserFromTeamMutation = useMutation({
    mutationFn: (userId: string) => unassignUserFromTeam(userId),
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The user has been removed from the team",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/field"] });
    },
    onError: () => {
      toast({
        title: "Failed to remove member",
        description: "An error occurred while removing the user from the team",
        variant: "destructive",
      });
    }
  });

  const handleManageMembers = (team: ITeam) => {
    setSelectedTeam(team);
    setManageMembersOpen(true);
  };
  
  // Get unique cities from teams
  const uniqueCities = Array.from(new Set(teams.map((team: any) => team.city).filter(Boolean))) as string[];
  
  // Filter teams based on city and search
  const filteredTeams = teams.filter((team: any) => {
    const matchesCity = !cityFilter || team.city === cityFilter;
    const matchesSearch = !searchTerm || 
      (team.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (team.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (team.city?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesCity && matchesSearch;
  });
  
  // Handle team creation form submission
  const onSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    createTeamMutation.mutate(values as InsertTeam);
  };
  
  // Handle team status changes
  const handleTeamStatusChange = (teamId: string, status: string) => {
    updateTeamStatusMutation.mutate({ teamId: teamId as any, status });
  };
  
  // Is the current user a supervisor
  const isSupervisor = user?.role === "Supervisor";
  
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#E0F7F6] to-[#EBF5F0] min-h-screen">
      <div className="container mx-auto max-w-6xl">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">Field Teams</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your field teams</p>
            </div>
            <div className="flex gap-2">
              {user?.role === "Supervisor" && (
                <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Create Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Field Team</DialogTitle>
                      <DialogDescription>
                        Fill out the details below to create a new field team. Teams created by supervisors are automatically approved.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Team Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter team name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter team description" 
                                  className="resize-none" 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter city name" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setCreateTeamOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createTeamMutation.isPending}
                          >
                            {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
            
          <div className="mb-4 flex gap-4 flex-wrap">
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-xs"
            />
            <select 
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {uniqueCities.map((city: string) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          {/* Show a notice for field users that they can only see their own team */}
          {!isSupervisor && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
              <p className="text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                As a field team member, you can only view information about your own team
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.length > 0 ? (
              filteredTeams
                // Filter teams based on user role:
                // - Supervisors can see all teams
                // - Field users can only see their own team
                .filter((team: any) => 
                  isSupervisor ? true : (user?.teamId === team._id)
                )
                .map((team: any) => (
                  <TeamCard 
                    key={team._id} 
                    team={team} 
                    fieldUsers={fieldUsers} 
                    tasks={tasks || []}
                    handleTeamStatusChange={handleTeamStatusChange}
                    onDelete={user?.role === "Supervisor" ? handleDeleteTeam : undefined}
                    onManageMembers={isSupervisor ? handleManageMembers : undefined}
                  />
                ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchTerm || cityFilter
                  ? "No teams match your search criteria"
                  : isSupervisor 
                    ? "No teams created yet. Create your first team using the button above"
                    : "No teams available"
                }
              </div>
            )}
            
            {/* No teams found after filtering */}
            {teams.length > 0 &&
              filteredTeams.filter((team: any) => 
                isSupervisor ? true : (user?.teamId === team._id)
               ).length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                {isSupervisor
                  ? "No teams match your search criteria"
                  : "You are not currently assigned to a team"}
              </div>
            )}
          </div>

          {/* Manage Members Dialog */}
          <Dialog open={manageMembersOpen} onOpenChange={setManageMembersOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Members{selectedTeam ? `: ${selectedTeam.name}` : ""}</DialogTitle>
                <DialogDescription>
                  Add or remove field users for this team.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Members */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Current Members</h4>
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {fieldUsers.filter((u: any) => selectedTeam && u.teamId === (selectedTeam as any)._id).length === 0 && (
                      <div className="text-sm text-gray-500">No members yet</div>
                    )}
                    {fieldUsers
                      .filter((u: any) => selectedTeam && u.teamId === (selectedTeam as any)._id)
                      .map((member: any) => (
                        <div key={member._id} className="flex items-center justify-between gap-3 border rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 bg-primary-100 text-primary-600">
                              <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm">{member.name || member.username}</span>
                              <span className="text-xs text-gray-500">{member.username}</span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => unassignUserFromTeamMutation.mutate(member._id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Add Members */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Add Members</h4>
                  <Input 
                    placeholder="Search users..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {fieldUsers
                      .filter((u: any) => selectedTeam && u.teamId !== (selectedTeam as any)._id)
                      .filter((u: any) => {
                        if (!memberSearch) return true;
                        const q = memberSearch.toLowerCase();
                        return (
                          (u.name || "").toLowerCase().includes(q) ||
                          (u.username || "").toLowerCase().includes(q)
                        );
                      })
                      .map((u: any) => (
                        <div key={u._id} className="flex items-center justify-between gap-3 border rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 bg-primary-100 text-primary-600">
                              <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm">{u.name || u.username}</span>
                              <span className="text-xs text-gray-500">{u.username}{u.teamId ? " • assigned" : ""}</span>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => selectedTeam && assignUserToTeamMutation.mutate({ userId: u._id, teamId: (selectedTeam as any)._id })}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setManageMembersOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}