import { useState, useEffect, useRef, useCallback } from "react";
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

  // Track navigation attempts to prevent infinite loops
  const navigationAttemptedRef = useRef<Set<string>>(new Set());
  
  // Clear navigation tracking when URL changes significantly
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const featureId = urlParams.get('feature');
    const boundaryId = urlParams.get('boundary');
    
    // If no navigation parameters exist, clear the tracking
    if (!featureId && !boundaryId) {
      navigationAttemptedRef.current.clear();
    }
  }, []); // Remove window.location.search dependency to prevent infinite loops
  
  // Debounced navigation handler to prevent rapid successive calls
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeNavigationRef = useRef<Set<string>>(new Set());
  
  // Handle URL parameters for navigation - using useCallback to prevent re-creation
  const handleUrlNavigation = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const featureId = urlParams.get('feature');
    const boundaryId = urlParams.get('boundary');
    
    // Only proceed if there are URL parameters to process
    if (!featureId && !boundaryId) return;
    
    // Check if map methods are available
    if (!mapMethods) {
      console.log('🔄 MapView navigation deferred - mapMethods not ready');
      return;
    }
    
    console.log('🔄 MapView navigation effect triggered');
    console.log('mapMethods available:', !!mapMethods);
    console.log('features count:', features.length);
    console.log('boundaries count:', boundaries.length);
    console.log('URL params - featureId:', featureId, 'boundaryId:', boundaryId);

    // Clear any existing navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Debounce navigation attempts
    navigationTimeoutRef.current = setTimeout(() => {
      if (featureId && features.length > 0) {
        const navigationKey = `feature-${featureId}`;
        
        // Check if navigation is already in progress or completed
        if (navigationAttemptedRef.current.has(navigationKey) || activeNavigationRef.current.has(navigationKey)) {
          console.log('📍 Navigation already attempted/in progress for feature:', featureId);
          return;
        }
        
        console.log('📍 Starting feature navigation for ID:', featureId);
        activeNavigationRef.current.add(navigationKey);
        
        // Single attempt with immediate feedback
        const success = mapMethods.zoomToFeature(featureId);
        
        if (success) {
          console.log('✅ Feature navigation successful');
          navigationAttemptedRef.current.add(navigationKey);
          // Clear the URL parameter after successful navigation
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('feature');
          window.history.replaceState({}, '', newUrl.toString());
        } else {
          console.log('❌ Feature navigation failed - feature not found');
          toast({
            title: "Navigation Failed",
            description: "Unable to locate the feature on the map. The map may still be loading.",
            variant: "destructive",
          });
        }
        
        activeNavigationRef.current.delete(navigationKey);
      }

      if (boundaryId && boundaries.length > 0) {
        const navigationKey = `boundary-${boundaryId}`;
        
        // Check if navigation is already in progress or completed
        if (navigationAttemptedRef.current.has(navigationKey) || activeNavigationRef.current.has(navigationKey)) {
          console.log('🏔️ Navigation already attempted/in progress for boundary:', boundaryId);
          return;
        }
        
        console.log('🏔️ Starting boundary navigation for ID:', boundaryId);
        activeNavigationRef.current.add(navigationKey);
        
        // Single attempt with immediate feedback
        const success = mapMethods.zoomToBoundary(boundaryId);
        
        if (success) {
          console.log('✅ Boundary navigation successful');
          navigationAttemptedRef.current.add(navigationKey);
          // Clear the URL parameter after successful navigation
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('boundary');
          window.history.replaceState({}, '', newUrl.toString());
        } else {
          console.log('❌ Boundary navigation failed - boundary not found');
          toast({
            title: "Navigation Failed",
            description: "Unable to locate the boundary on the map. The map may still be loading.",
            variant: "destructive",
          });
        }
        
        activeNavigationRef.current.delete(navigationKey);
      }
    }, 500); // 500ms debounce
  }, []); // Remove dependencies that cause infinite loops

  // Handle URL parameters for navigation - trigger when essential dependencies change
  useEffect(() => {
    // Only trigger navigation when we have the essential components ready
    if (mapMethods && (features.length > 0 || boundaries.length > 0)) {
      handleUrlNavigation();
    }
  }, [mapMethods, features.length, boundaries.length, handleUrlNavigation]);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Handle map navigation errors
  useEffect(() => {
    const handleNavigationError = (event: CustomEvent) => {
      const { type, id, error } = event.detail;
      toast({
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
  }, [toast]);
  
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

  // Function to load shp.js library (same as in ShapefileUpload)
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

  // Function to process saved shapefiles (simplified to match temporary shapefile processing)
  const processSavedShapefileWithShpJS = async (shapefile: any) => {
    if (!shapefile.features) {
      console.warn(`⚠️ Saved shapefile "${shapefile.name}" has no features`);
      return shapefile;
    }
    
    try {
      // Parse features if they're a string
      let features = typeof shapefile.features === 'string' 
        ? JSON.parse(shapefile.features) 
        : shapefile.features;
      
      // If features are already processed GeoJSON, return as is without transformation
      if (features && (features.type === 'FeatureCollection' || Array.isArray(features))) {
        console.log(`✅ Saved shapefile "${shapefile.name}" already in GeoJSON format, using as-is`);
        return {
          ...shapefile,
          features: features
        };
      }
      
      // If features contain raw shapefile data, process with shpjs
      if (features instanceof ArrayBuffer || (features && features.buffer)) {
        console.log(`🔄 Processing saved shapefile "${shapefile.name}" with shpjs`);
        const shp = await loadShpJS();
        const geojson = await shp(features);
        
        // Extract features in the same way as ShapefileUpload
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
      
      // Return shapefile as-is if no processing needed
      return shapefile;
      
    } catch (error) {
      console.error(`❌ Error processing saved shapefile "${shapefile.name}":`, error);
      return shapefile;
    }
  };

  // Function to transform coordinates in saved shapefiles
  const transformSavedShapefileCoordinates = (shapefile: any) => {
    if (!shapefile.features) return shapefile;
    
    try {
      // Parse features if they're a string
      let features = typeof shapefile.features === 'string' 
        ? JSON.parse(shapefile.features) 
        : shapefile.features;
      
      // Handle different GeoJSON formats
      let processableFeatures: any[] = [];
      if (features && typeof features === 'object' && features.type === 'FeatureCollection' && Array.isArray(features.features)) {
        processableFeatures = features.features;
      } else if (Array.isArray(features)) {
        processableFeatures = features;
      } else {
        return shapefile; // Return unchanged if format is not recognized
      }
      
      // Transform coordinates in each feature
      const transformedFeatures = processableFeatures.map(feature => {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
          return feature;
        }
        
        const transformCoordinates = (coords: any): any => {
          if (!Array.isArray(coords)) return coords;
          
          // Check if this is a coordinate pair [lng, lat]
          if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const validation = validateAndProcessCoordinates(coords);
            return validation.isValid ? validation.coords : coords;
          }
          
          // Recursively transform nested coordinate arrays
          return coords.map(subCoord => transformCoordinates(subCoord));
        };
        
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: transformCoordinates(feature.geometry.coordinates)
          }
        };
      });
      
      // Reconstruct the features in the original format
      let transformedFeaturesData;
      if (features && typeof features === 'object' && features.type === 'FeatureCollection') {
        transformedFeaturesData = {
          ...features,
          features: transformedFeatures
        };
      } else {
        transformedFeaturesData = transformedFeatures;
      }
      
             console.log(`🔄 Applied coordinate transformation to saved shapefile: ${shapefile.name}`, {
         originalFeatureCount: processableFeatures.length,
         transformedFeatureCount: transformedFeatures.length,
         sampleOriginalCoords: processableFeatures[0]?.geometry?.coordinates,
         sampleTransformedCoords: transformedFeatures[0]?.geometry?.coordinates
       });
      
      return {
        ...shapefile,
        features: transformedFeaturesData
      };
      
    } catch (error) {
      console.error(`❌ Error transforming coordinates for shapefile ${shapefile.name}:`, error);
      return shapefile; // Return unchanged if transformation fails
    }
  };

  // Combine local and saved shapefiles, filtering by visibility and transforming coordinates
  useEffect(() => {
    const processShapefiles = async () => {
      const visibleSavedShapefiles = savedShapefiles.filter((shapefile: any) => shapefile.isVisible);
      
      // Process saved shapefiles asynchronously
      const processedSavedShapefiles = await Promise.all(
        visibleSavedShapefiles.map(processSavedShapefileWithShpJS)
      );
      
      const combined = [...localShapefiles, ...processedSavedShapefiles];
      setAllShapefiles(combined);
    };
    
    processShapefiles();
  }, [localShapefiles, savedShapefiles]);

  // Removed debug logging to reduce console noise

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

  // Location event listeners for built-in control (simplified)
  useEffect(() => {
    const handleLocationSuccess = (event: any) => {
      // Safe destructuring with validation
      if (!event || !event.detail || typeof event.detail !== 'object') {
        console.warn('Invalid locationSuccess event:', event);
        return;
      }
      
      const { message, latitude, longitude } = event.detail || {};
      
      if (message && latitude !== undefined && longitude !== undefined) {
        toast({
          title: "Location Found! 🎯",
          description: `${message} (${latitude}, ${longitude})`,
        });
      } else {
        console.warn('Incomplete location data:', event.detail);
      }
    };

    const handleLocationError = (event: any) => {
      // Safe destructuring with validation
      if (!event || !event.detail || typeof event.detail !== 'object') {
        console.warn('Invalid locationError event:', event);
        return;
      }
      
      const { message } = event.detail || {};
      
      if (message) {
        toast({
          title: "Location Error ❌",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Location Error ❌",
          description: "Unknown location error occurred",
          variant: "destructive",
        });
      }
    };

    // Add event listeners
    window.addEventListener('locationSuccess', handleLocationSuccess);
    window.addEventListener('locationError', handleLocationError);

    // Cleanup
    return () => {
      window.removeEventListener('locationSuccess', handleLocationSuccess);
      window.removeEventListener('locationError', handleLocationError);
    };
  }, [toast]);

  // Helper function to detect if coordinates are in projected vs geographic coordinate system
  const detectCoordinateSystem = (coordinates: number[]): 'geographic' | 'projected' | 'unknown' => {
    if (!coordinates || coordinates.length < 2) return 'unknown';
    
    const [x, y] = coordinates;
    
    // More precise check for valid geographic coordinates
    // Allow for slightly more precision in the range check
    if (x >= -180.0 && x <= 180.0 && y >= -90.0 && y <= 90.0) {
      // Additional check: if coordinates are suspiciously large integers, they might be projected
      // But allow for reasonable decimal precision in geographic coordinates
      const isLikelyGeographic = (
        (Math.abs(x) <= 180 && Math.abs(y) <= 90) &&
        !(Math.abs(x) > 1000 && Math.abs(y) > 1000 && 
          Number.isInteger(x) && Number.isInteger(y))
      );
      
      if (isLikelyGeographic) {
        return 'geographic';
      }
    }
    
    // Check if coordinates look like common projected systems
    // UTM coordinates are typically 6-7 digits for easting, 7-8 digits for northing
    // State Plane coordinates vary but are typically large numbers
    if ((Math.abs(x) > 180 || Math.abs(y) > 90) && 
        (Math.abs(x) < 10000000 && Math.abs(y) < 20000000)) {
      return 'projected';
    }
    
    return 'unknown';
  };

  // Cache for coordinate transformations to avoid redundant processing
  const transformationCache = useRef<Map<string, { success: boolean; coords?: number[]; projection?: string }>>(new Map());

  // Function to clear transformation cache when needed
  const clearTransformationCache = () => {
    transformationCache.current.clear();
    console.log('🔄 Transformation cache cleared');
  };

  // Clear cache when shapefiles change to ensure fresh processing
  useEffect(() => {
    clearTransformationCache();
  }, [allShapefiles.length]);

  // Helper function to attempt coordinate transformation from common projected systems
  const transformProjectedCoordinates = (coordinates: number[]): { success: boolean; coords?: number[]; projection?: string } => {
    const [x, y] = coordinates;
    
    // Create cache key
    const cacheKey = `${x},${y}`;
    
    // Check cache first
    if (transformationCache.current.has(cacheKey)) {
      const cached = transformationCache.current.get(cacheKey)!;
      if (cached.success) {
        console.log(`🔄 Using cached transformation for [${x}, ${y}] -> ${cached.projection}`);
      }
      return cached;
    }
    
    // Common projected coordinate systems to try
    const commonProjections = [
      // Web Mercator (most common web projection)
      { name: 'Web Mercator (EPSG:3857)', proj: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs' },
      
      // UTM zones (Northern Hemisphere - common zones)
      { name: 'UTM Zone 10N (EPSG:32610)', proj: '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 11N (EPSG:32611)', proj: '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 12N (EPSG:32612)', proj: '+proj=utm +zone=12 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 13N (EPSG:32613)', proj: '+proj=utm +zone=13 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 14N (EPSG:32614)', proj: '+proj=utm +zone=14 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 15N (EPSG:32615)', proj: '+proj=utm +zone=15 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 16N (EPSG:32616)', proj: '+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 17N (EPSG:32617)', proj: '+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 18N (EPSG:32618)', proj: '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 19N (EPSG:32619)', proj: '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 20N (EPSG:32620)', proj: '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 30N (EPSG:32630)', proj: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 31N (EPSG:32631)', proj: '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 32N (EPSG:32632)', proj: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 33N (EPSG:32633)', proj: '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 34N (EPSG:32634)', proj: '+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 35N (EPSG:32635)', proj: '+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 36N (EPSG:32636)', proj: '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs' },
      
      // UTM zones (Southern Hemisphere - common zones)
      { name: 'UTM Zone 30S (EPSG:32730)', proj: '+proj=utm +zone=30 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 31S (EPSG:32731)', proj: '+proj=utm +zone=31 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 32S (EPSG:32732)', proj: '+proj=utm +zone=32 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 33S (EPSG:32733)', proj: '+proj=utm +zone=33 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 34S (EPSG:32734)', proj: '+proj=utm +zone=34 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 35S (EPSG:32735)', proj: '+proj=utm +zone=35 +south +datum=WGS84 +units=m +no_defs' },
      { name: 'UTM Zone 36S (EPSG:32736)', proj: '+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs' },
      
      // National grids and other common projections
      { name: 'British National Grid (EPSG:27700)', proj: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs' },
      { name: 'State Plane California III (EPSG:2227)', proj: '+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs' },
    ];

    // Try each projection
    for (const projection of commonProjections) {
      try {
        const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
        const transformed = proj4(projection.proj, wgs84, [x, y]);
        
        // Check if the transformed coordinates are within valid geographic bounds
        const [lng, lat] = transformed;
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          console.log(`✅ Successfully transformed coordinates using ${projection.name}`);
          const result = { success: true, coords: [lng, lat], projection: projection.name };
          
          // Cache the result
          transformationCache.current.set(cacheKey, result);
          
          return result;
        }
      } catch (error) {
        // Projection failed, try next one
        continue;
      }
    }
    
    const result = { success: false };
    // Cache the failed result to avoid retrying
    transformationCache.current.set(cacheKey, result);
    
    return result;
  };

  // Helper function to validate and potentially convert coordinates
  const validateAndProcessCoordinates = (coordinates: number[]): { isValid: boolean; coords?: number[]; type: string } => {
    const coordType = detectCoordinateSystem(coordinates);
    
    switch (coordType) {
      case 'geographic':
        return { isValid: true, coords: coordinates, type: 'geographic' };
      
      case 'projected':
        // Only show warning once per shapefile processing session
        if (!transformationCache.current.has('warning_shown')) {
          console.warn('⚠️ Projected coordinates detected. Attempting to transform to geographic coordinates.');
          transformationCache.current.set('warning_shown', { success: true });
        }
        
        // Attempt to transform projected coordinates to geographic
        const transformResult = transformProjectedCoordinates(coordinates);
        
        if (transformResult.success) {
          // Only log success once per unique coordinate transformation
          return { isValid: true, coords: transformResult.coords!, type: 'transformed' };
        } else {
          console.error('❌ Failed to transform projected coordinates. Using original values for testing.');
          toast({
            title: "Coordinate System Warning",
            description: "Could not transform projected coordinates. Map display may be incorrect.",
            variant: "destructive"
          });
          // Return as invalid to prevent out-of-bounds errors
          return { isValid: false, coords: coordinates, type: 'projected' };
        }
      
      default:
        console.warn('⚠️ Unknown coordinate system detected. Attempting to use as-is for testing.');
        return { isValid: true, coords: coordinates, type: 'unknown' };
    }
  };

  // Helper function to calculate appropriate zoom level based on extent size
  const calculateAppropriateZoom = (extent: number[]) => {
    const [minLon, minLat, maxLon, maxLat] = extent;
    const width = maxLon - minLon;
    const height = maxLat - minLat;
    
    // Rough heuristic - adjust as needed for your map
    if (width > 5 || height > 5) return 8;  // Country/region level
    if (width > 1 || height > 1) return 10; // Large city level
    if (width > 0.1 || height > 0.1) return 13; // City level
    if (width > 0.01 || height > 0.01) return 15; // Neighborhood level
    return 17; // Street level
  };

  // Function to zoom to a specific shapefile with coordinate validation
  const zoomToShapefile = (shapefile: Shapefile) => {
    console.log('🔍 Zooming to specific shapefile:', shapefile.name);
    
    // Debug shapefile structure
    debugShapefileStructure(shapefile);
    
    if (!shapefile || !shapefile.features) {
      console.warn('⚠️ Invalid shapefile data');
      toast({
        title: "Navigation Error",
        description: "Invalid shapefile data",
        variant: "destructive"
      });
      return;
    }
    
    // Extract features
    let geojsonData: GeoJSONData;
    let processableFeatures: GeoJSONFeature[] = [];
    
    try {
      const rawFeatures = typeof shapefile.features === 'string'
        ? JSON.parse(shapefile.features)
        : shapefile.features;
      
      // Check if it's a GeoJSON FeatureCollection
      if (rawFeatures && typeof rawFeatures === 'object' && 'type' in rawFeatures && 
          rawFeatures.type === 'FeatureCollection' && 'features' in rawFeatures && 
          Array.isArray(rawFeatures.features)) {
        
        geojsonData = rawFeatures as GeoJSONFeatureCollection;
        processableFeatures = geojsonData.features;
      } 
      // Check if it's an array of features
      else if (Array.isArray(rawFeatures)) {
        geojsonData = rawFeatures as GeoJSONFeature[];
        processableFeatures = geojsonData;
      } 
      else {
        throw new Error("Invalid GeoJSON data format");
      }
      
      if (processableFeatures.length === 0) {
        console.warn('⚠️ Shapefile has no features to display');
        toast({
          title: "Empty Shapefile",
          description: `Shapefile "${shapefile.name}" contains no displayable features`,
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('❌ Error parsing shapefile features:', error);
      toast({
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
    
    // Function to process a single coordinate pair with validation
    const processCoordinate = (coord: number[]) => {
      if (!Array.isArray(coord) || coord.length < 2) return;
      
      let [lng, lat] = coord;
      if (!isFinite(lng) || !isFinite(lat)) return;
      
      // Check if coordinates are valid geographic coordinates (longitude/latitude)
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        // These might be projected coordinates that weren't transformed
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
        // Coordinates are already in valid geographic range
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
    
    // Function to recursively process coordinate arrays
    const processCoordinates = (coords: any) => {
      if (!Array.isArray(coords)) return;
      
      // Check if this is a coordinate pair or nested array
      if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        processCoordinate(coords);
      } else {
        // Process nested arrays
        coords.forEach(subCoord => processCoordinates(subCoord));
      }
    };
    
    // Process all features
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
    
    // Handle projected coordinate system
    if (hasProjectedCoords && !validCoordinatesFound) {
      console.error('❌ Shapefile contains projected coordinates that could not be transformed');
      toast({
        title: "Coordinate Transformation Failed",
        description: `Shapefile "${shapefile.name}" uses a projected coordinate system that could not be automatically transformed. Please provide the shapefile in geographic coordinates (WGS84) or contact support for help with coordinate system conversion.`,
        variant: "destructive"
      });
      return;
    }
    
    // Validate bounds
    if (!validCoordinatesFound || !isFinite(minLon) || !isFinite(maxLon) || !isFinite(minLat) || !isFinite(maxLat)) {
      console.error('❌ Invalid coordinates calculated:', { minLon, maxLon, minLat, maxLat });
      toast({
        title: "Navigation Error",
        description: "Unable to calculate valid shapefile location. The coordinate system may be unsupported.",
        variant: "destructive"
      });
      return;
    }
    
    // Additional validation for reasonable coordinate ranges
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
      console.error('❌ Coordinates outside valid geographic range:', { minLon, maxLon, minLat, maxLat });
      toast({
        title: "Coordinate Range Error",
        description: `Shapefile coordinates are outside valid geographic range (Longitude: ${minLon.toFixed(2)} to ${maxLon.toFixed(2)}, Latitude: ${minLat.toFixed(2)} to ${maxLat.toFixed(2)}). This suggests the shapefile uses a projected coordinate system that needs transformation.`,
        variant: "destructive"
      });
      return;
    }
    
    // Add padding (10%)
    const lonPadding = (maxLon - minLon) * 0.1;
    const latPadding = (maxLat - minLat) * 0.1;
    
    // Calculate padded extent
    const extent = [
      minLon - lonPadding,
      minLat - latPadding,
      maxLon + lonPadding,
      maxLat + latPadding
    ];
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLon + maxLon) / 2;
    
    console.log(`🎯 Zooming to shapefile "${shapefile.name}" (${coordinateSystemType} coordinates)`);
    console.log(`📊 Geographic extent: [minLng: ${extent[0]}, minLat: ${extent[1]}, maxLng: ${extent[2]}, maxLat: ${extent[3]}]`);
    console.log(`📍 Center: [lng: ${centerLng}, lat: ${centerLat}]`);
    
    // Validate the calculated center coordinates
    if (!isFinite(centerLng) || !isFinite(centerLat) || 
        centerLng < -180 || centerLng > 180 || 
        centerLat < -90 || centerLat > 90) {
      console.error('❌ Invalid center coordinates calculated:', { centerLng, centerLat });
      toast({
        title: "Navigation Error",
        description: "Calculated center coordinates are invalid. Cannot navigate to shapefile.",
        variant: "destructive"
      });
      return;
    }
    
    // Create a custom event to trigger map zoom
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
    
    toast({
      title: "Navigating to Shapefile",
      description: `Showing "${shapefile.name}" on the map (${coordinateSystemType} coordinates)`,
    });
  };

  // Function to zoom to the most recent shapefile
  const zoomToRecentShapefile = () => {
    console.log('🔍 Attempting to zoom to recent shapefile...');
    console.log('📊 Current state:', {
      allShapefiles: allShapefiles.length,
      localShapefiles: localShapefiles.length,
      allShapefilesNames: allShapefiles.map(s => s.name),
      localShapefilesNames: localShapefiles.map(s => s.name)
    });
    
    // Check if we have any shapefiles available (local or saved)
    if ((!allShapefiles || allShapefiles.length === 0) && (!localShapefiles || localShapefiles.length === 0)) {
      console.warn('⚠️ No shapefiles available');
      toast({
        title: "No Shapefiles",
        description: "No shapefiles are currently visible",
        variant: "destructive"
      });
      return;
    }
    
    // Get the most recent shapefile (prioritize local uploads, then saved)
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

  // Handle shapefile processing from the upload component
  const handleShapefileProcessed = (shapefile: Shapefile) => {
    console.log('💾 Processing shapefile:', shapefile.name, 'with', shapefile.featureCount, 'features');
    
    setLocalShapefiles(prev => {
      const newShapefiles = [...prev, shapefile];
      console.log('📂 Updated localShapefiles:', newShapefiles.map(s => s.name));
      return newShapefiles;
    });
    
    // Zoom to the new shapefile directly instead of relying on state
    setTimeout(() => {
      console.log('⏱️ Timeout expired, zooming to shapefile');
      zoomToShapefile(shapefile);
    }, 300);
    
    toast({
      title: "Shapefile Added",
      description: `"${shapefile.name}" with ${shapefile.featureCount || 0} features`,
    });
  };

  // Function to debug shapefile data structure
  const debugShapefileStructure = (shapefile: Shapefile) => {
    console.log('🔍 Debugging shapefile structure:', {
      name: shapefile.name,
      id: shapefile._id,
      isVisible: shapefile.isVisible,
      featuresType: typeof shapefile.features,
      featuresLength: Array.isArray(shapefile.features) ? shapefile.features.length : 'Not an array',
      firstFeature: shapefile.features && Array.isArray(shapefile.features) ? shapefile.features[0] : 'No features or not array',
      rawFeatures: shapefile.features
    });
    
    // Try to parse features if they're a string
    if (typeof shapefile.features === 'string') {
      try {
        const parsed = JSON.parse(shapefile.features);
        console.log('🔍 Parsed features structure:', {
          type: typeof parsed,
          isArray: Array.isArray(parsed),
          hasType: parsed && typeof parsed === 'object' && 'type' in parsed,
          typeValue: parsed?.type,
          hasFeatures: parsed && typeof parsed === 'object' && 'features' in parsed,
          featuresCount: parsed?.features?.length || 0
        });
      } catch (error) {
        console.error('❌ Failed to parse features as JSON:', error);
      }
    }
  };

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

  const handleShapefileClick = (shapefileData: any) => {
    console.log('Shapefile clicked:', shapefileData);
    
    // Show shapefile information in a toast
    toast({
      title: "Shapefile Feature",
      description: `${shapefileData.parentShapefile?.name || 'Shapefile'}: ${shapefileData.properties?.name || 'Feature'}`,
    });
  };

  // Handle shapefile selection from manager
  const handleShapefileSelect = (shapefile: any) => {
    console.log('📍 Shapefile selected from manager:', shapefile.name);
    zoomToShapefile(shapefile);
  };

  // Handle shapefile visibility toggle from manager
  const handleShapefileToggle = (shapefile: any, isVisible: boolean) => {
    console.log(`👁️ Shapefile visibility toggled: ${shapefile.name} - ${isVisible ? 'visible' : 'hidden'}`);
    // The effect above will automatically update allShapefiles when savedShapefiles changes
    queryClient.invalidateQueries({ queryKey: ["/api/shapefiles"] });
  };

  // Handle shapefile upload completion
  const handleShapefileUploaded = () => {
    console.log('🔄 Refreshing saved shapefiles after upload');
    queryClient.invalidateQueries({ queryKey: ["/api/shapefiles"] });
  };

  // Handle feature selection from dialog
  const handleFeatureSelect = (featureType: string, drawingType: 'point' | 'line' | 'polygon') => {
    console.log('🟢 Feature selected:', featureType, 'drawing type:', drawingType);
    setSelectedFeatureType(featureType);
    
    // Reset all drawing modes
    setPointSelectionMode(false);
    setLineDrawingMode(false);
    setDrawingMode(false);
    setSelectionMode(false);
    
    // Set appropriate drawing mode based on feature type
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
    
    // Store the drawn polygon for feature creation
    setDrawnPolygon({ coordinates: polygonData.coordinates });
    setDrawingMode(false);
    
    // Check if it's a boundary feature for supervisors
    if (selectedFeatureType === "Boundary" && user?.role === "Supervisor") {
      // Supervisor creating boundary - use supervisor modal with simplified form
      setSupervisorPolygonModalOpen(true);
    } else {
      // Regular polygon feature creation (for other polygon features or all users)
      setCreateFeatureModalOpen(true);
    }
    
    toast({
      title: "Polygon completed",
      description: "Fill out the form to save this feature.",
    });
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Map Container */}
        <div className="relative flex-1 z-0 h-[60vh] lg:h-full">
          {/* Mobile Controls Bar - Top */}
          <div className="absolute top-2 left-2 right-2 z-[1000] lg:hidden flex flex-wrap gap-2 justify-between">
            {/* Left side controls */}
            <div className="flex gap-2">
              {/* Show Recent Shapefile Button */}
              {(allShapefiles.length > 0 || localShapefiles.length > 0) && (
                <button
                  onClick={zoomToRecentShapefile}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1 text-xs font-medium transition-colors"
                >
                  📍 Shapefile
                </button>
              )}
            </div>
            
            {/* Shapefile Controls - Mobile */}
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
            {/* Left side buttons - Desktop */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              {/* Show Recent Shapefile Button - Desktop */}
              {(allShapefiles.length > 0 || localShapefiles.length > 0) && (
                <button
                  onClick={zoomToRecentShapefile}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  📍 Show Recent Shapefile
                </button>
              )}
            </div>
            
            {/* Shapefile Controls - Desktop Top Right */}
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
          
          {/* Desktop Drawing Button - For All Users */}
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

          {/* Show boundary info for field users - Mobile */}
          {user?.role === "Field" && (
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
          )}

          {/* Desktop boundary info for field users */}
          {user?.role === "Field" && (
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
          )}
          
        </div>
        
        {/* Legend Panel - Responsive */}
        <div className="hidden lg:flex w-80 p-4 bg-gray-50 flex-col">
          <MapLegend />
        </div>

        {/* Mobile Legend Panel - Collapsible */}
        <div className="lg:hidden h-[40vh] bg-gray-50 border-t border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3">Map Legend</h3>
            <MapLegend />
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
      />
      
      {/* Supervisor Polygon Modal - for parcel/boundary creation */}
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

      {/* Regular Feature Creation Modal */}
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

      {/* Feature Selection Dialog */}
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
      
      {/* Point Feature Modal - WITH selectedFeatureType prop */}
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
          // @ts-ignore - Property exists in implementation but not in type definition
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