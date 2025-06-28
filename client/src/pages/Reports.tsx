import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAllTasks, getAllFeatures, getFieldUsers } from "@/lib/api";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";

interface TaskSubmission {
  _id: string;
  taskId: string;
  userId: string;
  teamId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
  submissionStatus: 'Pending' | 'Reviewed' | 'Approved' | 'Rejected';
  reviewComments?: string;
  createdAt: string;
}

interface Team {
  _id: string;
  name: string;
  teamLead: string;
  teamLeadContact: string;
  status: string;
}

export default function Reports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportPeriod, setReportPeriod] = useState("week");
  const [selectedTab, setSelectedTab] = useState("project");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string>("");
  
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
  });

  // Fetch all teams for supervisor
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: user?.role === "Supervisor",
  });

  // Fetch submissions for selected team
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['/api/teams', selectedTeam, 'submissions'],
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/teams/${selectedTeam}/submissions`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    enabled: user?.role === "Supervisor" && !!selectedTeam,
  });

  // Process data for Project Overview report
  const processedTasks = tasks.map(task => ({
    ...task,
    date: new Date(task.createdAt).toLocaleDateString()
  }));

  // Get unique dates
  const uniqueDates = [...new Set(processedTasks.map(task => task.date))];
  
  // Generate task completion data
  const taskCompletionData = uniqueDates.map(date => {
    const tasksOnDate = processedTasks.filter(task => task.date === date);
    const totalTasks = tasksOnDate.length;
    const completedTasks = tasksOnDate.filter(task => task.status === "Completed").length;
    
    return {
      date,
      total: totalTasks,
      completed: completedTasks,
      completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  });

  // Filter by recent period
  const getFilteredData = (data: any[], period: string) => {
    const now = new Date();
    let filterDate = new Date();
    
    switch(period) {
      case "week":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "month":
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        filterDate.setMonth(now.getMonth() - 3);
        break;
      default:
        filterDate.setDate(now.getDate() - 7);
    }
    
    return data.filter(item => new Date(item.date) >= filterDate);
  };

  const filteredTaskCompletionData = getFilteredData(taskCompletionData, reportPeriod);
  
  // Feature status data for pie chart
  const featureStatusCounts: Record<string, number> = {};
  features.forEach(feature => {
    featureStatusCounts[feature.feaStatus] = (featureStatusCounts[feature.feaStatus] || 0) + 1;
  });
  
  const featureStatusData = Object.entries(featureStatusCounts).map(([status, count]) => ({
    status,
    count
  }));
  
  // Team performance data
  const teamPerformanceData = fieldUsers.map(user => {
    const userTasks = tasks.filter(task => task.assignedTo === user.id);
    const completedTasks = userTasks.filter(task => task.status === "Completed").length;
    const inProgressTasks = userTasks.filter(task => task.status === "In Progress").length;
    
    return {
      name: user.name,
      assigned: userTasks.length,
      completed: completedTasks,
      inProgress: inProgressTasks,
      completionRate: userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#E0F7F6] to-[#EBF5F0] min-h-screen">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">Reports</h1>
          <div className="flex items-center space-x-2">
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                // This would generate a PDF or export data in a real application
                alert("Report export functionality would be implemented here");
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="project">Project Overview</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Total Tasks</p>
                    <p className="text-3xl font-bold">{tasks.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Features Tracked</p>
                    <p className="text-3xl font-bold">{features.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-3xl font-bold">
                      {tasks.length > 0
                        ? Math.round((tasks.filter(t => t.status === "Completed").length / tasks.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Field Teams</p>
                    <p className="text-3xl font-bold">{fieldUsers.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Rate</CardTitle>
                  <CardDescription>
                    Daily task completion rate over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ChartContainer>
                      <LineChart
                        data={filteredTaskCompletionData}
                        index="date"
                        categories={["completion_rate"]}
                        colors={["#1976D2"]}
                        valueFormatter={(value) => `${value}%`}
                        showLegend={false}
                        showYAxis={true}
                        showXAxis={true}
                        startEndOnly={filteredTaskCompletionData.length > 10}
                      />
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Feature Status Distribution</CardTitle>
                  <CardDescription>
                    Current status of all features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ChartContainer>
                      <PieChart
                        data={featureStatusData}
                        index="status"
                        category="count"
                        valueFormatter={(value) => `${value} features`}
                        colors={[
                          "#9E9E9E", // Unassigned
                          "#2196F3", // Assigned
                          "#9C27B0", // In Progress
                          "#4CAF50", // Completed
                          "#FFC107", // Incomplete
                          "#FF9800", // Submit-Review
                          "#8BC34A", // Review_Accepted
                          "#F44336", // Review_Reject
                          "#03A9F4"  // Review_inprogress
                        ]}
                      />
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Task completion rates by team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <BarChart
                      data={teamPerformanceData}
                      index="name"
                      categories={["completionRate"]}
                      colors={["#1976D2"]}
                      valueFormatter={(value) => `${value}%`}
                      showLegend={false}
                    />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>
                  Task assignment and completion by team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <BarChart
                      data={teamPerformanceData}
                      index="name"
                      categories={["assigned", "completed", "inProgress"]}
                      colors={["#9E9E9E", "#4CAF50", "#2196F3"]}
                      valueFormatter={(value) => `${value} tasks`}
                      stack
                    />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
