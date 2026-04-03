import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, UtensilsCrossed, Star, Clock, Flame, Eye } from "lucide-react";
import { getMenuCategories, createMenuCategory, updateMenuCategory, deleteMenuCategory, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/deliveryApi";
import { getRestaurantById } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/common/BackButton";
import MenuExcelImport from "@/components/delivery/MenuExcelImport";
import MenuItemOptionsManager from "@/components/delivery/MenuItemOptionsManager";
import ImageUpload from "@/components/common/ImageUpload";

const emptyItemForm = () => ({
  name_ar: "", name_en: "", description: "", price: 0, discounted_price: 0,
  image_url: "", preparation_time: 0, calories: 0,
  ingredients: "", // comma-separated, will split to array on save
  is_available: true, is_featured: false, is_popular: false, sort_order: 0,
});

const DeliveryMenuManagement = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name_ar: "", name_en: "", description: "", sort_order: 0 });
  const [itemForm, setItemForm] = useState(emptyItemForm());

  const load = async () => {
    if (!restaurantId) return;
    try {
      const [r, cats, its] = await Promise.all([
        getRestaurantById(restaurantId),
        getMenuCategories(restaurantId),
        getMenuItems(restaurantId),
      ]);
      setRestaurant(r);
      setCategories(cats || []);
      setItems(its || []);
      if (cats && cats.length > 0 && !selectedCat) setSelectedCat(cats[0].id);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleSaveCat = async () => {
    if (!catForm.name_ar.trim() || !restaurantId) return;
    try {
      if (editCat) {
        await updateMenuCategory(editCat.id, catForm);
        toast({ title: "تم تحديث الفئة" });
      } else {
        await createMenuCategory({ ...catForm, restaurant_id: restaurantId });
        toast({ title: "تمت إضافة الفئة" });
      }
      setShowCatDialog(false); setEditCat(null);
      setCatForm({ name_ar: "", name_en: "", description: "", sort_order: 0 });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("حذف هذه الفئة؟")) return;
    try {
      await deleteMenuCategory(id);
      toast({ title: "تم حذف الفئة" });
      if (selectedCat === id) setSelectedCat(null);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name_ar.trim() || !restaurantId || !selectedCat) {
      toast({ title: "يرجى اختيار فئة وإدخال اسم الصنف", variant: "destructive" }); return;
    }
    try {
      const ingredientsArray = itemForm.ingredients
        ? itemForm.ingredients.split(",").map(s => s.trim()).filter(Boolean)
        : null;
      const payload = {
        ...itemForm,
        restaurant_id: restaurantId,
        category_id: selectedCat,
        discounted_price: itemForm.discounted_price || null,
        calories: itemForm.calories || null,
        preparation_time: itemForm.preparation_time || null,
        image_url: itemForm.image_url || null,
        ingredients: ingredientsArray,
      };
      // Remove the ingredients string from payload (replace with array)
      delete (payload as any).ingredients;
      const finalPayload = { ...payload, ingredients: ingredientsArray };
      if (editItem) {
        await updateMenuItem(editItem.id, finalPayload);
        toast({ title: "تم تحديث الصنف" });
      } else {
        await createMenuItem(finalPayload);
        toast({ title: "تمت إضافة الصنف" });
      }
      setShowItemDialog(false); setEditItem(null);
      setItemForm(emptyItemForm());
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("حذف هذا الصنف؟")) return;
    try {
      await deleteMenuItem(id);
      toast({ title: "تم حذف الصنف" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openEditCat = (c: any) => {
    setEditCat(c);
    setCatForm({ name_ar: c.name_ar, name_en: c.name_en || "", description: c.description || "", sort_order: c.sort_order || 0 });
    setShowCatDialog(true);
  };

  const openEditItem = (i: any) => {
    setEditItem(i);
    setItemForm({
      name_ar: i.name_ar, name_en: i.name_en || "", description: i.description || "",
      price: i.price, discounted_price: i.discounted_price || 0, image_url: i.image_url || "",
      preparation_time: i.preparation_time || 0, calories: i.calories || 0,
      ingredients: Array.isArray(i.ingredients) ? i.ingredients.join(", ") : (i.ingredients || ""),
      is_available: i.is_available ?? true, is_featured: i.is_featured || false,
      is_popular: i.is_popular || false, sort_order: i.sort_order || 0,
    });
    setShowItemDialog(true);
  };

  const openPreview = () => {
    if (restaurantId) window.open(`/restaurant/${restaurantId}`, "_blank");
  };

  const filteredItems = items.filter(i => i.category_id === selectedCat);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BackButton fallback="/delivery/restaurants" />
          <div>
            <h2 className="text-2xl font-bold">إدارة منيو {restaurant?.name_ar}</h2>
            <p className="text-sm text-muted-foreground">إدارة الفئات والأصناف</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {restaurantId && <MenuExcelImport restaurantId={restaurantId} onComplete={load} />}
          <Button variant="outline" onClick={openPreview}>
            <Eye className="w-4 h-4 ml-1" /> معاينة المطعم
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">الفئات</h3>
            <Button size="sm" onClick={() => { setEditCat(null); setCatForm({ name_ar: "", name_en: "", description: "", sort_order: 0 }); setShowCatDialog(true); }}>
              <Plus className="w-3 h-3 ml-1" /> فئة
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد فئات</p>
          ) : (
            categories.map(c => (
              <div
                key={c.id}
                className={`rounded-lg border p-3 flex items-center justify-between cursor-pointer transition-all ${selectedCat === c.id ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedCat(c.id)}
              >
                <div>
                  <p className="font-medium text-sm">{c.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{items.filter(i => i.category_id === c.id).length} صنف</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditCat(c); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCat(c.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Items Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">
              {selectedCat ? `أصناف: ${categories.find(c => c.id === selectedCat)?.name_ar || ''}` : 'اختر فئة'}
            </h3>
            {selectedCat && (
              <Button onClick={() => { setEditItem(null); setItemForm(emptyItemForm()); setShowItemDialog(true); }}>
                <Plus className="w-4 h-4 ml-1" /> إضافة صنف
              </Button>
            )}
          </div>

          {!selectedCat ? (
            <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>اختر فئة من القائمة الجانبية</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد أصناف في هذه الفئة</p>
              <Button className="mt-4" size="sm" onClick={() => { setEditItem(null); setItemForm(emptyItemForm()); setShowItemDialog(true); }}>
                <Plus className="w-3 h-3 ml-1" /> أضف أول صنف
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="h-36 bg-muted/50 relative overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><UtensilsCrossed className="w-12 h-12" /></div>}
                    <Badge
                      variant={item.is_available ? "default" : "secondary"}
                      className="absolute top-2 right-2"
                    >
                      {item.is_available ? "متاح" : "غير متاح"}
                    </Badge>
                    {item.is_featured && <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500"><Star className="w-3 h-3" /></Badge>}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <h4 className="font-bold text-sm leading-tight">{item.name_ar}</h4>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.discounted_price ? (
                        <>
                          <span className="font-bold text-primary text-sm">{item.discounted_price} ر.ي</span>
                          <span className="text-xs text-muted-foreground line-through">{item.price} ر.ي</span>
                        </>
                      ) : (
                        <span className="font-bold text-primary text-sm">{item.price} ر.ي</span>
                      )}
                      {item.is_popular && <Badge variant="outline" className="text-xs"><Flame className="w-3 h-3 ml-0.5" />شائع</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {item.preparation_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.preparation_time} د</span>}
                      {item.calories && <span>🔥 {item.calories} سعرة</span>}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => openEditItem(item)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
                      <MenuItemOptionsManager menuItemId={item.id} menuItemName={item.name_ar} />
                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={v => { setShowCatDialog(v); if (!v) setEditCat(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editCat ? "تعديل فئة" : "إضافة فئة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم بالعربية *</Label><Input value={catForm.name_ar} onChange={e => setCatForm({...catForm, name_ar: e.target.value})} placeholder="مثال: المشويات" /></div>
            <div><Label>الاسم بالإنجليزية</Label><Input value={catForm.name_en} onChange={e => setCatForm({...catForm, name_en: e.target.value})} placeholder="Grills" /></div>
            <div><Label>الوصف</Label><Textarea value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} rows={2} /></div>
            <div><Label>الترتيب</Label><Input type="number" value={catForm.sort_order} onChange={e => setCatForm({...catForm, sort_order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>إلغاء</Button>
            <Button onClick={handleSaveCat}>{editCat ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={v => { setShowItemDialog(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "تعديل صنف" : "إضافة صنف جديد"}</DialogTitle></DialogHeader>

          <div className="space-y-5">
            {/* Food Image */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">صورة الصنف</Label>
              <ImageUpload
                value={itemForm.image_url}
                onChange={url => setItemForm(f => ({ ...f, image_url: url }))}
                bucket="menu-items"
                aspectRatio="cover"
                placeholder="اضغط لرفع صورة الطعام"
              />
            </div>

            <Separator />

            {/* Names & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>اسم الصنف بالعربية *</Label>
                <Input value={itemForm.name_ar} onChange={e => setItemForm({...itemForm, name_ar: e.target.value})} placeholder="مثال: كبسة دجاج" />
              </div>
              <div className="sm:col-span-2">
                <Label>اسم الصنف بالإنجليزية</Label>
                <Input value={itemForm.name_en} onChange={e => setItemForm({...itemForm, name_en: e.target.value})} placeholder="Chicken Kabsa" />
              </div>
              <div className="sm:col-span-2">
                <Label>وصف الصنف</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} placeholder="وصف مختصر عن الصنف..." rows={2} />
              </div>
            </div>

            {/* Price */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>السعر (ر.ي) *</Label>
                <Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})} />
              </div>
              <div>
                <Label>سعر بعد الخصم (ر.ي)</Label>
                <Input type="number" value={itemForm.discounted_price} onChange={e => setItemForm({...itemForm, discounted_price: Number(e.target.value)})} />
              </div>
            </div>

            {/* Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>وقت التحضير (دقائق)</Label>
                <Input type="number" value={itemForm.preparation_time} onChange={e => setItemForm({...itemForm, preparation_time: Number(e.target.value)})} placeholder="15" />
              </div>
              <div>
                <Label>السعرات الحرارية</Label>
                <Input type="number" value={itemForm.calories} onChange={e => setItemForm({...itemForm, calories: Number(e.target.value)})} placeholder="450" />
              </div>
              <div>
                <Label>الترتيب في القائمة</Label>
                <Input type="number" value={itemForm.sort_order} onChange={e => setItemForm({...itemForm, sort_order: Number(e.target.value)})} />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <Label>المكونات</Label>
              <Textarea
                value={itemForm.ingredients}
                onChange={e => setItemForm({...itemForm, ingredients: e.target.value})}
                placeholder="أرز، دجاج، بهارات، زعفران (افصل بين المكونات بفاصلة)"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">افصل بين المكونات بفاصلة ( , )</p>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <Switch checked={itemForm.is_available} onCheckedChange={v => setItemForm({...itemForm, is_available: v})} />
                <div>
                  <Label className="text-sm">متاح</Label>
                  <p className="text-xs text-muted-foreground">يظهر في المنيو</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <Switch checked={itemForm.is_featured} onCheckedChange={v => setItemForm({...itemForm, is_featured: v})} />
                <div>
                  <Label className="text-sm">مميز ⭐</Label>
                  <p className="text-xs text-muted-foreground">يظهر في الأعلى</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <Switch checked={itemForm.is_popular} onCheckedChange={v => setItemForm({...itemForm, is_popular: v})} />
                <div>
                  <Label className="text-sm">الأكثر طلباً 🔥</Label>
                  <p className="text-xs text-muted-foreground">يظهر شارة شائع</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>إلغاء</Button>
            <Button onClick={handleSaveItem}>{editItem ? "تحديث الصنف" : "إضافة الصنف"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryMenuManagement;
