import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/pushSubscription";

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
      setRole("customer");
    }
  };

  useEffect(() => {
    let mounted = true;

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
          if (event === "SIGNED_IN") {
            const prevCoverage = localStorage.getItem("wasal_coverage_status");
            if (prevCoverage === "guest" || prevCoverage === null) {
              localStorage.setItem("wasal_coverage_status", "covered");
            }
            setLoading(true);
            setRole(null);
            setTimeout(async () => {
              if (!mounted) return;
              await fetchUserData(session.user.id);
              if (mounted) setLoading(false);
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

  useEffect(() => {
    if (user && role) {
      subscribeToPush(user.id);
    }
  }, [user?.id, role]);

  const signOut = async () => {
    if (user) {
      await unsubscribeFromPush(user.id);
    }
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
