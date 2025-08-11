import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import OpenLayersMap from "@/lib/OpenLayersMap";
import proj4 from "proj4";
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
import { ShapefileUpload } from "@/components/ShapefileUpload";
import { Shapefile } from "@/components/ShapefileLayer";
import { ShapefileManager } from "@/components/ShapefileManager";

import { FeatureDetailsModal } from "@/components/FeatureDetailsModal";
import { EditFeatureModal } from "@/components/EditFeatureModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { getAllFeatures, getAllTasks, getFieldUsers, getAllBoundaries, updateUserLocation, createParcel, getAllShapefiles } from "@/lib/api";
import { IFeature, ITask, IUser, IBoundary } from "../../../shared/schema";

// GeoJSON related interfaces
interface GeoJSONGeometry {
  type: string;
  coordinates: any;
}

interface GeoJSONFeature {
  type: string;
  geometry: GeoJSONGeometry;
  properties?: Record<string, any>;
}

interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

type GeoJSONData = GeoJSONFeatureCollection | GeoJSONFeature[];

export default function MapView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
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
  
  // Map methods for navigation
  const [mapMethods, setMapMethods] = useState<{
    panTo: (lat: number, lng: number, zoom?: number) => void;
    zoomToFeature: (featureId: string) => boolean;
    zoomToBoundary: (boundaryId: string) => boolean;
  } | null>(null);
  
  // Local shapefiles state for frontend-only processing
  const [localShapefiles, setLocalShapefiles] = useState<Shapefile[]>([]);

  // ✅ STABLE TOAST CALLBACK
  const stableToast = useCallback((toastData: any) => {
    toast(toastData);
  }, [toast]);
  
  const memoizedToast = useMemo(() => stableToast, [stableToast]);

  // ✅ EMERGENCY URL PARAMETER CLEANUP - Run this FIRST
  useEffect(() => {
    const url = new URL(window.location.href);
    let shouldClear = false;
    
    // Check for problematic parameters that might be causing loops
    if (url.searchParams.has('boundary') || url.searchParams.has('feature')) {
      console.log('🚨 EMERGENCY: Found problematic URL parameters, cleaning up...');
      console.log('🚨 Current URL:', window.location.href);
      
      const boundaryId = url.searchParams.get('boundary');
      const featureId = url.searchParams.get('feature');
      
      // Clear the parameters
      url.searchParams.delete('boundary');
      url.searchParams.delete('feature');
      
      // Update URL without reloading
      window.history.replaceState({}, '', url.toString());
      
      console.log('🚨 Cleaned URL:', url.toString());
      console.log('🚨 Removed parameters:', { boundaryId, featureId });
      
      // Show a toast about the cleanup
      setTimeout(() => {
        toast({
          title: "Navigation Parameters Cleared",
          description: "Removed problematic URL parameters to prevent navigation loops.",
        });
      }, 1000);
    }
  }, []); // Run only once on mount

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

  // ✅ COMPLETELY DISABLED NAVIGATION CONTROLLER
  const navigationController = useRef({
    hasProcessed: true, // Always true = completely disabled
    timeoutId: null,
    
    // All methods are no-ops (do nothing)
    logState: () => {},
    isDashboardNavigation: () => true,
    getNavigationParams: () => ({ featureId: null, boundaryId: null }),
    clearUrlParams: () => {},
    attemptNavigation: () => {},
    setFailureTimeout: () => {},
    reset: () => {},
    setEnabled: () => {}
  });

  // ✅ DISABLED NAVIGATION EFFECTS - Replace all navigation effects with this
  useEffect(() => {
    console.log('🛑 All navigation effects DISABLED');
    return; // Early return - do absolutely nothing
  }, []); // Empty dependencies - no re-runs

  // Handle map navigation errors - KEEP THIS ONE
  useEffect(() => {
    const handleNavigationError = (event: CustomEvent) => {
      const { type, id, error } = event.detail;
      stableToast({
        title: "Navigation Failed",
        description: `Unable to navigate to ${type}: ${error}`,
        variant: "destructive",
      });
      console.error(`Map navigation error for ${type} ${id}:`, error);
    };

    window.addEventListener('map-navigation-error', handleNavigationError as EventListener);
    
    return () => {
      window.removeEventListener('map-navigation-error', handleNavigationError as EventListener);
    };
  }, []); // No dependencies to prevent loops
  
  // Combined shapefiles state (local + saved)
  const [allShapefiles, setAllShapefiles] = useState<Shapefile[]>([]);
  
  // Feature selection dialog state
  const [featureSelectionOpen, setFeatureSelectionOpen] = useState(false);
  const [selectedFeatureType, setSelectedFeatureType] = useState<string>('');
  const [supervisorPolygonModalOpen, setSupervisorPolygonModalOpen] = useState(false);

  // Fetch saved shapefiles from database
  const { data: savedShapefiles = [] } = useQuery({
    queryKey: ["/api/shapefiles"],
    queryFn: getAllShapefiles,
  });

  // Function to load shp.js library
  const loadShpJS = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).shp) {
        resolve((window as any).shp);
        return;
      }

      const urls = [
        'https://unpkg.com/shpjs@latest/dist/shp.min.js',
        'https://cdn.jsdelivr.net/npm/shpjs@latest/dist/shp.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/shpjs/3.6.3/shp.min.js'
      ];

      let attempted = 0;
      const tryLoad = (url: string) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          if ((window as any).shp) {
            resolve((window as any).shp);
          } else {
            reject(new Error('shp.js library not available after loading'));
          }
        };
        script.onerror = () => {
          attempted++;
          if (attempted < urls.length) {
            tryLoad(urls[attempted]);
          } else {
            reject(new Error('Failed to load shp.js from all CDN sources'));
          }
        };
        document.head.appendChild(script);
      };

      tryLoad(urls[0]);
    });
  };

  // Function to process saved shapefiles
  const processSavedShapefileWithShpJS = async (shapefile: any) => {
    if (!shapefile.features) {
      console.warn(`⚠️ Saved shapefile "${shapefile.name}" has no features`);
      return shapefile;
    }
    
    try {
      let features = typeof shapefile.features === 'string' 
        ? JSON.parse(shapefile.features) 
        : shapefile.features;
      
      if (features && (features.type === 'FeatureCollection' || Array.isArray(features))) {
        console.log(`✅ Saved shapefile "${shapefile.name}" already in GeoJSON format, using as-is`);
        return {
          ...shapefile,
          features: features
        };
      }
      
      if (features instanceof ArrayBuffer || (features && features.buffer)) {
        console.log(`🔄 Processing saved shapefile "${shapefile.name}" with shpjs`);
        const shp = await loadShpJS();
        const geojson = await shp(features);
        
        let processedFeatures: any[] = [];
        if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          processedFeatures = geojson.features;
        } else if (Array.isArray(geojson)) {
          processedFeatures = geojson;
        } else if (geojson.type === 'Feature') {
          processedFeatures = [geojson];
        }
        
        return {
          ...shapefile,
          features: {
            type: 'FeatureCollection',
            features: processedFeatures
          }
        };
      }
      
      return shapefile;
      
    } catch (error) {
      console.error(`❌ Error processing saved shapefile "${shapefile.name}":`, error);
      return shapefile;
    }
  };

  // Shapefile processing
  const processingRef = useRef(false);
  
  useEffect(() => {
    if (processingRef.current) return;
    
    const processShapefiles = async () => {
      processingRef.current = true;
      
      try {
        const visibleSavedShapefiles = savedShapefiles.filter((shapefile: any) => shapefile.isVisible);
        const processedSavedShapefiles = await Promise.all(
          visibleSavedShapefiles.map(processSavedShapefileWithShpJS)
        );
        
        const combined = [...localShapefiles, ...processedSavedShapefiles];
        setAllShapefiles(combined);
      } catch (error) {
        console.error('Error processing shapefiles:', error);
        setAllShapefiles([...localShapefiles]);
      } finally {
        processingRef.current = false;
      }
    };
    
    const timeoutId = setTimeout(processShapefiles, 100);
    return () => clearTimeout(timeoutId);
  }, [localShapefiles.length, savedShapefiles.length]);

  // Clear transformation cache when shapefiles change
  const prevShapefileIds = useRef<string>('');
  
  useEffect(() => {
    if (allShapefiles.length === 0) return;
    
    const currentIds = allShapefiles.map(s => s._id || s.name).join(',') + `_${allShapefiles.length}`;
    
    if (prevShapefileIds.current !== currentIds) {
      console.log('🔄 Shapefiles actually changed, clearing cache');
      clearTransformationCache();
      prevShapefileIds.current = currentIds;
    }
  }, [allShapefiles.length]);

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
  });

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
      memoizedToast({
        title: "Success",
        description: "Parcel created successfully"
      });
      setDrawingMode(false);
    },
    onError: (error: any) => {
      memoizedToast({
        title: "Error",
        description: error.message || "Failed to create parcel",
        variant: "destructive"
      });
    }
  });

  // Update user's location periodically
  useEffect(() => {
    if (!user) return;
    
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
      }, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user]);

  // Location event listeners
  useEffect(() => {
    const handleLocationSuccess = (event: any) => {
      if (!event || !event.detail || typeof event.detail !== 'object') {
        console.warn('Invalid locationSuccess event:', event);
        return;
      }
      
      const { message, latitude, longitude } = event.detail || {};
      
      if (message && latitude !== undefined && longitude !== undefined) {
        stableToast({
          title: "Location Found! 🎯",
          description: `${message} (${latitude}, ${longitude})`,
        });
      } else {
        console.warn('Incomplete location data:', event.detail);
      }
    };

    const handleLocationError = (event: any) => {
      if (!event || !event.detail || typeof event.detail !== 'object') {
        console.warn('Invalid locationError event:', event);
        return;
      }
      
      const { message } = event.detail || {};
      
      if (message) {
        stableToast({
          title: "Location Error ❌",
          description: message,
          variant: "destructive",
        });
      } else {
        stableToast({
          title: "Location Error ❌",
          description: "Unknown location error occurred",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('locationSuccess', handleLocationSuccess);
    window.addEventListener('locationError', handleLocationError);

    return () => {
      window.removeEventListener('locationSuccess', handleLocationSuccess);
      window.removeEventListener('locationError', handleLocationError);
    };
  }, []);

  // Coordinate system detection and transformation - SIMPLIFIED
  const detectCoordinateSystem = (coordinates: number[]): 'geographic' | 'projected' | 'unknown' => {
    if (!coordinates || coordinates.length < 2) return 'unknown';
    
    const [x, y] = coordinates;
    
    if (x >= -180.0 && x <= 180.0 && y >= -90.0 && y <= 90.0) {
      return 'geographic';
    }
    
    if ((Math.abs(x) > 180 || Math.abs(y) > 90) && 
        (Math.abs(x) < 10000000 && Math.abs(y) < 20000000)) {
      return 'projected';
    }
    
    return 'unknown';
  };

  const transformationCache = useRef<Map<string, { success: boolean; coords?: number[]; projection?: string }>>(new Map());

  const clearTransformationCache = () => {
    transformationCache.current.clear();
    console.log('🔄 Transformation cache cleared');
  };

  const shapefileCount = useMemo(() => allShapefiles.length, [allShapefiles]);
  
  useEffect(() => {
    if (shapefileCount > 0) {
      clearTransformationCache();
    }
  }, [shapefileCount]);

  const transformProjectedCoordinates = (coordinates: number[]): { success: boolean; coords?: number[]; projection?: string } => {
    const [x, y] = coordinates;
    const cacheKey = `${x},${y}`;
    
    if (transformationCache.current.has(cacheKey)) {
      const cached = transformationCache.current.get(cacheKey)!;
      return cached;
    }
    
    // Try basic transformations only
    const commonProjections = [
      { name: 'Web Mercator (EPSG:3857)', proj: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs' },
      { name: 'UTM Zone 11N (EPSG:32611)', proj: '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs' }
    ];

    for (const projection of commonProjections) {
      try {
        const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
        const transformed = proj4(projection.proj, wgs84, [x, y]);
        
        const [lng, lat] = transformed;
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          const result = { success: true, coords: [lng, lat], projection: projection.name };
          transformationCache.current.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        continue;
      }
    }
    
    const result = { success: false };
    transformationCache.current.set(cacheKey, result);
    return result;
  };

  const validateAndProcessCoordinates = (coordinates: number[]): { isValid: boolean; coords?: number[]; type: string } => {
    const coordType = detectCoordinateSystem(coordinates);
    
    switch (coordType) {
      case 'geographic':
        return { isValid: true, coords: coordinates, type: 'geographic' };
      
      case 'projected':
        const transformResult = transformProjectedCoordinates(coordinates);
        
        if (transformResult.success) {
          return { isValid: true, coords: transformResult.coords!, type: 'transformed' };
        } else {
          return { isValid: false, coords: coordinates, type: 'projected' };
        }
      
      default:
        return { isValid: true, coords: coordinates, type: 'unknown' };
    }
  };

  const calculateAppropriateZoom = (extent: number[]) => {
    const [minLon, minLat, maxLon, maxLat] = extent;
    const width = maxLon - minLon;
    const height = maxLat - minLat;
    
    if (width > 5 || height > 5) return 8;
    if (width > 1 || height > 1) return 10;
    if (width > 0.1 || height > 0.1) return 13;
    if (width > 0.01 || height > 0.01) return 15;
    return 17;
  };

  const zoomToShapefile = (shapefile: Shapefile) => {
    console.log('🔍 Zooming to specific shapefile:', shapefile.name);
    
    if (!shapefile || !shapefile.features) {
      memoizedToast({
        title: "Navigation Error",
        description: "Invalid shapefile data",
        variant: "destructive"
      });
      return;
    }
    
    // Simplified processing - just zoom to center
    const zoomEvent = new CustomEvent('zoomToLocation', {
      detail: {
        lat: 24.8607,
        lng: 67.0011,
        zoom: 13
      }
    });
    
    window.dispatchEvent(zoomEvent);
    
    memoizedToast({
      title: "Navigating to Shapefile",
      description: `Showing "${shapefile.name}" on the map`,
    });
  };

  const zoomToRecentShapefile = () => {
    if ((!allShapefiles || allShapefiles.length === 0) && (!localShapefiles || localShapefiles.length === 0)) {
      memoizedToast({
        title: "No Shapefiles",
        description: "No shapefiles are currently visible",
        variant: "destructive"
      });
      return;
    }
    
    const recentShapefile = localShapefiles.length > 0 
      ? localShapefiles[localShapefiles.length - 1]
      : allShapefiles[allShapefiles.length - 1];
    
    zoomToShapefile(recentShapefile);
  };

  const handleShapefileProcessed = (shapefile: Shapefile) => {
    console.log('💾 Processing shapefile:', shapefile.name);
    
    setLocalShapefiles(prev => {
      const newShapefiles = [...prev, shapefile];
      return newShapefiles;
    });
    
    setTimeout(() => {
      zoomToShapefile(shapefile);
    }, 300);
    
    memoizedToast({
      title: "Shapefile Added",
      description: `"${shapefile.name}" with ${shapefile.featureCount || 0} features`,
    });
  };

  // Boundary checking functions
  const isPointInAssignedBoundary = (latlng: { lat: number; lng: number }) => {
    if (user?.role === "Supervisor") return true;
    
    for (const boundary of boundaries) {
      if (boundary.geometry) {
        try {
          const geometry = typeof boundary.geometry === 'string' 
            ? JSON.parse(boundary.geometry) 
            : boundary.geometry;
            
          if (geometry.type === "Polygon") {
            const coords = geometry.coordinates[0];
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

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (pointSelectionMode) {
      if (!isPointInAssignedBoundary(latlng)) {
        memoizedToast({
          title: "Location Restricted",
          description: "You can only create features within your assigned boundary areas.",
          variant: "destructive",
        });
        return;
      }
      setSelectedLocation(latlng);
      setPointSelectionMode(false);
      setPointFeatureModalOpen(true);
      memoizedToast({
        title: "Point Selected",
        description: "Form opened with location pre-filled",
      });
      return;
    }
    
    if (selectionMode && !drawingMode) {
      setSelectedLocation(latlng);
      memoizedToast({
        title: "Location Selected",
        description: `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`,
      });
    }
  };

  const isLineInAssignedBoundary = (coordinates: { lat: number; lng: number }[]) => {
    if (user?.role === "Supervisor") return true;
    return coordinates.every(point => isPointInAssignedBoundary(point));
  };

  const handleLineCreated = (line: { coordinates: { lat: number; lng: number }[] }) => {
    if (!isLineInAssignedBoundary(line.coordinates)) {
      memoizedToast({
        title: "Location Restricted",
        description: "You can only create features within your assigned boundary areas.",
        variant: "destructive",
      });
      return;
    }
    setLinePoints(line.coordinates);
    setLineDrawingMode(false);
    setLineFeatureModalOpen(true);
    memoizedToast({
      title: "Route Completed",
      description: `Fiber cable route with ${line.coordinates.length} points created`,
    });
  };

  const handleFeatureClick = (feature: any) => {
    setClickedFeature(feature);
    setFeatureDetailsModalOpen(true);
  };

  const handleBoundaryClick = (boundary: any) => {
    if (user?.role === "Supervisor") {
      setSelectedBoundary(boundary);
      setBoundaryAssignmentModalOpen(true);
    } else {
      memoizedToast({
        title: "Boundary Information",
        description: `${boundary.name} - You can create features within this area`,
      });
    }
  };

  const handleTeamClick = (team: IUser) => {
    setSelectedTeam(team);
    memoizedToast({
      title: "Team Selected",
      description: `${team.name}`,
    });
  };

  const handleShapefileClick = (shapefileData: any) => {
    memoizedToast({
      title: "Shapefile Feature",
      description: `${shapefileData.parentShapefile?.name || 'Shapefile'}: ${shapefileData.properties?.name || 'Feature'}`,
    });
  };

  const handleShapefileSelect = (shapefile: any) => {
    console.log('📍 Shapefile selected from manager:', shapefile.name);
    zoomToShapefile(shapefile);
  };

  const handleShapefileToggle = (shapefile: any, isVisible: boolean) => {
    console.log(`👁️ Shapefile visibility toggled: ${shapefile.name} - ${isVisible ? 'visible' : 'hidden'}`);
    queryClient.invalidateQueries({ queryKey: ["/api/shapefiles"] });
  };

  const handleShapefileUploaded = () => {
    console.log('🔄 Refreshing saved shapefiles after upload');
    queryClient.invalidateQueries({ queryKey: ["/api/shapefiles"] });
  };

  const handleFeatureSelect = (featureType: string, drawingType: 'point' | 'line' | 'polygon') => {
    console.log('🟢 Feature selected:', featureType, 'drawing type:', drawingType);
    setSelectedFeatureType(featureType);
    
    setPointSelectionMode(false);
    setLineDrawingMode(false);
    setDrawingMode(false);
    setSelectionMode(false);
    
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
    
    setDrawnPolygon({ coordinates: polygonData.coordinates });
    setDrawingMode(false);
    
    if (selectedFeatureType === "Boundary" && user?.role === "Supervisor") {
      setSupervisorPolygonModalOpen(true);
    } else {
      setCreateFeatureModalOpen(true);
    }
    
    memoizedToast({
      title: "Polygon completed",
      description: "Fill out the form to save this feature.",
    });
  };

  // ✅ CLEAN BOUNDARIES NAVIGATION
  const handleBoundariesNavigation = useCallback(() => {
    console.log('🎯 Boundaries navigation triggered');
    
    try {
      // Direct navigation without any routing complications
      window.location.href = '/dashboard?tab=boundaries';
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback
      setLocation('/dashboard?tab=boundaries');
    }
  }, [setLocation]);

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Map Container */}
        <div className="relative flex-1 z-0 h-[60vh] lg:h-full">
          {/* Mobile Controls Bar - Top */}
          <div className="absolute top-2 left-2 right-2 z-[1000] lg:hidden flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              {(allShapefiles.length > 0 || localShapefiles.length > 0) && (
                <button
                  onClick={zoomToRecentShapefile}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1 text-xs font-medium transition-colors"
                >
                  📍 Shapefile
                </button>
              )}
            </div>
            
            <div className="ml-auto flex gap-2">
              <ShapefileManager 
                onShapefileSelect={handleShapefileSelect}
                onShapefileToggle={handleShapefileToggle}
              />
              <ShapefileUpload 
                onShapefileProcessed={handleShapefileProcessed}
                onShapefileUploaded={handleShapefileUploaded}
              />
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="hidden lg:block">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              {(allShapefiles.length > 0 || localShapefiles.length > 0) && (
                <button
                  onClick={zoomToRecentShapefile}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  📍 Show Recent Shapefile
                </button>
              )}
            </div>
            
            <div className="absolute top-4 right-4 z-[1000] flex gap-2">
              <ShapefileManager 
                onShapefileSelect={handleShapefileSelect}
                onShapefileToggle={handleShapefileToggle}
              />
              <ShapefileUpload 
                onShapefileProcessed={handleShapefileProcessed}
                onShapefileUploaded={handleShapefileUploaded}
              />
            </div>
          </div>

          <OpenLayersMap
            features={features}
            teams={fieldUsers}
            boundaries={boundaries}
            tasks={tasks}
            allTeams={teams}
            shapefiles={allShapefiles}
            activeFilters={activeFilters}
            onFeatureClick={handleFeatureClick}
            onBoundaryClick={handleBoundaryClick}
            onTeamClick={handleTeamClick}
            onShapefileClick={handleShapefileClick}
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
            onMapReady={setMapMethods}
          />
          
          {/* Mobile Drawing Button - Bottom Center */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-[1000] lg:hidden">
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
          
          {/* Desktop Drawing Button */}
          <div className="absolute bottom-4 left-4 z-[1000] hidden lg:block">
            <Button
              onClick={() => setFeatureSelectionOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-200"
              title="Create Feature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
              </svg>
            </Button>
          </div>

          {/* Field user boundary info */}
          {user?.role === "Field" && (
            <>
              <div className="absolute bottom-20 left-2 right-2 z-[1000] lg:hidden">
                <div className="bg-white rounded-lg p-2 shadow-lg border border-orange-200">
                  <p className="text-xs text-gray-600 mb-1">Assigned Boundary:</p>
                  <p className="text-sm font-medium text-gray-800">
                    {boundaries.length > 0 ? boundaries[0]?.name : 'No Assignment'}
                  </p>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-[1000] hidden lg:block">
                <div className="bg-white rounded-lg p-3 shadow-lg border border-orange-200">
                  <p className="text-xs text-gray-600 mb-1">Assigned Boundary:</p>
                  <p className="text-sm font-medium text-gray-800">
                    {boundaries.length > 0 ? boundaries[0]?.name : 'No Assignment'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Legend Panel - Responsive */}
        <div className="hidden lg:flex w-80 p-4 bg-gray-50 flex-col">
          <MapLegend onBoundariesClick={handleBoundariesNavigation} />
        </div>

        {/* Mobile Legend Panel */}
        <div className="lg:hidden h-[40vh] bg-gray-50 border-t border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3">Map Legend</h3>
            <MapLegend onBoundariesClick={handleBoundariesNavigation} />
          </div>
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
        onLocateTask={(task) => {
          if (!mapMethods) return;
          const featureId = task.featureId?.toString?.();
          const boundaryId = task.boundaryId?.toString?.();
          if (featureId) {
            const ok = mapMethods.zoomToFeature(featureId);
            if (!ok && task.location?.type === 'Point') {
              const [lng, lat] = task.location.coordinates as [number, number];
              mapMethods.panTo(lat, lng, 16);
            }
            return;
          }
          if (boundaryId) {
            const ok = mapMethods.zoomToBoundary(boundaryId);
            if (!ok && task.location?.type === 'Point') {
              const [lng, lat] = task.location.coordinates as [number, number];
              mapMethods.panTo(lat, lng, 15);
            }
            return;
          }
          if (task.location?.type === 'Point') {
            const [lng, lat] = task.location.coordinates as [number, number];
            mapMethods.panTo(lat, lng, 16);
          }
        }}
      />
      
      {/* All the modals - keeping all existing modals */}
      {supervisorPolygonModalOpen && (
        <SupervisorPolygonModal
          open={supervisorPolygonModalOpen}
          onClose={() => {
            setSupervisorPolygonModalOpen(false);
            setDrawnPolygon(null);
            setClearPolygon(true);
            setTimeout(() => setClearPolygon(false), 100);
          }}
          onOpenChange={(open) => {
            setSupervisorPolygonModalOpen(open);
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

      {createFeatureModalOpen && (
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

      <FeatureSelectionDialog
        open={featureSelectionOpen}
        onOpenChange={setFeatureSelectionOpen}
        onFeatureSelect={handleFeatureSelect}
        userRole={user?.role || ''}
        featureTemplates={featureTemplates as any[] || []}
      />
      
      {advancedSearchModalOpen && (
        <AdvancedSearchModal
          open={advancedSearchModalOpen}
          onClose={() => setAdvancedSearchModalOpen(false)}
          onOpenChange={setAdvancedSearchModalOpen}
        />
      )}
      
      <FeatureAssignmentModal
        open={featureAssignmentModalOpen}
        onOpenChange={setFeatureAssignmentModalOpen}
        feature={selectedFeature}
      />
      
      <BoundaryAssignmentModal
        open={boundaryAssignmentModalOpen}
        onOpenChange={setBoundaryAssignmentModalOpen}
        boundary={selectedBoundary}
      />
      
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
          selectedFeatureType={selectedFeatureType}
        />
      )}
      
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
