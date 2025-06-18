import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Simplified form schema for supervisor polygon creation
const supervisorPolygonSchema = z.object({
  areaName: z.string().min(1, "Area name is required"),
  areaNumber: z.string().min(1, "Area number is required"),
  assignedTo: z.string().min(1, "Please select a team"),
});

type SupervisorPolygonFormValues = z.infer<typeof supervisorPolygonSchema>;

interface SupervisorPolygonModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  drawnPolygon: { coordinates: number[][][] } | null;
  setDrawingMode: (mode: boolean) => void;
}

export default function SupervisorPolygonModal({
  open,
  onClose,
  onOpenChange,
  drawnPolygon,
  setDrawingMode,
}: SupervisorPolygonModalProps) {
  const { toast } = useToast();
  const [nextAreaNumber, setNextAreaNumber] = useState<string>("");

  // Fetch teams for assignment dropdown
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  // Fetch existing features to determine next area number
  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    enabled: open,
  });

  // Calculate next area number
  useEffect(() => {
    if (Array.isArray(features) && features.length > 0) {
      const parcelFeatures = features.filter((f: any) => f.feaType === "Parcel");
      const areaNumbers = parcelFeatures
        .map((f: any) => f.feaNo)
        .filter((feaNo: string) => feaNo && feaNo.startsWith("area_"))
        .map((feaNo: string) => {
          const num = feaNo.replace("area_", "");
          return parseInt(num, 10);
        })
        .filter((num: number) => !isNaN(num));

      const maxAreaNumber = areaNumbers.length > 0 ? Math.max(...areaNumbers) : 0;
      setNextAreaNumber(`area_${maxAreaNumber + 1}`);
    } else {
      setNextAreaNumber("area_1");
    }
  }, [features]);

  const form = useForm<SupervisorPolygonFormValues>({
    resolver: zodResolver(supervisorPolygonSchema),
    defaultValues: {
      areaName: "",
      areaNumber: nextAreaNumber,
      assignedTo: "",
    },
  });

  // Update form when area number changes
  useEffect(() => {
    if (nextAreaNumber) {
      form.setValue("areaNumber", nextAreaNumber);
    }
  }, [nextAreaNumber, form]);

  const createFeatureMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({
        title: "Area Created",
        description: "Parcel area has been successfully created and assigned.",
      });
      form.reset();
      setDrawingMode(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create area",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SupervisorPolygonFormValues) => {
    if (!drawnPolygon) {
      toast({
        title: "Error",
        description: "Please draw a polygon on the map first",
        variant: "destructive",
      });
      return;
    }

    const featureData = {
      name: values.areaName,
      feaNo: values.areaNumber,
      feaType: "Parcel" as const,
      specificType: "Residential" as const, // Use valid enum value
      feaState: "Plan" as const,
      feaStatus: "New" as const,
      maintenance: "None" as const,
      assignedTo: values.assignedTo,
      geometry: {
        type: "Polygon" as const,
        coordinates: drawnPolygon.coordinates,
      },
    };

    createFeatureMutation.mutate(featureData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Parcel Area</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="areaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter area name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areaNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-gray-50"
                      placeholder="Auto-generated"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Team</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.isArray(teams) && teams.map((team: any) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createFeatureMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createFeatureMutation.isPending}>
                {createFeatureMutation.isPending ? "Creating..." : "Create Area"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}