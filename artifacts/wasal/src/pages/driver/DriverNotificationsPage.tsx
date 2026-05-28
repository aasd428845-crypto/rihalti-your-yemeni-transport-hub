import NotificationsInbox, { NavResolver } from "@/components/notifications/NotificationsInbox";

const resolveNav: NavResolver = (data: any, type?: string) => {
  const t = type || data?.type || "";
  if (["trip_request", "new_trip", "trip_assigned", "booking", "trip_status"].includes(t)) return "/driver";
  if (data?.trip_id || data?.rideId || data?.ride_id) return "/driver";
  return null;
};

const DriverNotificationsPage = () => (
  <NotificationsInbox
    title="الإشعارات"
    resolveNav={resolveNav}
  />
);

export default DriverNotificationsPage;
