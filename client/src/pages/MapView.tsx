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

  // ✅ STABLE TOAST CALLBACK - Fixed dependencies
  const stableToast = useCallback((toastData: any) => {
    toast(toastData);
  }, [toast]);
  
  // ✅ MEMOIZE toast function to prevent recreation
  const memoizedToast = useMemo(() => stableToast, [stableToast]);

  // Fetch data first
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

  // ✅ ENHANCED NAVIGATION CONTROLLER WITH DEBUGGING AND PROPER ISOLATION
  const navigationController = useRef({
    hasProcessed: false,
    timeoutId: null as NodeJS.Timeout | null,
    lastUrl: '',
    processCount: 0,
    isEnabled: true, // Control flag for enabling/disabling
    
    // Enhanced debugging method
    logState(action: string) {
      if (!this.isEnabled) return;
      
      const currentUrl = window.location.href;
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      
      this.processCount++;
      
      console.log(`🔍 [${this.processCount}] Navigation Controller - ${action}:`, {
        pathname,
        search: window.location.search,
        hasTab: params.has('tab'),
        hasFeature: params.has('feature'),
        hasBoundary: params.has('boundary'),
        hasProcessed: this.hasProcessed,
        hasTimeout: !!this.timeoutId,
        lastUrl: this.lastUrl,
        currentUrl,
        enabled: this.isEnabled
      });
    },
    
    // Check if this is dashboard navigation that should be ignored
    isDashboardNavigation(): boolean {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      
      // If we have a tab parameter, this is dashboard navigation
      if (params.has('tab')) {
        this.logState('Dashboard navigation detected (tab parameter)');
        return true;
      }
      
      // If we're not on a map route, don't process
      if (!pathname.includes('map')) {
        this.logState('Non-map route detected');
        return true;
      }
      
      return false;
    },
    
    // Get navigation params
    getNavigationParams(): { featureId: string | null; boundaryId: string | null } {
      const params = new URLSearchParams(window.location.search);
      return {
        featureId: params.get('feature'),
        boundaryId: params.get('boundary')
      };
    },
    
    // Clear URL params after successful navigation
    clearUrlParams(featureId?: string, boundaryId?: string) {
      if (!this.isEnabled) return;
      
      const url = new URL(window.location.href);
      let changed = false;
      if (featureId) {
        url.searchParams.delete('feature');
        changed = true;
      }
      if (boundaryId) {
        url.searchParams.delete('boundary');
        changed = true;
      }
      if (changed) {
        this.logState('Clearing URL params');
        window.history.replaceState({}, '', url.toString());
      }
    },
    
    // Main navigation attempt
    attemptNavigation(mapMethods: any, features: any[], boundaries: any[], toastCallback: Function) {
      if (!this.isEnabled) {
        this.logState('DISABLED - Navigation controller is disabled');
        return;
      }
      
      this.logState('attemptNavigation called');
      
      // EARLY EXIT CONDITIONS
      if (this.hasProcessed) {
        this.logState('SKIP - Already processed');
        return;
      }
      
      if (this.isDashboardNavigation()) {
        this.logState('SKIP - Dashboard navigation detected');
        this.hasProcessed = true;
        return;
      }
      
      const { featureId, boundaryId } = this.getNavigationParams();
      
      if (!featureId && !boundaryId) {
        this.logState('SKIP - No navigation params');
        this.hasProcessed = true;
        return;
      }
      
      if (!mapMethods) {
        this.logState('SKIP - Map not ready');
        return;
      }
      
      this.logState('ATTEMPTING - Map navigation');
      
      let success = false;
      
      // Try feature navigation
      if (featureId && features.length > 0) {
        try {
          success = mapMethods.zoomToFeature(featureId);
          if (success) {
            this.logState('SUCCESS - Feature navigation');
            this.clearUrlParams(featureId);
          }
        } catch (error) {
          console.error('❌ Feature navigation error:', error);
        }
      }
      
      // Try boundary navigation
      if (!success && boundaryId && boundaries.length > 0) {
        try {
          success = mapMethods.zoomToBoundary(boundaryId);
          if (success) {
            this.logState('SUCCESS - Boundary navigation');
            this.clearUrlParams(undefined, boundaryId);
          }
        } catch (error) {
          console.error('❌ Boundary navigation error:', error);
        }
      }
      
      // Mark as processed
      this.hasProcessed = true;
      
      // Clear timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      
      // Show error if failed
      if (!success) {
        this.logState('FAILED - Navigation unsuccessful');
        this.clearUrlParams(featureId || undefined, boundaryId || undefined);
        toastCallback({
          title: "Navigation Failed",
          description: "Could not locate the item on the map.",
          variant: "destructive",
        });
      }
    },
    
    // Set failure timeout
    setFailureTimeout(toastCallback: Function) {
      if (!this.isEnabled || this.timeoutId || this.hasProcessed) {
        this.logState('SKIP - Timeout already set or processed');
        return;
      }
      
      if (this.isDashboardNavigation()) {
        this.logState('SKIP - Dashboard navigation, no timeout needed');
        return;
      }
      
      const { featureId, boundaryId } = this.getNavigationParams();
      if (!featureId && !boundaryId) {
        this.logState('SKIP - No params for timeout');
        return;
      }
      
      this.logState('SETTING - Failure timeout');
      this.timeoutId = setTimeout(() => {
        if (!this.hasProcessed) {
          this.logState('TIMEOUT - Navigation took too long');
          toastCallback({
            title: "Navigation Timeout",
            description: "Navigation took too long. Please try again.",
            variant: "destructive",
          });
          this.clearUrlParams(featureId || undefined, boundaryId || undefined);
          this.hasProcessed = true;
        }
        this.timeoutId = null;
      }, 5000);
    },
    
    // Reset navigation state
    reset() {
      const currentUrl = window.location.href;
      
      // Don't reset if disabled
      if (!this.isEnabled) {
        this.logState('SKIP RESET - Controller disabled');
        return;
      }
      
      // Don't reset if this is dashboard navigation
      if (this.isDashboardNavigation()) {
        this.logState('SKIP RESET - Dashboard navigation');
        return;
      }
      
      // Only reset if URL actually changed
      if (this.lastUrl === currentUrl) {
        this.logState('SKIP RESET - Same URL');
        return;
      }
      
      this.logState('RESET - Navigation controller');
      this.hasProcessed = false;
      this.lastUrl = currentUrl;
      
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },
    
    // Enable/disable controller
    setEnabled(enabled: boolean) {
      this.isEnabled = enabled;
      console.log(`🔧 Navigation controller ${enabled ? 'ENABLED' : 'DISABLED'}`);
      if (!enabled) {
        this.hasProcessed = true;
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
      }
    }
  });

  // ✅ ENHANCED NAVIGATION EFFECT WITH DEBUGGING AND EARLY EXITS
  const lastProcessedUrl = useRef('');
  
  useEffect(() => {
    const controller = navigationController.current;
    const currentUrl = window.location.search;
    
    // Early exit if controller is disabled
    if (!controller.isEnabled) {
      controller.logState('Navigation effect skipped - controller disabled');
      return;
    }
    
    controller.logState('Navigation effect triggered');
    
    // Skip if dashboard navigation
    if (controller.isDashboardNavigation()) {
      controller.hasProcessed = true;
      lastProcessedUrl.current = currentUrl;
      return;
    }
    
    // Skip if we already processed this exact URL
    if (lastProcessedUrl.current === currentUrl && controller.hasProcessed) {
      controller.logState('SKIP - Already processed this URL');
      return;
    }
    
    const { featureId, boundaryId } = controller.getNavigationParams();
    
    // No navigation needed
    if (!featureId && !boundaryId) {
      controller.hasProcessed = true;
      lastProcessedUrl.current = currentUrl;
      return;
    }
    
    // Already processed
    if (controller.hasProcessed) {
      controller.logState('SKIP - Already processed in effect');
      return;
    }
    
    // Set timeout once
    if (!controller.timeoutId) {
      controller.setFailureTimeout(stableToast);
    }
    
    // Try navigation when conditions are met
    if (mapMethods && ((featureId && features.length > 0) || (boundaryId && boundaries.length > 0))) {
      const timer = setTimeout(() => {
        controller.attemptNavigation(mapMethods, features, boundaries, stableToast);
        lastProcessedUrl.current = currentUrl;
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [mapMethods, features.length, boundaries.length, stableToast]);

  // ✅ INITIALIZE: Reset navigation state on component mount
  useEffect(() => {
    console.log('🚀 Navigation controller initialized');
    navigationController.current.reset();
  }, []);
  
  // ✅ URL CHANGE LISTENER - Reset navigation when URL changes
  useEffect(() => {
    const handlePopState = () => {
      console.log('🔄 PopState event - URL changed');
      navigationController.current.reset();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // ✅ CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      const controller = navigationController.current;
      if (controller.timeoutId) {
        clearTimeout(controller.timeoutId);
        controller.timeoutId = null;
      }
    };
  }, []);

  // ✅ EMERGENCY CONTROLS FOR DEBUGGING
  const emergencyDisableNavigation = useCallback(() => {
    navigationController.current.setEnabled(false);
    console.log('🛑 EMERGENCY: Navigation controller disabled');
  }, []);

  const emergencyEnableNavigation = useCallback(() => {
    navigationController.current.setEnabled(true);
    console.log('✅ Navigation controller re-enabled');
  }, []);

  // ✅ NAVIGATION MONITORING FOR DEBUGGING
  useEffect(() => {
    let navigationCount = 0;
    const startTime = Date.now();
    
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      navigationCount++;
      console.log(`🔄 [${navigationCount}] PushState:`, args[2]);
      if (navigationCount > 5) {
        console.warn(`⚠️ HIGH NAVIGATION ACTIVITY: ${navigationCount} navigations`);
      }
      return originalPushState.apply(this, args);
    };
    
    window.history.replaceState = function(...args) {
      navigationCount++;
      console.log(`🔄 [${navigationCount}] ReplaceState:`, args[2]);
      if (navigationCount > 5) {
        console.warn(`⚠️ HIGH NAVIGATION ACTIVITY: ${navigationCount} navigations`);
      }
      return originalReplaceState.apply(this, args);
    };
    
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Handle map navigation errors
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
  }, []);
  
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

  // Coordinate system detection and transformation
  const detectCoordinateSystem = (coordinates: number[]): 'geographic' | 'projected' | 'unknown' => {
    if (!coordinates || coordinates.length < 2) return 'unknown';
    
    const [x, y] = coordinates;
    
    if (x >= -180.0 && x <= 180.0 && y >= -90.0 && y <= 90.0) {
      const isLikelyGeographic = (
        (Math.abs(x) <= 180 && Math.abs(y) <= 90) &&
        !(Math.abs(x) > 1000 && Math.abs(y) > 1000 && 
          Number.isInteger(x) && Number.isInteger(y))
      );
      
      if (isLikelyGeographic) {
        return 'geographic';
      }
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
      if (cached.success) {
        console.log(`🔄 Using cached transformation for [${x}, ${y}] -> ${cached.projection}`);
      }
      return cached;
    }
    
    const commonProjections = [
      { name: 'Web Mercator (EPSG:3857)', proj: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs' },
      { name: 'UTM Zone 10N (EPSG:32610)', proj: '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 11N (EPSG:32611)', proj: '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 12N (EPSG:32612)', proj: '+proj=utm +zone=12 +datum=WGS84 +units=m +no_defs' },
      // Add more as needed...
    ];

    for (const projection of commonProjections) {
      try {
        const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
        const transformed = proj4(projection.proj, wgs84, [x, y]);
        
        const [lng, lat] = transformed;
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          console.log(`✅ Successfully transformed coordinates using ${projection.name}`);
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
        if (!transformationCache.current.has('warning_shown')) {
          console.warn('⚠️ Projected coordinates detected. Attempting to transform to geographic coordinates.');
          transformationCache.current.set('warning_shown', { success: true });
        }
        
        const transformResult = transformProjectedCoordinates(coordinates);
        
        if (transformResult.success) {
          return { isValid: true, coords: transformResult.coords!, type: 'transformed' };
        } else {
          console.error('❌ Failed to transform projected coordinates. Using original values for testing.');
          memoizedToast({
            title: "Coordinate System Warning",
            description: "Could not transform projected coordinates. Map display may be incorrect.",
            variant: "destructive"
          });
          return { isValid: false, coords: coordinates, type: 'projected' };
        }
      
      default:
        console.warn('⚠️ Unknown coordinate system detected. Attempting to use as-is for testing.');
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
      console.warn('⚠️ Invalid shapefile data');
      memoizedToast({
        title: "Navigation Error",
        description: "Invalid shapefile data",
        variant: "destructive"
      });
      return;
    }
    
    let geojsonData: GeoJSONData;
    let processableFeatures: GeoJSONFeature[] = [];
    
    try {
      const rawFeatures = typeof shapefile.features === 'string'
        ? JSON.parse(shapefile.features)
        : shapefile.features;
      
      if (rawFeatures && typeof rawFeatures === 'object' && 'type' in rawFeatures && 
          rawFeatures.type === 'FeatureCollection' && 'features' in rawFeatures && 
          Array.isArray(rawFeatures.features)) {
        
        geojsonData = rawFeatures as GeoJSONFeatureCollection;
        processableFeatures = geojsonData.features;
      } 
      else if (Array.isArray(rawFeatures)) {
        geojsonData = rawFeatures as GeoJSONFeature[];
        processableFeatures = geojsonData;
      } 
      else {
        throw new Error("Invalid GeoJSON data format");
      }
      
      if (processableFeatures.length === 0) {
        console.warn('⚠️ Shapefile has no features to display');
        memoizedToast({
          title: "Empty Shapefile",
          description: `Shapefile "${shapefile.name}" contains no displayable features`,
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('❌ Error parsing shapefile features:', error);
      memoizedToast({
        title: "Invalid Shapefile Data",
        description: "Could not parse shapefile data",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate bounds with coordinate system validation
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    let validCoordinatesFound = false;
    let coordinateSystemType = '';
    let hasProjectedCoords = false;
    
    const processCoordinate = (coord: number[]) => {
      if (!Array.isArray(coord) || coord.length < 2) return;
      
      let [lng, lat] = coord;
      if (!isFinite(lng) || !isFinite(lat)) return;
      
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        const validation = validateAndProcessCoordinates([lng, lat]);
        
        if (!validation.isValid) {
          if (validation.type === 'projected') {
            hasProjectedCoords = true;
            coordinateSystemType = 'projected';
          }
          return;
        }
        
        const [validLng, validLat] = validation.coords!;
        coordinateSystemType = validation.type;
        lng = validLng;
        lat = validLat;
      } else {
        coordinateSystemType = 'geographic';
      }
      
      const validLng = lng;
      const validLat = lat;
      
      minLon = Math.min(minLon, validLng);
      maxLon = Math.max(maxLon, validLng);
      minLat = Math.min(minLat, validLat);
      maxLat = Math.max(maxLat, validLat);
      validCoordinatesFound = true;
    };
    
    const processCoordinates = (coords: any) => {
      if (!Array.isArray(coords)) return;
      
      if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        processCoordinate(coords);
      } else {
        coords.forEach(subCoord => processCoordinates(subCoord));
      }
    };
    
    processableFeatures.forEach(feature => {
      if (!feature || !feature.geometry) return;
      
      try {
        const geometry = typeof feature.geometry === 'string'
          ? JSON.parse(feature.geometry)
          : feature.geometry;
        
        if (geometry && geometry.coordinates) {
          processCoordinates(geometry.coordinates);
        }
      } catch (error) {
        console.error('Error processing feature geometry:', error);
      }
    });
    
    if (hasProjectedCoords && !validCoordinatesFound) {
      console.error('❌ Shapefile contains projected coordinates that could not be transformed');
      memoizedToast({
        title: "Coordinate Transformation Failed",
        description: `Shapefile "${shapefile.name}" uses a projected coordinate system that could not be automatically transformed.`,
        variant: "destructive"
      });
      return;
    }
    
    if (!validCoordinatesFound || !isFinite(minLon) || !isFinite(maxLon) || !isFinite(minLat) || !isFinite(maxLat)) {
      console.error('❌ Invalid coordinates calculated:', { minLon, maxLon, minLat, maxLat });
      memoizedToast({
        title: "Navigation Error",
        description: "Unable to calculate valid shapefile location.",
        variant: "destructive"
      });
      return;
    }
    
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
      console.error('❌ Coordinates outside valid geographic range:', { minLon, maxLon, minLat, maxLat });
      memoizedToast({
        title: "Coordinate Range Error",
        description: `Shapefile coordinates are outside valid geographic range.`,
        variant: "destructive"
      });
      return;
    }
    
    const lonPadding = (maxLon - minLon) * 0.1;
    const latPadding = (maxLat - minLat) * 0.1;
    
    const extent = [
      minLon - lonPadding,
      minLat - latPadding,
      maxLon + lonPadding,
      maxLat + latPadding
    ];
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLon + maxLon) / 2;
    
    console.log(`🎯 Zooming to shapefile "${shapefile.name}" (${coordinateSystemType} coordinates)`);
    console.log(`📊 Geographic extent: [minLng: ${extent[0]}, minLat: ${extent[1]}, maxLng: ${extent[2]}, maxLat: ${extent[3]}]`);
    console.log(`📍 Center: [lng: ${centerLng}, lat: ${centerLat}]`);
    
    if (!isFinite(centerLng) || !isFinite(centerLat) || 
        centerLng < -180 || centerLng > 180 || 
        centerLat < -90 || centerLat > 90) {
      console.error('❌ Invalid center coordinates calculated:', { centerLng, centerLat });
      memoizedToast({
        title: "Navigation Error",
        description: "Calculated center coordinates are invalid.",
        variant: "destructive"
      });
      return;
    }
    
    const zoomEvent = new CustomEvent('zoomToLocation', {
      detail: {
        lat: centerLat,
        lng: centerLng,
        zoom: calculateAppropriateZoom(extent),
        extent: extent,
        padding: true
      }
    });
    
    window.dispatchEvent(zoomEvent);
    console.log('✅ Zoom event dispatched');
    
    memoizedToast({
      title: "Navigating to Shapefile",
      description: `Showing "${shapefile.name}" on the map (${coordinateSystemType} coordinates)`,
    });
  };

  const zoomToRecentShapefile = () => {
    console.log('🔍 Attempting to zoom to recent shapefile...');
    
    if ((!allShapefiles || allShapefiles.length === 0) && (!localShapefiles || localShapefiles.length === 0)) {
      console.warn('⚠️ No shapefiles available');
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
    
    console.log('🎯 Selected recent shapefile:', {
      name: recentShapefile.name,
      source: localShapefiles.length > 0 ? 'local' : 'saved',
      id: recentShapefile._id
    });
    
    zoomToShapefile(recentShapefile);
  };

  const handleShapefileProcessed = (shapefile: Shapefile) => {
    console.log('💾 Processing shapefile:', shapefile.name, 'with', shapefile.featureCount, 'features');
    
    setLocalShapefiles(prev => {
      const newShapefiles = [...prev, shapefile];
      console.log('📂 Updated localShapefiles:', newShapefiles.map(s => s.name));
      return newShapefiles;
    });
    
    setTimeout(() => {
      console.log('⏱️ Timeout expired, zooming to shapefile');
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

  const isPolygonInAssignedBoundary = (polygonCoords: number[][][]) => {
    if (user?.role === "Supervisor") return true;
    
    if (boundaries.length === 0) {
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
        const drawnCoords = polygonCoords[0];
        
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
    console.log('Shapefile clicked:', shapefileData);
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
        console.log('🟢 Activating point selection mode');
        setPointSelectionMode(true);
        break;
      case 'line':
        console.log('🟢 Activating line drawing mode');
        setLineDrawingMode(true);
        setLinePoints([]);
        break;
      case 'polygon':
        console.log('🟢 Activating polygon drawing mode');
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

  // ✅ BOUNDARIES BUTTON WITH PROPER NAVIGATION
  const handleBoundariesNavigation = useCallback(() => {
    console.log('🚀 Boundaries button clicked - navigating to dashboard');
    try {
      setLocation('/dashboard?tab=boundaries');
      console.log('✅ Navigation to boundaries completed');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback
      window.location.href = '/dashboard?tab=boundaries';
    }
  }, [setLocation]);

  return (
    <>
      {/* ✅ DEBUGGING CONTROLS - Remove after fixing */}
      <div className="fixed top-0 left-0 z-[9999] bg-red-500 text-white p-2 text-xs">
        <button onClick={emergencyDisableNavigation} className="mr-2 px-2 py-1 bg-red-700 rounded">
          🛑 Disable Nav
        </button>
        <button onClick={emergencyEnableNavigation} className="mr-2 px-2 py-1 bg-green-700 rounded">
          ✅ Enable Nav
        </button>
        <button onClick={handleBoundariesNavigation} className="px-2 py-1 bg-blue-700 rounded">
          🎯 Test Boundaries
        </button>
      </div>

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
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    {boundaries.length > 0 
                      ? "Features only within boundary"
                      : "No boundary assigned"
                    }
                  </p>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-[1000] hidden lg:block">
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
      
      {/* All the modals */}
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
