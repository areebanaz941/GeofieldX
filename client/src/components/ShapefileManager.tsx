import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { getAllShapefiles, deleteShapefile, updateShapefileVisibility } from '@/lib/api';
import { 
  Database, 
  Eye, 
  EyeOff, 
  Trash2, 
  MapPin, 
  Calendar,
  User,
  FileText,
  Loader2
} from 'lucide-react';

interface ShapefileManagerProps {
  onShapefileSelect?: (shapefile: any) => void;
  onShapefileToggle?: (shapefile: any, isVisible: boolean) => void;
}

export function ShapefileManager({ onShapefileSelect, onShapefileToggle }: ShapefileManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedShapefile, setSelectedShapefile] = useState<any>(null);

  // Fetch saved shapefiles
  const { data: shapefiles = [], isLoading, error } = useQuery({
    queryKey: ['/api/shapefiles'],
    queryFn: getAllShapefiles,
    enabled: open, // Only fetch when dialog is open
  });

  // Delete shapefile mutation
  const deleteMutation = useMutation({
    mutationFn: deleteShapefile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shapefiles'] });
      toast({
        title: "Success",
        description: "Shapefile deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shapefile",
        variant: "destructive",
      });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      updateShapefileVisibility(id, isVisible),
    onMutate: async ({ id, isVisible }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/shapefiles'] });
      const previous = queryClient.getQueryData<any[]>(['/api/shapefiles']);

      if (previous && Array.isArray(previous)) {
        // Optimistically reflect visibility change in cache for immediate UI/map update
        const updated = previous.map((s) => s._id === id ? { ...s, isVisible } : s);
        queryClient.setQueryData(['/api/shapefiles'], updated);
        const updatedItem = updated.find((s) => s._id === id);
        if (onShapefileToggle && updatedItem) {
          onShapefileToggle(updatedItem, isVisible);
        }
      }

      return { previous } as { previous?: any[] };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['/api/shapefiles'], context.previous);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update shapefile visibility",
        variant: "destructive",
      });
    },
    onSuccess: (updatedShapefile) => {
      // Ensure cache has server truth
      queryClient.setQueryData(['/api/shapefiles'], (oldData: any) => {
        if (Array.isArray(oldData)) {
          return oldData.map((s) => s._id === updatedShapefile._id ? updatedShapefile : s);
        }
        return oldData;
      });
      if (onShapefileToggle) {
        onShapefileToggle(updatedShapefile, updatedShapefile.isVisible);
      }
      toast({
        title: "Success",
        description: `Shapefile ${updatedShapefile.isVisible ? 'shown' : 'hidden'} on map`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shapefiles'] });
    },
  });

  const handleDelete = (shapefile: any) => {
    if (window.confirm(`Are you sure you want to delete "${shapefile.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(shapefile._id);
    }
  };

  const handleToggleVisibility = (shapefile: any) => {
    toggleVisibilityMutation.mutate({
      id: shapefile._id,
      isVisible: !shapefile.isVisible,
    });
  };

  const handleViewOnMap = (shapefile: any) => {
    if (onShapefileSelect) {
      onShapefileSelect(shapefile);
      setOpen(false);
      toast({
        title: "Navigating to Shapefile",
        description: `Showing "${shapefile.name}" on the map`,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShapefileTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Boundary': 'bg-blue-100 text-blue-800',
      'Infrastructure': 'bg-green-100 text-green-800',
      'Utility': 'bg-yellow-100 text-yellow-800',
      'Transportation': 'bg-purple-100 text-purple-800',
      'Environmental': 'bg-teal-100 text-teal-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors['Other'];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 shadow-sm"
        >
          <Database className="w-4 h-4 mr-2" />
          Saved Shapefiles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Shapefile Manager
            {shapefiles.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {shapefiles.length} saved
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Browse, preview, and manage saved shapefiles.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading shapefiles...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Error loading shapefiles</p>
              <p className="text-sm text-gray-500 mt-1">{(error as Error).message}</p>
            </div>
          ) : shapefiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No saved shapefiles</p>
              <p className="text-sm">Upload shapefiles to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shapefiles.map((shapefile: any) => (
                <div
                  key={shapefile._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {shapefile.name}
                        </h3>
                        <Badge className={getShapefileTypeColor(shapefile.shapefileType)}>
                          {shapefile.shapefileType}
                        </Badge>
                        {shapefile.isVisible ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{shapefile.originalFilename}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{shapefile.features?.length || 0} features</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(shapefile.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {shapefile.uploadedBy?.name || shapefile.uploadedBy?.username || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {shapefile.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {shapefile.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOnMap(shapefile)}
                        className="whitespace-nowrap"
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        View on Map
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVisibility(shapefile)}
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        {shapefile.isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>

                      {(user?.role === 'Supervisor' || shapefile.uploadedBy?._id === user?.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(shapefile)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}