import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

let initialized = false;

export const loadOneSignal = (): Promise<void> => {
  return new Promise((resolve) => {
    if (document.getElementById('onesignal-sdk')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export const initOneSignal = async () => {
  if (initialized) return;

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  await loadOneSignal();

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    await OneSignal.init({
      appId,
      safari_web_id: "web.onesignal.auto.313afc18-65a3-4cb5-bd8a-eabd69c6e4d8",
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    });
  });

  initialized = true;
};

export const registerUserForPush = async (userId: string, userEmail: string | undefined, userRole: string) => {
  if (!window.OneSignal) return;

  try {
    await window.OneSignal.login(userId);
    await window.OneSignal.User.addTags({
      user_id: userId,
      email: userEmail || '',
      role: userRole,
    });

    const playerId = await window.OneSignal.User.getOnesignalId();
    if (playerId) {
      await supabase
        .from('profiles')
        .update({ onesignal_player_id: playerId } as any)
        .eq('user_id', userId);
    }
  } catch (err) {
    console.warn('OneSignal registration failed:', err);
  }
};

export const logoutFromPush = async () => {
  if (!window.OneSignal) return;
  try {
    await window.OneSignal.logout();
  } catch (err) {
    console.warn('OneSignal logout failed:', err);
  }
};
