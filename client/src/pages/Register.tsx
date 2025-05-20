import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getAllTeams } from "@/lib/api";
import { Team } from "@shared/schema";

const baseRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["Supervisor", "Field"]),
});

// Create conditional schema based on role
const registerSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("Supervisor"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
  }),
  z.object({
    role: z.literal("Field"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    teamId: z.string().refine(val => val !== "", {
      message: "Please select a team"
    }),
  }),
]);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { register, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string>("Field");
  
  // Fetch teams
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: getAllTeams
  });
  
  // Filter teams to only show approved teams
  const approvedTeams = teams.filter((team: Team) => team.status === "Approved");
  
  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "Field",
      ...(selectedRole === "Field" && { teamId: "" }),
    },
  });

  // Watch for role changes to update form state
  const watchRole = form.watch("role");
  
  useEffect(() => {
    setSelectedRole(watchRole);
    
    // Reset the form with updated defaults based on role
    form.reset({
      ...form.getValues(),
      ...(watchRole === "Field" && { teamId: "" })
    });
  }, [watchRole, form]);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Convert teamId to number for Field users
      const formattedValues = values.role === "Field" 
        ? { ...values, teamId: parseInt(values.teamId, 10) }
        : values;
        
      await register(formattedValues);
      toast({
        title: "Success",
        description: "Your account has been created",
        variant: "default",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Username or email may already be in use.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-2">
            <div className="mr-2 text-primary-500 text-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <CardTitle className="text-2xl">GeoWhats</CardTitle>
          </div>
          <CardDescription>
            Create a new account to access the field operations management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="Field">Field Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show team selection only for Field role */}
              {selectedRole === "Field" && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTeams ? "Loading teams..." : "Select your team"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedTeams.length === 0 ? (
                            <SelectItem value="" disabled>No approved teams available</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="" disabled>Select a team</SelectItem>
                              {approvedTeams.map((team: Team) => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {approvedTeams.length === 0 && !isLoadingTeams && (
                        <p className="text-xs text-amber-600 mt-1">
                          No approved teams available. Please contact a supervisor to create and approve a team.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-primary-600 hover:text-primary-800">
              Login
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
