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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.5 4C7.5 2.34315 8.84315 1 10.5 1H13.5C15.1569 1 16.5 2.34315 16.5 4V5H18C18.5523 5 19 5.44772 19 6C19 6.55228 18.5523 7 18 7H16.5V9H18C18.5523 9 19 9.44772 19 10C19 10.5523 18.5523 11 18 11H16.5V13H18C18.5523 13 19 13.4477 19 14C19 14.5523 18.5523 15 18 15H16.5V17H18C18.5523 17 19 17.4477 19 18C19 18.5523 18.5523 19 18 19H16.5V21C16.5 21.5523 16.0523 22 15.5 22H8.5C7.94772 22 7.5 21.5523 7.5 21V19H6C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17H7.5V15H6C5.44772 15 5 14.5523 5 14C5 13.4477 5.44772 13 6 13H7.5V11H6C5.44772 11 5 10.5523 5 10C5 9.44772 5.44772 9 6 9H7.5V7H6C5.44772 7 5 6.55228 5 6C5 5.44772 5.44772 5 6 5H7.5V4ZM10.5 3C9.94772 3 9.5 3.44772 9.5 4V21H14.5V4C14.5 3.44772 14.0523 3 13.5 3H10.5Z"/>
        </svg>
      )
    },
    { 
      name: "Manholes", 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20ZM12 6C8.69 6 6 8.69 6 12S8.69 18 12 18 18 15.31 18 12 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12S9.79 8 12 8 16 9.79 16 12 14.21 16 12 16Z"/>
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

  return (
    <div id="side-nav" className="hidden md:block w-64 bg-white border-r border-neutral-200 flex-shrink-0 z-30">
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
              onClick={() => setLocation(item.path)}
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
                    onClick={() => setLocation(`/features/${type.toLowerCase()}`)}
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
                
                {/* Boundaries Section */}
                {boundaryFeatures.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50 border-t border-gray-100 mt-2 pt-3"
                    onClick={() => toast({
                      title: "Boundaries Management",
                      description: "View all boundary assignments and details",
                    })}
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
            onClick={() => setLocation("/settings")}
          >
            <i className="ri-settings-3-line mr-2"></i>
            <span className="text-sm">Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start mt-2"
            onClick={() => setLocation("/help")}
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
