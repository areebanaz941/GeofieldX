import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
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

// Simplified form schema for supervisor boundary creation
const supervisorPolygonSchema = z.object({
  boundaryName: z.string().min(1, "Boundary name is required"),
  workOrder: z.string().min(1, "Work order is required"),
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

  // Fetch teams for assignment dropdown
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  const form = useForm<SupervisorPolygonFormValues>({
    resolver: zodResolver(supervisorPolygonSchema),
    defaultValues: {
      boundaryName: "",
      workOrder: "",
      assignedTo: "",
    },
  });

  const createBoundaryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/boundaries', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boundaries"] });
      toast({
        title: "Boundary Created",
        description: "Boundary has been successfully created and assigned.",
      });
      form.reset();
      setDrawingMode(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create boundary",
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

    const boundaryData = {
      name: values.boundaryName,
      workOrder: values.workOrder,
      assignedTo: values.assignedTo,
      status: "Plan",
      geometry: {
        type: "Polygon" as const,
        coordinates: drawnPolygon.coordinates,
      },
    };

    createBoundaryMutation.mutate(boundaryData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Boundary</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="boundaryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Boundary Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter boundary name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Order</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter work order number"
                      {...field}
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
                disabled={createBoundaryMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBoundaryMutation.isPending}>
                {createBoundaryMutation.isPending ? "Creating..." : "Create Boundary"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}