import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import FeatureCreationWorkflow from "./FeatureCreationWorkflow";
import { getAllFeatures, getAllBoundaries } from "@/lib/api";

export default function SideNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Feature creation workflow state
  const [featureCreationWorkflowOpen, setFeatureCreationWorkflowOpen] = useState(false);

  if (!user) return null;

  // Fetch feature templates for supervisor sidebar
  const { data: featureTemplates = [] } = useQuery({
    queryKey: ["/api/feature-templates"],
    enabled: user?.role === "Supervisor",
  });

  // Fetch all features and boundaries for detailed sidebar display
  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
    enabled: user?.role === "Supervisor",
  });

  const { data: boundaries = [] } = useQuery({
    queryKey: ["/api/boundaries"],
    queryFn: getAllBoundaries,
    enabled: user?.role === "Supervisor",
  });

  // Group features by type
  const featuresByType = {
    Tower: features.filter((f: any) => f.feaType === 'Tower'),
    Manhole: features.filter((f: any) => f.feaType === 'Manhole'),
    FiberCable: features.filter((f: any) => f.feaType === 'FiberCable'),
    Parcel: features.filter((f: any) => f.feaType === 'Parcel'),
  };

  // Get boundaries (which are basically Parcel features with assignedTo)
  const boundaryFeatures = boundaries.filter((b: any) => b.assignedTo);

  // Handle feature creation completion
  const handleFeatureCreated = (newTemplate: any) => {
    toast({
      title: "Feature Template Created",
      description: `"${newTemplate.name}" template is ready to use on the map.`,
    });
    // Refresh feature templates data
    queryClient.invalidateQueries({ queryKey: ["/api/feature-templates"] });
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navigationItems = [
    {
      name: t('navigation.dashboard'),
      path: "/",
      icon: "ri-dashboard-line",
    },
    {
      name: t('navigation.map'),
      path: "/map",
      icon: "ri-map-pin-line",
    },
    {
      name: t('navigation.tasks'),
      path: "/tasks",
      icon: "ri-task-line",
    },
    {
      name: t('navigation.teams'),
      path: "/teams",
      icon: "ri-team-line",
    },
    {
      name: user.role === "Field" ? t('navigation.submissions') : t('navigation.reports'),
      path: user.role === "Field" ? "/submissions" : "/reports",
      icon: user.role === "Field" ? "ri-upload-line" : "ri-file-chart-line",
    },
  ];

  const featureTypes = [
    { 
      name: "Towers", 
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 10 10"
          stroke="currentColor"
          fill="none"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="0.5" x2="5" y2="1" />
          <path d="M3 9 L5 1 L7 9" />
          <line x1="3" y1="9" x2="7" y2="9" />
          <line x1="3.5" y1="7" x2="6.5" y2="7" />
          <line x1="4" y1="5" x2="6" y2="5" />
          <line x1="4.5" y1="3" x2="5.5" y2="3" />
        </svg>
      )
    },
    { 
      name: "Manholes", 
      icon: (
        <svg width="16" height="16" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" fill="none" strokeWidth={1} strokeLinecap="square" />
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth={1} strokeLinecap="square" />
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth={1} strokeLinecap="square" />
        </svg>
      )
    },
    { 
      name: "Fiber Cables", 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 5H4C2.9 5 2 5.9 2 7V17C2 18.1 2.9 19 4 19H20C21.1 19 22 18.1 22 17V7C22 5.9 21.1 5 20 5ZM20 17H4V7H20V17ZM6 9H8V15H6V9ZM10 9H12V15H10V9ZM14 9H16V15H14V9ZM18 9H20V15H18V9Z"/>
        </svg>
      )
    },
    { 
      name: "Parcels", 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3H21V21H3V3ZM5 5V19H19V5H5ZM7 7H17V17H7V7ZM9 9V15H15V9H9Z"/>
        </svg>
      )
    },
  ];

  // Handle navigation item click for mobile
  const handleNavClick = (path: string) => {
    setLocation(path);
    
    // Close mobile sidebar after navigation
    const sidebar = document.getElementById("side-nav");
    const overlay = document.getElementById("mobile-nav-overlay");
    
    if (sidebar && window.innerWidth < 768) { // md breakpoint
      sidebar.classList.add("hidden");
      sidebar.classList.remove("block");
      
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }
  };

  // Special handler for Boundaries navigation
  const handleBoundariesClick = () => {
    // Check if we're already on the dashboard
    if (location === "/" || location === "/dashboard") {
      // If on dashboard, just update the tab parameter
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'boundaries');
      window.history.pushState({}, '', url.toString());
      
      // Dispatch a custom event to notify the Dashboard component
      window.dispatchEvent(new CustomEvent('dashboard-tab-change', { 
        detail: { tab: 'boundaries' } 
      }));
    } else {
      // If not on dashboard, navigate to dashboard with boundaries tab
      setLocation('/dashboard?tab=boundaries');
    }
    
    // Close mobile sidebar after navigation
    const sidebar = document.getElementById("side-nav");
    const overlay = document.getElementById("mobile-nav-overlay");
    
    if (sidebar && window.innerWidth < 768) { // md breakpoint
      sidebar.classList.add("hidden");
      sidebar.classList.remove("block");
      
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }
  };

  return (
    <div 
      id="side-nav" 
      className="hidden md:block fixed md:relative top-0 left-0 h-full w-64 bg-white border-r border-neutral-200 flex-shrink-0 z-50 md:z-30"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 mb-2">
          <div className="bg-primary-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <i className="ri-map-2-line text-xl text-primary-500"></i>
              </div>
              <div>
                <p className="text-sm font-medium">Project Fiber Network</p>
                <p className="text-xs text-neutral-500">Active since June 2023</p>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1 px-3 pb-4 overflow-y-auto">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive(item.path) && "bg-primary-50 text-primary-700"
              )}
              onClick={() => handleNavClick(item.path)}
            >
              <i className={`${item.icon} text-lg mr-3`}></i>
              <span>{item.name}</span>
            </Button>
          ))}
          
          {user.role === "Supervisor" && (
            <div className="pt-3 mt-3 border-t border-neutral-200">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Features ({features.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-primary-50 hover:text-primary-600"
                  onClick={() => setFeatureCreationWorkflowOpen(true)}
                  title="Create new feature"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
              
              {/* Feature Types - Simple List with Counts */}
              <div className="mt-2 space-y-1">
                {Object.entries(featuresByType).map(([type, typeFeatures]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50"
                    onClick={() => handleNavClick(`/features/${type.toLowerCase()}`)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        {featureTypes.find(ft => ft.name.includes(type))?.icon}
                        <span className="text-sm font-medium">{type}s</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {typeFeatures.length}
                      </Badge>
                    </div>
                  </Button>
                ))}
                
                {/* Boundaries Section - FIXED WITH SPECIAL HANDLER */}
                {boundaryFeatures.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50 border-t border-gray-100 mt-2 pt-3"
                    onClick={handleBoundariesClick}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 3H21V21H3V3ZM5 5V19H19V5H5ZM7 7H17V17H7V7ZM9 9V15H15V9H9Z"/>
                        </svg>
                        <span className="text-sm font-medium">Boundaries</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {boundaryFeatures.length}
                      </Badge>
                    </div>
                  </Button>
                )}
                
                {features.length === 0 && (
                  <div className="px-3 py-4 text-xs text-neutral-500 text-center">
                    No features found. Create features on the map to see them here.
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavClick("/settings")}
          >
            <i className="ri-settings-3-line mr-2"></i>
            <span className="text-sm">Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start mt-2"
            onClick={() => handleNavClick("/help")}
          >
            <i className="ri-question-line mr-2"></i>
            <span className="text-sm">Help & Support</span>
          </Button>
        </div>
      </div>

      {/* Feature Creation Workflow */}
      <FeatureCreationWorkflow
        open={featureCreationWorkflowOpen}
        onOpenChange={setFeatureCreationWorkflowOpen}
        onFeatureCreated={handleFeatureCreated}
      />
    </div>
  );
}
