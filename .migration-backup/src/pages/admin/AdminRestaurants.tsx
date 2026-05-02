import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Store, Image as ImageIcon, Trash2, Eye, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/common/ImageUpload";

const AdminRestaurants = () => {
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [saving, setSaving] = useState(false);

  // Menu items image management
  const [menuDialog, setMenuDialog] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    setRestaurants(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: any) => {
    setSelected(r);
    setLogoUrl(r.logo_url || "");
    setCoverImage(r.cover_image || "");
    setEditDialog(true);
  };

  const saveImages = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      logo_url: logoUrl || null,
      cover_image: coverImage || null,
    }).eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ الصور بنجاح" });
      setEditDialog(false);
      load();
    }
  };

  const openMenuImages = async (r: any) => {
    setSelected(r);
    setMenuLoading(true);
    setMenuDialog(true);
    const { data } = await supabase
      .from("menu_items")
      .select("id, name_ar, image_url")
      .eq("restaurant_id", r.id)
      .order("sort_order");
    setMenuItems(data || []);
    setMenuLoading(false);
  };

  const updateMenuItemImage = async (itemId: string, imageUrl: string) => {
    const { error } = await supabase.from("menu_items").update({ image_url: imageUrl || null }).eq("id", itemId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, image_url: imageUrl } : i));
      toast({ title: "تم تحديث الصورة" });
    }
  };

  const filtered = restaurants.filter(r =>
    r.name_ar?.includes(search) || r.name_en?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6" />
          إدارة صور المطاعم
        </h2>
        <Badge variant="secondary">{restaurants.length} مطعم</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مطاعم</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <Card key={r.id} className="overflow-hidden">
              <div className="h-32 bg-muted relative">
                {r.cover_image ? (
                  <img src={r.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                {r.logo_url && (
                  <div className="absolute bottom-0 translate-y-1/2 right-3 w-12 h-12 rounded-full border-2 border-background bg-background overflow-hidden shadow">
                    <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <CardContent className={`p-4 space-y-3 ${r.logo_url ? "pt-8" : ""}`}>
                <h3 className="font-bold">{r.name_ar}</h3>
                <Badge variant={r.is_active ? "default" : "secondary"}>
                  {r.is_active ? "نشط" : "معطل"}
                </Badge>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="flex-1 gap-1">
                    <Edit className="w-3.5 h-3.5" /> صور المطعم
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openMenuImages(r)} className="flex-1 gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> صور المنيو
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Restaurant Images Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل صور المطعم: {selected?.name_ar}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">صورة الغلاف</Label>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                bucket="company-logos"
                folder="restaurant-covers"
                aspectRatio="cover"
                placeholder="اسحب صورة الغلاف هنا"
              />
            </div>
            <div>
              <Label className="mb-2 block">الشعار</Label>
              <ImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                bucket="company-logos"
                folder="restaurant-logos"
                aspectRatio="logo"
                placeholder="شعار المطعم"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveImages} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Items Images Dialog */}
      <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>صور أصناف المنيو: {selected?.name_ar}</DialogTitle>
          </DialogHeader>
          {menuLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" /></div>
          ) : menuItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد أصناف</p>
          ) : (
            <div className="space-y-4">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <ImageUpload
                    value={item.image_url || ""}
                    onChange={(url) => updateMenuItemImage(item.id, url)}
                    bucket="company-logos"
                    folder="menu-items"
                    aspectRatio="square"
                    placeholder="صورة"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name_ar}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRestaurants;
