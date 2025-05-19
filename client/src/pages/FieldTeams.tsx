import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFieldUsers, getAllTasks } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { User, Task } from "@shared/schema";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getActiveStatus(lastActive: Date | null | undefined) {
  if (!lastActive) return "Offline";
  
  const now = new Date();
  const lastActiveTime = new Date(lastActive);
  const diffMs = now.getTime() - lastActiveTime.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  
  if (diffMinutes < 5) return "Active";
  if (diffMinutes < 30) return "Recently active";
  if (diffMinutes < 60) return "Away";
  return "Offline";
}

export default function FieldTeams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });
  
  // Filter users based on search
  const filteredUsers = fieldUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get tasks assigned to each user
  const getUserTasks = (userId: number) => {
    return tasks.filter((task) => task.assignedTo === userId);
  };
  
  // Calculate completion rate for each user
  const getUserCompletionRate = (userId: number) => {
    const userTasks = getUserTasks(userId);
    if (userTasks.length === 0) return 0;
    
    const completedTasks = userTasks.filter((task) => task.status === "Completed");
    return Math.round((completedTasks.length / userTasks.length) * 100);
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Field Teams</h1>
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((fieldUser) => {
              const userTasks = getUserTasks(fieldUser.id);
              const completionRate = getUserCompletionRate(fieldUser.id);
              const activeStatus = getActiveStatus(fieldUser.lastActive);
              
              return (
                <Card key={fieldUser.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12 border-2 border-white bg-primary-100 text-primary-600">
                            <AvatarFallback>{getInitials(fieldUser.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{fieldUser.name}</h3>
                            <p className="text-sm text-gray-500">{fieldUser.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`
                            ${activeStatus === "Active" ? "bg-green-100 text-green-700 border-green-200" : ""}
                            ${activeStatus === "Recently active" ? "bg-blue-100 text-blue-700 border-blue-200" : ""}
                            ${activeStatus === "Away" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : ""}
                            ${activeStatus === "Offline" ? "bg-gray-100 text-gray-700 border-gray-200" : ""}
                          `}
                        >
                          {activeStatus}
                        </Badge>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-500">
                        <div className="space-y-1">
                          <p>Assigned Tasks</p>
                          <p className="text-lg font-semibold text-gray-900">{userTasks.length}</p>
                        </div>
                        <div className="space-y-1">
                          <p>Completion Rate</p>
                          <p className="text-lg font-semibold text-gray-900">{completionRate}%</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Task Status</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span>Completed</span>
                            <span>{userTasks.filter(t => t.status === "Completed").length}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span>In Progress</span>
                            <span>{userTasks.filter(t => t.status === "In Progress").length}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span>Assigned</span>
                            <span>{userTasks.filter(t => t.status === "Assigned").length}</span>
                          </div>
                        </div>
                      </div>
                      
                      {fieldUser.lastActive && (
                        <div className="mt-4 text-xs text-gray-500">
                          Last active: {new Date(fieldUser.lastActive).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 px-5 py-3 flex justify-between border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Show user location on map
                          toast({
                            title: "View on map",
                            description: "This feature will navigate to map view centered on this team member",
                          });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Locate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Show user tasks
                          toast({
                            title: "View tasks",
                            description: "This feature will show all tasks assigned to this team member",
                          });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                          <path d="M3 5v14"></path>
                          <path d="M12 5v14"></path>
                          <path d="M7 7l0 0"></path>
                          <path d="M7 11l0 0"></path>
                          <path d="M16 7l0 0"></path>
                          <path d="M16 11l0 0"></path>
                          <path d="M16 15l0 0"></path>
                        </svg>
                        Tasks
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              {searchTerm
                ? "No team members match your search criteria"
                : "No field team members found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
