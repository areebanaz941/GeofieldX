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
  preFilledPoints?: { lat: number; lng: number }[];
}

export default function LineFeatureModal({
  open,
  onClose,
  onOpenChange,
  preFilledPoints = [],
}: LineFeatureModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [multiplePoints, setMultiplePoints] = useState<{ lat: number; lng: number }[]>(preFilledPoints);

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

  // Initialize points from props
  useEffect(() => {
    if (preFilledPoints.length > 0) {
      setMultiplePoints(preFilledPoints);
    }
  }, [preFilledPoints]);

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