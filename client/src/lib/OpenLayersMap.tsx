import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Feature } from 'ol';
import { Point, Polygon, LineString, MultiPolygon, Circle as CircleGeometry } from 'ol/geom';
import { Style, Fill, Stroke, Circle, Text, Icon } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Draw, Modify, Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import GeoJSON from 'ol/format/GeoJSON';
import Geolocation from 'ol/Geolocation';
import Control from 'ol/control/Control'; // Import Control class
import { ITask, IUser, IFeature, IBoundary } from '../../../shared/schema';
import { getFeatureIcon } from '../components/FeatureIcons';
import { getStatusColor } from '../components/FeatureIcon';
import { Shapefile } from '@/components/ShapefileLayer';
import 'ol/ol.css';

// Import custom icons (keeping as fallback)
import towerIcon from '@assets/tower-removebg-preview_1750282584510.png';
import manholeIcon from '@assets/manhole-removebg-preview_1750282584509.png';
import fibercableIcon from '@assets/fibercable-removebg-preview_1750282584507.png';
import parcelIcon from '@assets/land-removebg-preview_1750282584509.png';

// Map various status names to our standardized status types
const mapToStandardStatus = (status: string): string => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'complete' || normalizedStatus === 'completed' || normalizedStatus === 'review_accepted') {
    return 'complete';
  } else if (normalizedStatus === 'assigned' || normalizedStatus === 'in progress' || normalizedStatus === 'submit-review' || normalizedStatus === 'review_inprogress' || normalizedStatus === 'inprogress') {
    return 'assigned';
  } else if (normalizedStatus === 'in-complete' || normalizedStatus === 'review_reject' || normalizedStatus === 'delayed') {
    return 'delayed';
  } else {
    return 'unassigned';
  }
};

// Define status colors matching our SVG system (kept for backward compatibility)
const statusColors = {
  'Unassigned': '#000000', // black
  'Assigned': '#3B82F6',   // blue
  'In Progress': '#3B82F6', // blue (treated as assigned)
  'Completed': '#10B981',   // green
  'Complete': '#10B981',    // green (alternative naming)
  'In-Complete': '#EF4444', // red (treated as delayed)
  'Submit-Review': '#3B82F6', // blue (treated as assigned)
  'Review_Accepted': '#10B981', // green
  'Review_Reject': '#EF4444',   // red
  'Review_inprogress': '#3B82F6', // blue
  'delayed': '#EF4444'      // red
};

// Enhanced Location Control with better visibility and bottom-right positioning
class LocationControl extends Control {
  private map: Map;
  private button: HTMLButtonElement;
  private locationLayer: VectorLayer<VectorSource>;
  private accuracyLayer: VectorLayer<VectorSource>;

