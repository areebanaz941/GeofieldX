import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const SHAPEFILE_TYPES = ["Administrative", "Infrastructure", "Survey", "Planning", "Other"] as const;

interface ShapefileUploadProps {
  userRole: 'Supervisor' | 'Field';
  userId: string;
  onUploadSuccess: () => void;
}

interface FormData {
  name: string;
  type: typeof SHAPEFILE_TYPES[number];
  description: string;
  assignedTeamId?: string;
}

export function ShapefileUpload({ userRole, userId, onUploadSuccess }: ShapefileUploadProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'Infrastructure',
    description: '',
    assignedTeamId: undefined
  });
  
  const { toast } = useToast();

  // Fetch teams for supervisor role
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: userRole === 'Supervisor'
  }) as { data: Array<{ _id: string; name: string }> };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a ZIP file containing shapefile data",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setFormData(prev => ({
      ...prev,
      name: file.name.replace('.zip', '').replace(/[_-]/g, ' ')
    }));

    toast({
      title: "File Selected",
      description: `Selected ${file.name}. Fill out the form to upload.`,
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a shapefile to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for the shapefile",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('shapefile', selectedFile);
      uploadFormData.append('name', formData.name.trim());
      uploadFormData.append('shapefileType', formData.type);
      uploadFormData.append('description', formData.description.trim());
      uploadFormData.append('userId', userId);
      
      if (userRole === 'Supervisor' && formData.assignedTeamId) {
        uploadFormData.append('assignedTo', formData.assignedTeamId);
      }

      const response = await fetch('/api/shapefiles/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Upload Successful",
        description: `Shapefile "${formData.name}" uploaded with ${result.featureCount || 0} features`,
      });

      // Reset form
      setSelectedFile(null);
      setFormData({
        name: '',
        type: 'Infrastructure',
        description: '',
        assignedTeamId: undefined
      });
      setOpen(false);
      onUploadSuccess();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Shapefile
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Shapefile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="shapefile-upload">Shapefile (ZIP format)</Label>
            <div className="mt-2">
              <input
                id="shapefile-upload"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
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
                  <p className="text-xs text-gray-500">
                    Max 50MB, ZIP format containing SHP files
                  </p>
                </div>
              </Label>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter shapefile name"
              required
            />
          </div>

          {/* Type Selection */}
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: typeof SHAPEFILE_TYPES[number]) => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPEFILE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Assignment (Supervisor Only) */}
          {userRole === 'Supervisor' && (
            <div>
              <Label htmlFor="assignedTeam">Assign to Team (Optional)</Label>
              <Select
                value={formData.assignedTeamId || 'none'}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, assignedTeamId: value === 'none' ? undefined : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team assignment</SelectItem>
                  {(teams as any[]).map((team: any) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of the shapefile"
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !formData.name.trim() || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Shapefile
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}