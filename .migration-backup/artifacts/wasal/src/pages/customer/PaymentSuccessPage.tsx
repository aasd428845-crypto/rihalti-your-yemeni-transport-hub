import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">تم إرسال طلب الدفع</h1>
        <p className="text-muted-foreground">
          تم استلام طلب الدفع الخاص بك بنجاح. سيتم مراجعة الحوالة من قبل الإدارة وإشعارك بالنتيجة.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/")} variant="outline">
            <Home className="w-4 h-4 ml-2" />
            الرئيسية
          </Button>
          <Button onClick={() => navigate("/history")}>
            طلباتي
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
