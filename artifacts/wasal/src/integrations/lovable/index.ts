import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

const friendlyOAuthError = (provider: string, raw: string): string => {
  const lower = raw.toLowerCase();
  if (lower.includes("provider is not enabled") || lower.includes("not enabled")) {
    return `خدمة ${provider === "google" ? "تسجيل الدخول بحساب Google" : provider} غير مفعّلة. يجب تفعيلها من إعدادات Supabase Authentication → Providers، وإضافة Client ID و Client Secret من Google Cloud Console.`;
  }
  if (lower.includes("redirect")) {
    return `عنوان إعادة التوجيه غير مسموح به. أضف ${window.location.origin} و عنوان callback الخاص بـ Supabase في إعدادات Google Cloud OAuth Authorized URIs.`;
  }
  return raw || `فشل تسجيل الدخول عبر ${provider}`;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: SignInOptions
    ) => {
      const supabaseProvider = provider === "microsoft" ? "azure" : provider;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider as any,
        options: {
          redirectTo: opts?.redirect_uri || window.location.origin,
          queryParams: opts?.extraParams,
        },
      });
      if (error) {
        return { error: friendlyOAuthError(provider, error.message || String(error)) };
      }
      return { redirected: true };
    },
  },
};
