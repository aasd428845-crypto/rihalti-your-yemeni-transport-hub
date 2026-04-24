import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/layouts/MainLayout";
const SuperAppLayout = lazy(() => import("./layouts/SuperAppLayout"));
import PageLoader from "@/components/common/PageLoader";
import Index from "./pages/Index";

// Auth pages (lazy loaded)
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));

// Static pages (lazy loaded)
const NotFound = lazy(() => import("./pages/NotFound"));
const ShipmentRequestPage = lazy(() => import("./pages/ShipmentRequestPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
// Admin (lazy loaded)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminInvitations = lazy(() => import("./pages/admin/AdminInvitations"));
const AdminCancellations = lazy(() => import("./pages/admin/AdminCancellations"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminJoinRequests = lazy(() => import("./pages/admin/AdminJoinRequests"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminViolations = lazy(() => import("./pages/admin/AdminViolations"));
const AdminChatMonitoring = lazy(() => import("./pages/admin/AdminChatMonitoring"));
const AdminDeliveryProofs = lazy(() => import("./pages/admin/AdminDeliveryProofs"));
const AdminPaymentReview = lazy(() => import("./pages/admin/AdminPaymentReview"));
const AdminPartnerControls = lazy(() => import("./pages/admin/AdminPartnerControls"));
const AdminSupportMessages = lazy(() => import("./pages/admin/AdminSupportMessages"));
const AdminSendNotification = lazy(() => import("./pages/admin/AdminSendNotification"));
const AdminNotificationLogs = lazy(() => import("./pages/admin/AdminNotificationLogs"));
const AdminPartnerProfile = lazy(() => import("./pages/admin/AdminPartnerProfile"));
const AdminMonitoring = lazy(() => import("./pages/admin/AdminMonitoring"));
const AdminRestaurants = lazy(() => import("./pages/admin/AdminRestaurants"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
// Supplier (lazy loaded)
const SupplierLayout = lazy(() => import("./components/supplier/SupplierLayout"));
const SupplierDashboard = lazy(() => import("./pages/supplier/SupplierDashboard"));
const SupplierTrips = lazy(() => import("./pages/supplier/SupplierTrips"));
const SupplierBookings = lazy(() => import("./pages/supplier/SupplierBookings"));
const SupplierShipments = lazy(() => import("./pages/supplier/SupplierShipments"));
const SupplierFinance = lazy(() => import("./pages/supplier/SupplierFinance"));
const SupplierSettings = lazy(() => import("./pages/supplier/SupplierSettings"));
const SupplierMessages = lazy(() => import("./pages/supplier/SupplierMessages"));
const SupplierPromotions = lazy(() => import("./pages/supplier/SupplierPromotions"));
const SupplierOrderDetails = lazy(() => import("./pages/supplier/SupplierOrderDetails"));
const SupplierPayments = lazy(() => import("./pages/supplier/SupplierPayments"));
const PartnerPaymentSettings = lazy(() => import("./pages/supplier/PartnerPaymentSettings"));
// Partner
const PartnerProfilePage = lazy(() => import("./pages/partner/PartnerProfilePage"));
const PublicPartnerProfilePage = lazy(() => import("./pages/partner/PublicPartnerProfilePage"));
// Delivery (lazy loaded)
const DeliveryLayout = lazy(() => import("./components/delivery/DeliveryLayout"));
const DeliveryDashboard = lazy(() => import("./pages/delivery/DeliveryDashboard"));
const DeliveryRestaurants = lazy(() => import("./pages/delivery/DeliveryRestaurants"));
const DeliveryMenuManagement = lazy(() => import("./pages/delivery/DeliveryMenuManagement"));
const DeliveryOrders = lazy(() => import("./pages/delivery/DeliveryOrders"));
const DeliveryRiders = lazy(() => import("./pages/delivery/DeliveryRiders"));
const DeliveryFinance = lazy(() => import("./pages/delivery/DeliveryFinance"));
const DeliveryIntegrations = lazy(() => import("./pages/delivery/DeliveryIntegrations"));
const DeliverySettings = lazy(() => import("./pages/delivery/DeliverySettings"));
const DeliveryReports = lazy(() => import("./pages/delivery/DeliveryReports"));
const DeliveryZones = lazy(() => import("./pages/delivery/DeliveryZones"));
const DeliveryPayments = lazy(() => import("./pages/delivery/DeliveryPayments"));
const DeliveryBanners = lazy(() => import("./pages/delivery/DeliveryBanners"));
const DeliveryPromotions = lazy(() => import("./pages/delivery/DeliveryPromotions"));
const DeliveryOffers = lazy(() => import("./pages/delivery/DeliveryOffers"));
// Customer Pages (lazy loaded)
const TripsPage = lazy(() => import("./pages/customer/TripsPage"));
const TripDetailsPage = lazy(() => import("./pages/customer/TripDetailsPage"));
const CheckoutPage = lazy(() => import("./pages/customer/CheckoutPage"));
// ShipmentsPage was the old supplier-based parcel flow. It is intentionally
// no longer routed; /shipments now redirects to /delivery-request which uses
// the delivery-company flow.
const DeliveryRequestPage = lazy(() => import("./pages/customer/DeliveryRequestPage"));
const DeliveriesPage = lazy(() => import("./pages/customer/DeliveriesPage"));
const HistoryPage = lazy(() => import("./pages/customer/HistoryPage"));
const AccountPage = lazy(() => import("./pages/customer/AccountPage"));
const TrackingPage = lazy(() => import("./pages/customer/TrackingPage"));
const AddressesPage = lazy(() => import("./pages/customer/AddressesPage"));
const DeliveryHubPage = lazy(() => import("./pages/customer/DeliveryHubPage"));
const RestaurantsPage = lazy(() => import("./pages/customer/RestaurantsPage"));
const RestaurantMenuPage = lazy(() => import("./pages/customer/RestaurantMenuPage"));
const RestaurantCheckoutPage = lazy(() => import("./pages/customer/RestaurantCheckoutPage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const OrderTrackingPage = lazy(() => import("./pages/customer/OrderTrackingPage"));
const OrderDetailsPage = lazy(() => import("./pages/customer/OrderDetailsPage"));
const RideRequestPage = lazy(() => import("./pages/customer/RideRequestPage"));
const RideDetailsPage = lazy(() => import("./pages/customer/RideDetailsPage"));
const RideTrackingPage = lazy(() => import("./pages/customer/RideTrackingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const PaymentPage = lazy(() => import("./pages/customer/PaymentPage"));
const PaymentSuccessPage = lazy(() => import("./pages/customer/PaymentSuccessPage"));
// Driver (lazy loaded)
const DriverLayout = lazy(() => import("./components/driver/DriverLayout"));
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));
const DriverRideDetails = lazy(() => import("./pages/driver/DriverRideDetails"));
const DriverActiveRide = lazy(() => import("./pages/driver/DriverActiveRide"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverHistory = lazy(() => import("./pages/driver/DriverHistory"));
const DriverEarnings = lazy(() => import("./pages/driver/DriverEarnings"));
const DriverSettings = lazy(() => import("./pages/driver/DriverSettings"));
// Delivery Driver (lazy loaded)
const DeliveryDriverLayout = lazy(() => import("./components/delivery-driver/DeliveryDriverLayout"));
const DeliveryDriverDashboard = lazy(() => import("./pages/delivery-driver/DeliveryDriverDashboard"));
const DeliveryDriverOrders = lazy(() => import("./pages/delivery-driver/DeliveryDriverOrders"));
const DeliveryDriverEarnings = lazy(() => import("./pages/delivery-driver/DeliveryDriverEarnings"));
const DeliveryDriverProfile = lazy(() => import("./pages/delivery-driver/DeliveryDriverProfile"));
const DeliveryDriverSettings = lazy(() => import("./pages/delivery-driver/DeliveryDriverSettings"));
const DeliveryDriverOrderDetails = lazy(() => import("./pages/delivery-driver/DeliveryDriverOrderDetails"));
const DeliveryDriverHistory = lazy(() => import("./pages/delivery-driver/DeliveryDriverHistory"));
const MorePage = lazy(() => import("./pages/MorePage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
import { InstallPWAButton } from "./components/InstallPWAButton";
import { UpdateNotification } from "./components/UpdateNotification";
import RealtimeToastListener from "./components/notifications/RealtimeToastListener";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="wasl-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" dir="rtl" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Pages with SuperAppLayout (Super App UX) */}
              <Route element={<SuperAppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/trips/:id" element={<TripDetailsPage />} />
                <Route path="/checkout/:tripId" element={<CheckoutPage />} />
                {/* /shipments was the old supplier-based page; redirect to the
                   delivery-company flow so all existing tiles/links land on the
                   correct page. */}
                <Route path="/shipments" element={<Navigate to="/delivery-request" replace />} />
                <Route path="/delivery-request" element={<DeliveryRequestPage />} />
                <Route path="/deliveries" element={<DeliveriesPage />} />
                <Route path="/restaurants" element={<DeliveryHubPage />} />
                <Route path="/delivery-hub" element={<DeliveryHubPage />} />
                <Route path="/food" element={<RestaurantsPage />} />
                <Route path="/restaurants/:id" element={<RestaurantMenuPage />} />
                <Route path="/restaurants/:id/checkout" element={<RestaurantCheckoutPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/ride/request" element={<RideRequestPage />} />
                <Route path="/ride/:id" element={<RideDetailsPage />} />
                <Route path="/ride/track/:id" element={<RideTrackingPage />} />
                <Route path="/order/:type/:id" element={<OrderDetailsPage />} />
                <Route path="/order/track/:type/:id" element={<OrderTrackingPage />} />
                <Route path="/payment/:entityType/:entityId" element={<PaymentPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/addresses" element={<AddressesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/notification-settings" element={<NotificationSettingsPage />} />
                <Route path="/shipment-request" element={<ShipmentRequestPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/more" element={<MorePage />} />
                <Route path="/partner/public/:id" element={<PublicPartnerProfilePage />} />
                <Route path="/install" element={<InstallPage />} />
              </Route>

              {/* Auth pages (no layout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/invite/:token" element={<InvitePage />} />

              {/* Partner Profile */}
              <Route path="/partner/profile" element={<PartnerProfilePage />} />

              {/* Admin */}
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
                <Route path="join-requests" element={<AdminJoinRequests />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="violations" element={<AdminViolations />} />
                <Route path="chat-monitoring" element={<AdminChatMonitoring />} />
                <Route path="delivery-proofs" element={<AdminDeliveryProofs />} />
                <Route path="payment-review" element={<AdminPaymentReview />} />
                <Route path="partner-controls" element={<AdminPartnerControls />} />
                <Route path="support-messages" element={<AdminSupportMessages />} />
                <Route path="send-notification" element={<AdminSendNotification />} />
                <Route path="notification-logs" element={<AdminNotificationLogs />} />
                <Route path="partner-profile/:id" element={<AdminPartnerProfile />} />
                <Route path="monitoring" element={<AdminMonitoring />} />
                <Route path="restaurants" element={<AdminRestaurants />} />
              </Route>
              {/* Supplier */}
              <Route path="/supplier" element={<SupplierLayout />}>
                <Route index element={<SupplierDashboard />} />
                <Route path="trips" element={<SupplierTrips />} />
                <Route path="shipments" element={<SupplierShipments />} />
                <Route path="bookings" element={<SupplierBookings />} />
                <Route path="messages" element={<SupplierMessages />} />
                <Route path="finance" element={<SupplierFinance />} />
                <Route path="payments" element={<SupplierPayments />} />
                <Route path="promotions" element={<SupplierPromotions />} />
                <Route path="settings" element={<SupplierSettings />} />
                <Route path="order/:id" element={<SupplierOrderDetails />} />
                <Route path="profile" element={<PartnerProfilePage />} />
                <Route path="payment-settings" element={<PartnerPaymentSettings />} />
              </Route>
              {/* Delivery Company */}
              <Route path="/delivery" element={<DeliveryLayout />}>
                <Route index element={<DeliveryDashboard />} />
                <Route path="orders" element={<DeliveryOrders />} />
                <Route path="restaurants" element={<DeliveryRestaurants />} />
                <Route path="menu/:restaurantId" element={<DeliveryMenuManagement />} />
                <Route path="riders" element={<DeliveryRiders />} />
                <Route path="finance" element={<DeliveryFinance />} />
                <Route path="reports" element={<DeliveryReports />} />
                <Route path="settings" element={<DeliverySettings />} />
                <Route path="zones" element={<DeliveryZones />} />
                <Route path="payments" element={<DeliveryPayments />} />
                <Route path="banners" element={<DeliveryBanners />} />
                <Route path="promotions" element={<DeliveryPromotions />} />
                <Route path="offers" element={<DeliveryOffers />} />
                <Route path="integrations" element={<DeliveryIntegrations />} />
                <Route path="profile" element={<PartnerProfilePage />} />
                <Route path="payment-settings" element={<PartnerPaymentSettings />} />
              </Route>
              {/* Driver */}
              <Route path="/driver" element={<DriverLayout />}>
                <Route index element={<DriverDashboard />} />
                <Route path="ride/:id" element={<DriverRideDetails />} />
                <Route path="active-ride/:id" element={<DriverActiveRide />} />
                <Route path="history" element={<DriverHistory />} />
                <Route path="earnings" element={<DriverEarnings />} />
                <Route path="profile" element={<DriverProfile />} />
                <Route path="settings" element={<DriverSettings />} />
              </Route>
              {/* Delivery Driver */}
              <Route path="/delivery-driver" element={<DeliveryDriverLayout />}>
                <Route index element={<DeliveryDriverDashboard />} />
                <Route path="orders" element={<DeliveryDriverOrders />} />
                <Route path="order/:id" element={<DeliveryDriverOrderDetails />} />
                <Route path="history" element={<DeliveryDriverHistory />} />
                <Route path="earnings" element={<DeliveryDriverEarnings />} />
                <Route path="profile" element={<DeliveryDriverProfile />} />
                <Route path="settings" element={<DeliveryDriverSettings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <InstallPWAButton />
            <UpdateNotification />
            <RealtimeToastListener />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
