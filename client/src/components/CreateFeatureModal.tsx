import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { createFeature } from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { featureStateEnum, featureStatusEnum, maintenanceEnum } from "@shared/schema";
import { ImageUpload } from "@/components/ui/image-upload";

// Import the correct enums from shared schema
import { 
  FEATURE_TYPES, 
  SPECIFIC_FEATURE_TYPES, 
  FEATURE_STATES, 
  FEATURE_STATUSES, 
  MAINTENANCE_STATUSES 
} from "@shared/schema";

// Define form schema with correct enum values matching the server
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
  color: z.string().optional(),
  geometry: z.object({
    type: z.enum(["Point", "LineString", "Polygon"]),
    coordinates: z.array(z.any())
  }).optional(),
  images: z.array(z.string()).optional(),
});

type FeatureFormValues = z.infer<typeof formSchema>;

interface CreateFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectionMode: (mode: boolean) => void;
  setDrawingMode: (mode: boolean) => void;
  drawnPolygon: { coordinates: number[][][] } | null;
}

export default function CreateFeatureModal({
  open,
  onClose,
  onOpenChange,
  selectedLocation,
  setSelectionMode,
  setDrawingMode,
  drawnPolygon,
}: CreateFeatureModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [specificTypeOptions, setSpecificTypeOptions] = useState<string[]>([]);
  const [multiplePoints, setMultiplePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [collectingPoints, setCollectingPoints] = useState(false);

  // Fetch users for assignment dropdown (only for supervisors)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "Supervisor", // Only fetch if user is supervisor
  });

  // Initialize form with dynamic default based on whether polygon is drawn
  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      feaType: drawnPolygon ? "Parcel" : "Tower", // Will be overridden by useEffect
      specificType: "Mobillink", // Default to first valid option
      feaState: "Plan",
      feaStatus: "New", // Use valid enum value
      assignedTo: "",
      maintenance: "None",
      maintenanceDate: "",
      remarks: "",
      color: "#3B82F6", // Default blue color for parcels
      geometry: undefined,
    },
  });

  // Watch feaType to update specificType options
  const feaType = form.watch("feaType");

  // Initialize form properly when modal opens
  useEffect(() => {
    if (open) {
      // Reset form to proper defaults when modal opens
      form.reset({
        name: "",
        feaNo: "",
        feaType: drawnPolygon ? "Parcel" : "Tower", // Will be cleared below
        specificType: "",
        feaState: "Plan",
        feaStatus: "New",
        assignedTo: "",
        maintenance: "None",
        maintenanceDate: "",
        remarks: "",
        color: "#3B82F6", // Default blue color for parcels
        geometry: undefined,
        images: [], // Initialize images as empty array but don't reset if already has values
      });
      
      // Clear feature type to force user selection unless polygon exists
      if (!drawnPolygon) {
        form.setValue("feaType", "" as any); // Force empty selection
      }
    }
  }, [open, drawnPolygon]); // Remove form dependency to prevent infinite loops

  useEffect(() => {
    let options: string[] = [];
    switch (feaType) {
      case "Tower":
        options = ["Mobillink", "Ptcl"];
        break;
      case "Manhole":
        options = ["2-way", "4-way"];
        break;
      case "FiberCable":
        options = ["10F", "24F"];
        break;
      case "Parcel":
        options = ["Commercial", "Residential", "Water Body", "Vegetation", "Agricultural", "Industrial", "Recreational", "Government", "Mixed Use", "Vacant Land"];
        break;
      default:
        options = [];
    }
    setSpecificTypeOptions(options);
    
    // Set default specific type value
    if (options.length > 0) {
      form.setValue("specificType", options[0]);
    }
    
    // Reset coordinate states when feature type changes
    if (feaType !== "FiberCable") {
      setMultiplePoints([]);
      setCollectingPoints(false);
    }
    if (feaType === "Parcel") {
      // Clear point selection when switching to parcel
      setSelectionMode(false);
    }
    // Clear geometry when switching feature types
    form.setValue("geometry", undefined);
  }, [feaType]); // Remove form dependency to prevent infinite loops

  // Handle multi-point collection for fiber cables
  useEffect(() => {
    if (collectingPoints && selectedLocation && feaType === "FiberCable") {
      if (multiplePoints.length < 10) { // Maximum 10 points
        // Check if this point is already added (avoid duplicates)
        const isDuplicate = multiplePoints.some(
          point => Math.abs(point.lat - selectedLocation.lat) < 0.000001 && 
                   Math.abs(point.lng - selectedLocation.lng) < 0.000001
        );
        
        if (!isDuplicate) {
          setMultiplePoints(prev => {
            const newPoints = [...prev, selectedLocation];
            toast({
              title: `Point ${newPoints.length} added`,
              description: newPoints.length >= 2 ? "You can finish or add more points" : "Add at least one more point",
            });
            return newPoints;
          });
        }
      } else {
        toast({
          title: "Maximum points reached",
          description: "You can add up to 10 points for fiber cable route",
          variant: "destructive",
        });
      }
    }
  }, [selectedLocation, collectingPoints, feaType]); // Remove multiplePoints.length dependency to prevent infinite loops

  // Update geometry when coordinates change
  useEffect(() => {
    if (feaType === "Parcel" && drawnPolygon) {
      const geometry = {
        type: "Polygon" as const,
        coordinates: drawnPolygon.coordinates,
      };
      form.setValue("geometry", geometry);
    } else if (feaType === "FiberCable" && multiplePoints.length >= 2) {
      const geometry = {
        type: "LineString" as const,
        coordinates: multiplePoints.map(point => [point.lng, point.lat]),
      };
      form.setValue("geometry", geometry);
    } else if ((feaType === "Tower" || feaType === "Manhole") && selectedLocation) {
      const geometry = {
        type: "Point" as const,
        coordinates: [selectedLocation.lng, selectedLocation.lat],
      };
      form.setValue("geometry", geometry);
    }
  }, [selectedLocation, drawnPolygon, multiplePoints, feaType]);

  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feature created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error creating feature:", error);
      let errorMessage = "Failed to create feature";
      
      // Handle different error types
      if (error?.message?.includes('401')) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: Array.isArray(errorMessage) ? errorMessage.map(e => e.message).join(", ") : errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FeatureFormValues) => {
    console.log("🔥 onSubmit called with values:", values);
    console.log("🔥 Form state at submission:", form.getValues());
    console.log("🔥 Images in values:", values.images);
    console.log("🔥 Images from form.getValues():", form.getValues("images"));
    
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create features",
        variant: "destructive",
      });
      return;
    }
    
    // Validate geometry based on feature type
    if (!values.geometry) {
      let message = "Please provide location coordinates";
      switch (values.feaType) {
        case "Parcel":
          message = "Please draw a polygon on the map for the parcel";
          break;
        case "FiberCable":
          message = "Please select at least 2 points for the fiber cable route";
          break;
        case "Tower":
        case "Manhole":
          message = "Please select a location point on the map";
          break;
      }
      toast({
        title: "Geometry required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Additional validation for specific feature types
    if (values.feaType === "FiberCable" && multiplePoints.length < 2) {
      toast({
        title: "Insufficient points",
        description: "Fiber cable requires at least 2 points to define the route",
        variant: "destructive",
      });
      return;
    }

    if ((values.feaType === "Tower" || values.feaType === "Manhole") && !selectedLocation) {
      toast({
        title: "Location required",
        description: "Please select a location point on the map",
        variant: "destructive",
      });
      return;
    }

    // Prepare the data for submission with proper type casting
    const submitData = {
      name: values.name.trim(),
      feaNo: values.feaNo.trim(),
      feaType: values.feaType,
      specificType: values.specificType,
      feaState: values.feaState,
      feaStatus: values.feaStatus,
      ...(values.assignedTo && { assignedTo: values.assignedTo }),
      maintenance: values.maintenance,
      geometry: {
        type: values.geometry!.type,
        coordinates: values.geometry!.coordinates
      },
      ...(values.remarks && values.remarks.trim() && { remarks: values.remarks.trim() }),
      ...(values.maintenanceDate && values.maintenanceDate.trim() && { 
        maintenanceDate: new Date(values.maintenanceDate) 
      }),
      ...(values.color && { color: values.color }),
      ...(values.images && values.images.length > 0 && { images: values.images })
    };

    console.log("🎯 Submitting feature data:", JSON.stringify(submitData, null, 2));
    console.log("📸 Images being submitted:", values.images);
    console.log("Geometry coordinates:", submitData.geometry.coordinates);
    createFeatureMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto fixed left-4 top-4 transform translate-x-0 translate-y-0 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new feature on the map.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Type</FormLabel>
                  <Select
                    onValueChange={field?.onChange}
                    value={field?.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEATURE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "FiberCable" ? "Fiber Cable" : type}
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
                  <FormLabel>Feature No.</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter feature number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specificType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{feaType} Type</FormLabel>
                  <Select
                    onValueChange={field?.onChange}
                    value={field?.value || ""}
                    key={feaType} // Force re-render when feature type changes
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${feaType.toLowerCase()} type`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specificTypeOptions.length > 0 ? (
                        specificTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-options" disabled>
                          No options available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Color Palette Selection for Parcels */}
            {feaType === "Parcel" && (
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcel Color</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="grid grid-cols-8 gap-2">
                          {[
                            { color: "#3B82F6", name: "Blue" },
                            { color: "#10B981", name: "Green" }, 
                            { color: "#F59E0B", name: "Orange" },
                            { color: "#EF4444", name: "Red" },
                            { color: "#8B5CF6", name: "Purple" },
                            { color: "#06B6D4", name: "Cyan" },
                            { color: "#84CC16", name: "Lime" },
                            { color: "#F97316", name: "Orange-600" },
                            { color: "#EC4899", name: "Pink" },
                            { color: "#6366F1", name: "Indigo" },
                            { color: "#14B8A6", name: "Teal" },
                            { color: "#A855F7", name: "Violet" },
                            { color: "#22C55E", name: "Green-500" },
                            { color: "#F472B6", name: "Pink-400" },
                            { color: "#6B7280", name: "Gray" },
                            { color: "#64748B", name: "Slate" }
                          ].map(({ color, name }) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                                field.value === color 
                                  ? 'border-gray-800 ring-2 ring-gray-400' 
                                  : 'border-gray-300 hover:border-gray-500'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                              title={name}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border-2 border-gray-300" 
                            style={{ backgroundColor: field.value || "#3B82F6" }}
                          />
                          <span className="text-sm text-gray-600">Selected Color</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
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
                      {featureStateEnum.options.map((state) => (
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
                      {maintenanceEnum.options.map((status) => (
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
            
            {form.watch("maintenance") === "Required" && (
              <FormField
                control={form.control}
                name="maintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional remarks"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Images (Optional)</FormLabel>
                  <FormControl>
                    <ImageUpload
                      maxFiles={10}
                      maxFileSize={10}
                      onFilesChange={async (files) => {
                        console.log("📸 Files selected for upload:", files.length);
                        
                        try {
                          const formData = new FormData();
                          files.forEach(file => {
                            formData.append('images', file);
                          });
                          console.log("📸 Uploading", files.length, "files to /api/features/upload-images");
                          
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
                          
                          if (response.ok) {
                            const result = await response.json();
                            console.log("📸 Upload response:", result);
                            
                            const uploadedPaths = result.imagePaths || [];
                            console.log("📸 All uploaded paths:", uploadedPaths);
                            console.log("📸 Current form images before update:", field.value);
                            
                            // Update form field with uploaded file paths
                            const currentImages = field.value || [];
                            const newImages = [...currentImages, ...uploadedPaths];
                            console.log("📸 Setting new images array:", newImages);
                            field.onChange(newImages);
                            
                            // Verify the form state was updated
                            setTimeout(() => {
                              console.log("📸 Form images after update:", form.getValues("images"));
                            }, 100);
                          } else {
                            console.error("Failed to upload images:", response.status);
                          }
                        } catch (error) {
                          console.error("Error uploading images:", error);
                        }
                      }}
                      disabled={createFeatureMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>
                {feaType === "Parcel" ? "Parcel Area" : 
                 feaType === "FiberCable" ? "Fiber Route Points" : "Location"}
              </FormLabel>
              
              {feaType === "Parcel" && (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      placeholder="Draw polygon on map"
                      value={drawnPolygon ? "Polygon drawn successfully" : ""}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDrawingMode(true);
                        toast({
                          title: "Draw parcel",
                          description: "Use the polygon drawing tool on the map",
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3,6 9,6 12,1 15,6 21,6 18,10 21,14 15,14 12,19 9,14 3,14 6,10"></polygon>
                      </svg>
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">Draw a polygon on the map to define the parcel area (minimum 4 points)</p>
                </div>
              )}

              {(feaType === "Tower" || feaType === "Manhole") && (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      placeholder="Click on the map to select location"
                      value={selectedLocation 
                        ? `Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}` 
                        : "Click 'Select' to choose location"}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectionMode(true);
                        toast({
                          title: "Point Selection",
                          description: "Click on the map to select exact location",
                        });
                      }}
                      className={selectedLocation ? "bg-green-50 border-green-200 text-green-700" : ""}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {selectedLocation ? "Update" : "Select"}
                    </Button>
                  </div>
                  {selectedLocation && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
                      <div className="font-medium">✓ Location Selected</div>
                      <div className="text-xs mt-1">
                        {feaType} position marked on map
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-neutral-500">
                    Select exact coordinates for {feaType.toLowerCase()} installation
                  </p>
                </div>
              )}

              {feaType === "FiberCable" && (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      placeholder="Select route points (minimum 2 points)"
                      value={multiplePoints.length > 0 
                        ? `${multiplePoints.length} point${multiplePoints.length > 1 ? 's' : ''} selected` 
                        : "Click 'Start' to define fiber cable route"}
                      className="flex-1"
                    />
                    {!collectingPoints ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCollectingPoints(true);
                          setMultiplePoints([]);
                          setSelectionMode(true);
                          toast({
                            title: "Route Planning",
                            description: "Click on map to select route points. Minimum 2 points required.",
                          });
                        }}
                        className="whitespace-nowrap"
                      >
                        Start Route
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        {multiplePoints.length >= 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCollectingPoints(false);
                              setSelectionMode(false);
                              toast({
                                title: "Route completed",
                                description: `Fiber cable route with ${multiplePoints.length} points saved`,
                              });
                            }}
                            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          >
                            Finish
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMultiplePoints([]);
                            setCollectingPoints(false);
                            setSelectionMode(false);
                            toast({
                              title: "Route cleared",
                              description: "All points removed. Click 'Start Route' to begin again.",
                            });
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                  {collectingPoints && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                      <div className="font-medium">🎯 Route Planning Active</div>
                      <div className="text-xs mt-1">
                        Click on map to add points • {multiplePoints.length}/10 points selected
                        {multiplePoints.length < 2 && " • Need at least 2 points"}
                      </div>
                    </div>
                  )}
                  {multiplePoints.length > 0 && (
                    <div className="text-xs text-neutral-600 max-h-24 overflow-y-auto border rounded p-2 bg-gray-50">
                      <div className="font-medium mb-1">Route Points ({multiplePoints.length}):</div>
                      {multiplePoints.map((point, index) => (
                        <div key={index} className="py-0.5 flex justify-between">
                          <span>{index + 1}. {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-neutral-500">
                    Define fiber cable route by selecting 2-10 points on the map
                  </p>
                </div>
              )}
            </div>
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
