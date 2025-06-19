import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { createTask, getAllTeams } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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

// Define form schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  dueDate: z.string().optional(),
  teamId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  setSelectionMode?: (mode: boolean) => void;
}

export default function CreateTaskModal({
  open,
  onClose,
  onOpenChange,
  selectedLocation,
  setSelectionMode,
}: CreateTaskModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch teams if user is supervisor
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: getAllTeams,
    enabled: user?.role === "Supervisor"
  });

  // Initialize form
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      dueDate: "",
      teamId: undefined,
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      onClose();
      form.reset();
      if (setSelectionMode) setSelectionMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
      console.error("Error creating task:", error);
    },
  });

  const onSubmit = (values: TaskFormValues) => {
    const taskData = {
      title: values.title,
      description: values.description,
      status: "Unassigned" as const,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
      teamId: (values.teamId && values.teamId !== "none") ? values.teamId : undefined,
      location: selectedLocation ? {
        type: "Point" as const,
        coordinates: [selectedLocation.lng, selectedLocation.lat]
      } : undefined,
      createdBy: user?._id
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description"
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {user?.role === "Supervisor" && (
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Team</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific team</SelectItem>
                        {teams.filter((team: any) => team.status === "Approved").map((team: any) => (
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
            )}
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Location</FormLabel>
              <div className="flex items-center mt-1">
                <Input
                  type="text"
                  readOnly
                  placeholder="Select location on map"
                  value={selectedLocation ? `Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}` : ""}
                  className="flex-1"
                />
                {setSelectionMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => {
                      setSelectionMode(true);
                      toast({
                        title: "Select location",
                        description: "Click on the map to select a location",
                      });
                    }}
                  >
                    <i className="ri-map-pin-line"></i>
                  </Button>
                )}
              </div>
              {setSelectionMode && (
                <p className="text-xs text-neutral-500 mt-1">Click on the map to select location</p>
              )}
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            className="bg-primary-500 hover:bg-primary-600"
            disabled={createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}