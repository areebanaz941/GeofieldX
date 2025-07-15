import { useEffect, useRef, useCallback } from 'react';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import { Style, Fill, Stroke, Circle, Text, RegularShape } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import BaseEvent from 'ol/events/Event';
import { FeatureLike } from 'ol/Feature';
import { Layer } from 'ol/layer';

interface ShapefileFeature {
  geometry: any;
  properties?: Record<string, any>;
  type?: string;
  [key: string]: any;
}

export interface Shapefile {
  _id: string;
  name: string;
  features: ShapefileFeature[] | string | any;
  projection?: string | null;
  uploadedAt?: Date;
  featureCount?: number;
  [key: string]: any;
}

interface ShapefileLayerProps {
  shapefiles: Shapefile[];
  onFeatureClick?: (feature: any) => void;
}

export function ShapefileLayer({ shapefiles = [], onFeatureClick }: ShapefileLayerProps) {
  const vectorSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  
  // Simplify features for better performance
  const simplifyFeatures = useCallback((features: any[], tolerance = 0.01) => {
    console.log(`Simplifying ${features.length} features with tolerance ${tolerance}`);
    try {
      const format = new GeoJSON();
      const simplified = features.map(feature => {
        const olFeature = format.readFeature(feature);
        const geometry = olFeature.getGeometry();
        if (geometry) {
          // Use the simplify method directly on the geometry
          geometry.simplify(tolerance);
        }
        return format.writeFeatureObject(olFeature);
      });
      return simplified;
    } catch (error) {
      console.error('Error simplifying features:', error);
      return features;
    }
  }, []);
  
  // Initialize the vector layer
  useEffect(() => {
    if (!window.olMap) {
      console.error('OpenLayers Map instance not available');
      return;
    }
    
    // Create vector source
    const vectorSource = new VectorSource<Feature<Geometry>>();
    vectorSourceRef.current = vectorSource;
    
    // Create vector layer with enhanced styling for visibility
    const vectorLayer = new VectorLayer<VectorSource<Feature<Geometry>>>({
      source: vectorSource,
      style: function(feature: FeatureLike) {
        const geometry = feature.getGeometry()?.getType();
        const properties = feature.getProperties();
        const shapefileData = properties.shapefileData || {};
        
        // Use bright colors for better visibility
        const fillColor = 'rgba(255, 105, 180, 0.3)';  // Hot pink
        const strokeColor = '#FF1493';                  // Deep pink
        
        // Get feature name from properties if available
        let featureName = '';
        if (shapefileData.properties) {
          // Try common property names for feature naming
          const nameProps = ['name', 'NAME', 'Name', 'title', 'TITLE', 'id', 'ID', 'label', 'LABEL'];
          for (const prop of nameProps) {
            if (shapefileData.properties[prop]) {
              featureName = shapefileData.properties[prop];
              break;
            }
          }
        }
        
        // Apply style based on geometry type
        switch(geometry) {
          case 'Point':
            return new Style({
              image: new RegularShape({
                points: 4,
                radius: 10,
                angle: Math.PI / 4,
                fill: new Fill({ color: strokeColor }),
                stroke: new Stroke({ color: '#fff', width: 2 })
              }),
              text: featureName ? new Text({
                text: featureName,
                offsetY: 20,
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
                width: 4,
                lineDash: [5, 5]
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
      zIndex: 500 // Ensure it's above other layers
    });
    
    vectorLayerRef.current = vectorLayer;
    
    // Add layer to map
    window.olMap.addLayer(vectorLayer);
    
    // Add click handler
    const clickHandler = (event: BaseEvent) => {
      const map = window.olMap;
      if (!map) return;
      
      // Cast to any to access pixel property
      const mapEvent = event as any;
      
      map.forEachFeatureAtPixel(mapEvent.pixel, function(feature: FeatureLike, layer: Layer) {
        if (layer === vectorLayerRef.current && onFeatureClick) {
          onFeatureClick(feature.get('shapefileData'));
          return true; // Stop iteration
        }
        return false;
      });
    };
    
    window.olMap.on('click', clickHandler);
    
    // Cleanup
    return () => {
      if (window.olMap) {
        window.olMap.un('click', clickHandler);
        if (vectorLayerRef.current) {
          window.olMap.removeLayer(vectorLayerRef.current);
        }
      }
      vectorLayerRef.current = null;
      vectorSourceRef.current = null;
    };
  }, [onFeatureClick]);
  
  // Update features when shapefiles change
  useEffect(() => {
    if (!vectorSourceRef.current || !shapefiles || shapefiles.length === 0) return;
    
    // Clear existing features
    vectorSourceRef.current.clear();
    
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
          // Simplify large datasets (>1000 features)
          const featuresToProcess = geojson.features.length > 1000
            ? simplifyFeatures(geojson.features)
            : geojson.features;
            
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
          
          // Parse GeoJSON into OpenLayers features
          try {
            const olFeatures = new GeoJSON().readFeatures(enhancedGeoJSON, {
              featureProjection: 'EPSG:3857' // Web Mercator
            });
            
            // Add shapefile data to each feature for reference
            olFeatures.forEach((feature, index) => {
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });
            
            // Add features to source
            if (vectorSourceRef.current) {
              vectorSourceRef.current.addFeatures(olFeatures);
            }
            console.log(`Added ${olFeatures.length} features from "${shapefile.name}"`);
          } catch (error) {
            console.error(`Error parsing GeoJSON for "${shapefile.name}":`, error);
          }
        } else if (Array.isArray(geojson)) {
          // Simplify large datasets
          const featuresToProcess = geojson.length > 1000
            ? simplifyFeatures(geojson)
            : geojson;
            
          console.log(`Processing ${featuresToProcess.length} features from "${shapefile.name}"`);
          
          // Convert to GeoJSON FeatureCollection format
          const featureCollection = {
            type: 'FeatureCollection',
            features: featuresToProcess.map((feature: any) => {
              // Ensure each feature has a properties object
              if (!feature.properties) feature.properties = {};
              
              // Add shapefile metadata to properties
              feature.properties.shapefileId = shapefile._id;
              feature.properties.shapefileName = shapefile.name;
              
              return feature;
            })
          };
          
          // Parse as GeoJSON
          try {
            const olFeatures = new GeoJSON().readFeatures(featureCollection, {
              featureProjection: 'EPSG:3857' // Web Mercator
            });
            
            // Add shapefile data to each feature
            olFeatures.forEach((feature, index) => {
              feature.set('shapefileData', {
                ...featuresToProcess[index],
                parentShapefile: shapefile
              });
            });
            
            // Add features to source
            if (vectorSourceRef.current) {
              vectorSourceRef.current.addFeatures(olFeatures);
            }
            console.log(`Added ${olFeatures.length} features from "${shapefile.name}"`);
          } catch (error) {
            console.error(`Error parsing feature array for "${shapefile.name}":`, error);
          }
        } else {
          console.warn(`Invalid features format in "${shapefile.name}"`);
        }
      } catch (error) {
        console.error(`Error processing shapefile "${shapefile.name}":`, error);
      }
    });
  }, [shapefiles, simplifyFeatures]);
  
  // Component doesn't render anything visible
  return null;
}