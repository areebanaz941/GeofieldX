import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FEATURE_TYPES, 
  SPECIFIC_FEATURE_TYPES, 
  FEATURE_STATES, 
  FEATURE_STATUSES, 
  MAINTENANCE_STATUSES,
  FeatureType
} from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feaNo: z.string().min(1, "Feature number is required"),
  feaType: z.enum(FEATURE_TYPES),
  specificType: z.enum(SPECIFIC_FEATURE_TYPES),
  feaState: z.enum(FEATURE_STATES),
  feaStatus: z.enum(FEATURE_STATUSES),
  maintenance: z.enum(MAINTENANCE_STATUSES),
  maintenanceDate: z.string().optional(),
  assignedTo: z.string().optional(),
  remarks: z.string().optional(),
  images: z.array(z.string()).optional(),
});

type PointFeatureFormValues = z.infer<typeof formSchema>;

interface PointFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectionMode: (mode: boolean) => void;
  assignedBoundaryId?: string;
  selectedFeatureType?: string;
}

export default function PointFeatureModal({
  open,
  onClose,
  onOpenChange,
  selectedLocation,
  setSelectionMode,
  assignedBoundaryId,
  selectedFeatureType,
}: PointFeatureModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [specificTypeOptions, setSpecificTypeOptions] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Fetch users for assignment dropdown (only for supervisors)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "Supervisor", // Only fetch if user is supervisor
  });

  // Handle image selection
  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Validate file count (max 10)
    if (selectedImages.length + fileArray.length > 10) {
      toast({
        title: "Too many images",
        description: "Maximum 10 images allowed per feature",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (max 10MB each)
    const invalidFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "File size too large",
        description: `${invalidFiles.length} file(s) exceed 10MB limit`,
        variant: "destructive",
      });
      return;
    }

    // Add new files to selection
    const newSelectedImages = [...selectedImages, ...fileArray];
    setSelectedImages(newSelectedImages);

    // Generate preview URLs
    const newPreviewUrls = fileArray.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Remove image from selection
  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    // Remove from arrays
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to server
  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    const formData = new FormData();
    selectedImages.forEach((file, index) => {
      formData.append('images', file);
    });

    try {
      // Get JWT token for authorization
      const authToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      
      const response = await fetch('/api/features/upload-images', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const result = await response.json();
      return result.imagePaths || [];
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload images');
    }
  };

  const form = useForm<PointFeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      feaType: (selectedFeatureType as any) || "Tower",
      specificType: "Mobillink", // Default to first valid option
      feaState: "Plan",
      feaStatus: "New", // Use valid enum value
      maintenance: "None",
      maintenanceDate: "",
      assignedTo: "",
      remarks: "",
      images: [],
    },
  });

  // Update form when selectedFeatureType changes or modal opens
  useEffect(() => {
    if (open && selectedFeatureType) {
      form.setValue("feaType", selectedFeatureType as any);
      handleFeatureTypeChange(selectedFeatureType);
    }
  }, [open, selectedFeatureType, form]);

  // Clean up image preview URLs when modal closes
  const handleModalClose = () => {
    // Revoke all object URLs to free memory
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviewUrls([]);
    form.reset();
    onClose();
  };

  const feaType = form.watch("feaType");

  // Update specific type options when feature type changes
  const updateSpecificTypeOptions = (type: FeatureType) => {
    let options: string[];
    switch (type) {
      case "Tower":
        options = ["Mobillink", "Ptcl", "Communication Tower", "Observation Tower"];
        break;
      case "Manhole":
        options = ["2-way", "4-way", "6-way", "8-way"];
        break;
      case "Pole":
        options = ["Utility Pole", "Street Light", "Traffic Light", "Flag Pole"];
        break;
      case "Cabinet":
        options = ["Distribution Box", "Control Cabinet", "Junction Box", "Switch Cabinet"];
        break;
      case "Equipment":
        options = ["Generator", "Transformer", "Antenna", "Repeater"];
        break;
      case "Utility":
        options = ["Water Valve", "Gas Meter", "Electrical Box", "Fire Hydrant"];
        break;
      case "FiberCable":
        options = ["10F", "24F"];
        break;
      case "Parcel":
        options = ["Commercial", "Residential", "Water Body", "Vegetation", "Agricultural", "Industrial", "Recreational", "Government", "Mixed Use", "Vacant Land"];
        break;
      default:
        options = ["Mobillink"]; // Default to first valid option
    }
    setSpecificTypeOptions(options);
    form.setValue("specificType", options[0] || "");
  };

  // Update options when feature type changes
  const handleFeatureTypeChange = (value: FeatureType) => {
    updateSpecificTypeOptions(value);
  };

  const createFeatureMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create feature");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({
        title: "Feature created",
        description: "Point feature has been created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating feature",
        description: error.message || "Failed to create feature",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: PointFeatureFormValues) => {
    if (!selectedLocation) {
      toast({
        title: "Location required",
        description: "Please select a location point on the map",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload images first if any are selected
      const uploadedImagePaths = await uploadImages();

      const submitData = {
        name: values.name.trim(),
        feaNo: values.feaNo.trim(),
        feaType: values.feaType,
        specificType: values.specificType,
        feaState: values.feaState,
        feaStatus: values.feaStatus,
        maintenance: values.maintenance,
        maintenanceDate: values.maintenanceDate || undefined,
        assignedTo: values.assignedTo || undefined,
        remarks: values.remarks || undefined,
        images: uploadedImagePaths,
        boundaryId: assignedBoundaryId, // Include boundary ID for field users
        geometry: {
          type: "Point" as const,
          coordinates: [selectedLocation.lng, selectedLocation.lat],
        },
      };

      createFeatureMutation.mutate(submitData);
    } catch (error: any) {
      toast({
        title: "Error uploading images",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto fixed left-4 top-4 transform translate-x-0 translate-y-0 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Create Point Feature</DialogTitle>
          <DialogDescription>
            Create a new point feature at the selected location on the map.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature</FormLabel>
                  <Select
                    onValueChange={(value: any) => {
                      field.onChange(value);
                      handleFeatureTypeChange(value);
                    }}
                    defaultValue={field.value}
                    disabled={!!selectedFeatureType} // Disable if feature type is pre-selected
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEATURE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specificType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specific Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specificTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter feature name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feaNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter feature number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              {selectedLocation ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="font-medium text-green-700 mb-1">✓ Location Selected</div>
                  <div className="text-sm text-green-600">
                    Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {feaType} position marked on map
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500 p-3 border rounded bg-gray-50">
                  No location selected. Please use the point tool to select location first.
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="feaState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature State</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Plan", "Under Construction", "As-Built", "Abandoned"].map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feaStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEATURE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned To Field - Only for Supervisors */}
            {user?.role === "Supervisor" && (
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Assignment</SelectItem>
                        {users && Array.isArray(users) ? 
                          users.map((userData: any) => (
                            <SelectItem key={userData._id} value={userData._id}>
                              {`${userData.name} (${userData.username})`}
                            </SelectItem>
                          )) : null
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="maintenance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Required", "None"].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Images (Optional - Max 10)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelection}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, GIF, WebP, BMP (Max 10MB per image)
                </p>
              </div>

              {/* Image Previews */}
              {imagePreviewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                        {selectedImages[index]?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter any remarks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={createFeatureMutation.isPending}
          >
            {createFeatureMutation.isPending ? "Saving..." : "Save Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}