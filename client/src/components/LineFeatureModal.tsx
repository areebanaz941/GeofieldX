import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feaNo: z.string().min(1, "Feature number is required"),
  specificType: z.enum(["10F", "24F"]),
  feaState: z.enum(["Plan", "Under Construction", "As-Built", "Abandoned"]),
  feaStatus: z.enum(["New", "InProgress", "Completed", "In-Completed", "Submit-Review", "Active"]),
  maintenance: z.enum(["Required", "None"]),
  maintenanceDate: z.string().optional(),
  remarks: z.string().optional(),
});

type LineFeatureFormValues = z.infer<typeof formSchema>;

interface LineFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectionMode: (mode: boolean) => void;
}

export default function LineFeatureModal({
  open,
  onClose,
  onOpenChange,
  selectedLocation,
  setSelectionMode,
}: LineFeatureModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [multiplePoints, setMultiplePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [collectingPoints, setCollectingPoints] = useState(false);

  const form = useForm<LineFeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      specificType: "10F",
      feaState: "Plan",
      feaStatus: "New",
      maintenance: "None",
      maintenanceDate: "",
      remarks: "",
    },
  });

  // Handle multi-point collection for fiber cables
  useEffect(() => {
    if (collectingPoints && selectedLocation) {
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
  }, [selectedLocation, collectingPoints, multiplePoints.length]);

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
        description: "Fiber cable route has been created successfully",
      });
      onClose();
      form.reset();
      setMultiplePoints([]);
      setCollectingPoints(false);
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
      remarks: values.remarks || undefined,
      geometry: {
        type: "LineString" as const,
        coordinates: multiplePoints.map(point => [point.lng, point.lat]),
      },
    };

    createFeatureMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto fixed left-4 top-4 transform translate-x-0 translate-y-0 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Create Fiber Cable Route</DialogTitle>
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

            {/* Route Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Points</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  placeholder="Select route points (minimum 2 points)"
                  value={multiplePoints.length > 0 
                    ? `${multiplePoints.length} point${multiplePoints.length > 1 ? 's' : ''} selected` 
                    : "Click 'Start Route' to define fiber cable route"}
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