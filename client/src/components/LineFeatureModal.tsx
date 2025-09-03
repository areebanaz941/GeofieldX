import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  SPECIFIC_FEATURE_TYPES, 
  FEATURE_STATES, 
  FEATURE_STATUSES, 
  MAINTENANCE_STATUSES 
} from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feaNo: z.string().min(1, "Feature number is required"),
  specificType: z.enum(SPECIFIC_FEATURE_TYPES),
  feaState: z.enum(FEATURE_STATES),
  feaStatus: z.enum(FEATURE_STATUSES),
  maintenance: z.enum(MAINTENANCE_STATUSES),
  maintenanceDate: z.string().optional(),
  assignedTo: z.string().optional(),
  remarks: z.string().optional(),
  images: z.array(z.string()).optional(),
});

type LineFeatureFormValues = z.infer<typeof formSchema>;

interface LineFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  preFilledPoints?: { lat: number; lng: number }[];
}

export default function LineFeatureModal({
  open,
  onClose,
  onOpenChange,
  preFilledPoints = [],
}: LineFeatureModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [multiplePoints, setMultiplePoints] = useState<{ lat: number; lng: number }[]>(preFilledPoints);

  // Fetch users for assignment dropdown (only for supervisors)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "Supervisor", // Only fetch if user is supervisor
  });

  const form = useForm<LineFeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      specificType: "10F",
      feaState: "Plan",
      feaStatus: "New", // Use valid enum value
      maintenance: "None",
      maintenanceDate: "",
      assignedTo: "",
      remarks: "",
      images: [],
    },
  });

  // Initialize points from props
  useEffect(() => {
    if (preFilledPoints.length > 0) {
      setMultiplePoints(preFilledPoints);
    }
  }, [preFilledPoints]);

  const createFeatureMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use shared API client to include auth token/cookies
      const res = await apiRequest('POST', '/api/features', data);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create feature');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({
        title: "Feature created",
        description: "Fiber cable route has been created successfully",
      });
      onClose();
      form.reset();
      setMultiplePoints([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating feature",
        description: error.message || "Failed to create feature",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: LineFeatureFormValues) => {
    if (multiplePoints.length < 2) {
      toast({
        title: "Route points required",
        description: "Please select at least 2 points to create fiber cable route",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      name: values.name.trim(),
      feaNo: values.feaNo.trim(),
      feaType: "FiberCable",
      specificType: values.specificType,
      feaState: values.feaState,
      feaStatus: values.feaStatus,
      maintenance: values.maintenance,
      maintenanceDate: values.maintenanceDate || undefined,
      assignedTo: values.assignedTo || undefined,
      remarks: values.remarks || undefined,
      geometry: {
        type: "LineString" as const,
        coordinates: multiplePoints.map(point => [point.lng, point.lat]),
      },
      ...(values.images && values.images.length > 0 && { images: values.images }),
    };

    createFeatureMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto fixed left-4 top-4 transform translate-x-0 translate-y-0 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Create Fiber Cable Route</DialogTitle>
          <DialogDescription>
            Create a new fiber cable route by drawing a line on the map.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="specificType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cable Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cable type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="10F">10F</SelectItem>
                      <SelectItem value="24F">24F</SelectItem>
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
                    <Input placeholder="Enter cable name" {...field} />
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
                  <FormLabel>Cable Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cable number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Route Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Points</label>
              {multiplePoints.length > 0 ? (
                <div className="text-xs text-neutral-600 max-h-32 overflow-y-auto border rounded p-3 bg-gray-50">
                  <div className="font-medium mb-2 text-green-700">✓ Route Defined ({multiplePoints.length} points):</div>
                  {multiplePoints.map((point, index) => (
                    <div key={index} className="py-0.5">
                      {index + 1}. {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-500 p-3 border rounded bg-gray-50">
                  No route points available. Please use the line tool to define route first.
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

            {/* Feature Images (Optional) */}
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
                        if (!files) return;
                        try {
                          const formData = new FormData();
                          files.forEach(file => formData.append('images', file));

                          const authToken = localStorage.getItem('auth_token');
                          const headers: HeadersInit = {};
                          if (authToken) headers.Authorization = `Bearer ${authToken}`;

                          const response = await fetch('/api/features/upload-images', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include',
                            headers,
                          });

                          if (!response.ok) {
                            console.error('Failed to upload images:', response.status);
                            return;
                          }
                          const result = await response.json();
                          const uploadedPaths: string[] = result.imagePaths || [];
                          const current = Array.isArray(field.value) ? field.value : [];
                          field.onChange([...current, ...uploadedPaths]);
                        } catch (error) {
                          console.error('Error uploading images:', error);
                        }
                      }}
                      disabled={createFeatureMutation.isPending}
                    />
                  </FormControl>
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
            {createFeatureMutation.isPending ? "Saving..." : "Save Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}