// Client-side image helpers: validation, a lightweight quality check and a compact preview
// that is small enough to keep in the scan history and embed into the PDF report.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];

export type ImageCheck = {
  preview: string; // JPEG data URL, longest side <= maxSide
  width: number;
  height: number;
  issues: Array<"lowResolution" | "tooDark" | "tooBright">;
};

export function validateImageFile(file: File): "tooLarge" | "notImage" | null {
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  const byExtension = /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.name);
  if (!(file.type ? ACCEPTED_TYPES.includes(file.type) || file.type.startsWith("image/") : byExtension)) return "notImage";
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

export async function inspectImage(file: File, maxSide = 520): Promise<ImageCheck> {
  const img = await loadImage(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Mean luminance of the central region (fundus images have a dark border by design).
  const cx = Math.round(canvas.width * 0.25);
  const cy = Math.round(canvas.height * 0.25);
  const cw = Math.max(1, Math.round(canvas.width * 0.5));
  const ch = Math.max(1, Math.round(canvas.height * 0.5));
  const data = ctx.getImageData(cx, cy, cw, ch).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 16) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const mean = sum / (data.length / 16);

  const issues: ImageCheck["issues"] = [];
  if (Math.min(width, height) < 384) issues.push("lowResolution");
  if (mean < 22) issues.push("tooDark");
  if (mean > 235) issues.push("tooBright");

  return { preview: canvas.toDataURL("image/jpeg", 0.82), width, height, issues };
}
