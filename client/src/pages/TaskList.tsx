import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getAllTasks, getFieldUsers, getAllFeatures, deleteTask, deleteFeature } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import ParcelDetailsModal from "@/components/ParcelDetailsModal";
import useAuth from "@/hooks/useAuth";
import { ITask, IFeature, ITeam } from "@shared/schema";
import { MapPin, Users } from "lucide-react";

export default function TaskList() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<IFeature | null>(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [parcelDetailsModalOpen, setParcelDetailsModalOpen] = useState(false);

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Task has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: (featureId: string) => deleteFeature(featureId),
    onSuccess: () => {
      toast({
        title: "Boundary deleted",
        description: "Boundary has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete boundary",
        variant: "destructive",
      });
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });

  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: () => fetch('/api/teams').then(res => res.json()),
  });

  // Get assigned boundaries (features with assignedTo)
  const assignedBoundaries = features.filter((feature: IFeature) => 
    feature.feaType === 'Parcel' && feature.assignedTo
  );

  // Filter and sort tasks based on search and status
  const filteredTasks = tasks
    .filter((task: ITask) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a: ITask, b: ITask) => {
      // Sort by creation date, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Filter boundaries based on search
  const filteredBoundaries = assignedBoundaries.filter((boundary: IFeature) => {
    const matchesSearch = boundary.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Get assignee name for each task
  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    const assignee = fieldUsers.find((user: any) => user._id && user._id.toString() === assigneeId);
    return assignee ? assignee.name : 'Unknown User';
  };

  // Get team name for boundaries
  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'Unassigned';
    const team = (teams as ITeam[]).find((team: ITeam) => team._id && team._id.toString() === teamId);
    return team ? team.name : 'Unknown Team';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#E0F7F6] to-[#EBF5F0] min-h-screen">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">Tasks & Assignments</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder={t('tasks.searchTasks')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In-Complete">Incomplete</SelectItem>
                    <SelectItem value="Submit-Review">Submit Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"></path>
              </svg>
              Tasks ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Boundary Assignments ({filteredBoundaries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">Manage inspection tasks and reviews</p>
              {user?.role === "Supervisor" && (
                <Button 
                  onClick={() => setCreateTaskModalOpen(true)} 
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 font-medium shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  Create Inspection Task
                </Button>
              )}
            </div>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task: ITask) => (
                <Card
                  key={task._id.toString()}
                  className="hover:shadow-md transition-shadow"
                >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                    <div 
                      className="flex-1 space-y-1 cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDetailsModalOpen(true);
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={task.status} />
                        {task.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full 
                            ${task.priority === 'High' || task.priority === 'Urgent'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-lg">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col lg:text-right lg:items-end gap-3">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500">
                          Assigned to: <span className="font-medium">{getAssigneeName(task.assignedTo?.toString())}</span>
                        </div>
                        {task.dueDate && (
                          <div className="text-sm text-gray-500">
                            Due: <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Updated: {new Date(task.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      {user?.role === "Supervisor" && (
                        <div className="flex justify-start lg:justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
                                deleteTaskMutation.mutate(task._id.toString());
                              }
                            }}
                            disabled={deleteTaskMutation.isPending}
                            className="text-xs px-3 py-1"
                          >
                            {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== "All"
                  ? "No tasks match your search criteria"
                  : "No tasks found. Create your first task!"}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4 mt-6">
            {filteredBoundaries.length > 0 ? (
              filteredBoundaries.map((boundary: IFeature) => (
                <Card
                  key={boundary._id.toString()}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div 
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedParcel(boundary);
                          setParcelDetailsModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {boundary.assignedTo ? 'Assigned' : 'Unassigned'}
                          </Badge>
                          <Badge variant="outline">
                            Boundary
                          </Badge>
                        </div>
                        <h3 className="font-medium text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {boundary.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Area #{boundary.feaNo} • Status: {boundary.feaStatus}
                        </p>
                      </div>
                      <div className="text-right flex flex-col justify-between">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">
                            <Users className="h-4 w-4 inline mr-1" />
                            Team: <span className="font-medium">{getTeamName(boundary.assignedTo?.toString())}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            Created: {new Date(boundary.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {user?.role === "Supervisor" && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this boundary? This action cannot be undone.")) {
                                  deleteFeatureMutation.mutate(boundary._id.toString());
                                }
                              }}
                              disabled={deleteFeatureMutation.isPending}
                              className="text-xs px-3 py-1"
                            >
                              {deleteFeatureMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm
                  ? "No boundary assignments match your search"
                  : "No boundary assignments found"}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>

      {createTaskModalOpen && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          onOpenChange={setCreateTaskModalOpen}
        />
      )}

      {taskDetailsModalOpen && selectedTask && (
        <TaskDetailsModal
          open={taskDetailsModalOpen}
          onClose={() => setTaskDetailsModalOpen(false)}
          onOpenChange={setTaskDetailsModalOpen}
          task={selectedTask}
        />
      )}

      {parcelDetailsModalOpen && selectedParcel && (
        <ParcelDetailsModal
          open={parcelDetailsModalOpen}
          onClose={() => setParcelDetailsModalOpen(false)}
          onOpenChange={setParcelDetailsModalOpen}
          parcel={selectedParcel}
          teamName={getTeamName(selectedParcel.assignedTo?.toString())}
        />
      )}
    </div>
  );
}
