import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initOneSignal, registerUserForPush, logoutFromPush } from "@/lib/onesignal";

type AppRole = "customer" | "supplier" | "delivery_company" | "admin" | "driver" | "delivery_driver";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; phone: string | null; city: string | null; account_status?: string | null; avatar_url?: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("full_name, phone, city, account_status, avatar_url").eq("user_id", userId).maybeSingle(),
      ]);

      // Always set a role — "customer" is the default so guards never stay
      // in a permanent null/loading limbo after fetchUserData finishes.
      setRole((roleRes.data?.role ?? "customer") as AppRole);

      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.account_status === "suspended") {
          await supabase.auth.signOut();
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      // On error fall back to customer so guards can redirect instead of spinning
      setRole("customer");
    }
  };

  useEffect(() => {
    let mounted = true;

    // Load initial session — await role/profile BEFORE clearing the loading state
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only do a full role-reset on SIGNED_IN (fresh login).
          // INITIAL_SESSION is handled by getSession() above (with await).
          // TOKEN_REFRESHED / USER_UPDATED must NOT reset the role — that
          // would cause an unnecessary loading flicker and navigation loops.
          if (event === "SIGNED_IN") {
            setLoading(true);
            setRole(null);
            // Use setTimeout to avoid Supabase client deadlock inside the callback.
            setTimeout(async () => {
              if (!mounted) return;
              await fetchUserData(session.user.id);
              if (mounted) {
                setLoading(false);
                initOneSignal();
              }
            }, 0);
          }
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Register for push when role is available
  useEffect(() => {
    if (user && role) {
      registerUserForPush(user.id, user.email, role);
    }
  }, [user, role]);

  const signOut = async () => {
    await logoutFromPush();
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
