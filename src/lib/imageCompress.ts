// ========================================================
// RESİM KÜÇÜLTME (yüklemeden önce, tarayıcıda)
// Telefon fotoğrafı (3–5 MB) ~200–400 KB olur; defter yazısı okunur kalır.
// Yeniden çizim EXIF bilgisini (konum dahil) de siler.
// Küçültülemeyen ya da küçülmeyen dosya olduğu gibi döner; sunucudaki sınırlar yine geçerlidir.
// ========================================================

/** Kişisel alan (Dosyalarım + tahta + soru görselleri) dolunca gösterilen mesaj */
export const QUOTA_FULL_MESSAGE = 'Depolama alanınız dolu (100 MB). Dosyalarım sayfasından kullanmadığınız dosyaları silerek yer açın.';

/** Küçültülebilen türler (GIF animasyonu bozulmasın diye hariç) */
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Uzun kenar (piksel) */
export const IMAGE_MAX_SIDE = 1600;
const QUALITY = 0.8;
/** Zaten küçük ve ölçüsü uygun resme dokunulmaz */
const SKIP_BELOW_BYTES = 300 * 1024;
/** Küçültülecek resim seçilirken kabul edilen en büyük ham boyut */
export const RAW_IMAGE_MAX_BYTES = 30 * 1024 * 1024;

const extOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Dosya türü tarayıcıdan gelmezse uzantıya bakılır */
export function isCompressibleImage(file: File): boolean {
  if (COMPRESSIBLE.includes(file.type)) return true;
  return !file.type && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extOf(file.name));
}

const renameExt = (name: string, ext: string) => {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name}.${ext}`;
};

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

export async function compressImage(file: File, maxSide = IMAGE_MAX_SIDE): Promise<File> {
  if (typeof document === 'undefined' || !isCompressibleImage(file)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // tarayıcı çözemedi (ör. HEIC); olduğu gibi yüklenir
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Önce WEBP (saydamlığı korur); tarayıcı WEBP üretemiyorsa beyaz zeminli JPEG
    ctx.drawImage(bitmap, 0, 0, w, h);
    let blob = await toBlob(canvas, 'image/webp');
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      blob = await toBlob(canvas, 'image/jpeg');
      ext = 'jpg';
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], renameExt(file.name, ext), { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** Sırayla küçültür (aynı anda çok büyük resim belleği doldurmasın) */
export async function compressImages(files: File[], maxSide = IMAGE_MAX_SIDE): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) out.push(await compressImage(f, maxSide));
  return out;
}
