import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmModal from "@/components/admin/common/ConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DELETE_CONFIRM_TEXT = "حذف حسابي";

const DeleteAccountButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== DELETE_CONFIRM_TEXT) {
      toast({ title: "يرجى كتابة نص التأكيد بشكل صحيح", variant: "destructive" });
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        return;
      }

      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;

      await supabase.auth.signOut();
      navigate("/login");
      toast({ title: "تم حذف حسابك بنجاح" });
    } catch (err: any) {
      toast({ title: "فشل حذف الحساب", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowConfirm(false);
      setConfirmText("");
    }
  };

  return (
    <>
      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            حذف الحساب نهائياً سيؤدي إلى إزالة جميع بياناتك من المنصة بشكل لا رجعة فيه.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 ml-2" />
            {deleting ? "جاري الحذف..." : "حذف الحساب نهائياً"}
          </Button>
        </CardContent>
      </Card>

      {showConfirm && (
        <ConfirmModal
          open={showConfirm}
          onOpenChange={(open) => { setShowConfirm(open); if (!open) setConfirmText(""); }}
          title="⚠️ تأكيد حذف الحساب"
          description=""
          confirmLabel={deleting ? "جاري الحذف..." : "حذف نهائياً"}
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          {/* The ConfirmModal handles the dialog, but we add a text input via a separate approach */}
        </div>
      )}
    </>
  );
};

export default DeleteAccountButton;
