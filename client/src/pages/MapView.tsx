import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import OpenLayersMap from "@/lib/OpenLayersMap";
import MapControls from "@/components/MapControls";
import MapFilterControls from "@/components/MapFilterControls";

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
import { FeatureDetailsModal } from "@/components/FeatureDetailsModal";
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

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    // Handle point feature selection - called from Draw interaction
    if (pointSelectionMode) {
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

  const handleLineCreated = (line: { coordinates: { lat: number; lng: number }[] }) => {
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
        title: "Area Selected",
        description: `Area boundary selected`,
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

  const handlePolygonCreated = (polygonData: { name: string; coordinates: number[][][] }) => {
    // Store the drawn polygon for feature creation
    setDrawnPolygon({ coordinates: polygonData.coordinates });
    setDrawingMode(false);
    
    // Automatically open the CreateFeatureModal for parcel creation
    setCreateFeatureModalOpen(true);
    
    toast({
      title: "Polygon completed",
      description: "Fill out the form to save this parcel feature.",
    });
  };

  return (
    <>
      <div className="relative flex-1 z-0">
        <OpenLayersMap
          features={features}
          teams={fieldUsers}
          boundaries={boundaries}
          tasks={tasks}
          activeFilters={activeFilters}
          onFeatureClick={handleFeatureClick}
          onBoundaryClick={handleBoundaryClick}
          onTeamClick={handleTeamClick}
          onMapClick={handleMapClick}
          onMapDoubleClick={handleMapDoubleClick}
          onPolygonCreated={handlePolygonCreated}
          onLineCreated={handleLineCreated}
          selectionMode={selectionMode}
          drawingMode={drawingMode}
          pointSelectionMode={pointSelectionMode}
          lineDrawingMode={lineDrawingMode}
          linePoints={linePoints}
          clearDrawnPolygon={clearPolygon}
        />
        
        <MapControls />
        

        
        {/* Drawing Tools - Different sets for different roles */}
        {user?.role === "Supervisor" && (
          <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
            {/* Supervisors only get the polygon tool for parcel creation */}
            <Button
              onClick={() => setDrawingMode(!drawingMode)}
              className={`${drawingMode ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}
              title={drawingMode ? "Stop Drawing Parcel" : "Draw Parcel"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <polygon points="3,6 9,6 12,1 15,6 21,6 18,10 21,14 15,14 12,19 9,14 3,14 6,10"></polygon>
              </svg>
            </Button>
          </div>
        )}

        {/* Field team members get all three drawing tools */}
        {user?.role === "Field" && (
          <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
            <Button
              onClick={() => {
                setPointSelectionMode(true);
                setLineDrawingMode(false);
                setDrawingMode(false);
                setSelectionMode(false);
                toast({
                  title: "Point Selection Mode",
                  description: "Click on map to place Tower/Manhole",
                });
              }}
              className={`${pointSelectionMode ? 'bg-green-700 hover:bg-green-800' : 'bg-green-500 hover:bg-green-600'} text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}
              title="Create Point Feature (Tower/Manhole)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </Button>
            
            <Button
              onClick={() => {
                setLineDrawingMode(true);
                setLinePoints([]);
                setPointSelectionMode(false);
                setDrawingMode(false);
                setSelectionMode(false);
                toast({
                  title: "Line Drawing Mode",
                  description: "Draw fiber route (2-20 points). Double-click to finish.",
                });
              }}
              className={`${lineDrawingMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}
              title="Create Line Feature (Fiber Cable)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M3 12h18m-9-9v18"></path>
                <path d="m8 8 8 8"></path>
                <path d="m16 8-8 8"></path>
              </svg>
            </Button>
            
            <Button
              onClick={() => setDrawingMode(!drawingMode)}
              className={`${drawingMode ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}
              title={drawingMode ? "Stop Drawing Parcel" : "Draw Parcel"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <polygon points="3,6 9,6 12,1 15,6 21,6 18,10 21,14 15,14 12,19 9,14 3,14 6,10"></polygon>
              </svg>
            </Button>
            
            {(selectionMode || selectedLocation) && (
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2 text-xs text-green-800 max-w-48">
                <div className="font-medium">Selection Mode</div>
                <div className="text-xs mt-1">
                  {selectedLocation 
                    ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                    : "Click on map to select location"
                  }
                </div>
                <Button
                  onClick={() => {
                    setSelectedLocation(null);
                    setSelectionMode(false);
                  }}
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-6 px-2 text-xs text-green-700 hover:text-green-900"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
        

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
        onCreateTask={() => setCreateTaskModalOpen(true)}
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
          teams={fieldUsers}
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
        />
      )}
    </>
  );
}
