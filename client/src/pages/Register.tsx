import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GeoPilotLogo from "../assets/GeoPilot Logo.png";

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
    teamId: z.string().min(1, "Please select a team"),
  }),
]);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { register, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
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
      // Keep teamId as string for MongoDB ObjectId compatibility
      const formattedValues = values;
        
      await register(formattedValues);
      toast({
        title: t('common.success'),
        description: t('auth.registrationSuccess'),
        variant: "default",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.registrationError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E0F7F6] to-[#EBF5F0] px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center mb-2">
              <img src={GeoPilotLogo} alt="GeoFieldX Logo" className="h-12 w-auto mr-2" />
              <CardTitle className="text-2xl bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">GeoFieldX</CardTitle>
            </div>
            <CardDescription className="text-center italic font-medium text-[#F9973E]">
              {t('auth.subtitle')}
            </CardDescription>
            <CardDescription className="text-center mt-2">
              {t('auth.registerWelcome')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.username')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.usernamePlaceholder')} {...field} />
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
                    <FormLabel>{t('auth.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.namePlaceholder')} {...field} />
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
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('auth.emailPlaceholder')} {...field} />
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
                    <FormLabel>{t('auth.role')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('auth.selectRole')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Supervisor">{t('auth.supervisor')}</SelectItem>
                        <SelectItem value="Field">{t('auth.fieldUser')}</SelectItem>
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
                      <FormLabel>{t('auth.team')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTeams ? t('common.loading') : t('auth.selectTeam')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedTeams.length === 0 ? (
                            <SelectItem value="_none" disabled>{t('teams.noTeamsFound')}</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="_placeholder" disabled>{t('auth.selectTeam')}</SelectItem>
                              {approvedTeams.map((team: any) => (
                                <SelectItem key={team._id} value={team._id.toString()}>
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
                          {t('teams.noTeamsAvailable')}
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
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('auth.passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#1E5CB3] to-[#3F7ED5] hover:from-[#164785] hover:to-[#2B5999]" 
                disabled={isLoading}
              >
                {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm">
            {t('auth.alreadyHaveAccount')}{" "}
            <a href="/login" className="font-medium text-[#1E5CB3] hover:text-[#164785]">
              {t('auth.loginHere')}
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
