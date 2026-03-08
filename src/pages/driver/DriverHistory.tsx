import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, DollarSign, Star, Calendar } from "lucide-react";

const DriverHistory = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      setRides(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">سجل الرحلات</h1>

      {rides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد رحلات مكتملة بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <Card key={ride.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-foreground font-medium">{ride.from_address || ride.from_city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-foreground font-medium">{ride.to_address || ride.to_city}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 ml-1" />
                        {ride.completed_at ? new Date(ride.completed_at).toLocaleDateString("ar-YE") : new Date(ride.created_at).toLocaleDateString("ar-YE")}
                      </Badge>
                      {ride.final_price && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="w-3 h-3 ml-1" />{ride.final_price} ر.ي
                        </Badge>
                      )}
                      <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">مكتملة ✓</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverHistory;
