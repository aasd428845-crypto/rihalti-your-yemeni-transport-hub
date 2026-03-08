import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { getMenuItemOptions, createMenuItemOption, updateMenuItemOption, deleteMenuItemOption } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";

interface Choice {
  name_ar: string;
  name_en?: string;
  price: number;
}

interface Props {
  menuItemId: string;
  menuItemName: string;
}

const MenuItemOptionsManager = ({ menuItemId, menuItemName }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editOption, setEditOption] = useState<any>(null);
  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    option_type: "single",
    is_required: false,
    max_selections: 1,
    choices: [{ name_ar: "", price: 0 }] as Choice[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMenuItemOptions(menuItemId);
      setOptions(data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const resetForm = () => {
    setForm({ name_ar: "", name_en: "", option_type: "single", is_required: false, max_selections: 1, choices: [{ name_ar: "", price: 0 }] });
    setEditOption(null);
  };

  const addChoice = () => setForm(f => ({ ...f, choices: [...f.choices, { name_ar: "", price: 0 }] }));
  const removeChoice = (i: number) => setForm(f => ({ ...f, choices: f.choices.filter((_, idx) => idx !== i) }));
  const updateChoice = (i: number, field: keyof Choice, value: any) => {
    setForm(f => ({ ...f, choices: f.choices.map((c, idx) => idx === i ? { ...c, [field]: value } : c) }));
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) return;
    const validChoices = form.choices.filter(c => c.name_ar.trim());
    if (validChoices.length === 0) { toast({ title: "أضف خياراً واحداً على الأقل", variant: "destructive" }); return; }

    try {
      const payload = {
        menu_item_id: menuItemId,
        name_ar: form.name_ar,
        name_en: form.name_en || null,
        option_type: form.option_type,
        is_required: form.is_required,
        max_selections: form.max_selections,
        choices: validChoices,
      };
      if (editOption) {
        await updateMenuItemOption(editOption.id, payload);
        toast({ title: "تم تحديث الخيار" });
      } else {
        await createMenuItemOption(payload);
        toast({ title: "تمت إضافة الخيار" });
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItemOption(id);
      toast({ title: "تم حذف الخيار" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (opt: any) => {
    setEditOption(opt);
    setForm({
      name_ar: opt.name_ar,
      name_en: opt.name_en || "",
      option_type: opt.option_type || "single",
      is_required: opt.is_required || false,
      max_selections: opt.max_selections || 1,
      choices: (opt.choices as Choice[]) || [{ name_ar: "", price: 0 }],
    });
    setShowForm(true);
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen(true)}>
        <Settings2 className="w-3 h-3" /> خيارات
      </Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { resetForm(); setShowForm(false); } }}>
        <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>خيارات إضافية - {menuItemName}</DialogTitle>
          </DialogHeader>

          {!showForm ? (
            <div className="space-y-3">
              <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full gap-2">
                <Plus className="w-4 h-4" /> إضافة مجموعة خيارات
              </Button>

              {loading ? (
                <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>
              ) : options.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">لا توجد خيارات إضافية</div>
              ) : (
                options.map(opt => (
                  <Card key={opt.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{opt.name_ar}</span>
                          {opt.is_required && <Badge variant="destructive" className="text-xs">مطلوب</Badge>}
                          <Badge variant="outline" className="text-xs">{opt.option_type === "single" ? "اختيار واحد" : "اختيار متعدد"}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(opt)}><Edit className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(opt.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {((opt.choices as Choice[]) || []).map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {c.name_ar} {c.price > 0 && `(+${c.price} ر.ي)`}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div><Label>اسم المجموعة (عربي) *</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="مثل: الحجم، الإضافات" /></div>
              <div><Label>اسم المجموعة (إنجليزي)</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={v => setForm({ ...form, is_required: v })} /><Label>مطلوب</Label></div>
                <div className="flex items-center gap-2">
                  <Label>النوع:</Label>
                  <select value={form.option_type} onChange={e => setForm({ ...form, option_type: e.target.value })} className="border rounded px-2 py-1 text-sm bg-background">
                    <option value="single">اختيار واحد</option>
                    <option value="multiple">اختيار متعدد</option>
                  </select>
                </div>
                {form.option_type === "multiple" && (
                  <div className="flex items-center gap-2">
                    <Label>الحد الأقصى:</Label>
                    <Input type="number" value={form.max_selections} onChange={e => setForm({ ...form, max_selections: Number(e.target.value) })} className="w-20" />
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">الخيارات:</Label>
                {form.choices.map((choice, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <Input value={choice.name_ar} onChange={e => updateChoice(i, "name_ar", e.target.value)} placeholder="اسم الخيار" className="flex-1" />
                    <Input type="number" value={choice.price} onChange={e => updateChoice(i, "price", Number(e.target.value))} placeholder="سعر إضافي" className="w-24" />
                    {form.choices.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeChoice(i)}><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addChoice} className="gap-1"><Plus className="w-3 h-3" /> إضافة خيار</Button>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>رجوع</Button>
                <Button onClick={handleSave}>{editOption ? "تحديث" : "حفظ"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MenuItemOptionsManager;
