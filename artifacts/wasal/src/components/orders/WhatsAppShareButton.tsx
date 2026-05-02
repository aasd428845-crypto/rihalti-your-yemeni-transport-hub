import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { generateWhatsAppMessage, logWhatsAppShare, OrderType } from '@/lib/orderApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Props {
  order: any;
  orderType: OrderType;
  riders?: { id: string; full_name: string; phone: string }[];
}

export default function WhatsAppShareButton({ order, orderType, riders = [] }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [driverPhone, setDriverPhone] = useState('');
  const [selectedRider, setSelectedRider] = useState('');

  const handleSend = async () => {
    const phone = selectedRider || driverPhone;
    if (!phone) {
      toast({ title: 'يرجى إدخال رقم السائق', variant: 'destructive' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const message = generateWhatsAppMessage(order, orderType);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Log the action
    if (user) {
      await logWhatsAppShare(user.id, order.id, orderType, cleanPhone, message);
    }

    window.open(url, '_blank');
    setOpen(false);
    toast({ title: 'تم فتح واتساب ✅', description: 'تم تسجيل عملية المشاركة' });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
        <MessageCircle className="w-4 h-4" /> إرسال للسائق عبر واتساب
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إرسال تفاصيل الطلب للسائق</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              سيتم إرسال تفاصيل الطلب بدون السعر عبر واتساب
            </p>

            {riders.length > 0 && (
              <div>
                <Label>اختر سائق من القائمة</Label>
                <select
                  className="w-full mt-1 p-2 border border-input rounded-md bg-background text-foreground"
                  value={selectedRider}
                  onChange={(e) => { setSelectedRider(e.target.value); setDriverPhone(''); }}
                >
                  <option value="">— اختر سائق —</option>
                  {riders.map(r => (
                    <option key={r.id} value={r.phone}>{r.full_name} - {r.phone}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label>أو أدخل رقم السائق يدوياً</Label>
              <Input
                placeholder="مثال: 967777123456"
                value={driverPhone}
                onChange={(e) => { setDriverPhone(e.target.value); setSelectedRider(''); }}
                className="mt-1"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">معاينة الرسالة:</p>
              <pre className="whitespace-pre-wrap font-sans">{generateWhatsAppMessage(order, orderType)}</pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend} className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4" /> إرسال عبر واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
