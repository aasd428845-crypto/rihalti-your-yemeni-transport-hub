import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CheckCircle } from 'lucide-react';

export default function AdminDeliveryProofs() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProofs = async () => {
      const { data } = await supabase
        .from('delivery_proof' as any)
        .select('*')
        .order('created_at', { ascending: false });
      setProofs((data as any[]) || []);
      setLoading(false);
    };
    fetchProofs();
  }, []);

  const typeLabels: Record<string, string> = { shipment: 'طرد', delivery: 'توصيل', ride: 'رحلة' };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <QrCode className="w-5 h-5" /> سجل إثباتات التسليم
      </h2>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : proofs.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد إثباتات تسليم مسجلة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>تاريخ المسح</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proofs.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell><Badge variant="outline">{typeLabels[p.order_type] || p.order_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{p.order_id?.slice(0, 8)}</TableCell>
                    <TableCell>
                      {p.barcode_scanned ? (
                        <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="w-3 h-3" />تم المسح</Badge>
                      ) : (
                        <Badge variant="outline">لم يُمسح</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{p.recipient_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.scanned_at ? new Date(p.scanned_at).toLocaleString('ar-YE') : '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{p.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
