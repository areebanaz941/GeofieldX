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
import 'ol/ol.css';

// Import custom icons
import towerIcon from '@assets/tower-removebg-preview_1750282584510.png';
import manholeIcon from '@assets/manhole-removebg-preview_1750282584509.png';
import fibercableIcon from '@assets/fibercable-removebg-preview_1750282584507.png';
import parcelIcon from '@assets/land-removebg-preview_1750282584509.png';

// Define status colors
const statusColors = {
  'Unassigned': '#9E9E9E',
  'Assigned': '#2196F3',
  'In Progress': '#9C27B0',
  'Completed': '#4CAF50',
  'In-Complete': '#FFC107',
  'Submit-Review': '#FF9800',
  'Review_Accepted': '#8BC34A',
  'Review_Reject': '#F44336',
  'Review_inprogress': '#03A9F4'
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
  activeFilters?: string[];
  onFeatureClick?: (feature: IFeature) => void;
  onBoundaryClick?: (boundary: IBoundary) => void;
  onTeamClick?: (team: IUser) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  onMapDoubleClick?: () => void;
  onPolygonCreated?: (polygon: { name: string; coordinates: number[][][] }) => void;
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
  activeFilters = ['All'],
  onFeatureClick,
  onBoundaryClick,
  onTeamClick,
  onMapClick,
  onMapDoubleClick,
  onPolygonCreated,
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
        
        // Select appropriate icon based on feature type
        let iconSrc = towerIcon;
        switch (featureType) {
          case 'Tower':
            iconSrc = towerIcon;
            break;
          case 'Manhole':
            iconSrc = manholeIcon;
            break;
          case 'FiberCable':
            iconSrc = fibercableIcon;
            break;
          case 'Parcel':
            iconSrc = parcelIcon;
            break;
          default:
            iconSrc = towerIcon;
        }
        
        // Handle different geometry types
        const geometry = feature.getGeometry();
        const geometryType = geometry?.getType();
        
        if (geometryType === 'LineString' || featureType === 'FiberCable') {
          // For line features (fiber cables), use stroke styling
          const lineWidth = Math.max(2, Math.min(6, zoom / 3));
          return new Style({
            stroke: new Stroke({
              color: featureColors[featureType as keyof typeof featureColors] || '#3F51B5',
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
          // For polygon features (parcels), use fill and stroke
          const strokeWidth = Math.max(1, Math.min(3, zoom / 5));
          return new Style({
            fill: new Fill({
              color: `${featureColors[featureType as keyof typeof featureColors] || '#009688'}40` // 25% opacity
            }),
            stroke: new Stroke({
              color: featureColors[featureType as keyof typeof featureColors] || '#009688',
              width: strokeWidth
            }),
            text: new Text({
              text: featureData?.name || `${featureType} #${featureData?.feaNo}`,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`
            })
          });
        } else {
          // For point features (towers, manholes), use custom icons
          return new Style({
            image: new Icon({
              src: iconSrc,
              scale: baseScale,
              anchor: [0.5, 1],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction'
            }),
            text: new Text({
              text: featureData?.name || `${featureType} #${featureData?.feaNo}`,
              offsetY: -30 * baseScale,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: `${Math.max(10, Math.min(14, zoom))}px Arial`
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
      style: new Style({
        fill: new Fill({
          color: 'rgba(0, 150, 136, 0.2)'
        }),
        stroke: new Stroke({
          color: '#009688',
          width: 2
        })
      })
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
        selectedLocationLayerRef.current
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom
      })
    });

    // Add click interaction for map clicks (only when in selection mode)
    if (onMapClick) {
      map.on('click', (event) => {
        console.log('Map clicked:', { pointSelectionMode, lineDrawingMode, selectionMode, drawingMode });
        
        if (!drawingMode && (selectionMode || pointSelectionMode || lineDrawingMode)) {
          const coordinate = toLonLat(event.coordinate);
          const [lng, lat] = coordinate;
          
          console.log('Processing map click:', { lat, lng, pointSelectionMode, lineDrawingMode });
          
          // Clear previous selection marker for point selection only
          if (pointSelectionMode && selectedLocationSourceRef.current) {
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

      // Handle double-click events for line drawing
      if (onMapDoubleClick) {
        map.on('dblclick', (event) => {
          if (lineDrawingMode) {
            event.preventDefault();
            onMapDoubleClick();
          }
        });
      }
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

  // Handle drawing mode
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing draw interaction
    if (drawInteractionRef.current) {
      mapRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

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
          onPolygonCreated({
            name: '',
            coordinates: lonLatCoordinates
          });
        }

        // Keep the polygon visible on map - don't clear it
        // Store reference to the draw layer so it can be cleared later if needed
        drawLayerRef.current = drawLayer;
        
        // Remove the draw interaction to prevent further drawing
        if (drawInteractionRef.current) {
          mapRef.current?.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }
      });

      mapRef.current.addInteraction(drawInteractionRef.current);
    }
  }, [drawingMode, onPolygonCreated]);

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
          const boundaryFeature = new Feature({
            geometry: new Polygon(coords),
            boundaryData: boundary
          });
          source.addFeature(boundaryFeature);
        }
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });
  }, [boundaries]);

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

  // Effect to handle line points visualization
  useEffect(() => {
    if (!mapRef.current || !selectedLocationSourceRef.current) return;

    const source = selectedLocationSourceRef.current;
    
    if (lineDrawingMode && linePoints.length > 0) {
      // Clear existing features
      source.clear();
      
      // Add points as markers
      linePoints.forEach((point, index) => {
        const coordinate = fromLonLat([point.lng, point.lat]);
        const marker = new Feature({
          geometry: new Point(coordinate)
        });
        source.addFeature(marker);
      });
      
      // Add line connecting the points if we have more than one
      if (linePoints.length > 1) {
        const coordinates = linePoints.map(point => fromLonLat([point.lng, point.lat]));
        const lineFeature = new Feature({
          geometry: new LineString(coordinates)
        });
        source.addFeature(lineFeature);
      }
    }
  }, [lineDrawingMode, linePoints]);

  // Effect to manage select interaction based on selection modes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing select interaction
    if (selectInteractionRef.current) {
      map.removeInteraction(selectInteractionRef.current);
      selectInteractionRef.current = null;
    }

    // Add select interaction only when not in selection modes
    if (!pointSelectionMode && !lineDrawingMode && !selectionMode) {
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
  }, [pointSelectionMode, lineDrawingMode, selectionMode, onFeatureClick, onTeamClick, onBoundaryClick]);

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