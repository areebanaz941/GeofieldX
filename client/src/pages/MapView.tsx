import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import OpenLayersMap from "@/lib/OpenLayersMap";
import MapFilterControls from "@/components/MapFilterControls";
import MapLegend from "@/components/MapLegend";

import TaskPanel from "@/components/TaskPanel";
import CreateFeatureModal from "@/components/CreateFeatureModal";
import SupervisorPolygonModal from "@/components/SupervisorPolygonModal";
import PointFeatureModal from "@/components/PointFeatureModal";
import LineFeatureModal from "@/components/LineFeatureModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import AdvancedSearchModal from "@/components/AdvancedSearchModal";
import FeatureAssignmentModal from "@/components/FeatureAssignmentModal";
import BoundaryAssignmentModal from "@/components/BoundaryAssignmentModal";
import FeatureSelectionDialog from "@/components/FeatureSelectionDialog";

import { FeatureDetailsModal } from "@/components/FeatureDetailsModal";
import { EditFeatureModal } from "@/components/EditFeatureModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAllFeatures, getAllTasks, getFieldUsers, getAllBoundaries, updateUserLocation, createParcel } from "@/lib/api";
import { IFeature, ITask, IUser, IBoundary } from "../../../shared/schema";

export default function MapView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<string[]>(["All"]);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<IUser | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [taskPanelExpanded, setTaskPanelExpanded] = useState(true);
  const [createFeatureModalOpen, setCreateFeatureModalOpen] = useState(false);
  const [pointFeatureModalOpen, setPointFeatureModalOpen] = useState(false);
  const [lineFeatureModalOpen, setLineFeatureModalOpen] = useState(false);
  const [pointSelectionMode, setPointSelectionMode] = useState(false);
  const [lineDrawingMode, setLineDrawingMode] = useState(false);
  const [linePoints, setLinePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [advancedSearchModalOpen, setAdvancedSearchModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ coordinates: number[][][] } | null>(null);
  const [clearPolygon, setClearPolygon] = useState(false);
  const [featureAssignmentModalOpen, setFeatureAssignmentModalOpen] = useState(false);
  const [boundaryAssignmentModalOpen, setBoundaryAssignmentModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [selectedBoundary, setSelectedBoundary] = useState<any | null>(null);
  const [featureDetailsModalOpen, setFeatureDetailsModalOpen] = useState(false);
  const [clickedFeature, setClickedFeature] = useState<IFeature | null>(null);
  const [editFeatureModalOpen, setEditFeatureModalOpen] = useState(false);
  const [featureToEdit, setFeatureToEdit] = useState<IFeature | null>(null);
  
  // Feature selection dialog state
  const [featureSelectionOpen, setFeatureSelectionOpen] = useState(false);
  const [selectedFeatureType, setSelectedFeatureType] = useState<string>('');
  const [supervisorPolygonModalOpen, setSupervisorPolygonModalOpen] = useState(false);
  
  // Feature creation workflow state (moved to sidebar)
  // const [featureCreationWorkflowOpen, setFeatureCreationWorkflowOpen] = useState(false);
  
  // Fetch data
  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });
  
  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  const { data: boundaries = [] } = useQuery({
    queryKey: ["/api/boundaries"],
    queryFn: getAllBoundaries,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
  });

  // Fetch feature templates for creating features on map
  const { data: featureTemplates = [] } = useQuery({
    queryKey: ["/api/feature-templates"],
    enabled: user?.role === "Supervisor",
  });

  // Update user location
  const updateLocationMutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => 
      updateUserLocation(lat, lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/field"] });
    },
  });

  // Create parcel mutation
  const createParcelMutation = useMutation({
    mutationFn: createParcel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boundaries"] });
      toast({
        title: "Success",
        description: "Parcel created successfully"
      });
      setDrawingMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create parcel",
        variant: "destructive"
      });
    }
  });

  // Update user's location periodically
  useEffect(() => {
    if (!user) return;
    
    // Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocationMutation.mutate({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
      
      // Set up periodic location updates
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            updateLocationMutation.mutate({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.error("Geolocation error:", error);
          }
        );
      }, 5 * 60 * 1000); // Update every 5 minutes
      
      return () => clearInterval(intervalId);
    }
  }, [user]);

  // Check if a point is within assigned boundaries for field users
  const isPointInAssignedBoundary = (latlng: { lat: number; lng: number }) => {
    if (user?.role === "Supervisor") return true; // Supervisors can create anywhere
    
    // For field users, check if point is within assigned boundary
    for (const boundary of boundaries) {
      if (boundary.geometry) {
        try {
          const geometry = typeof boundary.geometry === 'string' 
            ? JSON.parse(boundary.geometry) 
            : boundary.geometry;
            
          if (geometry.type === "Polygon") {
            const coords = geometry.coordinates[0];
            // Point-in-polygon check using ray casting algorithm
            let inside = false;
            for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
              const xi = coords[i][0], yi = coords[i][1];
              const xj = coords[j][0], yj = coords[j][1];
              
              if (((yi > latlng.lat) !== (yj > latlng.lat)) &&
                  (latlng.lng < (xj - xi) * (latlng.lat - yi) / (yj - yi) + xi)) {
                inside = !inside;
              }
            }
            if (inside) return true;
          }
        } catch (error) {
          console.error('Error parsing boundary geometry:', error);
        }
      }
    }
    return false;
  };

  // Check if a polygon is within assigned boundaries for field users
  const isPolygonInAssignedBoundary = (polygonCoords: number[][][]) => {
    if (user?.role === "Supervisor") return true; // Supervisors can create anywhere
    
    // For field users, check if all polygon points are within assigned boundary
    if (boundaries.length === 0) {
      // If no boundaries assigned, allow creation for now (will be handled by backend)
      return true;
    }
    
    const boundary = boundaries[0];
    if (!boundary.geometry) return false;
    
    try {
      const geometry = typeof boundary.geometry === 'string' 
        ? JSON.parse(boundary.geometry) 
        : boundary.geometry;
        
      if (geometry.type === "Polygon") {
        const boundaryCoords = geometry.coordinates[0];
        const drawnCoords = polygonCoords[0]; // First ring of drawn polygon
        
        // Check if all points of the drawn polygon are within the boundary
        return drawnCoords.every(([lng, lat]) => {
          let inside = false;
          for (let i = 0, j = boundaryCoords.length - 1; i < boundaryCoords.length; j = i++) {
            const xi = boundaryCoords[i][0], yi = boundaryCoords[i][1];
            const xj = boundaryCoords[j][0], yj = boundaryCoords[j][1];
            
            if (((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
              inside = !inside;
            }
          }
          return inside;
        });
      }
    } catch (error) {
      console.error('Error validating polygon:', error);
    }
    
    return false;
  };

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    // Handle point feature selection - called from Draw interaction
    if (pointSelectionMode) {
      // Check boundary restrictions for field users
      if (!isPointInAssignedBoundary(latlng)) {
        toast({
          title: "Location Restricted",
          description: "You can only create features within your assigned boundary areas.",
          variant: "destructive",
        });
        return;
      }
      setSelectedLocation(latlng);
      setPointSelectionMode(false);
      setPointFeatureModalOpen(true);
      toast({
        title: "Point Selected",
        description: "Form opened with location pre-filled",
      });
      return;
    }
    
    // Original selection mode for existing modals
    if (selectionMode && !drawingMode) {
      setSelectedLocation(latlng);
      toast({
        title: "Location Selected",
        description: `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`,
      });
    }
  };

  // Check if a line is within assigned boundaries for field users
  const isLineInAssignedBoundary = (coordinates: { lat: number; lng: number }[]) => {
    if (user?.role === "Supervisor") return true; // Supervisors can create anywhere
    
    // For field users, check if all points of the line are within assigned boundary
    return coordinates.every(point => isPointInAssignedBoundary(point));
  };

  const handleLineCreated = (line: { coordinates: { lat: number; lng: number }[] }) => {
    // Check boundary restrictions for field users
    if (!isLineInAssignedBoundary(line.coordinates)) {
      toast({
        title: "Location Restricted",
        description: "You can only create features within your assigned boundary areas.",
        variant: "destructive",
      });
      return;
    }
    // Store the line coordinates and open the modal
    setLinePoints(line.coordinates);
    setLineDrawingMode(false);
    setLineFeatureModalOpen(true);
    toast({
      title: "Route Completed",
      description: `Fiber cable route with ${line.coordinates.length} points created`,
    });
  };

  const handleMapDoubleClick = () => {
    // Legacy handler - now handled by handleLineCreated
  };

  const handleFeatureClick = (feature: any) => {
    // Show feature details popup for all users
    setClickedFeature(feature);
    setFeatureDetailsModalOpen(true);
  };

  const handleBoundaryClick = (boundary: any) => {
    // If user is supervisor, show assignment modal
    if (user?.role === "Supervisor") {
      setSelectedBoundary(boundary);
      setBoundaryAssignmentModalOpen(true);
    } else {
      toast({
        title: "Boundary Information",
        description: `${boundary.name} - You can create features within this area`,
      });
    }
  };

  const handleTeamClick = (team: IUser) => {
    setSelectedTeam(team);
    toast({
      title: "Team Selected",
      description: `${team.name}`,
    });
  };

  // Handle feature selection from dialog
  const handleFeatureSelect = (featureType: string, drawingType: 'point' | 'line' | 'polygon') => {
    setSelectedFeatureType(featureType);
    
    // Reset all drawing modes
    setPointSelectionMode(false);
    setLineDrawingMode(false);
    setDrawingMode(false);
    setSelectionMode(false);
    
    // Set appropriate drawing mode based on feature type
    switch (drawingType) {
      case 'point':
        setPointSelectionMode(true);
        break;
      case 'line':
        setLineDrawingMode(true);
        setLinePoints([]);
        break;
      case 'polygon':
        setDrawingMode(true);
        break;
    }
  };

  const handlePolygonCreated = (polygonData: { name: string; coordinates: number[][][] }) => {
    console.log('handlePolygonCreated called with:', polygonData);
    
    // Store the drawn polygon for feature creation (remove strict boundary validation)
    setDrawnPolygon({ coordinates: polygonData.coordinates });
    setDrawingMode(false);
    
    // For supervisors, open the supervisor polygon modal (parcel creation)
    if (user?.role === "Supervisor") {
      setSupervisorPolygonModalOpen(true);
    } else {
      // For field users, open the regular feature creation modal
      setCreateFeatureModalOpen(true);
    }
    
    toast({
      title: "Polygon completed",
      description: "Fill out the form to save this feature.",
    });
  };

  return (
    <>
      <div className="flex h-full">
        {/* Map Container */}
        <div className="relative flex-1 z-0">
          <OpenLayersMap
          features={features}
          teams={fieldUsers}
          boundaries={boundaries}
          tasks={tasks}
          allTeams={teams}
          activeFilters={activeFilters}
          onFeatureClick={handleFeatureClick}
          onBoundaryClick={handleBoundaryClick}
          onTeamClick={handleTeamClick}
          onMapClick={handleMapClick}
          onPolygonCreated={handlePolygonCreated}
          onLineCreated={handleLineCreated}
          selectionMode={selectionMode}
          drawingMode={drawingMode}
          pointSelectionMode={pointSelectionMode}
          lineDrawingMode={lineDrawingMode}
          linePoints={linePoints}
          clearDrawnPolygon={clearPolygon}
          className="w-full h-full"
        />
        

        
        {/* Single Drawing Button - For All Users */}
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Button
            onClick={() => setFeatureSelectionOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200"
            title="Create Feature"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
            </svg>
          </Button>
        </div>
        
        {/* Show boundary info for field users */}
        {user?.role === "Field" && (
          <div className="absolute bottom-20 left-4 z-[1000]">
            <div className="bg-white rounded-lg p-3 shadow-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Assigned Boundary:</p>
              <p className="text-sm font-medium text-gray-800">
                {boundaries.length > 0 ? boundaries[0]?.name : 'No Assignment'}
              </p>
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                {boundaries.length > 0 
                  ? "Features can only be created within this boundary area"
                  : "No boundary assigned to your team"
                }
              </p>
            </div>
          </div>
        )}
        
        </div>
        
        {/* Legend Panel */}
        <div className="w-80 p-4 bg-gray-50">
          <MapLegend />
        </div>
      </div>
      
      <TaskPanel
        tasks={tasks}
        selectedTask={selectedTask}
        onTaskSelect={(task) => {
          setSelectedTask(task);
          setTaskDetailsModalOpen(true);
        }}
        expanded={taskPanelExpanded}
        onExpandToggle={() => setTaskPanelExpanded(!taskPanelExpanded)}
      />
      
      {/* Show appropriate modal based on user role and feature type */}
      {createFeatureModalOpen && user?.role === "Supervisor" && drawnPolygon && (
        <SupervisorPolygonModal
          open={createFeatureModalOpen}
          onClose={() => {
            setCreateFeatureModalOpen(false);
            setDrawnPolygon(null);
            setClearPolygon(true);
            setTimeout(() => setClearPolygon(false), 100);
          }}
          onOpenChange={(open) => {
            setCreateFeatureModalOpen(open);
            if (!open) {
              setDrawnPolygon(null);
              setClearPolygon(true);
              setTimeout(() => setClearPolygon(false), 100);
            }
          }}
          drawnPolygon={drawnPolygon}
          setDrawingMode={setDrawingMode}
        />
      )}

      {createFeatureModalOpen && (user?.role !== "Supervisor" || !drawnPolygon) && (
        <CreateFeatureModal
          open={createFeatureModalOpen}
          onClose={() => {
            setCreateFeatureModalOpen(false);
            setSelectionMode(false);
            setDrawnPolygon(null);
            setClearPolygon(true);
            setTimeout(() => setClearPolygon(false), 100);
          }}
          onOpenChange={(open) => {
            setCreateFeatureModalOpen(open);
            if (!open) {
              setSelectionMode(false);
              setDrawnPolygon(null);
              setClearPolygon(true);
              setTimeout(() => setClearPolygon(false), 100);
            }
          }}
          selectedLocation={selectedLocation}
          setSelectionMode={setSelectionMode}
          setDrawingMode={setDrawingMode}
          drawnPolygon={drawnPolygon}
        />
      )}
      
      {createTaskModalOpen && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => {
            setCreateTaskModalOpen(false);
            setSelectionMode(false);
          }}
          onOpenChange={(open) => {
            setCreateTaskModalOpen(open);
            if (!open) setSelectionMode(false);
          }}
          selectedLocation={selectedLocation}
          setSelectionMode={setSelectionMode}
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

      {/* Feature Selection Dialog */}
      <FeatureSelectionDialog
        open={featureSelectionOpen}
        onOpenChange={setFeatureSelectionOpen}
        onFeatureSelect={handleFeatureSelect}
        userRole={user?.role || ''}
        featureTemplates={featureTemplates}
      />
      
      {advancedSearchModalOpen && (
        <AdvancedSearchModal
          open={advancedSearchModalOpen}
          onClose={() => setAdvancedSearchModalOpen(false)}
          onOpenChange={setAdvancedSearchModalOpen}
        />
      )}
      
      {/* Feature Assignment Modal for Supervisors */}
      <FeatureAssignmentModal
        open={featureAssignmentModalOpen}
        onOpenChange={setFeatureAssignmentModalOpen}
        feature={selectedFeature}
      />
      
      {/* Boundary Assignment Modal for Supervisors */}
      <BoundaryAssignmentModal
        open={boundaryAssignmentModalOpen}
        onOpenChange={setBoundaryAssignmentModalOpen}
        boundary={selectedBoundary}
      />
      
      {/* Point Feature Modal */}
      {pointFeatureModalOpen && (
        <PointFeatureModal
          open={pointFeatureModalOpen}
          onClose={() => {
            setPointFeatureModalOpen(false);
            setSelectionMode(false);
            setSelectedLocation(null);
          }}
          onOpenChange={(open) => {
            setPointFeatureModalOpen(open);
            if (!open) {
              setSelectionMode(false);
              setSelectedLocation(null);
            }
          }}
          selectedLocation={selectedLocation}
          setSelectionMode={setSelectionMode}
          assignedBoundaryId={user?.role === "Field" && boundaries.length > 0 ? boundaries[0]._id.toString() : undefined}
        />
      )}
      
      {/* Line Feature Modal */}
      {lineFeatureModalOpen && (
        <LineFeatureModal
          open={lineFeatureModalOpen}
          onClose={() => {
            setLineFeatureModalOpen(false);
            setLineDrawingMode(false);
            setLinePoints([]);
          }}
          onOpenChange={(open) => {
            setLineFeatureModalOpen(open);
            if (!open) {
              setLineDrawingMode(false);
              setLinePoints([]);
            }
          }}
          preFilledPoints={linePoints}
          assignedBoundaryId={user?.role === "Field" && boundaries.length > 0 ? boundaries[0]._id.toString() : undefined}
        />
      )}
      
      {/* Feature Details Modal */}
      <FeatureDetailsModal
        open={featureDetailsModalOpen}
        onClose={() => {
          setFeatureDetailsModalOpen(false);
          setClickedFeature(null);
        }}
        feature={clickedFeature}
        onEdit={(feature) => {
          setFeatureToEdit(feature);
          setEditFeatureModalOpen(true);
        }}
      />

      {/* Edit Feature Modal */}
      <EditFeatureModal
        open={editFeatureModalOpen}
        onClose={() => {
          setEditFeatureModalOpen(false);
          setFeatureToEdit(null);
        }}
        feature={featureToEdit}
      />

    </>
  );
}
