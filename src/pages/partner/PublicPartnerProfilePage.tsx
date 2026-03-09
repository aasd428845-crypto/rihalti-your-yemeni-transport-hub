import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Phone, Mail, Star, FileText } from "lucide-react";
import Header from "@/components/landing/Header";
import BackButton from "@/components/common/BackButton";

interface PartnerProfile {
  full_name: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  city: string | null;
  company_name: string | null;
}

const PublicPartnerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [workingAreas, setWorkingAreas] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [profileRes, areasRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, logo_url, description, city, company_name").eq("user_id", id).maybeSingle(),
        supabase.from("supplier_working_areas").select("region_id, regions(name_ar)").eq("supplier_id", id),
        supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
      ]);
      setProfile(profileRes.data);
      setWorkingAreas((areasRes.data || []).map((a: any) => a.regions?.name_ar).filter(Boolean));
      setRole(roleRes.data?.role || null);
      setLoading(false);
    };
    load();
  }, [id]);

  const roleLabels: Record<string, string> = {
    supplier: "صاحب مكتب",
    delivery_company: "شركة توصيل",
    driver: "سائق",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h2 className="text-xl font-bold">الملف الشخصي غير موجود</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <BackButton />

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 p-8 text-center">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.full_name} className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-background shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center border-4 border-background shadow-lg">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <h1 className="text-2xl font-bold mt-4">{profile.company_name || profile.full_name}</h1>
            {role && (
              <Badge variant="secondary" className="mt-2">
                {roleLabels[role] || role}
              </Badge>
            )}
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Description */}
            {profile.description && (
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" /> نبذة
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{profile.description}</p>
              </div>
            )}

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-primary" /> معلومات التواصل
              </h3>
              <div className="space-y-1.5 text-sm">
                {profile.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3 h-3" /> {profile.phone}
                  </p>
                )}
                {profile.city && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {profile.city}
                  </p>
                )}
              </div>
            </div>

            {/* Working Areas */}
            {workingAreas.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" /> مناطق العمل
                </h3>
                <div className="flex flex-wrap gap-2">
                  {workingAreas.map((area) => (
                    <Badge key={area} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicPartnerProfilePage;
