import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SendNotificationOptions {
  userId?: string;
  userIds?: string[];
  targetRole?: string;
  title: string;
  body: string;
  sound?: string;
  data?: Record<string, unknown>;
  url?: string;
  image?: string;
}

export const useNotifications = () => {
  const sendPushNotification = useCallback(async (options: SendNotificationOptions) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: options,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to send push notification:', err);
      throw err;
    }
  }, []);

  const sendTripReminder = useCallback((userId: string, tripDetails: { id: string; to_city: string }) => {
    return sendPushNotification({
      userId,
      title: 'تذكير برحلة 🚌',
      body: `رحلتك إلى ${tripDetails.to_city} قريباً`,
      sound: 'trip_reminder',
      data: { type: 'trip', tripId: tripDetails.id },
      url: `/trips/${tripDetails.id}`,
    });
  }, [sendPushNotification]);

  const sendNewBookingNotification = useCallback((supplierId: string, bookingDetails: { customerName: string; tripRoute: string }) => {
    return sendPushNotification({
      userId: supplierId,
      title: 'حجز جديد 🎉',
      body: `${bookingDetails.customerName} حجز في رحلة ${bookingDetails.tripRoute}`,
      sound: 'new_shipment',
      data: { type: 'booking' },
    });
  }, [sendPushNotification]);

  const sendShipmentUpdate = useCallback((userId: string, status: string) => {
    return sendPushNotification({
      userId,
      title: 'تحديث الشحنة 📦',
      body: `حالة شحنتك: ${status}`,
      sound: 'default',
      data: { type: 'shipment' },
    });
  }, [sendPushNotification]);

  const sendPromotion = useCallback((targetRole: string, title: string, body: string) => {
    return sendPushNotification({
      targetRole,
      title,
      body,
      sound: 'promotion',
      data: { type: 'promotion' },
    });
  }, [sendPushNotification]);

  const sendPaymentConfirmation = useCallback((userId: string, amount: number) => {
    return sendPushNotification({
      userId,
      title: 'تأكيد الدفع ✅',
      body: `تم استلام مبلغ ${amount} ريال بنجاح`,
      sound: 'payment_success',
      data: { type: 'payment' },
    });
  }, [sendPushNotification]);

  return {
    sendPushNotification,
    sendTripReminder,
    sendNewBookingNotification,
    sendShipmentUpdate,
    sendPromotion,
    sendPaymentConfirmation,
  };
};
