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
import JSZip from 'jszip';
import * as shp from 'shpjs';

interface ShapefileUploadProps {
  onShapefileProcessed: (shapefile: ShapefileData) => void;
}

interface ShapefileData {
  _id: string;
  name: string;
  features: any;
  projection: string | null;
  uploadedAt: Date;
  featureCount: number;
}

export function ShapefileUpload({ onShapefileProcessed }: ShapefileUploadProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a ZIP file containing shapefile data (.shp, .dbf, .prj)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setName(file.name.replace('.zip', '').replace(/[_-]/g, ' '));
    toast({
      title: 'File Selected',
      description: `Selected ${file.name}`,
    });
  };

  const processShapefile = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a shapefile to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Missing Name',
        description: 'Please provide a name for the shapefile',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setProgress(30);

      try {
        const geojson = await shp.default(arrayBuffer);
        setProgress(70);

        const features =
          geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)
            ? geojson.features
            : Array.isArray(geojson)
            ? geojson
            : [];

        if (features.length === 0) throw new Error('No features found in shapefile');

        const shapefile: ShapefileData = {
          _id: Date.now().toString(),
          name: name.trim(),
          features: geojson,
          projection: null,
          uploadedAt: new Date(),
          featureCount: features.length,
        };

        onShapefileProcessed(shapefile);
        setProgress(100);
        toast({
          title: 'Shapefile Processed',
          description: `Processed "${name}" with ${features.length} features`,
        });

        setSelectedFile(null);
        setName('');
        setOpen(false);
        return;
      } catch (directErr) {
        console.warn('Direct parse failed, trying fallback...');
      }

      // Fallback manual extraction
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(arrayBuffer);
      let shpFile: JSZip.JSZipObject | undefined;
      let dbfFile: JSZip.JSZipObject | undefined;
      let prjFile: JSZip.JSZipObject | undefined;

      zipContents.forEach((relativePath, zipEntry) => {
        const path = relativePath.toLowerCase();
        if (path.endsWith('.shp')) shpFile = zipEntry;
        else if (path.endsWith('.dbf')) dbfFile = zipEntry;
        else if (path.endsWith('.prj')) prjFile = zipEntry;
      });

      if (!shpFile) throw new Error('No .shp file found in ZIP');

      const shpData = await shpFile.async('arraybuffer');
      const dbfData = dbfFile ? await dbfFile.async('arraybuffer') : null;
      const prjData = prjFile ? await prjFile.async('string') : null;

      const geometries = await shp.parseShp(shpData);
      const properties = dbfData ? await shp.parseDbf(dbfData) : [];

      const features = geometries.map((geometry: any, i: number) => ({
        type: 'Feature',
        geometry,
        properties: properties[i] || {},
      }));

      const featureCollection = {
        type: 'FeatureCollection',
        features,
      };

      const shapefile: ShapefileData = {
        _id: Date.now().toString(),
        name: name.trim(),
        features: featureCollection,
        projection: prjData || null,
        uploadedAt: new Date(),
        featureCount: features.length,
      };

      onShapefileProcessed(shapefile);
      setProgress(100);
      toast({
        title: 'Shapefile Processed (Fallback)',
        description: `Processed "${name}" with ${features.length} features`,
      });

      setSelectedFile(null);
      setName('');
      setOpen(false);
    } catch (error: any) {
      console.error('Error processing shapefile:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process shapefile',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
          <Upload className="w-4 h-4 mr-2" />
          Upload Shapefile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Shapefile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="shapefile-upload">Shapefile (ZIP format)</Label>
            <div className="mt-2">
              <input
                id="shapefile-upload"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                ref={fileInputRef}
              />
              <Label
                htmlFor="shapefile-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <FileUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to select ZIP file'}
                  </p>
                  <p className="text-xs text-gray-500">ZIP with .shp, .dbf, and .prj</p>
                </div>
              </Label>
            </div>
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter shapefile name"
              required
            />
          </div>
          <div>
            <Button
              onClick={processShapefile}
              disabled={!selectedFile || !name.trim() || isProcessing}
              className="w-full relative"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing... {progress > 0 ? `${progress}%` : ''}
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Process Shapefile
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
