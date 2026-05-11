import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

      <Dialog open={showConfirm} onOpenChange={(open) => { setShowConfirm(open); if (!open) setConfirmText(""); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>⚠️ تأكيد حذف الحساب</DialogTitle>
            <DialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. اكتب <strong className="text-destructive">{DELETE_CONFIRM_TEXT}</strong> للتأكيد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete">نص التأكيد</Label>
            <Input
              id="confirm-delete"
              placeholder={DELETE_CONFIRM_TEXT}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              dir="rtl"
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmText !== DELETE_CONFIRM_TEXT}
            >
              {deleting ? "جاري الحذف..." : "حذف نهائياً"}
            </Button>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteAccountButton;
