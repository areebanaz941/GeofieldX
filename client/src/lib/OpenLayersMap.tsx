import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Feature } from 'ol';
import { Point, Polygon, LineString } from 'ol/geom';
import { Style, Fill, Stroke, Circle, Text, Icon } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Draw, Modify, Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import { ITask, IUser, IFeature, IBoundary } from '../../../shared/schema';
import { getFeatureIcon } from '../components/FeatureIcons';
import 'ol/ol.css';

// Import custom icons (keeping as fallback)
import towerIcon from '@assets/tower-removebg-preview_1750282584510.png';
import manholeIcon from '@assets/manhole-removebg-preview_1750282584509.png';
import fibercableIcon from '@assets/fibercable-removebg-preview_1750282584507.png';
import parcelIcon from '@assets/land-removebg-preview_1750282584509.png';

// Define status colors matching our SVG system
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

// Helper function to convert SVG to data URI
const createSVGIcon = (featureType: string, status: string, size: number = 24): string => {
  const getStatusColor = (status: string): string => {
    if (status === 'Complete' || status === 'Completed' || status === 'Review_Accepted') {
      return '#10B981'; // green
    } else if (status === 'Assigned' || status === 'In Progress' || status === 'Submit-Review' || status === 'Review_inprogress') {
      return '#3B82F6'; // blue
    } else if (status === 'In-Complete' || status === 'Review_Reject' || status === 'delayed') {
      return '#EF4444'; // red
    } else {
      return '#000000'; // black (unassigned)
    }
  };

  const color = getStatusColor(status);
  let svgContent = '';

  switch (featureType) {
    case 'Tower':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L8 6V10L10 12V22H14V12L16 10V6L12 2Z" fill="${color}" stroke="${color}" stroke-width="1"/>
        <circle cx="12" cy="4" r="1" fill="${color}"/>
        <path d="M6 18H18M8 20H16" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
      break;
    case 'Manhole':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="${color}" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" fill="none" stroke="white" stroke-width="1"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="white" stroke-width="1"/>
        <path d="M8 8L16 16M16 8L8 16" stroke="white" stroke-width="1" stroke-linecap="round"/>
      </svg>`;
      break;
    case 'FiberCable':
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12C2 12 6 8 12 8C18 8 22 12 22 12C22 12 18 16 12 16C6 16 2 12 2 12Z" stroke="${color}" stroke-width="2" fill="none"/>
        <path d="M4 12H8M16 12H20" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="2" fill="${color}"/>
      </svg>`;
      break;
    case 'Parcel':
    default:
      svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="${color}" stroke-width="2"/>
        <path d="M3 9H21M9 3V21" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="6" cy="6" r="1" fill="${color}"/>
        <circle cx="15" cy="6" r="1" fill="${color}"/>
        <circle cx="6" cy="15" r="1" fill="${color}"/>
        <circle cx="15" cy="15" r="1" fill="${color}"/>
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
  activeFilters?: string[];
  onFeatureClick?: (feature: IFeature) => void;
  onBoundaryClick?: (boundary: IBoundary) => void;
  onTeamClick?: (team: IUser) => void;
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
  activeFilters = ['All'],
  onFeatureClick,
  onBoundaryClick,
  onTeamClick,
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
        
        // Determine feature status for color coding
        const featureStatus = featureData?.feaState || featureData?.status || 'Unassigned';
        
        // Create SVG icon with status-based color
        const svgIconSrc = createSVGIcon(featureType, featureStatus, iconSize);
        
        // Handle different geometry types
        const geometry = feature.getGeometry();
        const geometryType = geometry?.getType();
        
        if (geometryType === 'LineString' || featureType === 'FiberCable') {
          // For line features (fiber cables), use stroke styling with status-based colors
          const lineWidth = Math.max(2, Math.min(6, zoom / 3));
          const statusColor = statusColors[featureStatus as keyof typeof statusColors] || '#000000';
          
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
        const color = statusColors[status as keyof typeof statusColors] || '#9E9E9E';
        
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

    // Create shapefile layer for uploaded shapefiles
    shapefilesLayerRef.current = new VectorLayer({
      source: shapefilesSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.2)' // Semi-transparent red fill
        }),
        stroke: new Stroke({
          color: '#FF0000',
          width: 2
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: '#FF0000' }),
          stroke: new Stroke({ color: '#ffffff', width: 1 })
        })
      })
    });

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
        selectedLocationLayerRef.current
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom
      })
    });

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

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
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

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapRef.current) {
      const view = mapRef.current.getView();
      view.setCenter(fromLonLat([lng, lat]));
      if (zoom) {
        view.setZoom(zoom);
      }
    }
  }, []);

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          panTo(latitude, longitude, 16);
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
    }
  }, [panTo]);



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
        layers: [featuresLayerRef.current, teamsLayerRef.current, boundariesLayerRef.current, tasksLayerRef.current].filter(Boolean)
      });

      selectInteractionRef.current.on('select', (event) => {
        const selected = event.selected;
        if (selected.length > 0) {
          const feature = selected[0];
          const featureData = feature.get('featureData');
          const teamData = feature.get('teamData');
          const boundaryData = feature.get('boundaryData');
          const taskData = feature.get('taskData');

          if (featureData && onFeatureClick) {
            onFeatureClick(featureData);
          } else if (teamData && onTeamClick) {
            onTeamClick(teamData);
          } else if (boundaryData && onBoundaryClick) {
            onBoundaryClick(boundaryData);
          }
        }
      });

      map.addInteraction(selectInteractionRef.current);
    }
  }, [pointSelectionMode, lineDrawingMode, selectionMode, drawingMode, onFeatureClick, onTeamClick, onBoundaryClick]);

  return (
    <div className={className}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        id="map"
      />
    </div>
  );
};

export default OpenLayersMap;