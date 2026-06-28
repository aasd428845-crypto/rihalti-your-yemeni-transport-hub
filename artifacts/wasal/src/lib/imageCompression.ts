/**
 * Compresses an image File using the Canvas API.
 * - Max dimension: 1200px (preserves aspect ratio)
 * - Output format: image/webp (falls back to image/jpeg for older browsers)
 * - Quality: 0.82 — good balance between quality and file size
 * - Non-image files are returned as-is.
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = canvas.toDataURL("image/webp").startsWith("data:image/webp")
        ? "image/webp"
        : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressedName = file.name.replace(/\.[^.]+$/, "") +
            (outputType === "image/webp" ? ".webp" : ".jpg");
          resolve(new File([blob], compressedName, { type: outputType }));
        },
        outputType,
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
