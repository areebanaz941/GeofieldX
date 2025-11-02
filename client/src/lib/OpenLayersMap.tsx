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
import Collection from 'ol/Collection';
import { unByKey } from 'ol/Observable';
import { ITask, IUser, IFeature, IBoundary } from '../../../shared/schema';
import { getFeatureIcon } from '../components/FeatureIcons';
import { getStatusColor } from '../components/FeatureIcon';
import { Shapefile } from '@/components/ShapefileLayer';
import 'ol/ol.css';

// Import custom icons (keeping as fallback)
import towerIcon from '@assets/tower-removebg-preview_1750282584510.png';
import fibercableIcon from '@assets/fibercable-removebg-preview_1750282584507.png';
import parcelIcon from '@assets/land-removebg-preview_1750282584509.png';

// Canonical status normalizer: returns schema statuses for consistent coloring
const toCanonicalStatus = (status: string): string => {
  if (!status) return 'New';
  const key = String(status).trim().toLowerCase().replace(/[\s_-]+/g, '');
  const map: Record<string, string> = {
    new: 'New',
    inprogress: 'InProgress',
    completed: 'Completed',
    complete: 'Completed',
    incompleted: 'In-Completed',
    incomplete: 'In-Completed',
    incompete: 'In-Completed',
    submitreview: 'Submit-Review',
    reviewaccepted: 'Review_Accepted',
    reviewreject: 'Review_Reject',
    reviewinprogress: 'Review_inprogress',
    active: 'Active',
    unassigned: 'New',
    assigned: 'InProgress',
  };
  return map[key] || status;
};
// Map various status names to our standardized status types
const mapToStandardStatus = (status: string): string => {
  if (!status) return 'unassigned';
  // Normalize by removing spaces/underscores/hyphens and lowercasing
  const normalized = status
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  // Completed states
  if (
    normalized === 'complete' ||
    normalized === 'completed' ||
    normalized === 'reviewaccepted' ||
    normalized === 'review_accepted'
  ) {
    return 'complete';
  }

  // Assigned/active/in progress states
  if (
    normalized === 'assigned' ||
    normalized === 'inprogress' ||
    normalized === 'submitreview' ||
    normalized === 'reviewinprogress' ||
    normalized === 'active'
  ) {
    return 'assigned';
  }

  // Delayed / incomplete states
  if (
    normalized === 'incomplete' || // generic
    normalized === 'incompleted' || // alternative typo form
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'incompleted' ||
    normalized === 'reviewreject' ||
    normalized === 'delayed'
  ) {
    return 'delayed';
  }

  // New/unassigned states map to unassigned
  if (normalized === 'new' || normalized === 'unassigned') {
    return 'unassigned';
  }

  return 'unassigned';
};

