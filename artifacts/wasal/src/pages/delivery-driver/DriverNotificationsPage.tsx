import NotificationsInbox, { NavResolver } from "@/components/notifications/NotificationsInbox";

const resolveNav: NavResolver = (data: any, type?: string) => {
  const t = type || data?.type || "";
  if (["rider_assigned", "order_status", "new_order", "order_confirmed",
       "order_assigned", "assignment"].includes(t)) return "/delivery-driver";
  if (data?.order_id || data?.orderId) return "/delivery-driver";
  return null;
};

const DriverNotificationsPage = () => (
  <NotificationsInbox
    title="الإشعارات"
    resolveNav={resolveNav}
  />
);

export default DriverNotificationsPage;
