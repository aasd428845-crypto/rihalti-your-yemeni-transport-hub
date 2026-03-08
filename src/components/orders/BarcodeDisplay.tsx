import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  barcode: string;
  orderId: string;
  orderType: string;
  showPrint?: boolean;
  size?: number;
}

export default function BarcodeDisplay({ barcode, orderId, orderType, showPrint = false, size = 160 }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const typeLabel = orderType === 'shipment' ? 'شحنة' : orderType === 'delivery' ? 'توصيل' : 'رحلة';

    printWindow.document.write(`
      <html dir="rtl">
        <head><title>باركود الطلب</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; text-align: center; padding: 40px; }
            .barcode-container { border: 2px dashed #ccc; padding: 30px; display: inline-block; border-radius: 12px; }
            .label { font-size: 14px; color: #666; margin-top: 12px; }
            .code { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-top: 8px; }
            .type { font-size: 12px; color: #999; margin-top: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div id="qr-container"></div>
            <div class="code">${barcode}</div>
            <div class="label">رقم الطلب: ${orderId.slice(0, 8)}</div>
            <div class="type">نوع الطلب: ${typeLabel}</div>
            <div class="label" style="margin-top:16px; font-size:11px; color:#e74c3c;">
              🔵 قدم هذا الباركود عند التسليم — يُمسح مرة واحدة فقط
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
          <script>
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, '${barcode}', { width: ${size} }, function() {
              document.getElementById('qr-container').appendChild(canvas);
              setTimeout(() => window.print(), 500);
            });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div ref={printRef} className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <QRCodeSVG value={barcode} size={size} level="H" />
      <p className="font-mono text-lg font-bold tracking-widest text-foreground">{barcode}</p>
      <p className="text-xs text-muted-foreground text-center">🔵 قدم هذا الباركود عند التسليم — يُمسح مرة واحدة فقط</p>
      {showPrint && (
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 mt-2">
          <Printer className="w-4 h-4" /> طباعة الباركود
        </Button>
      )}
    </div>
  );
}
