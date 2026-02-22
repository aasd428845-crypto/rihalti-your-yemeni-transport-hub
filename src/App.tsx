import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminInvitations from "./pages/admin/AdminInvitations";
import AdminCancellations from "./pages/admin/AdminCancellations";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminReports from "./pages/admin/AdminReports";
import SupplierLayout from "./components/supplier/SupplierLayout";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierTrips from "./pages/supplier/SupplierTrips";
import SupplierBookings from "./pages/supplier/SupplierBookings";
import SupplierShipments from "./pages/supplier/SupplierShipments";
import SupplierFinance from "./pages/supplier/SupplierFinance";
import SupplierSettings from "./pages/supplier/SupplierSettings";
import SupplierMessages from "./pages/supplier/SupplierMessages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="approvals" element={<AdminApprovals />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="invitations" element={<AdminInvitations />} />
              <Route path="cancellations" element={<AdminCancellations />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
            <Route path="/supplier" element={<SupplierLayout />}>
              <Route index element={<SupplierDashboard />} />
              <Route path="trips" element={<SupplierTrips />} />
              <Route path="bookings" element={<SupplierBookings />} />
              <Route path="shipments" element={<SupplierShipments />} />
              <Route path="finance" element={<SupplierFinance />} />
              <Route path="settings" element={<SupplierSettings />} />
              <Route path="messages" element={<SupplierMessages />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
