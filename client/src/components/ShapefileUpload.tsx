import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Use the global shp function like in the working example
declare global {
  interface Window {
    shp: (buffer: ArrayBuffer) => Promise<any>;
  }
}

interface ShapefileUploadProps {
  onShapefileProcessed: (shapefile: ShapefileData) => void;
  onShapefileUploaded?: () => void; // Callback to refresh saved shapefiles
}

interface ShapefileData {
  _id: string;
  name: string;
  features: any;
  projection: string | null;
  uploadedAt: Date;
  featureCount: number;
}

// Custom Tooltip Component that works with Dialog
const TooltipButton = ({ 
  children, 
  tooltipContent, 
  onClick,
  className = "",
  ...props 
}: { 
  children: React.ReactNode; 
  tooltipContent: string | React.ReactNode; 
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left'>('bottom');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Check if tooltip fits below
    if (triggerRect.bottom + tooltipRect.height + 10 < viewportHeight) {
      setPosition('bottom');
    }
    // Check if tooltip fits above
    else if (triggerRect.top - tooltipRect.height - 10 > 0) {
      setPosition('top');
    }
    // Otherwise place to the left
    else {
      setPosition('left');
    }
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
    setTimeout(updatePosition, 0);
  };

  const getTooltipClasses = () => {
    const baseClasses = `
      fixed z-[9999] px-4 py-3 text-sm text-gray-800 bg-white rounded-lg shadow-2xl
      border-2 border-gray-200 backdrop-blur-sm w-80 pointer-events-none
    `;
    
    switch (position) {
      case 'top':
        return `${baseClasses} 
          after:content-[''] after:absolute after:top-full after:left-1/2 
          after:transform after:-translate-x-1/2 after:border-4 
          after:border-transparent after:border-t-white after:drop-shadow-sm`;
      case 'bottom':
        return `${baseClasses}
          before:content-[''] before:absolute before:bottom-full before:left-1/2 
          before:transform before:-translate-x-1/2 before:border-4 
          before:border-transparent before:border-b-white before:drop-shadow-sm`;
      case 'left':
        return `${baseClasses}
          after:content-[''] after:absolute after:top-1/2 after:left-full 
          after:transform after:-translate-y-1/2 after:border-4 
          after:border-transparent after:border-l-white after:drop-shadow-sm`;
      default:
        return baseClasses;
    }
  };

  const getTooltipStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    
    switch (position) {
      case 'top':
        return {
          left: triggerRect.left + (triggerRect.width / 2) - 160,
          top: triggerRect.top - 10,
          transform: 'translateY(-100%)'
        };
      case 'bottom':
        return {
          left: triggerRect.left + (triggerRect.width / 2) - 160,
          top: triggerRect.bottom + 10
        };
      case 'left':
        return {
          right: window.innerWidth - triggerRect.left + 10,
          top: triggerRect.top + (triggerRect.height / 2) - 80
        };
      default:
        return {};
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm font-medium
          bg-white/95 border border-black/20 rounded shadow-md
          hover:bg-white hover:shadow-lg hover:-translate-y-0.5
          transition-all duration-200 ease-in-out
          text-gray-700 hover:text-gray-900
          backdrop-blur-sm min-w-[44px] min-h-[44px]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        onClick={onClick}
        type="button"
        aria-label="Upload Shapefile - Click to upload ZIP files containing shapefile data"
        {...props}
      >
        {children}
      </button>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={getTooltipClasses()}
          style={getTooltipStyle()}
        >
          <div className="text-left">
            {tooltipContent}
          </div>
        </div>
      )}
    </>
  );
};

