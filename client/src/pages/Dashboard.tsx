import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: features = [] } = useQuery({ queryKey: ['/api/features'] });
  const { data: teams = [] } = useQuery({ queryKey: ['/api/teams'] });
  const { data: fieldUsers = [] } = useQuery({ queryKey: ['/api/users/field'] });
  const { data: boundaries = [] } = useQuery({ queryKey: ['/api/boundaries'] });

  // Task statistics calculation
  const taskStats = {
    total: tasks.length,
    unassigned: tasks.filter((task: any) => !task.assignedTo).length,
    inProgress: tasks.filter((task: any) => task.status === 'In Progress').length,
    completed: tasks.filter((task: any) => task.status === 'Completed').length,
    pending: tasks.filter((task: any) => task.status === 'Pending').length
  };

  // Feature statistics calculation
  const featureStats = {
    towers: features.filter((feature: any) => feature.feaType === 'Tower').length,
    manholes: features.filter((feature: any) => feature.feaType === 'Manhole').length,
    fiberCables: features.filter((feature: any) => feature.feaType === 'FiberCable').length,
    parcels: features.filter((feature: any) => feature.feaType === 'Parcel').length
  };

  // Loading state for field users only
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E5CB3]"></div>
      </div>
    );
  }

  // Field user dashboard - comprehensive team view
  if (user.role === 'Field') {
    // Find user's team
    const userTeam = teams.find((team: any) => team._id?.toString() === user.teamId?.toString());
    
    // Get team members count
    const teamMembers = fieldUsers.filter((u: any) => u.teamId?.toString() === user.teamId?.toString());
    const teamMembersCount = teamMembers.length;
    
    // Get tasks assigned to the team
    const teamTasks = tasks.filter((task: any) => task.assignedTo?.toString() === user.teamId?.toString());
    const totalTeamTasks = teamTasks.length;
    
    // Get boundaries assigned to this team
    const assignedBoundaries = boundaries.filter((boundary: any) => 
      boundary.assignedTo?.toString() === user.teamId?.toString()
    );
    
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent mb-4">
            Field Team Dashboard
          </h1>
          <p className="text-gray-600">Welcome back, {user.username}</p>
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#1E5CB3] text-white">
              Team: {userTeam?.name || 'Unassigned'}
            </span>
          </div>
        </div>
        
        {/* Team Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Members */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-[#1E5CB3] font-medium">Team Members</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                  {teamMembersCount}
                </p>
                <p className="text-xs text-gray-500">Total active members</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Total Tasks */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-[#1E5CB3] font-medium">Assigned Tasks</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                  {totalTeamTasks}
                </p>
                <p className="text-xs text-gray-500">Team tasks total</p>
              </div>
            </CardContent>
          </Card>
          
          {/* My Personal Tasks */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-[#1E5CB3] font-medium">My Tasks</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                  {tasks.filter((task: any) => task.assignedTo === user._id).length}
                </p>
                <p className="text-xs text-gray-500">Personal assignments</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Assigned Boundaries Section */}
        {assignedBoundaries.length > 0 && (
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                Assigned Boundary Areas
              </CardTitle>
              <CardDescription>
                Areas assigned to your team for field operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignedBoundaries.map((boundary: any, index: number) => (
                  <div key={boundary._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {boundary.name || `Boundary Area ${index + 1}`}
                      </h4>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Category:</span> {boundary.category || 'General Area'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Status:</span> 
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                            boundary.status === 'Active' ? 'bg-green-100 text-green-800' :
                            boundary.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {boundary.status}
                          </span>
                        </p>
                        {boundary.description && (
                          <p className="text-sm text-gray-500 mt-2">{boundary.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* No Boundaries Message */}
        {assignedBoundaries.length === 0 && (
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <p className="text-gray-500">No boundary areas assigned to your team yet.</p>
                <p className="text-sm text-gray-400">Contact your supervisor for area assignments.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
          {t('dashboard.title')}
        </h1>
        <div className="flex gap-2 sm:gap-4">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            size="sm"
          >
            Overview
          </Button>
          <Button 
            variant={activeTab === "features" ? "default" : "outline"}
            onClick={() => setActiveTab("features")}
            size="sm"
          >
            Features
          </Button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <p className="text-sm text-[#1E5CB3] font-medium">{t('dashboard.totalTasks')}</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {tasks.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <p className="text-sm text-[#1E5CB3] font-medium">{t('dashboard.totalFeatures')}</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {features.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <p className="text-sm text-[#1E5CB3] font-medium">{t('dashboard.totalTeams')}</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {teams.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <p className="text-sm text-[#1E5CB3] font-medium">Field Teams</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {fieldUsers.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] text-white">
                <CardTitle className="text-white">Task Status Distribution</CardTitle>
                <CardDescription className="text-gray-100">
                  Overview of current task statuses
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {taskStats.total > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gray-400 mr-3"></div>
                        <span className="font-medium">Unassigned</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <div 
                            className="h-full bg-gray-400" 
                            style={{width: `${Math.round((taskStats.unassigned / taskStats.total) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="tabular-nums">
                          {taskStats.unassigned} ({Math.round((taskStats.unassigned / taskStats.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                        <span className="font-medium">In Progress</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{width: `${Math.round((taskStats.inProgress / taskStats.total) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="tabular-nums">
                          {taskStats.inProgress} ({Math.round((taskStats.inProgress / taskStats.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
                        <span className="font-medium">Completed</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <div 
                            className="h-full bg-green-500" 
                            style={{width: `${Math.round((taskStats.completed / taskStats.total) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="tabular-nums">
                          {taskStats.completed} ({Math.round((taskStats.completed / taskStats.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-yellow-500 mr-3"></div>
                        <span className="font-medium">Pending</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <div 
                            className="h-full bg-yellow-500" 
                            style={{width: `${Math.round((taskStats.pending / taskStats.total) * 100)}%`}}
                          ></div>
                        </div>
                        <span className="tabular-nums">
                          {taskStats.pending} ({Math.round((taskStats.pending / taskStats.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p>No tasks available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] text-white">
                <CardTitle className="text-white">Feature Distribution</CardTitle>
                <CardDescription className="text-gray-100">
                  Overview of infrastructure features
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {features.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-red-500 mr-3"></div>
                        <span className="font-medium">Towers</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.towers}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                        <span className="font-medium">Manholes</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.manholes}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
                        <span className="font-medium">Fiber Cables</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.fiberCables}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-purple-500 mr-3"></div>
                        <span className="font-medium">Land Parcels</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.parcels}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p>No features available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "features" && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] text-white">
              <CardTitle className="text-white">Features Overview</CardTitle>
              <CardDescription className="text-gray-100">
                Geographic features in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-10 text-gray-500">
                <p>Feature details view</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}