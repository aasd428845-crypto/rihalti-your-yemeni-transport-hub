import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Region {
  id: number;
  name_ar: string;
  type: string;
  parent_id: number | null;
}

interface RegionSelectorProps {
  regions: Region[];
  label?: string;
  placeholder?: string;
  /** Single select mode - returns one region */
  mode?: "single" | "multi";
  /** For single mode */
  value?: string;
  onValueChange?: (value: string) => void;
  /** For multi mode */
  selectedIds?: number[];
  onSelectedIdsChange?: (ids: number[]) => void;
  /** Filter to specific parent (e.g. Yemen governorates only) */
  parentId?: number;
  /** Filter to specific types */
  filterTypes?: string[];
  /** Show manual input option */
  allowCustom?: boolean;
  /** Required field */
  required?: boolean;
  className?: string;
}

const RegionSelector = ({
  regions,
  label,
  placeholder = "اختر المنطقة",
  mode = "single",
  value,
  onValueChange,
  selectedIds = [],
  onSelectedIdsChange,
  parentId,
  filterTypes,
  allowCustom = true,
  required = false,
  className,
}: RegionSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter regions
  let filtered = regions;
  if (parentId !== undefined) {
    filtered = filtered.filter((r) => r.parent_id === parentId);
  }
  if (filterTypes && filterTypes.length > 0) {
    filtered = filtered.filter((r) => filterTypes.includes(r.type));
  }

  const handleSubmitCustom = async () => {
    if (!customName.trim() || !user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("custom_regions").insert({
        name_ar: customName.trim(),
        parent_region_id: parentId || null,
        submitted_by: user.id,
      });
      if (error) throw error;
      toast({ title: "✅ تم إرسال المنطقة للمراجعة" });

      if (mode === "single" && onValueChange) {
        onValueChange(customName.trim());
      }
      setCustomName("");
      setShowCustomInput(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (mode === "multi") {
    // Group by parent for display
    const parentIds = [...new Set(filtered.map((r) => r.parent_id))];
    const parents = parentIds.map((pid) => {
      const parent = regions.find((r) => r.id === pid);
      return { id: pid, name: parent?.name_ar || "أخرى", children: filtered.filter((r) => r.parent_id === pid) };
    });

    const toggle = (id: number) => {
      const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
      onSelectedIdsChange?.(next);
    };

    return (
      <div className={className}>
        {label && (
          <Label className="flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 text-primary" /> {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {selectedIds.map((id) => {
              const r = regions.find((reg) => reg.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(id)}>
                  {r?.name_ar || id}
                  <X className="w-3 h-3" />
                </Badge>
              );
            })}
          </div>
        )}

        {parents.map((group) => (
          <div key={group.id ?? "none"} className="mb-3">
            {group.name && <p className="text-xs font-semibold text-primary mb-1">{group.name}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {group.children.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded border transition-colors ${
                    selectedIds.includes(r.id) ? "bg-primary/10 border-primary" : "border-transparent hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    className="rounded border-input"
                  />
                  <span>{r.name_ar}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {allowCustom && (
          <div className="mt-3 border-t pt-3">
            {!showCustomInput ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomInput(true)} className="gap-1 text-primary">
                <Plus className="w-3 h-3" /> إضافة منطقة يدوياً
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="اسم المنطقة"
                  className="text-sm"
                />
                <Button type="button" size="sm" onClick={handleSubmitCustom} disabled={submitting || !customName.trim()}>
                  إرسال
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {required && selectedIds.length === 0 && (
          <p className="text-xs text-destructive mt-1">يجب اختيار منطقة واحدة على الأقل</p>
        )}
      </div>
    );
  }

  // Single mode
  return (
    <div className={className}>
      {label && (
        <Label className="flex items-center gap-1 mb-1.5">
          <MapPin className="w-3 h-3 text-primary" /> {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {!showCustomInput ? (
        <div className="flex gap-2">
          <Select value={value} onValueChange={(v) => {
            if (v === "__custom") {
              setShowCustomInput(true);
              return;
            }
            onValueChange?.(v);
          }}>
            <SelectTrigger className="flex-1 text-sm">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((r) => (
                <SelectItem key={r.id} value={r.name_ar}>
                  {r.name_ar}
                </SelectItem>
              ))}
              {allowCustom && (
                <SelectItem value="__custom">
                  <span className="flex items-center gap-1 text-primary">
                    <Plus className="w-3 h-3" /> إضافة منطقة يدوياً
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="اسم المنطقة"
            className="text-sm flex-1"
          />
          <Button type="button" size="sm" onClick={handleSubmitCustom} disabled={submitting || !customName.trim()}>
            إرسال
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomInput(false); setCustomName(""); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegionSelector;