export function ShapefileUpload({ onShapefileProcessed, onShapefileUploaded }: ShapefileUploadProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add debug logging
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      addDebugLog('❌ No file selected');
      return;
    }

    addDebugLog(`📁 File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      addDebugLog('❌ Invalid file type - must be ZIP');
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a ZIP file containing shapefile data (.shp, .dbf, .prj)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      addDebugLog('❌ File too large');
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setName(file.name.replace('.zip', '').replace(/[_-]/g, ' '));
    addDebugLog('✅ File validated and selected successfully');
    toast({
      title: 'File Selected',
      description: `Selected ${file.name}`,
    });
  };

  const loadShpJS = async (): Promise<any> => {
    addDebugLog('🔄 Loading shp.js library...');
    
    // Check if shp.js is already loaded
    if (window.shp) {
      addDebugLog('✅ shp.js already loaded');
      return window.shp;
    }

    // Try multiple CDN sources
    const cdnUrls = [
      'https://unpkg.com/shpjs@latest/dist/shp.min.js',
      'https://cdn.jsdelivr.net/npm/shpjs@latest/dist/shp.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/shpjs/3.6.3/shp.min.js'
    ];

    for (const url of cdnUrls) {
      try {
        addDebugLog(`🔄 Trying to load from: ${url}`);
        
        await new Promise<void>((resolve, reject) => {
          // Remove any existing script with the same src
          const existingScript = document.querySelector(`script[src="${url}"]`);
          if (existingScript) {
            existingScript.remove();
          }

          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            addDebugLog(`✅ Successfully loaded from: ${url}`);
            resolve();
          };
          script.onerror = () => {
            addDebugLog(`❌ Failed to load from: ${url}`);
            reject(new Error(`Failed to load from ${url}`));
          };
          document.head.appendChild(script);
        });

        // Wait a bit for the library to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.shp) {
          addDebugLog('✅ shp.js loaded and available');
          return window.shp;
        } else {
          throw new Error('shp.js loaded but not available on window object');
        }
      } catch (error) {
        addDebugLog(`❌ Error loading from ${url}: ${error}`);
        continue; // Try next URL
      }
    }

    throw new Error('Failed to load shp.js from all CDN sources');
  };

  const processShapefile = async () => {
    if (!selectedFile) {
      addDebugLog('❌ Process called without file selection');
      toast({
        title: 'No File Selected',
        description: 'Please select a shapefile to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      addDebugLog('❌ Process called without name');
      toast({
        title: 'Missing Name',
        description: 'Please provide a name for the shapefile',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setDebugLogs([]); // Clear previous logs
    addDebugLog('🚀 Starting shapefile processing...');

    try {
      // Load shp.js library with multiple fallbacks
      addDebugLog('📚 Step 1: Loading libraries...');
      const shp = await loadShpJS();
      setProgress(25);

      // Read file as ArrayBuffer
      addDebugLog('📖 Step 2: Reading file as ArrayBuffer...');
      const arrayBuffer = await selectedFile.arrayBuffer();
      addDebugLog(`✅ File read successfully: ${arrayBuffer.byteLength} bytes`);
      setProgress(50);

      // Parse using shp.js (exactly like working example)
      addDebugLog('🔄 Step 3: Parsing shapefile with shp.js...');
      const geojson = await shp(arrayBuffer);
      addDebugLog('✅ Shapefile parsed successfully');
      setProgress(75);

      console.log('🟢 Successfully parsed shapefile:', geojson);

      // Extract features - handle different formats
      addDebugLog('🔍 Step 4: Extracting features...');
      let features: any[] = [];
      
      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        features = geojson.features;
        addDebugLog(`✅ Found FeatureCollection with ${features.length} features`);
      } else if (Array.isArray(geojson)) {
        features = geojson;
        addDebugLog(`✅ Found feature array with ${features.length} features`);
      } else if (geojson.type === 'Feature') {
        features = [geojson];
        addDebugLog('✅ Found single feature, converted to array');
      } else {
        throw new Error(`Unsupported GeoJSON format: ${geojson.type || 'unknown'}`);
      }

      if (features.length === 0) {
        throw new Error('No features found in shapefile');
      }

      setProgress(90);

      // Upload to server for database storage
      addDebugLog('💾 Step 5: Uploading to server...');
      const formData = new FormData();
      formData.append('shapefile', selectedFile);
      formData.append('name', name.trim());
      formData.append('shapefileType', 'Other'); // Default type, can be made configurable
      formData.append('description', ''); // Can be made configurable

      try {
        const response = await fetch('/api/shapefiles/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include session cookies for authentication
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        const savedShapefile = await response.json();
        addDebugLog(`✅ Shapefile saved to database with ID: ${savedShapefile._id}`);

        // Refresh saved shapefiles in the parent component
        if (onShapefileUploaded) {
          onShapefileUploaded();
        }

        // Create local shapefile object for immediate visualization
        const shapefile: ShapefileData = {
          _id: savedShapefile._id,
          name: name.trim(),
          features: geojson,
          projection: null,
          uploadedAt: new Date(),
          featureCount: features.length,
        };

        addDebugLog(`✅ Shapefile object created: "${shapefile.name}" with ${shapefile.featureCount} features`);
        console.log('🟢 Created shapefile object:', shapefile);

        onShapefileProcessed(shapefile);
        setProgress(100);
        
        addDebugLog('🎉 Processing completed successfully!');
        toast({
          title: 'Shapefile Uploaded Successfully',
          description: `Uploaded and saved "${name}" with ${features.length} features`,
        });

        setSelectedFile(null);
        setName('');
        setOpen(false);

      } catch (uploadError: any) {
        addDebugLog(`❌ Upload error: ${uploadError.message}`);
        console.error('❌ Upload error:', uploadError);
        
        // Still create local shapefile for visualization even if upload fails
        const shapefile: ShapefileData = {
          _id: `shapefile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: name.trim(),
          features: geojson,
          projection: null,
          uploadedAt: new Date(),
          featureCount: features.length,
        };

        onShapefileProcessed(shapefile);
        setProgress(100);
        
        toast({
          title: 'Shapefile Processed (Local Only)',
          description: `Processed "${name}" locally. Upload to server failed: ${uploadError.message}`,
          variant: 'destructive',
        });

        setSelectedFile(null);
        setName('');
        setOpen(false);
      }

    } catch (error: any) {
      addDebugLog(`❌ Error during processing: ${error.message}`);
      console.error('❌ Error processing shapefile:', error);
      
      let errorMessage = 'Failed to process shapefile';
      if (error.message.includes('shp.js')) {
        errorMessage = 'Failed to load shapefile processing library. Please check your internet connection.';
      } else if (error.message.includes('No features')) {
        errorMessage = 'No valid features found in the shapefile. Please check the file format.';
      } else if (error.message.includes('Unsupported')) {
        errorMessage = 'Unsupported shapefile format. Please ensure your file contains valid shapefile data.';
      }
      
      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Tooltip content explaining supported formats
  const tooltipContent = (
    <div>
      <div className="font-bold mb-3 text-center text-green-700 text-base border-b border-gray-200 pb-2">
        📁 Shapefile Upload Guide
      </div>
      
      <div className="mb-3">
        <div className="font-semibold text-gray-800 mb-2 text-sm">Required Files:</div>
        <ul className="space-y-1.5 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span>
            <div>
              <strong className="text-gray-800">.shp</strong> - Main geometry data
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span>
            <div>
              <strong className="text-gray-800">.shx</strong> - Shape index (required)
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span>
            <div>
              <strong className="text-gray-800">.dbf</strong> - Attribute data table
            </div>
          </li>
        </ul>
      </div>

      <div className="mb-3">
        <div className="font-semibold text-gray-800 mb-2 text-sm">Optional Files:</div>
        <ul className="space-y-1 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-gray-500">•</span>
            <div>
              <strong className="text-gray-700">.prj</strong> - Projection info (highly recommended)
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-500">•</span>
            <div>
              <strong className="text-gray-700">.cpg</strong> - Character encoding
            </div>
          </li>
        </ul>
      </div>

      {/* Coordinate System Requirements - Highlighted */}
      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
        <div className="font-semibold text-blue-800 mb-2 text-sm flex items-center gap-1">
          🗺️ Coordinate System Requirements
        </div>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <strong className="text-blue-700">EPSG:4326</strong> - WGS84 Geographic (Recommended)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <strong className="text-blue-700">EPSG:3857</strong> - Web Mercator (Also supported)
          </div>
          <div className="text-blue-600 text-xs mt-1 italic">
            Other coordinate systems may require reprojection
          </div>
        </div>
      </div>
      
      <div className="pt-3 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-500">📦</span>
          <strong className="text-gray-700">Format:</strong> 
          <span className="text-gray-600">Single ZIP file containing all components</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-orange-500">⚠️</span>
          <strong className="text-gray-700">Max size:</strong> 
          <span className="text-gray-600">50MB per upload</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-500">✓</span>
          <strong className="text-gray-700">Best practice:</strong> 
          <span className="text-gray-600">Include .prj file with coordinate system info</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <TooltipButton
            tooltipContent={tooltipContent}
            onClick={() => {
              console.log('🔘 Upload button clicked');
              addDebugLog('🔘 Upload button clicked - opening dialog');
              setOpen(true);
            }}
          >
            <Upload className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Upload Shapefile</span>
          </TooltipButton>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-2 border-gray-200 shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Upload className="w-5 h-5 text-green-600" />
            Upload Shapefile
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Upload and save your shapefile to the database for future use. The shapefile will be processed and stored permanently.
          </p>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label htmlFor="shapefile-upload" className="text-sm font-medium text-gray-700">
              Shapefile (ZIP format) *
            </Label>
            <div className="mt-2">
              <input
                id="shapefile-upload"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                ref={fileInputRef}
                disabled={isProcessing}
              />
              <Label
                htmlFor="shapefile-upload"
                className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 group ${
                  isProcessing 
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <div className="text-center">
                  <FileUp className={`mx-auto h-8 w-8 mb-2 transition-colors ${
                    isProcessing 
                      ? 'text-gray-300' 
                      : 'text-gray-400 group-hover:text-green-500'
                  }`} />
                  <p className="text-sm font-medium text-gray-600">
                    {selectedFile ? (
                      <span className="text-green-700">{selectedFile.name}</span>
                    ) : (
                      'Click to select ZIP file'
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Must contain .shp, .dbf, .shx files
                  </p>
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Max size: 50MB
                  </p>
                </div>
              </Label>
            </div>
          </div>
          
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Display Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name for your shapefile"
              required
              disabled={isProcessing}
              className="mt-2 border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Debug logs section - only show when processing or if there are errors */}
          {(isProcessing || debugLogs.some(log => log.includes('❌'))) && (
            <div className="max-h-32 overflow-y-auto bg-gray-50 border rounded p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Processing Log:</div>
              {debugLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-xs font-mono ${
                    log.includes('❌') ? 'text-red-600' : 
                    log.includes('✅') ? 'text-green-600' : 
                    'text-gray-500'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isProcessing}
              className="flex-1 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={processShapefile}
              disabled={!selectedFile || !name.trim() || isProcessing}
              className="flex-1 relative bg-green-600 hover:bg-green-700 text-white font-medium disabled:bg-gray-400"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress < 90 ? 'Processing' : 'Saving to Database'} {progress > 0 ? `${progress}%` : '...'}
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-green-400 transition-all duration-300 rounded-b"
                    style={{ width: `${progress}%` }}
                  />
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Save to Database
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}