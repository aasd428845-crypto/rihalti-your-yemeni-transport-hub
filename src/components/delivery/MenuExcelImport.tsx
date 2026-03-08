import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { createMenuCategory, createMenuItem } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";

interface Props {
  restaurantId: string;
  onComplete: () => void;
}

interface ParsedItem {
  category: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  price: number;
  discounted_price?: number;
  preparation_time?: number;
  calories?: number;
}

const MenuExcelImport = ({ restaurantId, onComplete }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // CSV/TSV parsing (simple approach, also works for Excel saved as CSV)
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setError("الملف فارغ أو لا يحتوي على بيانات كافية"); return; }

    // First line is header
    const headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
    const catIdx = headers.findIndex(h => h.includes("فئة") || h.includes("category") || h.includes("cat"));
    const nameArIdx = headers.findIndex(h => h.includes("اسم") || h.includes("name_ar") || h.includes("name"));
    const nameEnIdx = headers.findIndex(h => h.includes("english") || h.includes("name_en"));
    const descIdx = headers.findIndex(h => h.includes("وصف") || h.includes("desc"));
    const priceIdx = headers.findIndex(h => h.includes("سعر") || h.includes("price"));
    const discIdx = headers.findIndex(h => h.includes("خصم") || h.includes("discount"));
    const prepIdx = headers.findIndex(h => h.includes("تحضير") || h.includes("prep"));
    const calIdx = headers.findIndex(h => h.includes("سعر") || h.includes("cal"));

    if (nameArIdx === -1 || priceIdx === -1) {
      setError("يجب أن يحتوي الملف على أعمدة 'اسم' و 'سعر' على الأقل");
      return;
    }

    const items: ParsedItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,\t]/).map(c => c.trim());
      const price = parseFloat(cols[priceIdx]);
      if (isNaN(price) || !cols[nameArIdx]) continue;
      items.push({
        category: catIdx >= 0 ? cols[catIdx] || "عام" : "عام",
        name_ar: cols[nameArIdx],
        name_en: nameEnIdx >= 0 ? cols[nameEnIdx] : undefined,
        description: descIdx >= 0 ? cols[descIdx] : undefined,
        price,
        discounted_price: discIdx >= 0 ? parseFloat(cols[discIdx]) || undefined : undefined,
        preparation_time: prepIdx >= 0 ? parseInt(cols[prepIdx]) || undefined : undefined,
        calories: calIdx >= 0 ? parseInt(cols[calIdx]) || undefined : undefined,
      });
    }

    if (items.length === 0) { setError("لم يتم العثور على أصناف صالحة في الملف"); return; }
    setParsed(items);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      // Group by category
      const categories = [...new Set(parsed.map(p => p.category))];
      const catMap: Record<string, string> = {};

      for (const catName of categories) {
        const cat = await createMenuCategory({ restaurant_id: restaurantId, name_ar: catName, sort_order: 0 });
        catMap[catName] = cat.id;
      }

      for (const item of parsed) {
        await createMenuItem({
          restaurant_id: restaurantId,
          category_id: catMap[item.category],
          name_ar: item.name_ar,
          name_en: item.name_en || null,
          description: item.description || null,
          price: item.price,
          discounted_price: item.discounted_price || null,
          preparation_time: item.preparation_time || null,
          calories: item.calories || null,
          is_available: true,
          sort_order: 0,
        });
      }

      toast({ title: `تم استيراد ${parsed.length} صنف في ${categories.length} فئة بنجاح! 🎉` });
      setOpen(false);
      setParsed([]);
      onComplete();
    } catch (err: any) {
      toast({ title: "خطأ أثناء الاستيراد", description: err.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const categoryGroups = parsed.reduce<Record<string, ParsedItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <FileSpreadsheet className="w-4 h-4" /> استيراد من ملف
      </Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setParsed([]); setError(""); } }}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>استيراد المنيو من ملف</DialogTitle></DialogHeader>

          {parsed.length === 0 ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">اختر ملف CSV أو Excel (محفوظ كـ CSV)</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
                <Button onClick={() => fileRef.current?.click()}>اختيار ملف</Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-bold">تنسيق الملف المطلوب:</p>
                <p>يجب أن يحتوي على أعمدة (مفصولة بفاصلة أو Tab):</p>
                <code className="block bg-background p-2 rounded text-xs">فئة,اسم,english,وصف,سعر,خصم,تحضير,سعرات</code>
                <p className="text-muted-foreground">الأعمدة المطلوبة: <strong>اسم</strong> و <strong>سعر</strong> فقط. الباقي اختياري.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">تم تحليل {parsed.length} صنف في {Object.keys(categoryGroups).length} فئة</span>
              </div>
              {Object.entries(categoryGroups).map(([cat, items]) => (
                <div key={cat}>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Badge>{cat}</Badge> <span className="text-muted-foreground">({items.length} صنف)</span>
                  </h4>
                  <div className="grid gap-1 text-xs">
                    {items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex justify-between bg-muted/30 p-2 rounded">
                        <span>{item.name_ar}</span>
                        <span className="font-bold">{item.price} ر.ي</span>
                      </div>
                    ))}
                    {items.length > 5 && <p className="text-muted-foreground text-center">... و {items.length - 5} أصناف أخرى</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setParsed([]); setError(""); }}>إعادة اختيار</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "جاري الاستيراد..." : `استيراد ${parsed.length} صنف`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MenuExcelImport;
