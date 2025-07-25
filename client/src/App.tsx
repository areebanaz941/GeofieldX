import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import NotFound from "@/pages/not-found";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import TaskList from "./pages/TaskList";
import FieldTeams from "./pages/FieldTeams";
import Reports from "./pages/Reports";
import Submissions from "./pages/Submissions";
import FeatureList from "./pages/FeatureList";
import FeatureDetails from "./pages/FeatureDetails";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthenticatedRoutes } from "./components/AuthenticatedRoutes";
import { SupervisorRoutes } from "./components/SupervisorRoutes";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/">
              <AuthenticatedRoutes>
                <Dashboard />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/dashboard">
              <AuthenticatedRoutes>
                <Dashboard />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/map">
              <AuthenticatedRoutes>
                <MapView />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/map-view">
              <AuthenticatedRoutes>
                <MapView />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/tasks">
              <AuthenticatedRoutes>
                <TaskList />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/teams">
              <AuthenticatedRoutes>
                <FieldTeams />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/reports">
              <AuthenticatedRoutes>
                <Reports />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/submissions">
              <AuthenticatedRoutes>
                <Submissions />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/features/:featureType">
              <AuthenticatedRoutes>
                <SupervisorRoutes>
                  <FeatureList />
                </SupervisorRoutes>
              </AuthenticatedRoutes>
            </Route>
            <Route path="/features/:featureType/:featureId">
              <AuthenticatedRoutes>
                <SupervisorRoutes>
                  <FeatureDetails />
                </SupervisorRoutes>
              </AuthenticatedRoutes>
            </Route>
            <Route component={NotFound} />
          </Switch>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