// Convert hex color (#RRGGBB) to rgba string with given alpha
const hexToRgba = (hex: string, alpha: number): string => {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('')
    : cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const standardStatus = toCanonicalStatus(status);
  const color = getStatusColor(standardStatus);
  let svgContent = '';

  switch (featureType) {
    case 'Tower':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 10 10" stroke="${color}" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="5" y1="0.5" x2="5" y2="1" />
        <path d="M3 9 L5 1 L7 9" />
        <line x1="3" y1="9" x2="7" y2="9" />
        <line x1="3.5" y1="7" x2="6.5" y2="7" />
        <line x1="4" y1="5" x2="6" y2="5" />
        <line x1="4.5" y1="3" x2="5.5" y2="3" />
      </svg>`;
      break;
    case 'Manhole':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${color}" stroke-width="1" stroke-linecap="square">
        <rect x="0.5" y="0.5" width="9" height="9" fill="none" />
        <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" />
        <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" />
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
  onMapReady?: (mapMethods: { 
    panTo: (lat: number, lng: number, zoom?: number) => void;
    zoomToFeature: (featureId: string) => boolean;
    zoomToBoundary: (boundaryId: string) => boolean;
  }) => void;
  // NEW: Boundary editing props
  editingBoundaryId?: string;
  onBoundaryGeometryEdited?: (boundaryId: string, coordinates: number[][][]) => void;
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
  clearDrawnPolygon = false,
  onMapReady,
  editingBoundaryId,
  onBoundaryGeometryEdited
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
  const modifyInteractionRef = useRef<Modify | null>(null);
  const hoveredFeatureRef = useRef<Feature | null>(null);
  const selectedFeatureRef = useRef<Feature | null>(null);
  const suppressNextPrimaryClickRef = useRef<boolean>(false);
  // Live refs for interaction modes to avoid stale closures in OL handlers
  const drawingModeRef = useRef<boolean>(drawingMode);
  const pointSelectionModeRef = useRef<boolean>(pointSelectionMode);
  const lineDrawingModeRef = useRef<boolean>(lineDrawingMode);
  const selectionModeRef = useRef<boolean>(selectionMode);

  // Internal state for line/polygon drawing undo/redo and keyboard handling
  const lineDrawStateRef = useRef<{
    active: boolean;
    sketchFeature: Feature | null;
    redoStack: number[][]; // stores lon/lat in map projection (EPSG:3857)
    geometryListenerKey: any | null;
    lastCoordCount: number;
    isPerformingRedo: boolean;
  }>({ active: false, sketchFeature: null, redoStack: [], geometryListenerKey: null, lastCoordCount: 0, isPerformingRedo: false });

  const polygonDrawStateRef = useRef<{
    active: boolean;
    sketchFeature: Feature | null;
    redoStack: number[][]; // stores lon/lat in map projection (EPSG:3857)
    geometryListenerKey: any | null;
    lastCoordCount: number; // count of coordinates in first ring
    isPerformingRedo: boolean;
  }>({ active: false, sketchFeature: null, redoStack: [], geometryListenerKey: null, lastCoordCount: 0, isPerformingRedo: false });

  const emitDrawingStateLine = useCallback(() => {
    const state = lineDrawStateRef.current;
    let points = 0;
    try {
      const geom = state.sketchFeature?.getGeometry() as LineString | undefined;
      if (geom) {
        const coords = geom.getCoordinates() || [];
        points = Math.max(0, coords.length - 1); // last is dynamic pointer
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('map-drawing-state', {
      detail: {
        shape: 'line',
        active: state.active,
        points,
        canUndo: points > 0,
        canRedo: (state.redoStack?.length || 0) > 0
      }
    }));
  }, []);

  const emitDrawingStatePolygon = useCallback(() => {
    const state = polygonDrawStateRef.current;
    let points = 0;
    try {
      const geom = state.sketchFeature?.getGeometry() as Polygon | undefined;
      if (geom) {
        const rings = geom.getCoordinates() || [];
        const ring = Array.isArray(rings) ? (rings[0] || []) : [];
        // ring includes dynamic last pointer; subtract 1 to get fixed vertices
        points = Math.max(0, ring.length - 1);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('map-drawing-state', {
      detail: {
        shape: 'polygon',
        active: state.active,
        points,
        canUndo: points > 0,
        canRedo: (state.redoStack?.length || 0) > 0
      }
    }));
  }, []);

  const undoLastVertexLine = useCallback(() => {
    if (!drawInteractionRef.current || !lineDrawingModeRef.current) return;
    const state = lineDrawStateRef.current;
    const geom = state.sketchFeature?.getGeometry() as LineString | undefined;
    if (!geom) return;
    const coords = geom.getCoordinates();
    if (!coords || coords.length < 2) {
      // Need at least 1 fixed point + dynamic to undo
      return;
    }
    // The last fixed vertex is coords[length - 2] (last is dynamic pointer)
    const lastFixed = coords[coords.length - 2];
    state.redoStack.push(lastFixed);
    const drawAny = drawInteractionRef.current as any;
    if (drawAny && typeof drawAny.removeLastPoint === 'function') {
      drawAny.removeLastPoint();
    } else {
      // Fallback: manually remove last fixed vertex while preserving dynamic pointer
      const dynamic = coords[coords.length - 1];
      const newCoords = coords.slice(0, Math.max(0, coords.length - 2)).concat([dynamic]);
      state.isPerformingRedo = true;
      geom.setCoordinates(newCoords);
      state.isPerformingRedo = false;
    }
    emitDrawingStateLine();
  }, [emitDrawingStateLine]);

  const redoLastVertexLine = useCallback(() => {
    const state = lineDrawStateRef.current;
    const geom = state.sketchFeature?.getGeometry() as LineString | undefined;
    if (!geom) return;
    const redo = state.redoStack;
    if (!redo || redo.length === 0) return;
    const next = redo.pop();
    if (!next) return;
    const coords = geom.getCoordinates() || [];
    // Insert before dynamic last coordinate
    const insertIndex = Math.max(0, coords.length - 1);
    const newCoords = coords.slice(0, insertIndex).concat([next], coords.slice(insertIndex));
    // Avoid clearing redo stack inside geometry change listener for this programmatic update
    state.isPerformingRedo = true;
    geom.setCoordinates(newCoords);
    state.isPerformingRedo = false;
    emitDrawingStateLine();
  }, [emitDrawingStateLine]);

  const finishDrawingAny = useCallback(() => {
    if (!drawInteractionRef.current) return;
    drawInteractionRef.current.finishDrawing();
    // drawend handler will clean up and emit state
  }, []);

  const cancelDrawingAny = useCallback(() => {
    if (drawInteractionRef.current) {
      drawInteractionRef.current.abortDrawing();
    }
    // Notify app to exit drawing mode (generic + legacy line event)
    const shape = lineDrawingModeRef.current ? 'line' : (drawingModeRef.current ? 'polygon' : 'unknown');
    window.dispatchEvent(new CustomEvent('drawingCancelled', { detail: { shape } }));
    if (shape === 'line') {
      window.dispatchEvent(new CustomEvent('lineDrawingCancelled'));
    } else if (shape === 'polygon') {
      window.dispatchEvent(new CustomEvent('polygonDrawingCancelled'));
    }

    // Reset internal states
    const s = lineDrawStateRef.current;
    if (s.geometryListenerKey) {
      try { unByKey(s.geometryListenerKey); } catch {}
      s.geometryListenerKey = null;
    }
    s.active = false;
    s.sketchFeature = null;
    s.redoStack = [];
    s.lastCoordCount = 0;
    s.isPerformingRedo = false;
    emitDrawingStateLine();

    const p = polygonDrawStateRef.current;
    if (p.geometryListenerKey) {
      try { unByKey(p.geometryListenerKey); } catch {}
      p.geometryListenerKey = null;
    }
    p.active = false;
    p.sketchFeature = null;
    p.redoStack = [];
    p.lastCoordCount = 0;
    p.isPerformingRedo = false;
    emitDrawingStatePolygon();
  }, [emitDrawingStateLine, emitDrawingStatePolygon]);

  // Polygon-specific undo/redo helpers
  const undoLastVertexPolygon = useCallback(() => {
    if (!drawInteractionRef.current || !drawingModeRef.current) return;
    const state = polygonDrawStateRef.current;
    const geom = state.sketchFeature?.getGeometry() as Polygon | undefined;
    if (!geom) return;
    const rings = geom.getCoordinates();
    if (!rings || rings.length === 0) return;
    const ring = rings[0] || [];
    if (ring.length < 2) return; // need at least 1 fixed + dynamic
    const lastFixed = ring[ring.length - 2];
    state.redoStack.push(lastFixed);
    const drawAny = drawInteractionRef.current as any;
    if (drawAny && typeof drawAny.removeLastPoint === 'function') {
      drawAny.removeLastPoint();
    } else {
      const dynamic = ring[ring.length - 1];
      const newRing = ring.slice(0, Math.max(0, ring.length - 2)).concat([dynamic]);
      state.isPerformingRedo = true;
      geom.setCoordinates([newRing]);
      state.isPerformingRedo = false;
    }
    emitDrawingStatePolygon();
  }, [emitDrawingStatePolygon]);

  const redoLastVertexPolygon = useCallback(() => {
    const state = polygonDrawStateRef.current;
    const geom = state.sketchFeature?.getGeometry() as Polygon | undefined;
    if (!geom) return;
    const redo = state.redoStack;
    if (!redo || redo.length === 0) return;
    const next = redo.pop();
    if (!next) return;
    const rings = geom.getCoordinates() || [];
    const ring = rings[0] || [];
    const insertIndex = Math.max(0, ring.length - 1); // before dynamic
    const newRing = ring.slice(0, insertIndex).concat([next], ring.slice(insertIndex));
    state.isPerformingRedo = true;
    geom.setCoordinates([newRing]);
    state.isPerformingRedo = false;
    emitDrawingStatePolygon();
  }, [emitDrawingStatePolygon]);

  // Generic wrappers used by keyboard and toolbar actions
  const undoLastVertexAny = useCallback(() => {
    if (lineDrawingModeRef.current) return undoLastVertexLine();
    if (drawingModeRef.current) return undoLastVertexPolygon();
  }, [undoLastVertexLine, undoLastVertexPolygon]);

  const redoLastVertexAny = useCallback(() => {
    if (lineDrawingModeRef.current) return redoLastVertexLine();
    if (drawingModeRef.current) return redoLastVertexPolygon();
  }, [redoLastVertexLine, redoLastVertexPolygon]);

  // Keyboard shortcuts for line/polygon drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lineDrawingModeRef.current && !drawingModeRef.current) return;
      // Ignore when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

      const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrawingAny();
        return;
      }
      if (ctrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastVertexAny();
        return;
      }
      if ((ctrlOrCmd && e.key.toLowerCase() === 'y') || (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redoLastVertexAny();
        return;
      }
      if (e.key === 'Enter') {
        // Optional: allow Enter to finish drawing (double-click works by default)
        e.preventDefault();
        finishDrawingAny();
      }
    };

    const handleDrawingActionEvent = (ev: Event) => {
      const e = ev as CustomEvent;
      const action = (e.detail && e.detail.action) || '';
      switch (action) {
        case 'undo':
          undoLastVertexAny();
          break;
        case 'redo':
          redoLastVertexAny();
          break;
        case 'finish':
          finishDrawingAny();
          break;
        case 'cancel':
          cancelDrawingAny();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('map-drawing-action', handleDrawingActionEvent as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('map-drawing-action', handleDrawingActionEvent as EventListener);
    };
  }, [undoLastVertexAny, redoLastVertexAny, finishDrawingAny, cancelDrawingAny]);

  // Stable callback refs to prevent effect churn during drawing
  const onPolygonCreatedRef = useRef<MapProps['onPolygonCreated'] | null>(null);
  const onMapClickRef = useRef<MapProps['onMapClick'] | null>(null);
  const onLineCreatedRef = useRef<MapProps['onLineCreated'] | null>(null);

  // Visibility thresholds to prevent flicker at low zooms
  const LAYERS_VISIBILITY_ZOOM = 13; // Hide vector layers below this zoom

  // OpenLayers Geolocation references
  const geolocationRef = useRef<Geolocation | null>(null);
  const locationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const accuracyLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const locationControlRef = useRef<LocationControl | null>(null);

  // State for triggering shapefile re-processing on zoom changes
  // Removed shapefileUpdateTrigger state as it was causing excessive re-renders

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
      // Disable decluttering so nearby icons (e.g., towers) don't hide each other
      declutter: false,
      // Avoid re-rendering on each interaction frame to reduce flicker
      updateWhileInteracting: false,
      style: (feature, resolution) => {
        const featureData = feature.get('featureData');
        const featureType = featureData?.feaType || 'Tower';
        const zoom = mapRef.current?.getView().getZoom() || 13;
        // Hide features entirely at low zooms
        if (zoom < LAYERS_VISIBILITY_ZOOM) return undefined;
        // Use a fixed icon source and scale by zoom to avoid image reload flicker
        const baseIconSize = 24;
        const sizeScale = Math.max(0.6, Math.min(1.6, (zoom - 10) / 6));
        const effectiveIconSize = baseIconSize * sizeScale;
        
        // FIXED: Changed feaState to feaStatus for proper color determination
        const featureStatus = featureData?.feaStatus || featureData?.status || 'Unassigned';
        
        // Create SVG icon with status-based color using enhanced system
        const svgIconSrc = createSVGIcon(featureType, featureStatus, baseIconSize);
        
        // Handle different geometry types
        const geometry = feature.getGeometry();
        const geometryType = geometry?.getType();

        const isHovered = !!feature.get('isHovered');
        const isSelected = !!feature.get('isSelected');
        const standardStatus = toCanonicalStatus(featureStatus);
        const statusColor = getStatusColor(standardStatus);
        const hoverStrokeColor = isSelected ? statusColor : '#f59e0b'; // status color when selected, amber on hover
        const hoverFillColor = isSelected ? hexToRgba(statusColor, 0.15) : 'rgba(245,158,11,0.15)';
        
        if (geometryType === 'LineString' || featureType === 'FiberCable') {
          // For line features (fiber cables), use stroke styling with status-based colors
          const lineWidth = Math.max(2, Math.min(6, zoom / 3));
          // Use status-based color for base styling
          const baseStyle = new Style({
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
          if (isHovered || isSelected) {
            const highlight = new Style({
              stroke: new Stroke({ color: hoverStrokeColor, width: lineWidth + 2 })
            });
            return [highlight, baseStyle];
          }
          return baseStyle;
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
          
          const baseStyle = new Style({
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({
              color: strokeColor,
              width: strokeWidth,
              lineDash: (isParcel && !featureData?.color) ? [8, 8] : undefined
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
          if (isHovered || isSelected) {
            const highlight = new Style({
              stroke: new Stroke({ color: hoverStrokeColor, width: strokeWidth + 2 }),
              fill: new Fill({ color: hoverFillColor })
            });
            return [highlight, baseStyle];
          }
          return baseStyle;
        } else {
          // For point features (towers, manholes), use SVG icons with status-based colors
          const base = new Style({
            image: new Icon({
              src: svgIconSrc,
              scale: (isHovered || isSelected ? 1.15 : 1) * sizeScale,
              anchor: [0.5, 0.5],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction'
            }),
            text: new Text({
              text: featureData?.name || `${featureType} #${featureData?.feaNo}`,
              offsetY: effectiveIconSize + 10,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`,
              textAlign: 'center'
            })
          });
          if (isHovered || isSelected) {
            const ring = new Style({
              image: new Circle({
                radius: Math.max(12, effectiveIconSize / 1.5),
                fill: new Fill({ color: hoverFillColor }),
                stroke: new Stroke({ color: hoverStrokeColor, width: 2 })
              })
            });
            return [ring, base];
          }
          return base;
        }
      },
      // Ensure features render above shapefiles and boundaries for click priority
      zIndex: 600
    });

    teamsLayerRef.current = new VectorLayer({
      source: teamsSource,
      style: (feature) => {
        const zoom = mapRef.current?.getView().getZoom() || 13;
        if (zoom < LAYERS_VISIBILITY_ZOOM) return undefined;
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
      },
      // Keep teams above shapefiles but below user-location/accuracy
      zIndex: 520
    });

    boundariesLayerRef.current = new VectorLayer({
      source: boundariesSource,
      // Decluttering is unnecessary for polygon strokes and can hide labels inconsistently
      declutter: false,
      updateWhileInteracting: false,
      style: (feature) => {
        const zoom = mapRef.current?.getView().getZoom() || 13;
        if (zoom < LAYERS_VISIBILITY_ZOOM) return undefined;
        const featureType = feature.get('type');
        const boundaryData = feature.get('boundaryData');
        const boundaryStatusColor = getStatusColor(toCanonicalStatus(boundaryData?.status || 'New'));
        
        if (featureType === 'boundary-label') {
          // Slightly stricter threshold for labels to avoid clutter flicker
          if (zoom < LAYERS_VISIBILITY_ZOOM + 1) return undefined;
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
        
        const isHovered = !!feature.get('isHovered');
        const isSelected = !!feature.get('isSelected');
        const base = new Style({
          fill: new Fill({ color: 'rgba(0, 0, 0, 0)' }),
          stroke: new Stroke({ color: '#009688', width: 4, lineDash: [8, 8] })
        });
        if (isHovered || isSelected) {
          const highlight = new Style({
            stroke: new Stroke({ color: isSelected ? boundaryStatusColor : '#f59e0b', width: 5 })
          });
          return [highlight, base];
        }
        return base;
      },
      // Render boundaries below point features to avoid blocking clicks
      zIndex: 400
    });

    tasksLayerRef.current = new VectorLayer({
      source: tasksSource,
      style: (feature) => {
        const zoom = mapRef.current?.getView().getZoom() || 13;
        if (zoom < LAYERS_VISIBILITY_ZOOM) return undefined;
        const taskData = feature.get('taskData');
        const status = taskData?.status || 'Unassigned';
        // ENHANCED: Use improved status mapping system
        const standardStatus = toCanonicalStatus(status);
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
      },
      // Ensure tasks are above shapefiles
      zIndex: 530
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
        const zoom = mapRef.current?.getView().getZoom() || 13;
        if (zoom < LAYERS_VISIBILITY_ZOOM) return undefined;
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
      // Always keep shapefiles beneath everything else
      zIndex: 100
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
    const persistedCenter = (() => {
      try {
        const raw = localStorage.getItem('map_center');
        if (!raw) return center;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed as [number, number];
      } catch {}
      return center;
    })();
    const persistedZoom = (() => {
      try {
        const raw = localStorage.getItem('map_zoom');
        if (!raw) return zoom;
        const z = Number(raw);
        return Number.isFinite(z) ? z : zoom;
      } catch {}
      return zoom;
    })();

    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        // Ensure shapefiles are ALWAYS below other feature layers
        shapefilesLayerRef.current,
        // Keep boundaries below clickable point features to avoid blocking selection
        featuresLayerRef.current,
        boundariesLayerRef.current,
        teamsLayerRef.current,
        tasksLayerRef.current,
        selectedLocationLayerRef.current,
        accuracyLayerRef.current, // Accuracy circle
        locationLayerRef.current  // User location marker
      ],
      view: new View({
        center: fromLonLat(persistedCenter),
        zoom: persistedZoom
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
    if (onMapClickRef.current) {
      map.on('click', (event) => {
        // Only handle legacy selection mode, not the new drawing modes
        if (
          !drawingModeRef.current &&
          !pointSelectionModeRef.current &&
          !lineDrawingModeRef.current &&
          selectionModeRef.current
        ) {
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
          
          const handler = onMapClickRef.current;
          if (handler) handler({ lat, lng });
        }
      });
    }

    // Hover highlight handler for all map features
    const setHoveredFeature = (feature: Feature | null) => {
      if (hoveredFeatureRef.current === feature) return;
      // Clear previous
      if (hoveredFeatureRef.current) {
        hoveredFeatureRef.current.set('isHovered', false);
        hoveredFeatureRef.current.changed();
      }
      hoveredFeatureRef.current = feature;
      if (feature) {
        feature.set('isHovered', true);
        feature.changed();
      }
    };

    const pickTopFeature = (pixel: number[]) => {
      let bestFeature: Feature | null = null;
      let bestScore = -Infinity;
      const preferPointScore = (geomType?: string) => geomType === 'Point' ? 3 : geomType === 'LineString' ? 2 : 1;
      map.forEachFeatureAtPixel(pixel, (f: any, layer: any) => {
        const geomType = f.getGeometry()?.getType();
        let layerScore = 0;
        if (layer === featuresLayerRef.current) layerScore = 100;
        else if (layer === teamsLayerRef.current || layer === tasksLayerRef.current) layerScore = 90;
        else if (layer === boundariesLayerRef.current) layerScore = 50;
        else if (layer === shapefilesLayerRef.current) layerScore = 10;
        const score = layerScore + preferPointScore(geomType);
        if (score > bestScore) {
          bestScore = score;
          bestFeature = f as Feature;
        }
        return false; // continue searching
      }, { hitTolerance: 6 });
      return bestFeature;
    };

    const handlePointerMove = (evt: any) => {
      if (
        drawingModeRef.current ||
        pointSelectionModeRef.current ||
        lineDrawingModeRef.current ||
        selectionModeRef.current
      ) {
        setHoveredFeature(null);
        return;
      }
      const feature = pickTopFeature(evt.pixel);
      setHoveredFeature(feature);
      map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    };

    map.on('pointermove', handlePointerMove);

    // Click selection with priority: prefer towers/points over boundaries
    const setSelectedFeature = (feature: Feature | null) => {
      if (selectedFeatureRef.current === feature) return;
      if (selectedFeatureRef.current) {
        selectedFeatureRef.current.set('isSelected', false);
        selectedFeatureRef.current.changed();
      }
      selectedFeatureRef.current = feature;
      if (feature) {
        feature.set('isSelected', true);
        feature.changed();
      }
    };

    const handlePrimaryClick = (evt: any) => {
      if (suppressNextPrimaryClickRef.current) {
        suppressNextPrimaryClickRef.current = false;
        evt?.preventDefault?.();
        evt?.stopPropagation?.();
        const originalEvent = evt?.originalEvent;
        originalEvent?.preventDefault?.();
        originalEvent?.stopPropagation?.();
        return;
      }
      if (
        drawingModeRef.current ||
        pointSelectionModeRef.current ||
        lineDrawingModeRef.current ||
        selectionModeRef.current
      ) return; // handled elsewhere
      const feature = pickTopFeature(evt.pixel);
      setSelectedFeature(feature);
      if (!feature) return;
      const featureData = feature.get('featureData');
      const teamData = feature.get('teamData');
      const boundaryData = feature.get('boundaryData');
      const taskData = feature.get('taskData');
      const shapefileData = feature.get('shapefileData');
      if (featureData && onFeatureClick) onFeatureClick(featureData);
      else if (teamData && onTeamClick) onTeamClick(teamData);
      else if (boundaryData && onBoundaryClick) onBoundaryClick(boundaryData);
      else if (taskData && onShapefileClick) onShapefileClick?.(taskData);
      else if (shapefileData && onShapefileClick) onShapefileClick(shapefileData);
    };

    map.on('singleclick', handlePrimaryClick);

    // Store map reference for later use
    mapRef.current = map;

    // Call onMapReady callback with map methods
    if (onMapReady) {
      onMapReady({
        panTo,
        zoomToFeature,
        zoomToBoundary
      });
    }

    // Initialize visibility based on starting zoom
    const applyLayerVisibilityByZoom = (z: number) => {
      const visible = z >= LAYERS_VISIBILITY_ZOOM;
      featuresLayerRef.current?.setVisible(visible);
      teamsLayerRef.current?.setVisible(visible);
      tasksLayerRef.current?.setVisible(visible);
      boundariesLayerRef.current?.setVisible(visible);
      shapefilesLayerRef.current?.setVisible(visible);
    };
    applyLayerVisibilityByZoom(map.getView().getZoom() || persistedZoom);

    // Persist view on moveend
    map.on('moveend', () => {
      const v = map.getView();
      const c = toLonLat(v.getCenter()!);
      localStorage.setItem('map_center', JSON.stringify([c[0], c[1]]));
      localStorage.setItem('map_zoom', String(v.getZoom() ?? 13));
      // Update layer visibility and then request a redraw once when interaction ends
      const z = v.getZoom() ?? 13;
      applyLayerVisibilityByZoom(z);
      featuresLayerRef.current?.changed();
      teamsLayerRef.current?.changed();
      tasksLayerRef.current?.changed();
      boundariesLayerRef.current?.changed();
      shapefilesLayerRef.current?.changed();
    });

    // Add event listener for zoom-to-location functionality
    const handleZoomToLocation = (event: any) => {
      const detail = event?.detail || {};
      console.log('🎯 Map received zoom event:', detail);
      const { lat, lng, zoom, extent, padding } = detail;
      
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
      if (mapRef.current) {
        mapRef.current.un('pointermove', handlePointerMove);
        mapRef.current.un('singleclick', handlePrimaryClick);
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

  // Keep mode refs updated for use inside OL event handlers
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);
  useEffect(() => { pointSelectionModeRef.current = pointSelectionMode; }, [pointSelectionMode]);
  useEffect(() => { lineDrawingModeRef.current = lineDrawingMode; }, [lineDrawingMode]);
  useEffect(() => { selectionModeRef.current = selectionMode; }, [selectionMode]);

  // Clear hover/cursor when any interactive mode activates
  useEffect(() => {
    const anyActive = drawingMode || pointSelectionMode || lineDrawingMode || selectionMode;
    if (anyActive) {
      if (hoveredFeatureRef.current) {
        hoveredFeatureRef.current.set('isHovered', false);
        hoveredFeatureRef.current.changed();
        hoveredFeatureRef.current = null;
      }
      if (mapRef.current?.getTargetElement()) {
        mapRef.current.getTargetElement().style.cursor = '';
      }
    }
  }, [drawingMode, pointSelectionMode, lineDrawingMode, selectionMode]);

  // Keep callback refs updated without retriggering drawing effects
  useEffect(() => {
    onPolygonCreatedRef.current = onPolygonCreated || null;
  }, [onPolygonCreated]);

  useEffect(() => {
    onMapClickRef.current = onMapClick || null;
  }, [onMapClick]);

  useEffect(() => {
    onLineCreatedRef.current = onLineCreated || null;
  }, [onLineCreated]);

  // Zoom change listener for shapefile optimization - DISABLED to prevent performance issues
  useEffect(() => {
    // DISABLED: This was causing excessive re-renders and hanging
    // The shapefiles will be rendered once and cached, zoom-based optimization is not needed
    // for most use cases and was causing more harm than good
    
    // if (!mapRef.current) return;
    // const map = mapRef.current;
    // let zoomTimeout: NodeJS.Timeout;
    // const handleZoomEnd = () => {
    //   clearTimeout(zoomTimeout);
    //   zoomTimeout = setTimeout(() => {
    //     console.log('🔄 Zoom changed, updating shapefile features...');
    //     setShapefileUpdateTrigger(prev => prev + 1);
    //   }, 300);
    // };
    // map.getView().on('change:resolution', handleZoomEnd);
    // return () => {
    //   clearTimeout(zoomTimeout);
    //   map.getView().un('change:resolution', handleZoomEnd);
    // };
  }, []);

  // Handle drawing modes (polygon, point, line)
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Always stop any active draw interaction
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    const anyModeActive = !!(drawingMode || pointSelectionMode || lineDrawingMode);

    // Decide whether to remove the temporary draw layer
    if (anyModeActive) {
      // Starting or switching drawing modes — ensure a clean layer
      if (drawLayerRef.current) {
        map.removeLayer(drawLayerRef.current);
        drawLayerRef.current = null;
      }
    } else {
      // No drawing active — keep polygon preview until explicitly cleared,
      // but remove temporary layers for point/line to avoid leftovers
      if (drawLayerRef.current) {
        const existingMode = drawLayerRef.current.get('mode');
        if (existingMode !== 'polygon') {
          map.removeLayer(drawLayerRef.current);
          drawLayerRef.current = null;
        }
      }
    }

    // Handle polygon drawing
    if (drawingMode && onPolygonCreatedRef.current) {
      suppressNextPrimaryClickRef.current = true;
      if (selectInteractionRef.current) {
        selectInteractionRef.current.setActive(false);
      }
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
      // Mark layer mode so we can decide persistence when modes change
      drawLayer.set('mode', 'polygon');

      map.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'Polygon'
      });

      drawInteractionRef.current.on('drawstart', (event) => {
        suppressNextPrimaryClickRef.current = true;
        const state = polygonDrawStateRef.current;
        state.active = true;
        state.sketchFeature = event.feature as Feature;
        state.redoStack = [];
        state.isPerformingRedo = false;
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        const geom = state.sketchFeature.getGeometry();
        if (geom) {
          try {
            const rings = (state.sketchFeature?.getGeometry() as Polygon)?.getCoordinates() || [];
            const ring = rings[0] || [];
            state.lastCoordCount = ring.length;
          } catch { state.lastCoordCount = 0; }
          state.geometryListenerKey = (geom as any).on('change', () => {
            try {
              const rings = (state.sketchFeature?.getGeometry() as Polygon)?.getCoordinates() || [];
              const ring = rings[0] || [];
              const currentCount = ring.length;
              if (!state.isPerformingRedo && currentCount > state.lastCoordCount) {
                state.redoStack = [];
              }
              state.lastCoordCount = currentCount;
            } catch {}
            emitDrawingStatePolygon();
          });
        }
        emitDrawingStatePolygon();
      });

      drawInteractionRef.current.on('drawabort', () => {
        const state = polygonDrawStateRef.current;
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        state.active = false;
        state.sketchFeature = null;
        state.redoStack = [];
        state.lastCoordCount = 0;
        state.isPerformingRedo = false;
        emitDrawingStatePolygon();
      });

      drawInteractionRef.current.on('drawend', (event) => {
        suppressNextPrimaryClickRef.current = true;
        const geometry = event.feature.getGeometry() as Polygon;
        const coordinates = geometry.getCoordinates();
        
        // Convert coordinates from map projection to longitude/latitude
        const lonLatCoordinates = coordinates.map(ring =>
          ring.map(coord => toLonLat(coord))
        );

        const handler = onPolygonCreatedRef.current;
        if (handler) {
          console.log('Polygon created with coordinates:', lonLatCoordinates);
          handler({
            name: '',
            coordinates: lonLatCoordinates
          });
        }

        // Reset polygon draw state
        const state = polygonDrawStateRef.current;
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        state.active = false;
        state.sketchFeature = null;
        state.redoStack = [];
        state.lastCoordCount = 0;
        state.isPerformingRedo = false;
        emitDrawingStatePolygon();

        // Remove only the interaction; keep the layer visible until cleared
        if (drawInteractionRef.current) {
          map.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      map.addInteraction(drawInteractionRef.current);
    }

    // Handle point selection mode
    if (pointSelectionMode && onMapClickRef.current) {
      suppressNextPrimaryClickRef.current = true;
      if (selectInteractionRef.current) {
        selectInteractionRef.current.setActive(false);
      }
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
      drawLayer.set('mode', 'point');

      map.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'Point'
      });

      drawInteractionRef.current.on('drawend', (event) => {
        suppressNextPrimaryClickRef.current = true;
        const geometry = event.feature.getGeometry() as Point;
        const coordinates = geometry.getCoordinates();
        const [lng, lat] = toLonLat(coordinates);

        const handler = onMapClickRef.current;
        if (handler) handler({ lat, lng });

        // Remove the draw interaction after single point
        if (drawInteractionRef.current) {
          map.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      map.addInteraction(drawInteractionRef.current);
    }

    // Handle line drawing mode
    if (lineDrawingMode && !drawInteractionRef.current) {
      suppressNextPrimaryClickRef.current = true;
      if (selectInteractionRef.current) {
        selectInteractionRef.current.setActive(false);
      }
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
      drawLayer.set('mode', 'line');

      map.addLayer(drawLayer);
      drawLayerRef.current = drawLayer;

      drawInteractionRef.current = new Draw({
        source: source,
        type: 'LineString',
        minPoints: 2,
        maxPoints: 20
      });

      drawInteractionRef.current.on('drawstart', (event) => {
        suppressNextPrimaryClickRef.current = true;
        // Reset redo stack and start tracking geometry changes
        const state = lineDrawStateRef.current;
        state.active = true;
        state.sketchFeature = event.feature as Feature;
        state.redoStack = [];
        state.isPerformingRedo = false;
        // Remove previous listener if any
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        const geom = state.sketchFeature.getGeometry();
        if (geom) {
          // Initialize coordinate count (includes dynamic pointer)
          try {
            const initialCoords = (state.sketchFeature?.getGeometry() as LineString)?.getCoordinates() || [];
            state.lastCoordCount = initialCoords.length;
          } catch { state.lastCoordCount = 0; }
          state.geometryListenerKey = (geom as any).on('change', () => {
            try {
              const currentCoords = (state.sketchFeature?.getGeometry() as LineString)?.getCoordinates() || [];
              const currentCount = currentCoords.length;
              // If a new vertex was added by the user, clear redo stack
              if (!state.isPerformingRedo && currentCount > state.lastCoordCount) {
                state.redoStack = [];
              }
              state.lastCoordCount = currentCount;
            } catch {}
            emitDrawingStateLine();
          });
        }
        emitDrawingStateLine();
      });

      drawInteractionRef.current.on('drawabort', () => {
        const state = lineDrawStateRef.current;
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        state.active = false;
        state.sketchFeature = null;
        state.redoStack = [];
        state.lastCoordCount = 0;
        state.isPerformingRedo = false;
        emitDrawingStateLine();
      });

      drawInteractionRef.current.on('drawend', (event) => {
        suppressNextPrimaryClickRef.current = true;
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
        const handler = onLineCreatedRef.current;
        if (handler) {
          console.log('🔵 Calling onLineCreated handler');
          handler({ coordinates: lonLatCoordinates });
        } else {
          console.warn('🔵 No onLineCreated handler available');
        }

        // Reset internal drawing state
        const state = lineDrawStateRef.current;
        if (state.geometryListenerKey) {
          try { unByKey(state.geometryListenerKey); } catch {}
          state.geometryListenerKey = null;
        }
        state.active = false;
        state.sketchFeature = null;
        state.redoStack = [];
        state.lastCoordCount = 0;
        state.isPerformingRedo = false;
        emitDrawingStateLine();

        // Remove the draw interaction after line completion
        if (drawInteractionRef.current) {
          map.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      map.addInteraction(drawInteractionRef.current);
    }
  }, [drawingMode, pointSelectionMode, lineDrawingMode]);

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
            
            // Determine team name handling both populated and raw ObjectId cases
            let teamName = "Unassigned";
            const assigned = (boundary as any).assignedTo;
            if (assigned) {
              // If populated document, prefer its name directly
              if (typeof assigned === 'object') {
                teamName = assigned.name || assigned.username || 'Unknown Team';
              } else {
                // Fallback: find in allTeams by matching IDs as strings
                const assignedTeam = allTeams.find(team => {
                  if (!team || !team._id) return false;
                  return String(team._id) === String(assigned);
                });
                teamName = assignedTeam ? assignedTeam.name : 'Unknown Team';
              }
            }
            
            labelFeature.set('labelText', `${boundary.name}\nAssigned to: ${teamName}`);
            source.addFeature(labelFeature);
          }
        }
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });
  }, [boundaries, allTeams]);

  // NEW: Enable modify interaction for boundary editing
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove existing modify interaction
    if (modifyInteractionRef.current) {
      map.removeInteraction(modifyInteractionRef.current);
      modifyInteractionRef.current = null;
    }

    if (!editingBoundaryId || !boundariesLayerRef.current) return;

    const source = boundariesLayerRef.current.getSource();
    if (!source) return;

    // Find the feature corresponding to the boundary ID
    const target = source.getFeatures().find(f => {
      const boundaryData = f.get('boundaryData');
      return boundaryData && boundaryData._id && boundaryData._id.toString() === editingBoundaryId;
    });

    if (!target) return;

    const features = new Collection<Feature>([target]);
    const modify = new Modify({ 
      features,
      pixelTolerance: 5 // tighten so point clicks are less likely to grab vertices
    });

    modify.on('modifyend', () => {
      try {
        const geom = target.getGeometry() as Polygon;
        const coord3857 = geom.getCoordinates();
        const lonLat = coord3857.map(ring => ring.map(coord => toLonLat(coord)));
        if (onBoundaryGeometryEdited) {
          onBoundaryGeometryEdited(editingBoundaryId, lonLat as unknown as number[][][]);
        }
      } catch (e) {
        console.error('Error extracting modified boundary geometry:', e);
      }
    });

    map.addInteraction(modify);
    modifyInteractionRef.current = modify;
  }, [editingBoundaryId]);

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

    // Processing shapefiles for display

    // Get current zoom level for geometry simplification only
    const zoomLevel = mapRef.current?.getView().getZoom?.() ?? 13;

    let totalFeaturesAdded = 0;

    // Process each shapefile
    shapefiles
      .filter((s: any) => s == null || s.isVisible !== false)
      .forEach(shapefile => {
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
        if (geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          // Optionally simplify at low zooms
          const featuresToProcess = geojson.features;
          try {
            const olFeatures = new GeoJSON().readFeatures({
              type: 'FeatureCollection',
              features: featuresToProcess.map((feature: any) => ({
                ...feature,
                properties: {
                  ...(feature.properties || {}),
                  shapefileId: shapefile._id,
                  shapefileName: shapefile.name
                }
              }))
            }, {
              featureProjection: 'EPSG:3857'
            });

            olFeatures.forEach((feature, index) => {
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });

            source.addFeatures(olFeatures);
            totalFeaturesAdded += olFeatures.length;
          } catch (error) {
            console.error(`❌ Error parsing GeoJSON for "${shapefile.name}":`, error);
          }
        } else if (Array.isArray(geojson)) {
          const featuresToProcess = geojson;
          try {
            const featureCollection = {
              type: 'FeatureCollection',
              features: featuresToProcess.map((feature: any) => {
                if (!feature.properties) feature.properties = {};
                feature.properties.shapefileId = shapefile._id;
                feature.properties.shapefileName = shapefile.name;
                return feature;
              })
            };

            const olFeatures = new GeoJSON().readFeatures(featureCollection, {
              featureProjection: 'EPSG:3857'
            });

            olFeatures.forEach((feature, index) => {
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });

            source.addFeatures(olFeatures);
            totalFeaturesAdded += olFeatures.length;
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

    // Shapefile processing complete
  }, [shapefiles]); // Only depend on shapefiles, remove update trigger to prevent excessive re-renders

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapRef.current) {
      const view = mapRef.current.getView();
      view.setCenter(fromLonLat([lng, lat]));
      if (zoom) {
        view.setZoom(zoom);
      }
    }
  }, []);

  // Method to zoom to a specific feature and highlight it
  const zoomToFeature = useCallback((featureId: string): boolean => {
    console.log('🎯 zoomToFeature called with ID:', featureId);
    
    if (!mapRef.current || !featuresLayerRef.current) {
      console.log('❌ Map or features layer not available');
      return false;
    }

    const source = featuresLayerRef.current.getSource();
    if (!source) {
      console.log('❌ Features layer source not available');
      return false;
    }

    // Find the feature by ID
    const olFeatures = source.getFeatures();
    console.log('📊 Total features in layer:', olFeatures.length);
    
    const targetFeature = olFeatures.find(f => {
      const featureData = f.get('featureData');
      return featureData && featureData._id.toString() === featureId;
    });

    if (targetFeature) {
      console.log('✅ Found target feature:', targetFeature.get('featureData'));
      const geometry = targetFeature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        console.log('📍 Feature extent:', extent);
        const view = mapRef.current.getView();
        
        // Fit to the feature extent with padding
        view.fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000,
          maxZoom: 18
        });

        console.log('🎯 Successfully zoomed to feature');
        // Highlight the feature temporarily
        highlightFeature(targetFeature);
        return true;
      } else {
        console.log('❌ Feature has no geometry');
        // Dispatch custom event for error handling
        window.dispatchEvent(new CustomEvent('map-navigation-error', {
          detail: { type: 'feature', id: featureId, error: 'Feature has no geometry' }
        }));
        return false;
      }
    } else {
      console.log('❌ Feature not found with ID:', featureId);
      console.log('Available feature IDs:', olFeatures.map(f => {
        const data = f.get('featureData');
        return data ? data._id.toString() : 'no-data';
      }));
      // Don't dispatch error event here - let the retry logic handle it
      return false;
    }
  }, []);

  // Method to zoom to a specific boundary and highlight it
  const zoomToBoundary = useCallback((boundaryId: string): boolean => {
    console.log('🏔️ zoomToBoundary called with ID:', boundaryId);
    
    if (!mapRef.current || !boundariesLayerRef.current) {
      console.log('❌ Map or boundaries layer not available');
      return false;
    }

    const source = boundariesLayerRef.current.getSource();
    if (!source) {
      console.log('❌ Boundaries layer source not available');
      return false;
    }

    // Find the boundary by ID
    const olFeatures = source.getFeatures();
    console.log('📊 Total boundaries in layer:', olFeatures.length);
    
    const targetBoundary = olFeatures.find(f => {
      const boundaryData = f.get('boundaryData');
      return boundaryData && boundaryData._id.toString() === boundaryId;
    });

    if (targetBoundary) {
      console.log('✅ Found target boundary:', targetBoundary.get('boundaryData'));
      const geometry = targetBoundary.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        console.log('📍 Boundary extent:', extent);
        const view = mapRef.current.getView();
        
        // Fit to the boundary extent with padding
        view.fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000,
          maxZoom: 16
        });

        console.log('🏔️ Successfully zoomed to boundary');
        // Highlight the boundary temporarily
        highlightFeature(targetBoundary);
        return true;
      } else {
        console.log('❌ Boundary has no geometry');
        // Dispatch custom event for error handling
        window.dispatchEvent(new CustomEvent('map-navigation-error', {
          detail: { type: 'boundary', id: boundaryId, error: 'Boundary has no geometry' }
        }));
        return false;
      }
    } else {
      console.log('❌ Boundary not found with ID:', boundaryId);
      console.log('Available boundary IDs:', olFeatures.map(f => {
        const data = f.get('boundaryData');
        return data ? data._id.toString() : 'no-data';
      }));
      // Don't dispatch error event here - let the retry logic handle it
      return false;
    }
  }, []);

  // Method to highlight a feature temporarily
  const highlightFeature = useCallback((feature: Feature) => {
    if (!mapRef.current) return;

    // Create a temporary highlight layer if it doesn't exist
    let highlightLayer = mapRef.current.getLayers().getArray().find(layer => 
      layer.get('name') === 'highlight-layer'
    ) as VectorLayer<VectorSource>;

    if (!highlightLayer) {
      const highlightSource = new VectorSource();
      highlightLayer = new VectorLayer({
        source: highlightSource,
        style: new Style({
          stroke: new Stroke({
            color: '#ff0000',
            width: 4
          }),
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.1)'
          })
        }),
        zIndex: 1000
      });
      highlightLayer.set('name', 'highlight-layer');
      mapRef.current.addLayer(highlightLayer);
    }

    const highlightSource = highlightLayer.getSource();
    if (highlightSource) {
      // Clear previous highlights
      highlightSource.clear();
      
      // Clone the feature for highlighting
      const highlightFeature = feature.clone();
      highlightSource.addFeature(highlightFeature);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        highlightSource.clear();
      }, 3000);
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
        hitTolerance: 6,
        // Only allow selecting non-shapefile layers to ensure point features are clickable
        layers: [
          featuresLayerRef.current,
          teamsLayerRef.current,
          tasksLayerRef.current,
          boundariesLayerRef.current
        ].filter((layer): layer is VectorLayer<any> => layer !== null)
      });

      selectInteractionRef.current.on('select', (event) => {
        if (
          drawingModeRef.current ||
          pointSelectionModeRef.current ||
          lineDrawingModeRef.current ||
          selectionModeRef.current
        ) {
          return;
        }
        if (suppressNextPrimaryClickRef.current) {
          suppressNextPrimaryClickRef.current = false;
          return;
        }
        // Reflect selection state on features so style function can render status-colored highlight
        event.deselected?.forEach((f: any) => { f.set('isSelected', false); f.changed(); });
        const selected = event.selected;
        if (selected.length > 0) {
          const feature = selected[0];
          feature.set('isSelected', true);
          feature.changed();

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
