import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: logs a failed push / in-app notification to
 * public.notification_failures without blocking the caller.
 *
 * Usage (do NOT await):
 *   logNotificationFailure("send-push-notification", payload, err);
 */
export const logNotificationFailure = (
  functionName: string,
  payload: object,
  error: unknown,
): void => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error);

  // Intentionally not awaited — this must never block the primary operation.
  (supabase.from as any)("notification_failures")
    .insert({
      function_name: functionName,
      payload,
      error_message: errorMessage,
      resolved: false,
    })
    .then(() => {})
    .catch(() => {
      // Last-resort: if logging itself fails, write to console only.
      console.warn("[notificationFailure] Could not log failure:", functionName, errorMessage);
    });
};
