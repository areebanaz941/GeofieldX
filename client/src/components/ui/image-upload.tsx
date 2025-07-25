import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  maxFiles?: number;
  maxFileSize?: number; // in MB
  accept?: string[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

interface ImagePreview {
  file: File;
  url: string;
  id: string;
}

export function ImageUpload({
  maxFiles = 10,
  maxFileSize = 10,
  accept = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  onFilesChange,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!accept.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use: ${accept.join(', ')}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size of ${maxFileSize}MB`;
    }

    return null;
  }, [accept, maxFileSize]);

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check total file count
    if (previews.length + fileArray.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} images allowed. You can upload ${maxFiles - previews.length} more.`);
      return;
    }

    // Validate each file
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show errors if any
    if (errors.length > 0) {
      toast({
        title: "Upload errors",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    // Process valid files
    if (validFiles.length > 0) {
      setIsUploading(true);
      
      const newPreviews: ImagePreview[] = [];
      let processedCount = 0;

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const id = Math.random().toString(36).substr(2, 9);
          newPreviews.push({
            file,
            url: e.target?.result as string,
            id,
          });
          
          processedCount++;
          if (processedCount === validFiles.length) {
            setPreviews(prev => [...prev, ...newPreviews]);
            onFilesChange([...previews.map(p => p.file), ...newPreviews.map(p => p.file)]);
            setIsUploading(false);
            
            toast({
              title: "Images uploaded",
              description: `${validFiles.length} image${validFiles.length !== 1 ? 's' : ''} ready for upload`,
            });
          }
        };
        
        reader.onerror = () => {
          processedCount++;
          errors.push(`Failed to read ${file.name}`);
          
          if (processedCount === validFiles.length) {
            setIsUploading(false);
            if (errors.length > 0) {
              toast({
                title: "Upload errors",
                description: errors.join('\n'),
                variant: "destructive",
              });
            }
          }
        };
        
        reader.readAsDataURL(file);
      });
    }
  }, [previews, maxFiles, validateFile, onFilesChange, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeImage = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      onFilesChange(updated.map(p => p.file));
      return updated;
    });
    
    toast({
      title: "Image removed",
      description: "Image has been removed from upload queue",
    });
  }, [onFilesChange, toast]);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const clearAll = useCallback(() => {
    setPreviews([]);
    onFilesChange([]);
    toast({
      title: "All images cleared",
      description: "Upload queue has been cleared",
    });
  }, [onFilesChange, toast]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card
        className={`
          relative border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Processing images...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                {isDragOver ? (
                  <Upload className="h-6 w-6 text-primary animate-bounce" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-primary" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-base font-medium">
                  {isDragOver ? 'Drop images here' : 'Upload Feature Images'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop images here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxFiles} images • Max {maxFileSize}MB each • JPEG, PNG, GIF, WebP, BMP
                </p>
              </div>
              
              {previews.length > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-muted-foreground/20">
                  <span className="text-sm text-muted-foreground">
                    {previews.length}/{maxFiles} images selected
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Image Previews</h4>
            <span className="text-xs text-muted-foreground">
              {previews.length} of {maxFiles} images
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((preview) => (
              <div key={preview.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={preview.url}
                    alt={preview.file.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(preview.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                {/* File Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs truncate" title={preview.file.name}>
                    {preview.file.name}
                  </p>
                  <p className="text-xs text-gray-300">
                    {(preview.file.size / (1024 * 1024)).toFixed(1)}MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}