  constructor(
    map: Map, 
    locationLayer: VectorLayer<VectorSource>, 
    accuracyLayer: VectorLayer<VectorSource>
  ) {
    const button = document.createElement('button');
    const element = document.createElement('div');
    
    super({
      element: element,
    });

    this.map = map;
    this.button = button;
    this.locationLayer = locationLayer;
    this.accuracyLayer = accuracyLayer;

    // Style the container - POSITIONED ABOVE ZOOM CONTROLS
    element.className = 'ol-unselectable ol-control';
    element.style.cssText = `
      bottom: 78px;
      right: 8px;
      position: absolute;
      pointer-events: auto;
    `;

    // Create standard location icon
    const locationSVG = this.createLocationIcon();
    
    // Style the button with SOLID BACKGROUND for better visibility
    button.innerHTML = locationSVG;
    
    button.style.cssText = `
      background-color: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      cursor: pointer;
      height: 2.375em;
      width: 2.375em;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.14em;
      font-weight: 700;
      text-decoration: none;
      text-align: center;
      pointer-events: auto;
      user-select: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    `;

    button.title = 'Show your location';
    button.type = 'button';

    // Enhanced hover effects for better visibility
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 1)';
      button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      button.style.transform = 'translateY(0)';
    });

    // Add click handler with console logging
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Location button clicked!');
      this.handleLocationClick();
    });
    
    element.appendChild(button);
    console.log('📍 Location control created and button attached');
  }

  private createLocationIcon(isLoading: boolean = false): string {
    if (isLoading) {
      // Loading spinner - with darker color for better visibility
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="#666" stroke-width="2" fill="none" opacity="0.3"/>
          <path d="M12 3C16.97 3 21 7.03 21 12" stroke="#2563eb" stroke-width="2" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/>
          </path>
        </svg>
      `;
    }
    
    // Standard current location icon with better contrast (darker colors)
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer circle -->
        <circle cx="12" cy="12" r="8" stroke="#374151" stroke-width="1.5" fill="none"/>
        <!-- Center dot -->
        <circle cx="12" cy="12" r="2.5" fill="#2563eb"/>
        <!-- Radiating lines -->
        <line x1="12" y1="2" x2="12" y2="5" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="12" y1="19" x2="12" y2="22" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="12" x2="5" y2="12" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="19" y1="12" x2="22" y2="12" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  private handleLocationClick() {
    console.log('🎯 Handling location click...');
    
    // Update button to show loading state
    this.button.innerHTML = this.createLocationIcon(true);
    this.button.title = 'Getting location...';
    this.button.style.cursor = 'wait';

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      window.dispatchEvent(new CustomEvent('locationError', {
        detail: { 
          message: 'Geolocation not supported',
          instructions: 'Your browser does not support location services.'
        }
      }));
      this.resetButton();
      return;
    }

    console.log('🎯 Requesting current position...');
    
    // Request location with navigator.geolocation directly
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location found:', position.coords);
        const { latitude, longitude } = position.coords;
        
        // Convert to map projection and animate to location
        const coords = fromLonLat([longitude, latitude]);
        this.map.getView().animate({
          center: coords,
          zoom: Math.max(this.map.getView().getZoom() || 15, 16),
          duration: 1000
        });

        // Add location marker using the layer reference
        const locationSource = this.locationLayer.getSource();
        if (locationSource) {
          // Clear existing location markers
          locationSource.clear();
          
          // Add new location marker
          const locationFeature = new Feature({
            geometry: new Point(coords),
            name: 'user-location'
          });
          locationSource.addFeature(locationFeature);
          console.log('📍 Added location marker to map');
        }

        // Add accuracy circle if accuracy is available
        if (position.coords.accuracy) {
          const accuracySource = this.accuracyLayer.getSource();
          if (accuracySource) {
            accuracySource.clear();
            
            // Create accuracy circle using Circle geometry
            const accuracyFeature = new Feature({
              geometry: new CircleGeometry(coords, position.coords.accuracy),
              name: 'location-accuracy'
            });
            accuracySource.addFeature(accuracyFeature);
            console.log('📍 Added accuracy circle to map');
          }
        }

        // Dispatch success event
        window.dispatchEvent(new CustomEvent('locationSuccess', {
          detail: { 
            message: 'Location found successfully!',
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6)
          }
        }));

        // Reset button
        this.resetButton();
      },
      (error) => {
        console.error('❌ Location error:', error);
        
        let errorMessage = 'Unable to get your location';
        let instructions = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            instructions = 'Please enable location permissions in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            instructions = 'Please check your GPS or internet connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            instructions = 'Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred';
            instructions = 'Please try again.';
            break;
        }
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('locationError', {
          detail: { 
            message: errorMessage,
            instructions: instructions
          }
        }));

        // Reset button
        this.resetButton();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }

  private resetButton() {
    this.button.innerHTML = this.createLocationIcon();
    this.button.title = 'Show your location';
    this.button.style.cursor = 'pointer';
    console.log('🔄 Button reset to normal state');
  }
}

// Helper function to convert SVG to data URI - UPDATED with enhanced status mapping
const createSVGIcon = (featureType: string, status: string, size: number = 24): string => {
  const standardStatus = mapToStandardStatus(status);
  const color = getStatusColor(standardStatus);
  let svgContent = '';

  switch (featureType) {
    case 'Tower':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2L12 7L17 2V4L12 9L7 4V2Z"/>
        <path d="M6 10H18V12H16V20H8V12H6V10Z"/>
        <path d="M10 14H14V16H10V14Z"/>
        <path d="M11 18H13V19H11V18Z"/>
      </svg>`;
      break;
    case 'Manhole':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" fill="none" stroke="${color}" stroke-width="1"/>
        <rect x="10" y="10" width="4" height="4" fill="${color}"/>
        <path d="M12 2V6M12 18V22M22 12H18M6 12H2" stroke="${color}" stroke-width="1"/>
      </svg>`;
      break;
    case 'FiberCable':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12C3 7.03 7.03 3 12 3S21 7.03 21 12 16.97 21 12 21" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="M8 12C8 9.79 9.79 8 12 8S16 9.79 16 12 14.21 16 12 16" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="2" fill="${color}"/>
        <path d="M2 18L6 14M18 6L22 2" stroke="${color}" stroke-width="1"/>
      </svg>`;
      break;
    case 'Parcel':
    default:
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H21V21H3V3Z" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="M8 8H16V16H8V8Z" fill="${color}" fill-opacity="0.3"/>
        <path d="M6 6L10 10M18 6L14 10M6 18L10 14M18 18L14 14" stroke="${color}" stroke-width="1"/>
      </svg>`;
      break;
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
};

const featureColors = {
  'Tower': '#E91E63',
  'Manhole': '#9C27B0',
  'FiberCable': '#3F51B5',
  'Parcel': '#009688'
};

interface MapProps {
  center?: [number, number];
  zoom?: number;
  features?: IFeature[];
  teams?: IUser[];
  boundaries?: IBoundary[];
  tasks?: ITask[];
  allTeams?: any[];
  shapefiles?: Shapefile[];
  activeFilters?: string[];
  onFeatureClick?: (feature: IFeature) => void;
  onBoundaryClick?: (boundary: IBoundary) => void;
  onTeamClick?: (team: IUser) => void;
  onShapefileClick?: (shapefile: any) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  onMapDoubleClick?: () => void;
  onPolygonCreated?: (polygon: { name: string; coordinates: number[][][] }) => void;
  onLineCreated?: (line: { coordinates: { lat: number; lng: number }[] }) => void;
  selectionMode?: boolean;
  drawingMode?: boolean;
  pointSelectionMode?: boolean;
  lineDrawingMode?: boolean;
  linePoints?: { lat: number; lng: number }[];
  className?: string;
  clearDrawnPolygon?: boolean;
}

const OpenLayersMap = ({
  center = [67.0011, 24.8607],
  zoom = 13,
  features = [],
  teams = [],
  boundaries = [],
  tasks = [],
  allTeams = [],
  shapefiles = [],
  activeFilters = ['All'],
  onFeatureClick,
  onBoundaryClick,
  onTeamClick,
  onShapefileClick,
  onMapClick,
  onMapDoubleClick,
  onPolygonCreated,
  onLineCreated,
  selectionMode = false,
  drawingMode = false,
  pointSelectionMode = false,
  lineDrawingMode = false,
  linePoints = [],
  className = 'h-full w-full',
  clearDrawnPolygon = false
}: MapProps) => {
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const featuresLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const teamsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const boundariesLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const tasksLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const shapefilesLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const selectedLocationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const selectedLocationSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const drawLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);

  // OpenLayers Geolocation references
  const geolocationRef = useRef<Geolocation | null>(null);
  const locationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const accuracyLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const locationControlRef = useRef<LocationControl | null>(null);

  // State for triggering shapefile re-processing on zoom changes
  const [shapefileUpdateTrigger, setShapefileUpdateTrigger] = useState(0);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create vector sources for different layers
    const featuresSource = new VectorSource();
    const teamsSource = new VectorSource();
    const boundariesSource = new VectorSource();
    const tasksSource = new VectorSource();
    const shapefilesSource = new VectorSource();
    const selectedLocationSource = new VectorSource();
    selectedLocationSourceRef.current = selectedLocationSource;

    // Create location-specific sources
    const locationSource = new VectorSource();
    const accuracySource = new VectorSource();

    // Create vector layers
    featuresLayerRef.current = new VectorLayer({
      source: featuresSource,
      style: (feature, resolution) => {
        const featureData = feature.get('featureData');
        const featureType = featureData?.feaType || 'Tower';
        
        // Calculate zoom-responsive scale (extremely small when zoomed out)
        const zoom = mapRef.current?.getView().getZoom() || 13;
        const baseScale = Math.max(0.05, Math.min(0.4, (zoom - 8) / 20));
        const iconSize = Math.max(16, Math.min(32, zoom * 2));
        
        // FIXED: Changed feaState to feaStatus for proper color determination
        const featureStatus = featureData?.feaStatus || featureData?.status || 'Unassigned';
        
        // Create SVG icon with status-based color using enhanced system
        const svgIconSrc = createSVGIcon(featureType, featureStatus, iconSize);
        
        // Handle different geometry types
        const geometry = feature.getGeometry();
        const geometryType = geometry?.getType();
        
        if (geometryType === 'LineString' || featureType === 'FiberCable') {
          // For line features (fiber cables), use stroke styling with status-based colors
          const lineWidth = Math.max(2, Math.min(6, zoom / 3));
          const standardStatus = mapToStandardStatus(featureStatus);
          const statusColor = getStatusColor(standardStatus);
          
          return new Style({
            stroke: new Stroke({
              color: statusColor,
              width: lineWidth
            }),
            text: new Text({
              text: featureData?.name || `${featureType} #${featureData?.feaNo}`,
              placement: 'line',
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`
            })
          });
        } else if (geometryType === 'Polygon' || featureType === 'Parcel') {
          // For polygon features (parcels), use blue fill and stroke with team assignment
          const strokeWidth = Math.max(1, Math.min(3, zoom / 5));
          const isParcel = featureType === 'Parcel';
          
          // Use custom colors for parcels if available, otherwise use assignment-based colors
          let fillColor, strokeColor;
          if (isParcel) {
            // Check if parcel has a custom color
            if (featureData?.color) {
              // Use custom color with transparency for fill
              fillColor = `${featureData.color}40`; // 25% opacity
              strokeColor = featureData.color;
            } else {
              // Make boundaries hollow (no fill) with dashed outline for default parcels
              fillColor = 'rgba(0, 0, 0, 0)'; // Completely transparent fill
              if (featureData?.assignedTo) {
                // Assigned boundary - blue dashed outline
                strokeColor = '#2196F3';
              } else {
                // Unassigned boundary - green dashed outline
                strokeColor = '#4CAF50';
              }
            }
          } else {
            // Other polygon types - original colors
            fillColor = `${featureColors[featureType as keyof typeof featureColors] || '#009688'}40`;
            strokeColor = featureColors[featureType as keyof typeof featureColors] || '#009688';
          }
          
          // Get team assignment information for parcels
          let labelText = featureData?.name || `${featureType} #${featureData?.feaNo}`;
          if (isParcel && featureData?.assignedTo) {
            // Add team assignment to the label - assignedTo contains team ID, need to find team name
            const teamName = teams?.find((team: any) => team._id === featureData.assignedTo)?.name || 'Unknown Team';
            labelText = `${labelText}\nAssigned to: ${teamName}`;
          }
          
          return new Style({
            fill: new Fill({
              color: fillColor
            }),
            stroke: new Stroke({
              color: strokeColor,
              width: strokeWidth,
              lineDash: (isParcel && !featureData?.color) ? [8, 8] : undefined // Dashed only for boundaries without custom colors
            }),
            text: new Text({
              text: labelText,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`,
              textAlign: 'center',
              textBaseline: 'middle'
            })
          });
        } else {
          // For point features (towers, manholes), use SVG icons with status-based colors
          return new Style({
            image: new Icon({
              src: svgIconSrc,
              scale: 1,
              anchor: [0.5, 0.5],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction'
            }),
            text: new Text({
              text: featureData?.name || `${featureType} #${featureData?.feaNo}`,
              offsetY: iconSize + 10,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`,
              textAlign: 'center'
            })
          });
        }
      }
    });

    teamsLayerRef.current = new VectorLayer({
      source: teamsSource,
      style: (feature) => {
        const teamData = feature.get('teamData');
        const isActive = teamData?.lastActive && 
          (new Date().getTime() - new Date(teamData.lastActive).getTime() < 15 * 60 * 1000);
        const statusColor = isActive ? '#4CAF50' : '#F44336';
        
        return new Style({
          image: new Circle({
            radius: 12,
            fill: new Fill({ color: '#2196F3' }),
            stroke: new Stroke({ color: statusColor, width: 3 })
          }),
          text: new Text({
            text: teamData?.name?.slice(0, 1) || 'T',
            fill: new Fill({ color: '#ffffff' }),
            font: 'bold 14px Arial'
          })
        });
      }
    });

    boundariesLayerRef.current = new VectorLayer({
      source: boundariesSource,
      style: (feature) => {
        const featureType = feature.get('type');
        
        if (featureType === 'boundary-label') {
          const labelText = feature.get('labelText');
          return new Style({
            text: new Text({
              text: labelText,
              font: 'bold 16px Arial',
              fill: new Fill({ color: '#000000' }),
              stroke: new Stroke({ color: '#ffffff', width: 4 }),
              textAlign: 'center',
              textBaseline: 'middle',
              backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
              backgroundStroke: new Stroke({ color: '#009688', width: 2 }),
              padding: [8, 12, 8, 12],
              offsetY: 0
            })
          });
        }
        
        return new Style({
          fill: new Fill({
            color: 'rgba(0, 0, 0, 0)' // Completely transparent fill (hollow)
          }),
          stroke: new Stroke({
            color: '#009688',
            width: 4,
            lineDash: [8, 8] // More prominent dashed line for better visibility
          })
        });
      }
    });

    tasksLayerRef.current = new VectorLayer({
      source: tasksSource,
      style: (feature) => {
        const taskData = feature.get('taskData');
        const status = taskData?.status || 'Unassigned';
        // ENHANCED: Use improved status mapping system
        const standardStatus = mapToStandardStatus(status);
        const color = getStatusColor(standardStatus);
        
        return new Style({
          image: new Circle({
            radius: 10,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 2 })
          }),
          text: new Text({
            text: 'T',
            fill: new Fill({ color: '#ffffff' }),
            font: 'bold 12px Arial'
          })
        });
      }
    });

    selectedLocationLayerRef.current = new VectorLayer({
      source: selectedLocationSource,
      style: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#FF0000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })
    });

    // Create shapefile layer for uploaded shapefiles with enhanced styling
    shapefilesLayerRef.current = new VectorLayer({
      source: shapefilesSource,
      style: function(feature) {
        const geometry = feature.getGeometry()?.getType();
        const properties = feature.getProperties();
        const shapefileData = properties.shapefileData || {};
        
        // Use bright, distinctive colors for better visibility
        const fillColor = 'rgba(255, 105, 180, 0.4)';  // Hot pink with transparency
        const strokeColor = '#FF1493';                   // Deep pink
        
        // Get feature name from properties if available
        let featureName = '';
        if (shapefileData.properties) {
          // Try common property names for feature naming
          const nameProps = ['name', 'NAME', 'Name', 'title', 'TITLE', 'id', 'ID', 'label', 'LABEL'];
          for (const prop of nameProps) {
            if (shapefileData.properties[prop]) {
              featureName = String(shapefileData.properties[prop]);
              break;
            }
          }
        }
        
        // Apply style based on geometry type
        switch(geometry) {
          case 'Point':
            return new Style({
              image: new Circle({
                radius: 8,
                fill: new Fill({ color: strokeColor }),
                stroke: new Stroke({ color: '#fff', width: 2 })
              }),
              text: featureName ? new Text({
                text: featureName,
                offsetY: 25,
                fill: new Fill({ color: '#000' }),
                stroke: new Stroke({ color: '#fff', width: 3 }),
                font: 'bold 12px Arial'
              }) : undefined
            });
            
          case 'LineString':
          case 'MultiLineString':
            return new Style({
              stroke: new Stroke({
                color: strokeColor,
                width: 4
              }),
              text: featureName ? new Text({
                text: featureName,
                placement: 'line',
                fill: new Fill({ color: '#000' }),
                stroke: new Stroke({ color: '#fff', width: 3 }),
                font: 'bold 12px Arial'
              }) : undefined
            });
            
          case 'Polygon':
          case 'MultiPolygon':
          default:
            return new Style({
              fill: new Fill({
                color: fillColor
              }),
              stroke: new Stroke({
                color: strokeColor,
                width: 3
              }),
              text: featureName ? new Text({
                text: featureName,
                fill: new Fill({ color: '#000' }),
                stroke: new Stroke({ color: '#fff', width: 3 }),
                font: 'bold 12px Arial',
                textAlign: 'center',
                textBaseline: 'middle'
              }) : undefined
            });
        }
      },
      zIndex: 600 // Ensure it's above other layers but below selections
    });

    // Create location layers for user position with identifiable names
    accuracyLayerRef.current = new VectorLayer({
      source: accuracySource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(76, 175, 80, 0.1)' // Light green for accuracy circle
        }),
        stroke: new Stroke({
          color: '#4CAF50',
          width: 2
        })
      }),
      zIndex: 700
    });
    accuracyLayerRef.current.set('name', 'location-accuracy');

    // Helper function to create location marker icon
    const createLocationMarkerIcon = (): string => {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <!-- Marker background -->
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#4CAF50"/>
          <!-- White border -->
          <path d="M12 2C6.486 2 2 6.486 2 12c0 7.5 10 17 10 17s10-9.5 10-17c0-5.514-4.486-10-10-10z" fill="#4CAF50" stroke="white" stroke-width="2"/>
          <!-- Center dot -->
          <circle cx="12" cy="12" r="4" fill="white"/>
          <circle cx="12" cy="12" r="2" fill="#4CAF50"/>
        </svg>
      `)}`;
    };

    locationLayerRef.current = new VectorLayer({
      source: locationSource,
      style: new Style({
        image: new Icon({
          src: createLocationMarkerIcon(),
          scale: 1,
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction'
        })
      }),
      zIndex: 800 // Highest priority for user location
    });
    locationLayerRef.current.set('name', 'user-location');

    // Create map
    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        boundariesLayerRef.current,
        featuresLayerRef.current,
        teamsLayerRef.current,
        tasksLayerRef.current,
        shapefilesLayerRef.current,
        selectedLocationLayerRef.current,
        accuracyLayerRef.current, // Accuracy circle
        locationLayerRef.current  // User location marker
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom
      })
    });

    // Style zoom controls to bottom right position
    const addZoomControlStyles = () => {
      const style = document.createElement('style');
      style.textContent = `
        .ol-zoom {
          top: auto !important;
          left: auto !important;
          bottom: 8px !important;
          right: 8px !important;
          position: absolute !important;
        }
        .ol-zoom button {
          background-color: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(0, 0, 0, 0.2) !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
          transition: all 0.2s ease !important;
          margin: 1px !important;
          width: 2.375em !important;
          height: 1.875em !important;
          font-size: 1.14em !important;
          font-weight: 700 !important;
        }
        .ol-zoom button:hover {
          background-color: rgba(255, 255, 255, 1) !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
          transform: translateY(-1px) !important;
        }
        .ol-zoom button:focus {
          outline: 2px solid #2563eb !important;
          outline-offset: 2px !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Apply zoom control styles
    addZoomControlStyles();

    // Set up OpenLayers Geolocation for user location marker display
    const geolocation = new Geolocation({
      projection: map.getView().getProjection(),
      trackingOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    });

    geolocationRef.current = geolocation;

    // Handle position changes for displaying user location marker
    geolocation.on('change:position', () => {
      const coordinates = geolocation.getPosition();
      if (coordinates && locationSource) {
        locationSource.clear();
        
        // Add location marker
        const locationFeature = new Feature({
          geometry: new Point(coordinates)
        });
        locationSource.addFeature(locationFeature);

        console.log('📍 User location updated:', toLonLat(coordinates));
      }
    });

    // Handle accuracy changes (show accuracy circle)
    geolocation.on('change:accuracyGeometry', () => {
      const accuracyGeometry = geolocation.getAccuracyGeometry();
      if (accuracyGeometry && accuracySource) {
        accuracySource.clear();
        
        const accuracyFeature = new Feature({
          geometry: accuracyGeometry
        });
        accuracySource.addFeature(accuracyFeature);
      }
    });

    // Create and add enhanced location control with white icon and black symbol
    const locationControl = new LocationControl(map, locationLayerRef.current, accuracyLayerRef.current);
    locationControlRef.current = locationControl;
    map.addControl(locationControl);

    // Expose the map instance globally for ShapefileLayer to use
    window.olMap = map;

    // Add click interaction for legacy selection mode only
    if (onMapClick) {
      map.on('click', (event) => {
        // Only handle legacy selection mode, not the new drawing modes
        if (!drawingMode && !pointSelectionMode && !lineDrawingMode && selectionMode) {
          const coordinate = toLonLat(event.coordinate);
          const [lng, lat] = coordinate;
          
          // Clear previous selection marker
          if (selectedLocationSourceRef.current) {
            selectedLocationSourceRef.current.clear();
          }
          
          // Add new selection marker
          const marker = new Feature({
            geometry: new Point(event.coordinate)
          });
          if (selectedLocationSourceRef.current) {
            selectedLocationSourceRef.current.addFeature(marker);
          }
          
          onMapClick({ lat, lng });
        }
      });
    }

    // Store map reference for later use
    mapRef.current = map;

    // Add zoom change listener to update icon sizes
    map.getView().on('change:resolution', () => {
      // Trigger layer re-render when zoom changes
      if (featuresLayerRef.current) {
        featuresLayerRef.current.changed();
      }
      if (teamsLayerRef.current) {
        teamsLayerRef.current.changed();
      }
      if (tasksLayerRef.current) {
        tasksLayerRef.current.changed();
      }
    });

    // Add event listener for zoom-to-location functionality
    const handleZoomToLocation = (event: any) => {
      console.log('🎯 Map received zoom event:', event.detail);
      const { lat, lng, zoom, extent, padding } = event.detail;
      
      if (!mapRef.current) {
        console.error('❌ Map reference not available');
        return;
      }
      
      const view = mapRef.current.getView();
      
      // If an extent is provided, fit the view to it
      if (extent) {
        try {
          // Convert extent coordinates to map projection
          const extentCoords = [
            extent[0], extent[1], // min lon, min lat
            extent[2], extent[3]  // max lon, max lat
          ];
          
          // Create transformed extent in web mercator
          const transformedExtent = [
            fromLonLat([extentCoords[0], extentCoords[1]]),
            fromLonLat([extentCoords[2], extentCoords[3]])
          ].flat();
          
          view.fit(transformedExtent, {
            padding: padding ? [50, 50, 50, 50] : undefined,
            duration: 1000
          });
          console.log('✅ Map zoomed to extent:', extent);
          return;
        } catch (error) {
          console.error('❌ Error zooming to extent:', error);
          // Fall back to center/zoom
        }
      }
      
      // Otherwise, animate to the center and zoom
      view.animate({
        center: fromLonLat([lng, lat]),
        zoom: zoom || 15,
        duration: 1000
      });
      console.log('✅ Map animated to:', [lng, lat], 'zoom:', zoom);
    };

    window.addEventListener('zoomToLocation', handleZoomToLocation);

    return () => {
      window.removeEventListener('zoomToLocation', handleZoomToLocation);
      
      // Clean up geolocation
      if (geolocationRef.current) {
        geolocationRef.current.setTracking(false);
        geolocationRef.current = null;
      }
      
      // Clean up location control
      if (locationControlRef.current && mapRef.current) {
        mapRef.current.removeControl(locationControlRef.current);
        locationControlRef.current = null;
      }
      
      // Clean up zoom control styles
      const existingStyles = document.querySelectorAll('style');
      existingStyles.forEach(style => {
        if (style.textContent && style.textContent.includes('.ol-zoom')) {
          style.remove();
        }
      });
      
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        window.olMap = null; // Clear the global reference
        mapRef.current = null;
      }
    };
  }, []);

  // Zoom change listener for shapefile optimization
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    let zoomTimeout: NodeJS.Timeout;

    const handleZoomEnd = () => {
      // Debounce zoom changes to avoid too frequent updates
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        console.log('🔄 Zoom changed, updating shapefile features...');
        // Trigger re-processing of shapefiles
        setShapefileUpdateTrigger(prev => prev + 1);
      }, 300); // Wait 300ms after zoom stops
    };

    map.getView().on('change:resolution', handleZoomEnd);

    return () => {
      clearTimeout(zoomTimeout);
      map.getView().un('change:resolution', handleZoomEnd);
    };
  }, []);

  // Handle drawing modes (polygon, point, line)
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing draw interaction
    if (drawInteractionRef.current) {
      mapRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    // Remove existing draw layer
    if (drawLayerRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }

    // Handle polygon drawing
    if (drawingMode && onPolygonCreated) {
      const source = new VectorSource();
      const drawLayer = new VectorLayer({
        source: source,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.2)'
          }),
          stroke: new Stroke({
            color: '#FF0000',
            width: 2
          })
        })
      });

      mapRef.current.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'Polygon'
      });

      drawInteractionRef.current.on('drawend', (event) => {
        const geometry = event.feature.getGeometry() as Polygon;
        const coordinates = geometry.getCoordinates();
        
        // Convert coordinates from map projection to longitude/latitude
        const lonLatCoordinates = coordinates.map(ring =>
          ring.map(coord => toLonLat(coord))
        );

        if (onPolygonCreated) {
          console.log('Polygon created with coordinates:', lonLatCoordinates);
          onPolygonCreated({
            name: '',
            coordinates: lonLatCoordinates
          });
        }

        // Remove the draw interaction to prevent further drawing
        if (drawInteractionRef.current) {
          mapRef.current?.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      mapRef.current.addInteraction(drawInteractionRef.current);
    }

    // Handle point selection mode
    if (pointSelectionMode && onMapClick) {
      const source = new VectorSource();
      const drawLayer = new VectorLayer({
        source: source,
        style: new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({ color: '#4CAF50' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 })
          })
        })
      });

      mapRef.current.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'Point'
      });

      drawInteractionRef.current.on('drawend', (event) => {
        const geometry = event.feature.getGeometry() as Point;
        const coordinates = geometry.getCoordinates();
        const [lng, lat] = toLonLat(coordinates);

        if (onMapClick) {
          onMapClick({ lat, lng });
        }

        // Remove the draw interaction after single point
        if (drawInteractionRef.current) {
          mapRef.current?.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      mapRef.current.addInteraction(drawInteractionRef.current);
    }

    // Handle line drawing mode
    if (lineDrawingMode && !drawInteractionRef.current && mapRef.current) {
      console.log('🔵 Activating line drawing mode');
      const source = new VectorSource();
      const drawLayer = new VectorLayer({
        source: source,
        style: new Style({
          stroke: new Stroke({
            color: '#2196F3',
            width: 3
          }),
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#2196F3' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 })
          })
        })
      });

      mapRef.current.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'LineString',
        minPoints: 2,
        maxPoints: 20
      });

      drawInteractionRef.current.on('drawend', (event) => {
        console.log('🔵 Line drawing completed');
        const geometry = event.feature.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();
        
        console.log('🔵 Line coordinates:', coordinates.length, 'points');
        
        // Validate point count
        if (coordinates.length < 2) {
          console.warn('Line must have at least 2 points');
          return;
        }
        
        if (coordinates.length > 20) {
          console.warn('Line cannot have more than 20 points');
          return;
        }

        const lonLatCoordinates = coordinates.map(coord => {
          const [lng, lat] = toLonLat(coord);
          return { lat, lng };
        });

        console.log('🔵 Converted coordinates:', lonLatCoordinates);

        // Pass the line coordinates to the completion handler
        if (onLineCreated) {
          console.log('🔵 Calling onLineCreated handler');
          onLineCreated({ coordinates: lonLatCoordinates });
        } else {
          console.warn('🔵 No onLineCreated handler available');
        }

        // Remove the draw interaction after line completion
        if (drawInteractionRef.current) {
          mapRef.current?.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      mapRef.current.addInteraction(drawInteractionRef.current);
    }
  }, [drawingMode, pointSelectionMode, lineDrawingMode, onPolygonCreated, onMapClick, onLineCreated]);

  // Handle clearing drawn polygon
  useEffect(() => {
    if (clearDrawnPolygon && drawLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
  }, [clearDrawnPolygon]);

  // Update features on the map
  useEffect(() => {
    if (!featuresLayerRef.current) return;

    const source = featuresLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    features.forEach(feature => {
      if (!feature.geometry) return;

      try {
        const geometry = typeof feature.geometry === 'string'
          ? JSON.parse(feature.geometry)
          : feature.geometry;

        let olFeature: Feature | null = null;

        if (geometry.type === 'Point') {
          const [lng, lat] = geometry.coordinates;
          olFeature = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            featureData: feature
          });
        } else if (geometry.type === 'LineString') {
          const coords = geometry.coordinates.map(([lng, lat]: number[]) => fromLonLat([lng, lat]));
          olFeature = new Feature({
            geometry: new LineString(coords),
            featureData: feature
          });
        } else if (geometry.type === 'Polygon') {
          const coords = geometry.coordinates.map((ring: number[][]) =>
            ring.map(([lng, lat]: number[]) => fromLonLat([lng, lat]))
          );
          olFeature = new Feature({
            geometry: new Polygon(coords),
            featureData: feature
          });
        }

        if (olFeature) {
          source.addFeature(olFeature);
        }
      } catch (error) {
        console.error('Error rendering feature geometry:', error);
      }
    });
  }, [features, activeFilters]);

  // Update team markers on the map
  useEffect(() => {
    if (!teamsLayerRef.current) return;

    const source = teamsLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    teams.forEach(team => {
      if (!team.currentLocation) return;

      try {
        const location = typeof team.currentLocation === 'string'
          ? JSON.parse(team.currentLocation)
          : team.currentLocation;

        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          const teamFeature = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            teamData: team
          });
          source.addFeature(teamFeature);
        }
      } catch (error) {
        console.error('Error rendering team marker:', error);
      }
    });
  }, [teams]);

  // Update boundaries on the map
  useEffect(() => {
    if (!boundariesLayerRef.current) return;

    const source = boundariesLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    boundaries.forEach(boundary => {
      if (!boundary.geometry) return;

      try {
        const geometry = typeof boundary.geometry === 'string'
          ? JSON.parse(boundary.geometry)
          : boundary.geometry;

        if (geometry.type === 'Polygon') {
          const coords = geometry.coordinates.map((ring: number[][]) =>
            ring.map(([lng, lat]: number[]) => fromLonLat([lng, lat]))
          );
          const polygon = new Polygon(coords);
          const boundaryFeature = new Feature({
            geometry: polygon,
            boundaryData: boundary
          });
          source.addFeature(boundaryFeature);

          // Add label with team assignment for supervisors
          if (allTeams && allTeams.length > 0) {
            const center = polygon.getInteriorPoint().getCoordinates();
            const labelFeature = new Feature({
              geometry: new Point(center),
              type: 'boundary-label'
            });
            
            // Find assigned team with robust ObjectId comparison
            const assignedTeam = allTeams.find(team => {
              if (!boundary.assignedTo || !team._id) return false;
              
              // Convert both IDs to strings for reliable comparison
              const teamIdStr = String(team._id);
              const assignedIdStr = String(boundary.assignedTo);
              
              return teamIdStr === assignedIdStr;
            });
            
            const teamName = assignedTeam ? assignedTeam.name : "Unassigned";
            
            labelFeature.set('labelText', `${boundary.name}\nAssigned to: ${teamName}`);
            source.addFeature(labelFeature);
          }
        }
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });
  }, [boundaries, allTeams]);

  // Update tasks on the map
  useEffect(() => {
    if (!tasksLayerRef.current) return;

    const source = tasksLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    tasks.forEach(task => {
      if (!task.location) return;

      try {
        const location = typeof task.location === 'string'
          ? JSON.parse(task.location)
          : task.location;

        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          const taskFeature = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            taskData: task
          });
          source.addFeature(taskFeature);
        }
      } catch (error) {
        console.error('Error rendering task marker:', error);
      }
    });
  }, [tasks]);

  // OPTIMIZED SHAPEFILE RENDERING - SHOW ALL FEATURES WITH PERFORMANCE OPTIMIZATIONS
  useEffect(() => {
    if (!shapefilesLayerRef.current) return;

    const source = shapefilesLayerRef.current.getSource();
    if (!source) return;

    // Clear existing shapefile features
    source.clear();

    // If shapefiles are empty, just return
    if (!shapefiles || shapefiles.length === 0) return;

    console.log(`🚀 Processing ${shapefiles.length} shapefiles - SHOWING ALL FEATURES`);

    // Get current zoom level for geometry simplification only
    const currentZoom = mapRef.current?.getView().getZoom() || 13;

    // Process each shapefile
    shapefiles.forEach(shapefile => {
      try {
        if (!shapefile.features) {
          console.warn(`Shapefile "${shapefile.name}" has no features`);
          return;
        }

        // Handle both GeoJSON FeatureCollection and raw features array
        const geojson = typeof shapefile.features === 'string'
          ? JSON.parse(shapefile.features) 
          : shapefile.features;

        // Determine if it's a FeatureCollection or array of features
        if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          const totalFeatures = geojson.features.length;
          
          // SHOW ALL FEATURES - No limiting
          const featuresToProcess = geojson.features;
          console.log(`📊 Zoom ${currentZoom.toFixed(1)}: Showing ALL ${totalFeatures} features`);
          
          // Create an enhanced version with metadata
          const enhancedGeoJSON = {
            type: 'FeatureCollection',
            features: featuresToProcess.map((feature: any) => ({
              ...feature,
              properties: {
                ...(feature.properties || {}),
                shapefileId: shapefile._id,
                shapefileName: shapefile.name
              }
            }))
          };
          
          // Parse GeoJSON into OpenLayers features with light geometry simplification for performance
          try {
            const olFeatures = new GeoJSON().readFeatures(enhancedGeoJSON, {
              featureProjection: 'EPSG:3857' // Web Mercator
            });
            
            // Light geometry simplification based on zoom level for better performance
            olFeatures.forEach((feature, index) => {
              const geometry = feature.getGeometry();
              if (geometry && (geometry.getType() === 'Polygon' || geometry.getType() === 'LineString' || geometry.getType() === 'MultiPolygon')) {
                // Light simplification - only at very low zoom levels
                const tolerance = currentZoom < 8 ? 50 : 
                                currentZoom < 10 ? 25 : 
                                currentZoom < 12 ? 10 : 5; // Minimal simplification
                geometry.simplify(tolerance);
              }
              
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });
            
            // Add ALL features to source
            source.addFeatures(olFeatures);
            console.log(`✅ Added ALL ${olFeatures.length} features from "${shapefile.name}" (light simplification: ${currentZoom < 8 ? 50 : currentZoom < 10 ? 25 : currentZoom < 12 ? 10 : 5})`);
          } catch (error) {
            console.error(`❌ Error parsing GeoJSON for "${shapefile.name}":`, error);
          }
        } else if (Array.isArray(geojson)) {
          // Handle array of features - SHOW ALL
          const totalFeatures = geojson.length;
          const featuresToProcess = geojson; // Show all features
          console.log(`📊 Zoom ${currentZoom.toFixed(1)}: Showing ALL ${totalFeatures} features`);
          
          // Convert to GeoJSON FeatureCollection format
          const featureCollection = {
            type: 'FeatureCollection',
            features: featuresToProcess.map((feature: any) => {
              if (!feature.properties) feature.properties = {};
              feature.properties.shapefileId = shapefile._id;
              feature.properties.shapefileName = shapefile.name;
              return feature;
            })
          };
          
          // Parse as GeoJSON with light simplification
          try {
            const olFeatures = new GeoJSON().readFeatures(featureCollection, {
              featureProjection: 'EPSG:3857'
            });
            
            // Light geometry simplification
            olFeatures.forEach((feature, index) => {
              const geometry = feature.getGeometry();
              if (geometry && (geometry.getType() === 'Polygon' || geometry.getType() === 'LineString' || geometry.getType() === 'MultiPolygon')) {
                const tolerance = currentZoom < 8 ? 50 : 
                                currentZoom < 10 ? 25 : 
                                currentZoom < 12 ? 10 : 5;
                geometry.simplify(tolerance);
              }
              
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });
            
            // Add ALL features to source
            source.addFeatures(olFeatures);
            console.log(`✅ Added ALL ${olFeatures.length} features from "${shapefile.name}"`);
          } catch (error) {
            console.error(`❌ Error parsing feature array for "${shapefile.name}":`, error);
          }
        } else {
          console.warn(`⚠️ Invalid features format in "${shapefile.name}"`);
        }
      } catch (error) {
        console.error(`❌ Error processing shapefile "${shapefile.name}":`, error);
      }
    });

    console.log(`🎯 Shapefile processing complete. Total features in source:`, source.getFeatures().length);
    console.log(`🔥 Performance: ALL features rendered with light geometry simplification`);
  }, [shapefiles, shapefileUpdateTrigger]); // Depend on both shapefiles and the update trigger

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapRef.current) {
      const view = mapRef.current.getView();
      view.setCenter(fromLonLat([lng, lat]));
      if (zoom) {
        view.setZoom(zoom);
      }
    }
  }, []);

  // Effect to manage select interaction based on selection modes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing select interaction
    if (selectInteractionRef.current) {
      map.removeInteraction(selectInteractionRef.current);
      selectInteractionRef.current = null;
    }

    // Add select interaction only when not in any drawing/selection modes
    if (!pointSelectionMode && !lineDrawingMode && !selectionMode && !drawingMode) {
      selectInteractionRef.current = new Select({
        condition: click,
        layers: [featuresLayerRef.current, teamsLayerRef.current, boundariesLayerRef.current, tasksLayerRef.current, shapefilesLayerRef.current].filter((layer): layer is VectorLayer<any> => layer !== null)
      });

      selectInteractionRef.current.on('select', (event) => {
        const selected = event.selected;
        if (selected.length > 0) {
          const feature = selected[0];
          const featureData = feature.get('featureData');
          const teamData = feature.get('teamData');
          const boundaryData = feature.get('boundaryData');
          const taskData = feature.get('taskData');
          const shapefileData = feature.get('shapefileData');

          if (featureData && onFeatureClick) {
            onFeatureClick(featureData);
          } else if (teamData && onTeamClick) {
            onTeamClick(teamData);
          } else if (boundaryData && onBoundaryClick) {
            onBoundaryClick(boundaryData);
          } else if (shapefileData && onShapefileClick) {
            onShapefileClick(shapefileData);
          }
        }
      });

      map.addInteraction(selectInteractionRef.current);
    }
  }, [pointSelectionMode, lineDrawingMode, selectionMode, drawingMode, onFeatureClick, onTeamClick, onBoundaryClick, onShapefileClick]);

  return (
    <div className={className}>
      <div
        ref={mapContainerRef}
        className="w-full h-full touch-pan-y touch-pinch-zoom"
        style={{ 
          minHeight: '300px',
          touchAction: 'pan-x pan-y pinch-zoom',
          userSelect: 'none'
        }}
        id="map"
      />
    </div>
  );
};

export default OpenLayersMap;