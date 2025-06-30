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
    
    // Get team members count - all users (including inactive) with the same team name
    const currentUserTeam = teams.find((team: any) => team._id?.toString() === user.teamId?.toString());
    const teamMembers = allUsers.filter((u: any) => {
      // Find the team for this user
      const userTeamData = teams.find((team: any) => team._id?.toString() === u.teamId?.toString());
      
      // Match by team name, not team ID - includes all registered users with this team name
      return userTeamData?.name === currentUserTeam?.name;
    });
    const teamMembersCount = teamMembers.length;
    
    // Get tasks assigned to the team
    const teamTasks = tasks.filter((task: any) => task.assignedTo?.toString() === user.teamId?.toString());
    const totalTeamTasks = teamTasks.length;
    
    // Get boundaries assigned to this team (features with feaType === 'Parcel')
    const assignedBoundaries = features.filter((feature: any) => 
      feature.feaType === 'Parcel' && feature.assignedTo?.toString() === user.teamId?.toString()
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
                <p className="text-xs text-gray-500">Total registered members</p>
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
                          <span className="font-medium">Type:</span> {boundary.feaType}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Number:</span> {boundary.feaNo}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Status:</span> 
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                            boundary.feaStatus === 'Active' ? 'bg-green-100 text-green-800' :
                            boundary.feaStatus === 'New' ? 'bg-blue-100 text-blue-800' :
                            boundary.feaStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {boundary.feaStatus}
                          </span>
                        </p>
                        {boundary.specificType && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Type:</span> {boundary.specificType}
                          </p>
                        )}
                        {boundary.remarks && (
                          <p className="text-sm text-gray-500 mt-2">{boundary.remarks}</p>
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

        {/* Feature Overview Section - Similar to Supervisor Dashboard */}
        <Card className="bg-white border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] text-white">
            <CardTitle className="text-white">Area Features Overview</CardTitle>
            <CardDescription className="text-gray-100">
              Features within your assigned boundary areas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {assignedBoundaries.length > 0 ? (
              <div className="space-y-6">
                {assignedBoundaries.map((boundary: any) => {
                  // Get features within this boundary area (features with matching boundaryId)
                  const boundaryFeatures = features.filter((feature: any) => 
                    feature.boundaryId?.toString() === boundary._id?.toString()
                  );
                  
                  const boundaryStats = {
                    towers: boundaryFeatures.filter((f: any) => f.feaType === 'Tower').length,
                    manholes: boundaryFeatures.filter((f: any) => f.feaType === 'Manhole').length,
                    fiberCables: boundaryFeatures.filter((f: any) => f.feaType === 'FiberCable').length,
                    parcels: boundaryFeatures.filter((f: any) => f.feaType === 'Parcel').length
                  };
                  
                  return (
                    <div key={boundary._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-[#1E5CB3]">{boundary.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Area #{boundary.feaNo}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            boundary.feaStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                            boundary.feaStatus === 'InProgress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {boundary.feaStatus}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="w-8 h-8 mx-auto mb-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 w-full h-full">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                              <path d="M2 17l10 5 10-5"/>
                              <path d="M2 12l10 5 10-5"/>
                            </svg>
                          </div>
                          <div className="text-2xl font-bold text-red-600">{boundaryStats.towers}</div>
                          <div className="text-sm text-gray-600">Towers</div>
                        </div>
                        
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="w-8 h-8 mx-auto mb-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 w-full h-full">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">{boundaryStats.manholes}</div>
                          <div className="text-sm text-gray-600">Manholes</div>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="w-8 h-8 mx-auto mb-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 w-full h-full">
                              <path d="M8 2v4"/>
                              <path d="M16 2v4"/>
                              <path d="M21 6H3"/>
                              <path d="M21 6v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6"/>
                            </svg>
                          </div>
                          <div className="text-2xl font-bold text-green-600">{boundaryStats.fiberCables}</div>
                          <div className="text-sm text-gray-600">Cables</div>
                        </div>
                        
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-8 h-8 mx-auto mb-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 w-full h-full">
                              <path d="M3 3h18v18H3z"/>
                              <path d="M9 9h6v6H9z"/>
                            </svg>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">{boundaryStats.parcels}</div>
                          <div className="text-sm text-gray-600">Parcels</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Features in Area:</span>
                          <span className="font-semibold text-[#1E5CB3] text-lg">
                            {boundaryStats.towers + boundaryStats.manholes + boundaryStats.fiberCables + boundaryStats.parcels}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="w-20 h-20 mx-auto mb-4 text-gray-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">No Assigned Boundaries</p>
                <p className="text-sm">Your team hasn't been assigned any boundary areas yet.</p>
                <p className="text-xs text-gray-400 mt-1">Contact your supervisor for area assignments.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Creation Section */}
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
              Quick Actions
            </CardTitle>
            <CardDescription>
              Create infrastructure features within your assigned areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => setLocation('/map')}
                  className="bg-[#1E5CB3] hover:bg-[#0D2E5A] text-white py-3 h-auto flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">Open Map View</div>
                    <div className="text-xs opacity-75">Add features to your areas</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => setLocation('/tasks')}
                  variant="outline"
                  className="border-[#1E5CB3] text-[#1E5CB3] hover:bg-[#1E5CB3] hover:text-white py-3 h-auto flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">View All Tasks</div>
                    <div className="text-xs opacity-75">Check assigned work</div>
                  </div>
                </Button>
              </div>

              {/* Feature Type Statistics */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Towers</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {features.filter((f: any) => f.feaType === 'Tower').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Manholes</p>
                      <p className="text-2xl font-bold text-green-900">
                        {features.filter((f: any) => f.feaType === 'Manhole').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Fiber Cables</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {features.filter((f: any) => f.feaType === 'FiberCable').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Equipment</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {features.filter((f: any) => f.feaType === 'Equipment').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* MapView Button */}
              <div className="pt-4 border-t">
                <Button 
                  className="w-full bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] hover:from-[#1a4d9e] hover:to-[#0a2347] text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                  onClick={() => setLocation('/map')}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Open Map to Add Features
                </Button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Create new infrastructure features within your assigned boundary areas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          {user.role === "Supervisor" && (
            <Button 
              variant={activeTab === "features" ? "default" : "outline"}
              onClick={() => setActiveTab("features")}
              size="sm"
            >
              Features
            </Button>
          )}
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
            
            {user.role === "Supervisor" && (
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
            )}
            
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-600 mr-3">
                          <path d="M7.5 4C7.5 2.34315 8.84315 1 10.5 1H13.5C15.1569 1 16.5 2.34315 16.5 4V5H18C18.5523 5 19 5.44772 19 6C19 6.55228 18.5523 7 18 7H16.5V9H18C18.5523 9 19 9.44772 19 10C19 10.5523 18.5523 11 18 11H16.5V13H18C18.5523 13 19 13.4477 19 14C19 14.5523 18.5523 15 18 15H16.5V17H18C18.5523 17 19 17.4477 19 18C19 18.5523 18.5523 19 18 19H16.5V21C16.5 21.5523 16.0523 22 15.5 22H8.5C7.94772 22 7.5 21.5523 7.5 21V19H6C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17H7.5V15H6C5.44772 15 5 14.5523 5 14C5 13.4477 5.44772 13 6 13H7.5V11H6C5.44772 11 5 10.5523 5 10C5 9.44772 5.44772 9 6 9H7.5V7H6C5.44772 7 5 6.55228 5 6C5 5.44772 5.44772 5 6 5H7.5V4ZM10.5 3C9.94772 3 9.5 3.44772 9.5 4V21H14.5V4C14.5 3.44772 14.0523 3 13.5 3H10.5Z"/>
                        </svg>
                        <span className="font-medium">Towers</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.towers}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600 mr-3">
                          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20ZM12 6C8.69 6 6 8.69 6 12S8.69 18 12 18 18 15.31 18 12 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12S9.79 8 12 8 16 9.79 16 12 14.21 16 12 16Z"/>
                        </svg>
                        <span className="font-medium">Manholes</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.manholes}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600 mr-3">
                          <path d="M20 5H4C2.9 5 2 5.9 2 7V17C2 18.1 2.9 19 4 19H20C21.1 19 22 18.1 22 17V7C22 5.9 21.1 5 20 5ZM20 17H4V7H20V17ZM6 9H8V15H6V9ZM10 9H12V15H10V9ZM14 9H16V15H14V9ZM18 9H20V15H18V9Z"/>
                        </svg>
                        <span className="font-medium">Fiber Cables</span>
                      </div>
                      <span className="tabular-nums font-semibold">{featureStats.fiberCables}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600 mr-3">
                          <path d="M3 3H21V21H3V3ZM5 5V19H19V5H5ZM7 7H17V17H7V7ZM9 9V15H15V9H9Z"/>
                        </svg>
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