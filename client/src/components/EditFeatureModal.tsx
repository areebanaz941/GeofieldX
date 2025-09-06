import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { featureStateEnum, featureStatusEnum, maintenanceEnum, IFeature } from "@shared/schema";

// Define form schema with dynamic specific type options
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feaNo: z.string().min(1, "Feature number is required"),
  feaType: z.enum(["Tower", "Manhole", "FiberCable", "Parcel"]),
  specificType: z.string().min(1, "Specific type is required"),
  feaState: z.enum(["Plan", "Under Construction", "As-Built", "Abandoned"]),
  feaStatus: z.enum(["New", "InProgress", "Completed", "In-Completed", "Submit-Review", "Active"]),
  maintenance: z.enum(["Required", "None"]),
  maintenanceDate: z.string().optional(),
  remarks: z.string().optional(),
  color: z.string().optional(),
  images: z.array(z.string()).optional(),
});

type FeatureFormValues = z.infer<typeof formSchema>;

interface EditFeatureModalProps {
  open: boolean;
  onClose: () => void;
  feature: IFeature | null;
}

export function EditFeatureModal({ open, onClose, feature }: EditFeatureModalProps) {
  const { toast } = useToast();
  const [specificTypeOptions, setSpecificTypeOptions] = useState<string[]>([]);

  // Initialize form with feature data
  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      feaType: "Tower",
      specificType: "",
      feaState: "Plan",
      feaStatus: "New",
      maintenance: "None",
      maintenanceDate: "",
      remarks: "",
      color: "#3B82F6",
      images: [],
    },
  });

  // Watch feaType to update specificType options
  const feaType = form.watch("feaType");

  // Populate form with feature data when modal opens
  useEffect(() => {
    if (open && feature) {
      form.reset({
        name: feature.name || "",
        feaNo: feature.feaNo || "",
        feaType: feature.feaType as any,
        specificType: feature.specificType || "",
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        maintenance: feature.maintenance as any,
        maintenanceDate: feature.maintenanceDate ? new Date(feature.maintenanceDate).toISOString().split('T')[0] : "",
        remarks: feature.remarks || "",
        color: feature.color || "#3B82F6",
        images: Array.isArray(feature.images) ? feature.images : [],
      });
    }
  }, [open, feature, form]);

  // Update specific type options based on feature type
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
  }, [feaType]);

  // Update feature mutation (uses centralized API helper which handles JWT/session and FormData)
  const updateFeatureMutation = useMutation({
    mutationFn: async (data: any) => {
      const { updateFeature } = await import("@/lib/api");
      return await updateFeature(String(feature?._id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: "Success",
        description: "Feature updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FeatureFormValues) => {
    const submitData = {
      name: values.name.trim(),
      feaNo: values.feaNo.trim(),
      feaType: values.feaType,
      specificType: values.specificType,
      feaState: values.feaState,
      feaStatus: values.feaStatus,
      maintenance: values.maintenance,
      ...(values.remarks && values.remarks.trim() && { remarks: values.remarks.trim() }),
      ...(values.maintenanceDate && values.maintenanceDate.trim() && { 
        maintenanceDate: new Date(values.maintenanceDate) 
      }),
      ...(values.color && { color: values.color }),
      ...(values.images && values.images.length > 0 && { images: values.images }),
    };

    updateFeatureMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
          <DialogDescription>Update the selected feature's details and media.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    onValueChange={field.onChange}
                    value={field.value}
                    key={feaType}
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
                            { color: "#FBBF24", name: "Yellow" },
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
                    value={field.value}
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
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {featureStatusEnum.options.map((status) => (
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
            
            <FormField
              control={form.control}
              name="maintenance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenanceEnum.options.map((maintenance) => (
                        <SelectItem key={maintenance} value={maintenance}>
                          {maintenance}
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
              name="maintenanceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional remarks"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Images - allow adding/replacing images during edit */}
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Images</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {/* Existing images preview (if any) */}
                      {Array.isArray(feature?.images) && feature?.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {feature!.images!.map((img, idx) => {
                            let url = img as string;
                            if (typeof url === 'string') {
                              if (url.startsWith('http')) {
                                // keep
                              } else if (url.startsWith('/api/images/')) {
                                // keep GridFS URL
                              } else if (url.startsWith('api/images/')) {
                                url = `/${url}`;
                              } else if (url.startsWith('/uploads/')) {
                                // keep legacy static path
                              } else if (url.startsWith('uploads/')) {
                                url = `/${url}`;
                              } else {
                                const clean = url.startsWith('/') ? url.slice(1) : url;
                                url = `/uploads/${clean}`;
                              }
                            }
                            return (
                              <img key={idx} src={url} alt={`image-${idx}`} className="w-full h-20 object-cover rounded border" />
                            );
                          })}
                        </div>
                      )}
                      <ImageUpload
                        maxFiles={10}
                        maxFileSize={10}
                        onFilesChange={async (files) => {
                          if (!files || files.length === 0) return;
                          try {
                            const formData = new FormData();
                            files.forEach(f => formData.append('images', f));
                            const authToken = localStorage.getItem('auth_token');
                            const headers: HeadersInit = {};
                            if (authToken) headers.Authorization = `Bearer ${authToken}`;
                            const resp = await fetch('/api/features/upload-images', {
                              method: 'POST',
                              body: formData,
                              credentials: 'include',
                              headers
                            });
                            if (!resp.ok) throw new Error('Failed to upload images');
                            const result = await resp.json();
                            const uploadedPaths: string[] = result.imagePaths || [];
                            const current = Array.isArray(field.value) ? field.value : [];
                            field.onChange([...current, ...uploadedPaths]);
                          } catch (e) {
                            console.error('Image upload failed:', e);
                          }
                        }}
                        disabled={updateFeatureMutation.isPending}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateFeatureMutation.isPending}
              >
                {updateFeatureMutation.isPending ? "Updating..." : "Update Feature"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}