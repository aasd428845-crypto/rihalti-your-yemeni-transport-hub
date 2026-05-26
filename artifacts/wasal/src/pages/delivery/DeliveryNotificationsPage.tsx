import NotificationsInbox, { NavResolver } from "@/components/notifications/NotificationsInbox";

const resolveNav: NavResolver = (data: any, type?: string) => {
  const t = type || data?.type || "";
  if (!t && !data) return null;
  if (["order_received", "new_order", "order_status", "order_confirmed",
       "rider_assigned", "order_assigned", "payment"].includes(t)) return "/delivery/orders";
  if (["rider_joined", "rider_connect", "rider_linked"].includes(t)) return "/delivery/riders";
  if (["partner_request", "join_request"].includes(t)) return "/delivery";
  if (["payment_review", "bank_transfer"].includes(t)) return "/delivery/payments";
  if (data?.orderId || data?.order_id) return "/delivery/orders";
  return null;
};

const DeliveryNotificationsPage = () => (
  <NotificationsInbox
    title="الإشعارات"
    resolveNav={resolveNav}
  />
);

export default DeliveryNotificationsPage;
