import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Clock, DollarSign, Bus, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDistinctBusCompanies } from "@/lib/customerApi";
import RegionSelector from "@/components/regions/RegionSelector";
import type { TripSearchParams } from "@/types/customer.types";

interface TripFiltersProps {
  regions: any[];
  onFilter: (params: TripSearchParams) => void;
  initialParams?: TripSearchParams;
}

const TripFilters = ({ regions, onFilter, initialParams }: TripFiltersProps) => {
  const [fromCity, setFromCity] = useState(initialParams?.from_city || "");
  const [toCity, setToCity] = useState(initialParams?.to_city || "");
  const [date, setDate] = useState(initialParams?.date || "");
  const [period, setPeriod] = useState(initialParams?.period || "");
  const [minPrice, setMinPrice] = useState(initialParams?.min_price?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(initialParams?.max_price?.toString() || "");
  const [busCompany, setBusCompany] = useState(initialParams?.bus_company || "");
  const [busCompanies, setBusCompanies] = useState<string[]>([]);

  useEffect(() => {
    fetchDistinctBusCompanies().then(setBusCompanies).catch(() => {});
  }, []);

  const allRegions = regions || [];

  const applyFilters = () => {
    onFilter({
      from_city: fromCity || undefined,
      to_city: toCity || undefined,
      date: date || undefined,
      period: period || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      bus_company: busCompany || undefined,
    });
  };

  const clearFilters = () => {
    setFromCity("");
    setToCity("");
    setDate("");
    setPeriod("");
    setMinPrice("");
    setMaxPrice("");
    setBusCompany("");
    onFilter({});
  };

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="w-4 h-4" />
          تصفية النتائج
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From */}
        <RegionSelector
          regions={allRegions}
          label="من"
          placeholder="مدينة الانطلاق"
          mode="single"
          value={fromCity}
          onValueChange={setFromCity}
          filterTypes={["governorate", "city"]}
          allowCustom={false}
        />

        {/* To */}
        <RegionSelector
          regions={allRegions}
          label="إلى"
          placeholder="مدينة الوصول"
          mode="single"
          value={toCity}
          onValueChange={setToCity}
          filterTypes={["governorate", "city"]}
          allowCustom={false}
        />

        {/* Date */}
        <div>
          <Label className="text-xs mb-1 block">التاريخ</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
        </div>

        {/* Period */}
        <div>
          <Label className="text-xs mb-1 block">الفترة</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="morning">صباحاً</SelectItem>
              <SelectItem value="evening">مساءً</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div>
          <Label className="text-xs mb-1 block">نطاق السعر (ر.ي)</Label>
          <div className="flex gap-2">
            <Input type="number" placeholder="من" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
            <Input type="number" placeholder="إلى" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
          </div>
        </div>

        {/* Bus Company */}
        {busCompanies.length > 0 && (
          <div>
            <Label className="text-xs mb-1 block">شركة النقل</Label>
            <Select value={busCompany} onValueChange={setBusCompany}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="الكل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {busCompanies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={applyFilters} className="w-full gap-2">
            <Search className="w-4 h-4" />
            بحث
          </Button>
          <Button variant="ghost" onClick={clearFilters} className="w-full gap-2 text-muted-foreground">
            <X className="w-4 h-4" />
            مسح الفلاتر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripFilters;
