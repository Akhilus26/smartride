import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusTrackingProvider } from "@/contexts/BusTrackingContext";
import { ProtectedRoute, RoleBasedRedirect } from "@/components/ProtectedRoute";

// Auth Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Passenger Pages
import PassengerDashboard from "@/pages/passenger/Dashboard";
import TrackBus from "@/pages/passenger/TrackBus";
import BookTicket from "@/pages/passenger/BookTicket";
import MyTickets from "@/pages/passenger/MyTickets";

// Conductor Pages
import ConductorDashboard from "@/pages/conductor/Dashboard";
import QRScanner from "@/pages/conductor/QRScanner";
import StopManagement from "@/pages/conductor/StopManagement";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import ManageBuses from "@/pages/admin/ManageBuses";
import ManageRoutes from "@/pages/admin/ManageRoutes";
import ManageStops from "@/pages/admin/ManageStops";
import LiveMonitor from "@/pages/admin/LiveMonitor";
import Reports from "@/pages/admin/Reports";
import FleetStatus from "@/pages/admin/FleetStatus";
import BusDetails from "@/pages/admin/BusDetails";
import ManageUsers from "@/pages/admin/ManageUsers";
import CreateConductor from "@/pages/admin/CreateConductor";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BusTrackingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/smartride">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Role-based redirect */}
              <Route path="/" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />

              {/* Passenger Routes */}
              <Route path="/passenger" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerDashboard /></ProtectedRoute>} />
              <Route path="/passenger/track" element={<ProtectedRoute allowedRoles={['passenger']}><TrackBus /></ProtectedRoute>} />
              <Route path="/passenger/book" element={<ProtectedRoute allowedRoles={['passenger']}><BookTicket /></ProtectedRoute>} />
              <Route path="/passenger/tickets" element={<ProtectedRoute allowedRoles={['passenger']}><MyTickets /></ProtectedRoute>} />
              <Route path="/passenger/notifications" element={<ProtectedRoute allowedRoles={['passenger']}><Notifications /></ProtectedRoute>} />

              {/* Conductor Routes */}
              <Route path="/conductor" element={<ProtectedRoute allowedRoles={['conductor']}><ConductorDashboard /></ProtectedRoute>} />
              <Route path="/conductor/scanner" element={<ProtectedRoute allowedRoles={['conductor']}><QRScanner /></ProtectedRoute>} />
              <Route path="/conductor/stops" element={<ProtectedRoute allowedRoles={['conductor']}><StopManagement /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/buses" element={<ProtectedRoute allowedRoles={['admin']}><ManageBuses /></ProtectedRoute>} />
              <Route path="/admin/routes" element={<ProtectedRoute allowedRoles={['admin']}><ManageRoutes /></ProtectedRoute>} />
              <Route path="/admin/stops" element={<ProtectedRoute allowedRoles={['admin']}><ManageStops /></ProtectedRoute>} />
              <Route path="/admin/monitor" element={<ProtectedRoute allowedRoles={['admin']}><LiveMonitor /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
              <Route path="/admin/fleet" element={<ProtectedRoute allowedRoles={['admin']}><FleetStatus /></ProtectedRoute>} />
              <Route path="/admin/fleet/:id" element={<ProtectedRoute allowedRoles={['admin']}><BusDetails /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><ManageUsers /></ProtectedRoute>} />
              <Route path="/admin/conductors/new" element={<ProtectedRoute allowedRoles={['admin']}><CreateConductor /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><Notifications /></ProtectedRoute>} />

              {/* Shared Routes */}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BusTrackingProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
