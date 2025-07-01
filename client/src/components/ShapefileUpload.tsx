import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import JSZip from 'jszip';
import shapefile from 'shapefile';

const SHAPEFILE_TYPES = ["Administrative", "Infrastructure", "Survey", "Planning", "Other"] as const;

interface ShapefileUploadProps {
  userRole: 'Supervisor' | 'Field';
  userId: string;
  onUploadSuccess: () => void;
}

export function ShapefileUpload({ userRole, userId, onUploadSuccess }: ShapefileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shapefileData, setShapefileData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    shapefileType: 'Other' as typeof SHAPEFILE_TYPES[number],
    description: '',
    assignedTo: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get teams for assignment dropdown (supervisors only)
  const { data: teams } = useQuery<any[]>({
    queryKey: ['/api/teams'],
    enabled: userRole === 'Supervisor',
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a ZIP file containing SHP data",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Extract ZIP file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);
      
      // Find required shapefile components
      const shpFile = Object.keys(zipData.files).find(name => name.toLowerCase().endsWith('.shp'));
      const dbfFile = Object.keys(zipData.files).find(name => name.toLowerCase().endsWith('.dbf'));
      
      if (!shpFile || !dbfFile) {
        toast({
          title: "Invalid Shapefile",
          description: "ZIP must contain both .shp and .dbf files",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Extract SHP and DBF data
      const shpBuffer = await zipData.files[shpFile].async('arraybuffer');
      const dbfBuffer = await zipData.files[dbfFile].async('arraybuffer');

      // Parse shapefile data
      const features: any[] = [];
      await shapefile.open(shpBuffer, dbfBuffer)
        .then(source => source.read()
          .then(function read(result): any {
            if (result.done) return;
            if (result.value) {
              features.push({
                type: "Feature",
                geometry: result.value.geometry,
                properties: result.value.properties || {}
              });
            }
            return source.read().then(read);
          })
        );

      if (features.length === 0) {
        toast({
          title: "Empty Shapefile",
          description: "No features found in the shapefile",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      setShapefileData({ features, originalFile: file });
      setFormData(prev => ({
        ...prev,
        name: file.name.replace('.zip', '').replace(/[_-]/g, ' ')
      }));

      toast({
        title: "Shapefile Loaded",
        description: `Successfully loaded ${features.length} features`,
      });

    } catch (error) {
      console.error('Error parsing shapefile:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to parse shapefile. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!shapefileData || !formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and upload a shapefile",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for file upload
      const uploadFormData = new FormData();
      uploadFormData.append('shapefile', shapefileData.originalFile);
      uploadFormData.append('name', formData.name);
      uploadFormData.append('shapefileType', formData.shapefileType);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('uploadedBy', userId);
      
      if (userRole === 'Supervisor' && formData.assignedTo) {
        uploadFormData.append('assignedTo', formData.assignedTo);
      }

      // Upload shapefile
      const response = await fetch('/api/shapefiles/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      toast({
        title: "Upload Successful",
        description: `Shapefile "${formData.name}" uploaded successfully`,
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        shapefileType: 'Other',
        description: '',
        assignedTo: '',
      });
      setShapefileData(null);
      setIsOpen(false);
      onUploadSuccess();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload shapefile",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShapefileData(null);
    setFormData({
      name: '',
      shapefileType: 'Other',
      description: '',
      assignedTo: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import SHP
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Shapefile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="shapefile">Shapefile (ZIP format)</Label>
            <div className="relative">
              <Input
                id="shapefile"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={isUploading}
                className="cursor-pointer"
              />
              {isUploading && !shapefileData && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Upload a ZIP file containing .shp, .dbf, and optional .shx, .prj files
            </p>
          </div>

          {/* Form fields - only show when shapefile is loaded */}
          {shapefileData && (
            <>
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Layer Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter layer name"
                  disabled={isUploading}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="shapefileType">Type</Label>
                <Select
                  value={formData.shapefileType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, shapefileType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPEFILE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Assignment (Supervisors only) */}
              {userRole === 'Supervisor' && (
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign to Team (Optional)</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Assignment</SelectItem>
                      {Array.isArray(teams) && teams.map((team: any) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              {/* Features info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Features loaded:</strong> {shapefileData.features.length}
                </p>
                {shapefileData.features.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Geometry type: {shapefileData.features[0].geometry.type}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!shapefileData || !formData.name.trim() || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload Shapefile
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}