import { ImagePlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/context";

/** Shrinks phone photos in the browser, so uploads are quick on mobile data and stay under the 5MB limit. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))), "image/webp", 0.82),
  );
}

export function ImageUploader({ images, onChange, max = 5 }: { images: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let next = images;
    try {
      for (const file of [...files].slice(0, max - images.length)) {
        const blob = await shrink(file).catch(() => { throw new Error(`${file.name} couldn't be read. Please use a JPG, PNG or WebP photo.`); });
        const form = new FormData();
        form.append("file", blob, "photo.webp");
        const { url } = await api<{ url: string }>("/api/uploads", { form });
        next = [...next, url];
        onChange(next);
      }
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((src, i) => (
        <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-line">
          <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
          <button type="button" onClick={() => onChange(images.filter((u) => u !== src))} aria-label={`Remove photo ${i + 1}`}
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {images.length < max && (
        <label className="grid size-20 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-muted transition-colors hover:border-brand hover:text-fg">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="sr-only">Add photos</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy}
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}
