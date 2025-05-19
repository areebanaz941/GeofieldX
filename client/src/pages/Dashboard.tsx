import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getAllTasks, getAllFeatures, getFieldUsers } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const isSupervisor = user?.role === "Supervisor";

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });

  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });

  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
    enabled: isSupervisor,
  });

  // Calculate stats
  const taskStats = {
    total: tasks.length,
    unassigned: tasks.filter(task => task.status === "Unassigned").length,
    inProgress: tasks.filter(task => task.status === "In Progress").length,
    completed: tasks.filter(task => task.status === "Completed").length,
  };

  const featureStats = {
    total: features.length,
    towers: features.filter(feature => feature.feaType === "Tower").length,
    manholes: features.filter(feature => feature.feaType === "Manhole").length,
    fiberCables: features.filter(feature => feature.feaType === "FiberCable").length,
    parcels: features.filter(feature => feature.feaType === "Parcel").length,
  };

  // Prepare chart data
  const pieData = taskStats.total > 0 ? [
    { name: "Unassigned", value: taskStats.unassigned, color: "#9E9E9E" },
    { name: "In Progress", value: taskStats.inProgress, color: "#2196F3" },
    { name: "Completed", value: taskStats.completed, color: "#4CAF50" },
    { name: "Other", value: taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed, color: "#FF9800" },
  ] : [{ name: "No Data", value: 1, color: "#9E9E9E" }];

  const featurePieData = featureStats.total > 0 ? [
    { name: "Towers", value: featureStats.towers, color: "#E91E63" },
    { name: "Manholes", value: featureStats.manholes, color: "#9C27B0" },
    { name: "Fiber Cables", value: featureStats.fiberCables, color: "#3F51B5" },
    { name: "Parcels", value: featureStats.parcels, color: "#009688" },
  ] : [{ name: "No Data", value: 1, color: "#9E9E9E" }];

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-3xl font-bold">{taskStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Features Tracked</p>
                <p className="text-3xl font-bold">{featureStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-3xl font-bold">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Field Teams</p>
                <p className="text-3xl font-bold">{fieldUsers.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
              <CardDescription>
                Overview of current task statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taskStats.total > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                      <span>Unassigned</span>
                    </div>
                    <span>{taskStats.unassigned} ({Math.round((taskStats.unassigned / taskStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span>In Progress</span>
                    </div>
                    <span>{taskStats.inProgress} ({Math.round((taskStats.inProgress / taskStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span>Completed</span>
                    </div>
                    <span>{taskStats.completed} ({Math.round((taskStats.completed / taskStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-400 mr-2"></div>
                      <span>Other</span>
                    </div>
                    <span>{taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed} ({Math.round(((taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed) / taskStats.total) * 100)}%)</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-gray-500">No task data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Feature Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of features by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {featureStats.total > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
                      <span>Towers</span>
                    </div>
                    <span>{featureStats.towers} ({Math.round((featureStats.towers / featureStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      <span>Manholes</span>
                    </div>
                    <span>{featureStats.manholes} ({Math.round((featureStats.manholes / featureStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                      <span>Fiber Cables</span>
                    </div>
                    <span>{featureStats.fiberCables} ({Math.round((featureStats.fiberCables / featureStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-teal-500 mr-2"></div>
                      <span>Parcels</span>
                    </div>
                    <span>{featureStats.parcels} ({Math.round((featureStats.parcels / featureStats.total) * 100)}%)</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-gray-500">No feature data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>
                Latest updated tasks in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-[300px]">
                          {task.description || "No description provided"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={task.status} />
                        <span className="text-xs text-gray-500">
                          {new Date(task.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No tasks found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
