import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { getAllBoundaries, deleteBoundary } from '@/lib/api';
import FeatureIcon, { FeatureType } from '@/components/FeatureIcon';
import { Trash2, MapPin, Users, Calendar } from 'lucide-react';

// Boundary Management Component
function BoundaryManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: boundaries = [], isLoading } = useQuery({
    queryKey: ['/api/boundaries'],
    queryFn: getAllBoundaries
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBoundary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boundaries'] });
      toast({
        title: "Success",
        description: "Boundary deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete boundary",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (boundaryId: string, boundaryName: string) => {
    if (confirm(`Are you sure you want to delete the boundary "${boundaryName}"?`)) {
      deleteMutation.mutate(boundaryId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="text-gray-500">Loading boundaries...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Boundary Management
        </CardTitle>
        <CardDescription>
          View and manage boundary assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {boundaries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No boundaries found</p>
            <p className="text-sm mt-1">Create boundaries on the map to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {boundaries.map((boundary: any) => (
              <div key={boundary._id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{boundary.name}</h3>
                    {boundary.description && (
                      <p className="text-sm text-gray-600 mt-1">{boundary.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        boundary.status === 'Active' ? 'bg-green-100 text-green-800' :
                        boundary.status === 'New' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {boundary.status}
                      </span>
                      {boundary.assignedTo && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Assigned to: {boundary.assignedTo.name || boundary.assignedTo.username}</span>
                        </div>
                      )}
                      {boundary.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(boundary.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {boundary.geometry && (
                        <span>Type: {boundary.geometry.type}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/map?boundary=${boundary._id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      View on Map
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(boundary._id, boundary.name)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'teams' | 'boundaries'>('overview');

  // Read tab from URL on mount and handle browser navigation
  useEffect(() => {
    const getTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      
      // Validate tab parameter
      if (tabParam && ['overview', 'features', 'teams', 'boundaries'].includes(tabParam)) {
        return tabParam as 'overview' | 'features' | 'teams' | 'boundaries';
      }
      return 'overview'; // Default tab
    };

    // Set initial tab from URL
    const urlTab = getTabFromUrl();
    setActiveTab(urlTab);

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      const urlTab = getTabFromUrl();
      setActiveTab(urlTab);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Only run on mount

  // Listen for dashboard tab change events from sidebar
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      const { tab } = event.detail;
      if (tab && ['overview', 'features', 'teams', 'boundaries'].includes(tab)) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('dashboard-tab-change', handleTabChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('dashboard-tab-change', handleTabChangeEvent as EventListener);
    };
  }, []);

  // Update URL when tab changes (without causing loops)
  const handleTabChange = (newTab: 'overview' | 'features' | 'teams' | 'boundaries') => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      
      // Update URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.pushState({}, '', url.toString());
    }
  };

  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: features = [], refetch: refetchFeatures } = useQuery({ 
    queryKey: ['/api/features'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    select: (serverFeatures: any[]) => {
      // Ensure field users always see features they created OR assigned to their team OR within their assigned boundaries
      if (!user || user.role === 'Supervisor') return serverFeatures;
      try {
        const teamId = user.teamId?.toString();
        if (!teamId) return serverFeatures;
        // Pre-calc boundary ids from parcels assigned to team (already present in list)
        const teamParcels = serverFeatures.filter((f: any) => f.feaType === 'Parcel' && f.assignedTo?.toString() === teamId);
        const teamBoundaryIds = new Set(teamParcels.map((p: any) => p._id?.toString()).filter(Boolean));
        return serverFeatures.filter((f: any) => {
          const createdByTeam = f.teamId?.toString() === teamId;
          const assignedToTeam = f.assignedTo?.toString() === teamId;
          const inTeamBoundary = f.boundaryId && teamBoundaryIds.has(f.boundaryId.toString());
          return createdByTeam || assignedToTeam || inTeamBoundary;
        });
      } catch {
        return serverFeatures;
      }
    }
  });
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

  // Debug logging for towers issue
  console.log('Dashboard - Features data:', features);
  console.log('Dashboard - Total features:', (features as any[]).length);
  console.log('Dashboard - Tower features:', featureStats.towers);
  console.log('Dashboard - Current user:', user);

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

          {/* Area Features Overview - Same icons as supervisor dashboard */}
          <Card className="bg-white border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                Area Features Overview
              </CardTitle>
              <CardDescription>
                Features in your assigned boundary areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Feature Statistics Grid - Same as supervisor dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card 
                  className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => setLocation('/map?type=Tower')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 mx-auto mb-2">
                      <FeatureIcon type="Tower" status="unassigned" size={32} />
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      {(features as any[]).filter((feature: any) => 
                        feature.feaType === 'Tower' && 
                        feature.assignedTo?.toString() === user.teamId?.toString()
                      ).length}
                    </div>
                    <div className="text-xs text-gray-600">Towers</div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => setLocation('/map?type=Manhole')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 mx-auto mb-2">
                      <FeatureIcon type="Manhole" status="assigned" size={32} />
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      {(features as any[]).filter((feature: any) => 
                        feature.feaType === 'Manhole' && 
                        feature.assignedTo?.toString() === user.teamId?.toString()
                      ).length}
                    </div>
                    <div className="text-xs text-gray-600">Manholes</div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => setLocation('/map?type=FiberCable')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 mx-auto mb-2">
                      <FeatureIcon type="FiberCable" status="complete" size={32} />
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      {(features as any[]).filter((feature: any) => 
                        feature.feaType === 'FiberCable' && 
                        feature.assignedTo?.toString() === user.teamId?.toString()
                      ).length}
                    </div>
                    <div className="text-xs text-gray-600">Fiber Cables</div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => setLocation('/map?type=Parcel')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 mx-auto mb-2">
                      <FeatureIcon type="Parcel" status="delayed" size={32} />
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      {assignedBoundaries.length}
                    </div>
                    <div className="text-xs text-gray-600">Boundaries</div>
                  </CardContent>
                </Card>
              </div>
              
              {/* View All Features Button */}
              <div className="mt-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/features/all')}
                  className="text-[#1E5CB3] border-[#1E5CB3] hover:bg-[#1E5CB3] hover:text-white"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  View All Features on Map
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Boundaries Section - New for Field Users */}
          {assignedBoundaries.length > 0 && (
            <Card className="bg-white border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">
                  Assigned Boundaries
                </CardTitle>
                <CardDescription>
                  Boundary areas assigned to your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignedBoundaries.slice(0, 3).map((boundary: any) => (
                    <div key={boundary._id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{boundary.name}</h4>
                          {boundary.description && (
                            <p className="text-sm text-gray-600 mt-1">{boundary.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${
                              boundary.feaStatus === 'Active' ? 'bg-green-100 text-green-800' :
                              boundary.feaStatus === 'New' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {boundary.feaStatus}
                            </span>
                            <span>Type: {boundary.feaType}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/map?boundary=${boundary._id}`)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  ))}
                  {assignedBoundaries.length > 3 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation('/map?type=Parcel')}
                        className="text-[#1E5CB3] hover:text-[#0D2E5A]"
                      >
                        View all {assignedBoundaries.length} boundaries
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
              onClick={() => handleTabChange("overview")}
              size="sm"
              className="whitespace-nowrap"
            >
              Overview
            </Button>
            <Button 
              variant={activeTab === "features" ? "default" : "outline"}
              onClick={() => handleTabChange("features")}
              size="sm"
              className="whitespace-nowrap"
            >
              Features
            </Button>
            <Button 
              variant={activeTab === "boundaries" ? "default" : "outline"}
              onClick={() => handleTabChange("boundaries")}
              size="sm"
              className="whitespace-nowrap"
            >
              Boundaries
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

        {activeTab === "boundaries" && (
          <div className="space-y-4 md:space-y-6">
            <BoundaryManagement />
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
                    <FeatureIcon type="Tower" status="unassigned" size={32} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800">{featureStats.towers}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.towers')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/Manhole')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <FeatureIcon type="Manhole" status="assigned" size={32} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800">{featureStats.manholes}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.manholes')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/FiberCable')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <FeatureIcon type="FiberCable" status="complete" size={32} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800">{featureStats.fiberCables}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('features.fiberCables')}</div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" 
                onClick={() => setLocation('/features/Parcel')}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <FeatureIcon type="Parcel" status="delayed" size={32} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800">{featureStats.parcels}</div>
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
