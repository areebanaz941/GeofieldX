import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { createFeature } from "@/lib/api";
import {
  Dialog,
  DialogContent,
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
  geometry: z.object({
    type: z.enum(["Point", "LineString", "Polygon"]),
    coordinates: z.array(z.any())
  }).optional(),
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
  const [specificTypeOptions, setSpecificTypeOptions] = useState<string[]>([]);
  const [multiplePoints, setMultiplePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [collectingPoints, setCollectingPoints] = useState(false);

  // Initialize form with dynamic default based on whether polygon is drawn
  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      feaType: drawnPolygon ? "Parcel" : "Tower", // Default to Parcel if polygon exists
      specificType: "",
      feaState: "Plan",
      feaStatus: "New",
      maintenance: "None",
      maintenanceDate: "",
      remarks: "",
      geometry: undefined,
    },
  });

  // Watch feaType to update specificType options
  const feaType = form.watch("feaType");

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
        options = ["Commercial", "Residential"];
        break;
      default:
        options = [];
    }
    setSpecificTypeOptions(options);
    form.setValue("specificType", options[0] || "");
    
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
  }, [feaType]);

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
          setMultiplePoints(prev => [...prev, selectedLocation]);
          toast({
            title: `Point ${multiplePoints.length + 1} added`,
            description: multiplePoints.length + 1 >= 2 ? "You can finish or add more points" : "Add at least one more point",
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
  }, [selectedLocation, collectingPoints, feaType, multiplePoints.length]);

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
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create feature";
      toast({
        title: "Error",
        description: Array.isArray(errorMessage) ? errorMessage.map(e => e.message).join(", ") : errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FeatureFormValues) => {
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
      feaType: values.feaType as "Tower" | "Manhole" | "FiberCable" | "Parcel",
      specificType: values.specificType as "Mobillink" | "Ptcl" | "2-way" | "4-way" | "10F" | "24F" | "Commercial" | "Residential",
      feaState: values.feaState as "Plan" | "Under Construction" | "As-Built" | "Abandoned",
      feaStatus: values.feaStatus as "New" | "InProgress" | "Completed" | "In-Completed" | "Submit-Review" | "Active",
      maintenance: values.maintenance as "Required" | "None",
      geometry: {
        type: values.geometry!.type,
        coordinates: values.geometry!.coordinates
      },
      ...(values.remarks && values.remarks.trim() && { remarks: values.remarks.trim() }),
      ...(values.maintenanceDate && values.maintenanceDate.trim() && { 
        maintenanceDate: new Date(values.maintenanceDate) 
      })
    };

    console.log("Submitting feature data:", JSON.stringify(submitData, null, 2));
    console.log("Geometry coordinates:", submitData.geometry.coordinates);
    createFeatureMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tower">Tower</SelectItem>
                      <SelectItem value="Manhole">Manhole</SelectItem>
                      <SelectItem value="FiberCable">Fiber Cable</SelectItem>
                      <SelectItem value="Parcel">Parcel</SelectItem>
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
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${feaType.toLowerCase()} type`} />
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
                      {["New", "InProgress", "Completed", "In-Completed", "Submit-Review", "Active"].map((status) => (
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
          <Button variant="outline" onClick={onClose} type="button">
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
