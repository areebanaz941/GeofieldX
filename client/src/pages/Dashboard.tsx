import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: features = [] } = useQuery({ queryKey: ['/api/features'] });
  const { data: teams = [] } = useQuery({ queryKey: ['/api/teams'] });
  const { data: fieldUsers = [] } = useQuery({ queryKey: ['/api/users/field'] });
  const { data: allUsers = [] } = useQuery({ queryKey: ['/api/users'] });
  const { data: boundaries = [] } = useQuery({ queryKey: ['/api/boundaries'] });

  // Task statistics calculation
  const taskStats = {
    total: (tasks as any[]).length,
    unassigned: (tasks as any[]).filter((task: any) => !task.assignedTo).length,
    inProgress: (tasks as any[]).filter((task: any) => task.status === 'In Progress').length,
    completed: (tasks as any[]).filter((task: any) => task.status === 'Completed').length,
    pending: (tasks as any[]).filter((task: any) => task.status === 'Pending').length
  };

  // Feature statistics calculation
  const featureStats = {
    towers: (features as any[]).filter((feature: any) => feature.feaType === 'Tower').length,
    manholes: (features as any[]).filter((feature: any) => feature.feaType === 'Manhole').length,
    fiberCables: (features as any[]).filter((feature: any) => feature.feaType === 'FiberCable').length,
    parcels: (features as any[]).filter((feature: any) => feature.feaType === 'Parcel').length
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
    const userTeam = (teams as any[]).find((team: any) => team._id?.toString() === user.teamId?.toString());
    
    // Get team members count - all users (including inactive) with the same team name
    const currentUserTeam = (teams as any[]).find((team: any) => team._id?.toString() === user.teamId?.toString());
    const teamMembers = (allUsers as any[]).filter((u: any) => {
      // Find the team for this user
      const userTeamData = (teams as any[]).find((team: any) => team._id?.toString() === u.teamId?.toString());
      
      // Match by team name, not team ID - includes all registered users with this team name
      return userTeamData?.name === currentUserTeam?.name;
    });
    const teamMembersCount = teamMembers.length;
    
    // Get tasks assigned to the team
    const teamTasks = (tasks as any[]).filter((task: any) => task.assignedTo?.toString() === user.teamId?.toString());
    const totalTeamTasks = teamTasks.length;
    
    // Get boundaries assigned to this team (features with feaType === 'Parcel')
    const assignedBoundaries = (features as any[]).filter((feature: any) => 
      feature.feaType === 'Parcel' && feature.assignedTo?.toString() === user.teamId?.toString()
    );
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 max-w-7xl space-y-4 md:space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
              Field Team Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome back, {user.username}</p>
            <div className="flex justify-center">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[#1E5CB3] text-white">
                Team: {userTeam?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Team Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Team Members */}
            <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E5CB3] rounded-full"></div>
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">Team Members</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {teamMembersCount}
                  </p>
                  <p className="text-xs text-gray-500">Total registered members</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Total Tasks */}
            <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E5CB3] rounded-full"></div>
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">Assigned Tasks</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {totalTeamTasks}
                  </p>
                  <p className="text-xs text-gray-500">Team tasks total</p>
                </div>
              </CardContent>
            </Card>
            
            {/* My Personal Tasks */}
            <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E5CB3] rounded-full"></div>
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">My Tasks</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                    {(tasks as any[]).filter((task: any) => task.assignedTo === user._id).length}
                  </p>
                  <p className="text-xs text-gray-500">Personal assignments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access key features for field operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Button
                  onClick={() => setLocation('/map')}
                  className="bg-[#1E5CB3] hover:bg-[#0D2E5A] text-white py-4 h-auto flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Open Map View</div>
                    <div className="text-xs opacity-75">Add features to your areas</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => setLocation('/tasks')}
                  variant="outline"
                  className="border-[#1E5CB3] text-[#1E5CB3] hover:bg-[#1E5CB3] hover:text-white py-4 h-auto flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold text-sm">View All Tasks</div>
                    <div className="text-xs opacity-75">Check assigned work</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Supervisor Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 max-w-7xl space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto">
            <Button 
              variant={activeTab === "overview" ? "default" : "outline"}
              onClick={() => setActiveTab("overview")}
              size="sm"
              className="whitespace-nowrap"
            >
              Overview
            </Button>
            <Button 
              variant={activeTab === "features" ? "default" : "outline"}
              onClick={() => setActiveTab("features")}
              size="sm"
              className="whitespace-nowrap"
            >
              Features
            </Button>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4 md:space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">{t('dashboard.totalTasks')}</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                      {(tasks as any[]).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">{t('dashboard.featuresTracked')}</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                      {(features as any[]).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">{t('dashboard.fieldTeams')}</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                      {(teams as any[]).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-[#1E5CB3] font-medium">Field Users</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                      {(fieldUsers as any[]).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tasks */}
            <Card className="bg-white border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                  {t('dashboard.recentTasks')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.recentTasksDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(tasks as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(tasks as any[]).slice(0, 5).map((task: any) => (
                      <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                          <p className="text-sm text-gray-500 truncate">{task.description}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('dashboard.noTasksFound')}</p>
                    <p className="text-sm mt-1">{t('dashboard.createTasksToGetStarted')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-4 md:space-y-6">
            {/* Feature Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/Tower')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 w-full h-full">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{featureStats.towers}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.towers')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/Manhole')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 w-full h-full">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{featureStats.manholes}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.manholes')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/FiberCable')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 w-full h-full">
                      <path d="M8 2v4"/>
                      <path d="M16 2v4"/>
                      <path d="M21 6H3"/>
                      <path d="M21 6v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6"/>
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{featureStats.fiberCables}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.fiberCables')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/Parcel')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 w-full h-full">
                      <path d="M3 3h18v18H3z"/>
                      <path d="M9 9h6v6H9z"/>
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{featureStats.parcels}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.parcels')}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}