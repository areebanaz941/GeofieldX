import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { ITask, IUser, IFeature, IBoundary } from '../../../shared/schema';

// Store legend control reference separately
interface CustomMap extends L.Map {
  _legendControl?: L.Control;
}

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
  onPolygonCreated?: (polygon: { name: string; coordinates: number[][][] }) => void;
  selectionMode?: boolean;
  drawingMode?: boolean;
  className?: string;
}

const LeafletMap = ({
  center = [24.8607, 67.0011], // Default Karachi coordinates
  zoom = 13,
  features = [],
  teams = [],
  boundaries = [],
  tasks = [],
  activeFilters = [],
  onFeatureClick,
  onBoundaryClick,
  onTeamClick,
  onMapClick,
  onPolygonCreated,
  selectionMode = false,
  drawingMode = false,
  className = 'h-full w-full'
}: MapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const featuresLayerRef = useRef<L.LayerGroup | null>(null);
  const teamsLayerRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerRef = useRef<L.LayerGroup | null>(null);
  const tasksLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const selectedLocationMarkerRef = useRef<L.Marker | null>(null);
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map').setView(center, zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      featuresLayerRef.current = L.layerGroup().addTo(map);
      teamsLayerRef.current = L.layerGroup().addTo(map);
      boundariesLayerRef.current = L.layerGroup().addTo(map);
      tasksLayerRef.current = L.layerGroup().addTo(map);
      
      // Initialize drawing layer
      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);
      
      mapRef.current = map;
      
      if (onMapClick) {
        map.on('click', (e) => {
          // Allow map clicks when in selection mode or when not drawing
          if (selectionMode || !drawingMode) {
            // Remove existing selection marker
            if (selectedLocationMarkerRef.current) {
              map.removeLayer(selectedLocationMarkerRef.current);
            }
            
            // Create new selection marker
            const selectedIcon = L.divIcon({
              className: 'selected-location-marker',
              html: `
                <div class="animate-pulse">
                  <div class="rounded-full bg-red-500 w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                    <div class="rounded-full bg-white w-2 h-2"></div>
                  </div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            selectedLocationMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], { icon: selectedIcon });
            selectedLocationMarkerRef.current.addTo(map);
            
            onMapClick(e.latlng);
          }
        });
      }
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update map center and zoom if changed
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Handle drawing mode
  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current) return;

    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;

    if (drawingMode) {
      // Add drawing controls
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          remove: true
        },
        draw: {
          polygon: {
            allowIntersection: false,
            drawError: {
              color: '#e1e100',
              message: '<strong>Error:</strong> Shape edges cannot cross!'
            },
            shapeOptions: {
              color: '#97009c'
            }
          },
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false
        }
      });

      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Handle polygon creation
      const onDrawCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latlng: any) => [latlng.lng, latlng.lat]);
        
        if (onPolygonCreated) {
          // Prompt for parcel name
          const name = prompt('Enter parcel name:');
          if (name) {
            onPolygonCreated({
              name,
              coordinates: [coordinates]
            });
          }
        }
        
        drawnItems.addLayer(layer);
      };

      map.on(L.Draw.Event.CREATED, onDrawCreated);

      return () => {
        map.off(L.Draw.Event.CREATED, onDrawCreated);
        if (drawControlRef.current) {
          map.removeControl(drawControlRef.current);
          drawControlRef.current = null;
        }
      };
    } else {
      // Remove drawing controls
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    }
  }, [drawingMode, onPolygonCreated]);
  
  // Update features on the map
  useEffect(() => {
    if (!featuresLayerRef.current) return;
    
    featuresLayerRef.current.clearLayers();
    
    features.forEach(feature => {
      // Skip if filtered out
      if (activeFilters.length > 0 && !activeFilters.includes('All') && 
          !activeFilters.includes(feature.feaStatus)) {
        return;
      }
      
      if (!feature.geometry) return;
      
      try {
        const geometry = typeof feature.geometry === 'string' 
          ? JSON.parse(feature.geometry) 
          : feature.geometry;
        
        let layer: L.Layer | null = null;
        
        if (geometry.type === 'Point') {
          const [lng, lat] = geometry.coordinates;
          
          // Create icon based on feature type
          const color = featureColors[feature.feaType as keyof typeof featureColors] || '#757575';
          
          // Define feature-specific icons
          const getFeatureIcon = (featureType: string) => {
            switch (featureType) {
              case 'Tower':
                return `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
                    <path d="M12 2l-2 2v2l-2 2v2l-2 2v10h12V10l-2-2V6l-2-2V4l-2-2z"/>
                    <circle cx="12" cy="4" r="1" fill="white"/>
                    <rect x="10" y="6" width="4" height="1" fill="white"/>
                    <rect x="9" y="8" width="6" height="1" fill="white"/>
                    <rect x="8" y="10" width="8" height="1" fill="white"/>
                  </svg>
                `;
              case 'Manhole':
                return `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
                    <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="5" fill="none" stroke="white" stroke-width="1"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                    <rect x="6" y="11" width="12" height="2" fill="white"/>
                    <rect x="11" y="6" width="2" height="12" fill="white"/>
                  </svg>
                `;
              case 'FiberCable':
                return `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
                    <path d="M3 12h18M3 8h18M3 16h18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="6" cy="12" r="2" fill="${color}"/>
                    <circle cx="12" cy="12" r="2" fill="${color}"/>
                    <circle cx="18" cy="12" r="2" fill="${color}"/>
                    <rect x="2" y="6" width="20" height="12" fill="none" stroke="${color}" stroke-width="1" rx="2"/>
                  </svg>
                `;
              case 'Parcel':
                return `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
                    <rect x="3" y="3" width="18" height="18" fill="${color}" stroke="white" stroke-width="2" rx="2"/>
                    <path d="M3 3l9 9l9-9" stroke="white" stroke-width="2" fill="none"/>
                    <path d="M3 21l9-9l9 9" stroke="white" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                  </svg>
                `;
              default:
                return `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
                    <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${feature.feaNo || '?'}</text>
                  </svg>
                `;
            }
          };
          
          const icon = L.divIcon({
            className: 'feature-icon',
            html: `
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; position: relative;">
                ${getFeatureIcon(feature.feaType)}
                <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); background: ${color}; color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: bold; border: 1px solid white;">
                  ${feature.feaNo || '?'}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          layer = L.marker([lat, lng], { icon });
        } else if (geometry.type === 'LineString') {
          const points = geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
          layer = L.polyline(points, { 
            color: featureColors[feature.feaType as keyof typeof featureColors] || '#757575',
            weight: 3,
            opacity: 0.8
          });
        } else if (geometry.type === 'Polygon') {
          const points = geometry.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);
          layer = L.polygon(points, { 
            color: featureColors[feature.feaType as keyof typeof featureColors] || '#757575',
            fillOpacity: 0.3,
            weight: 2
          });
        }
        
        if (layer) {
          layer.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${feature.name || `${feature.feaType} #${feature.feaNo}`}</h3>
              <div class="text-xs mt-1">Type: ${feature.specificType}</div>
              <div class="text-xs">Status: ${feature.feaStatus}</div>
            </div>
          `);
          
          if (onFeatureClick) {
            layer.on('click', () => onFeatureClick(feature));
          }
          
          featuresLayerRef.current?.addLayer(layer);
        }
      } catch (error) {
        console.error('Error rendering feature geometry:', error);
      }
    });
  }, [features, activeFilters, onFeatureClick]);
  
  // Update team markers on the map
  useEffect(() => {
    if (!teamsLayerRef.current) return;
    
    teamsLayerRef.current.clearLayers();
    
    teams.forEach(team => {
      if (!team.currentLocation) return;
      
      try {
        const location = typeof team.currentLocation === 'string'
          ? JSON.parse(team.currentLocation)
          : team.currentLocation;
        
        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          
          // Create user marker
          const isActive = team.lastActive && (new Date().getTime() - new Date(team.lastActive).getTime() < 15 * 60 * 1000);
          const statusColor = isActive ? '#4CAF50' : '#F44336';
          
          const icon = L.divIcon({
            className: 'user-marker',
            html: `
              <div class="rounded-full bg-white p-1 shadow-md">
                <div class="rounded-full bg-primary-500 text-white w-8 h-8 flex items-center justify-center font-medium text-sm relative">
                  ${team.name.slice(0, 1)}
                  <span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white flex items-center justify-center">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${statusColor}"></span>
                  </span>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          const marker = L.marker([lat, lng], { icon });
          
          marker.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${team.name}</h3>
              <div class="text-xs mt-1">Role: ${team.role}</div>
              <div class="text-xs">Status: ${isActive ? 'Active' : 'Inactive'}</div>
              ${team.lastActive ? `<div class="text-xs">Last seen: ${new Date(team.lastActive).toLocaleTimeString()}</div>` : ''}
            </div>
          `);
          
          if (onTeamClick) {
            marker.on('click', () => onTeamClick(team));
          }
          
          teamsLayerRef.current?.addLayer(marker);
        }
      } catch (error) {
        console.error('Error rendering team marker:', error);
      }
    });
  }, [teams, onTeamClick]);
  
  // Update boundaries on the map
  useEffect(() => {
    if (!boundariesLayerRef.current) return;
    
    boundariesLayerRef.current.clearLayers();
    
    boundaries.forEach(boundary => {
      if (!boundary.geometry) return;
      
      try {
        const geometry = typeof boundary.geometry === 'string'
          ? JSON.parse(boundary.geometry)
          : boundary.geometry;
        
        if (geometry.type === 'Polygon') {
          const points = geometry.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);
          
          // Get color based on status
          const statusColor = statusColors[boundary.status as keyof typeof statusColors] || '#757575';
          
          const polygon = L.polygon(points, {
            color: statusColor,
            fillOpacity: 0.2,
            weight: 2
          });
          
          polygon.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${boundary.name}</h3>
              <div class="text-xs mt-1">Status: ${boundary.status}</div>
            </div>
          `);
          
          if (onBoundaryClick) {
            polygon.on('click', () => onBoundaryClick(boundary));
          }
          
          boundariesLayerRef.current?.addLayer(polygon);
        }
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });
  }, [boundaries]);
  
  // Update tasks on the map
  useEffect(() => {
    if (!tasksLayerRef.current) return;
    
    tasksLayerRef.current.clearLayers();
    
    tasks.forEach(task => {
      if (!task.location) return;
      
      try {
        const location = typeof task.location === 'string'
          ? JSON.parse(task.location)
          : task.location;
        
        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          
          // Get color based on status
          const statusColor = statusColors[task.status as keyof typeof statusColors] || '#757575';
          
          const icon = L.divIcon({
            className: 'task-marker',
            html: `
              <div class="rounded-full bg-white p-1 shadow-md">
                <div class="rounded-full flex items-center justify-center text-white w-8 h-8 text-xs font-medium" style="background-color: ${statusColor}">
                  Task
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          const marker = L.marker([lat, lng], { icon });
          
          marker.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${task.title}</h3>
              <div class="text-xs mt-1">Status: ${task.status}</div>
              ${task.dueDate ? `<div class="text-xs">Due: ${new Date(task.dueDate).toLocaleDateString()}</div>` : ''}
            </div>
          `);
          
          tasksLayerRef.current?.addLayer(marker);
        }
      } catch (error) {
        console.error('Error rendering task marker:', error);
      }
    });
  }, [tasks]);
  
  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoom || mapRef.current.getZoom());
    }
  }, []);
  
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 16);
          }
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
    }
  }, []);
  
  // Create a legend control
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove existing legend if any
    const map = mapRef.current;
    const existingLegends = document.querySelectorAll('.map-legend-control');
    existingLegends.forEach(el => el.remove());
    
    // Create custom legend control
    const LegendControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'map-legend-control');
        
        // Style the container
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
        container.style.minWidth = '150px';
        container.style.zIndex = '1000';
        
        // Add title
        let content = '<h4 style="margin:0 0 8px; font-weight:bold;">Map Legend</h4>';
        
        // Add feature types
        if (features && features.length > 0) {
          content += '<div style="margin-bottom:8px;"><strong>Feature Types</strong></div>';
          
          Object.entries(featureColors).forEach(([type, color]) => {
            content += `
              <div style="display:flex; align-items:center; margin-bottom:4px;">
                <div style="width:16px; height:16px; background-color:${color}; margin-right:8px; border-radius:50%;"></div>
                <span>${type}</span>
              </div>
            `;
          });
        }
        
        // Add task status
        if (tasks && tasks.length > 0) {
          content += '<div style="margin-top:12px; margin-bottom:8px;"><strong>Task Status</strong></div>';
          
          Object.entries(statusColors).forEach(([status, color]) => {
            content += `
              <div style="display:flex; align-items:center; margin-bottom:4px;">
                <div style="width:16px; height:16px; background-color:${color}; margin-right:8px; border-radius:3px;"></div>
                <span>${status}</span>
              </div>
            `;
          });
        }
        
        container.innerHTML = content;
        return container;
      }
    });
    
    // Add the legend to the map
    new LegendControl().addTo(map);
    
  }, [features, tasks, mapRef.current]);
  
  return (
    <div id="map" className={className}></div>
  );
};

export default LeafletMap;
