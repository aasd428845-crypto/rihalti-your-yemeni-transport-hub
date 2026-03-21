import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket: string;
  folder?: string;
  aspectRatio?: "square" | "cover" | "logo";
  placeholder?: string;
  className?: string;
}

const ImageUpload = ({ value, onChange, bucket, folder = "", aspectRatio = "square", placeholder, className = "" }: ImageUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const containerClass = {
    square: "w-32 h-32 rounded-xl",
    cover: "w-full h-40 rounded-xl",
    logo: "w-24 h-24 rounded-full",
  }[aspectRatio];

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة صالحة", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder ? folder + "/" : ""}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(urlData.publicUrl);
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`relative ${containerClass} ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`
          w-full h-full flex flex-col items-center justify-center
          border-2 border-dashed border-border rounded-[inherit]
          cursor-pointer transition-all duration-200
          hover:border-primary hover:bg-primary/5
          ${value ? "border-transparent" : ""}
          overflow-hidden relative
        `}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={clear}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">جاري الرفع...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">{placeholder || "اضغط أو اسحب صورة"}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
