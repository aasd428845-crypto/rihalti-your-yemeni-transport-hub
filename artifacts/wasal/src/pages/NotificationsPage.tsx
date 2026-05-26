import NotificationsInbox, { NavResolver } from "@/components/notifications/NotificationsInbox";

const resolveNav: NavResolver = (data: any, type?: string) => {
  const t = type || data?.type || "";
  if (["order_status", "order_confirmed", "new_order", "order_received"].includes(t)) return "/history";
  if (["trip", "trip_status", "booking"].includes(t)) return "/trips";
  if (["delivery", "shipment"].includes(t)) return "/history";
  if (data?.orderId || data?.order_id) return "/history";
  return null;
};

const NotificationsPage = () => (
  <NotificationsInbox
    title="الإشعارات"
    resolveNav={resolveNav}
  />
);

export default NotificationsPage;
