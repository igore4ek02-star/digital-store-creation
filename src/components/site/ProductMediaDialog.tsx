import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface ProductDraft {
  id: number;
  title: string;
  status?: string;
}

interface Props {
  product: ProductDraft | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}

interface ImageItem {
  id: number;
  url: string;
}

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Authorization': `Bearer ${getAuthToken()}`,
});

const CHUNK_SIZE = 5 * 1024 * 1024;
const DIRECT_UPLOAD_LIMIT = CHUNK_SIZE;

const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Сервер вернул некорректный ответ (код ${res.status})` };
  }
};

const readSliceAsBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const ProductMediaDialog = ({ product, open, onOpenChange, onSubmitted }: Props) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fileMode, setFileMode] = useState<'upload' | 'link'>('upload');
  const [fileLink, setFileLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImages([]);
    setFileName(null);
    setFileMode('upload');
    setFileLink('');
  };

  useEffect(() => {
    if (!product || !open) return;
    fetch(`${API.products}?id=${product.id}`, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.product) {
          setImages(d.product.imageIds || []);
          setFileName(d.product.fileName || null);
          if (d.product.fileSource === 'link') {
            setFileMode('link');
            setFileLink(d.product.fileUrl || '');
          } else {
            setFileMode('upload');
            setFileLink('');
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, open]);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !product) return;
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          toast.error(`${file.name}: поддерживаются PNG, JPEG, WEBP`);
          continue;
        }
        if (file.size > 3 * 1024 * 1024) {
          toast.error(`${file.name}: файл слишком большой (максимум 3 МБ)`);
          continue;
        }
        const base64 = await readAsBase64(file);
        const res = await fetch(API.products, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ action: 'upload-image', productId: product.id, image: base64 }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Не удалось загрузить ${file.name}`);
          continue;
        }
        setImages((prev) => [...prev, data.image]);
      }
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeImage = async (imageId: number) => {
    await fetch(API.products, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'remove-image', imageId }),
    });
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  const uploadFileChunked = async (file: File) => {
    if (!product) return;
    const initRes = await fetch(API.products, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'upload-file-init', productId: product.id, fileName: file.name }),
    });
    const initData = await parseJsonSafe(initRes);
    if (!initRes.ok) {
      toast.error(initData.error || 'Не удалось начать загрузку файла');
      return;
    }
    const { uploadId, key } = initData;

    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: { partNumber: number; etag: string }[] = [];
    try {
      for (let i = 0; i < totalParts; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);
        const base64 = await readSliceAsBase64(blob);
        const partRes = await fetch(API.products, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            action: 'upload-file-part',
            uploadId,
            key,
            partNumber: i + 1,
            data: base64,
          }),
        });
        const partData = await parseJsonSafe(partRes);
        if (!partRes.ok) {
          throw new Error(partData.error || `Не удалось загрузить часть файла (${i + 1}/${totalParts})`);
        }
        parts.push({ partNumber: partData.partNumber, etag: partData.etag });
        setUploadProgress(Math.round(((i + 1) / totalParts) * 100));
      }

      const completeRes = await fetch(API.products, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'upload-file-complete',
          productId: product.id,
          uploadId,
          key,
          parts,
          fileName: file.name,
        }),
      });
      const completeData = await parseJsonSafe(completeRes);
      if (!completeRes.ok) {
        throw new Error(completeData.error || 'Не удалось завершить загрузку файла');
      }
      setFileName(completeData.fileName);
      toast.success('Файл товара загружен');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить файл');
      await fetch(API.products, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'upload-file-abort', uploadId, key }),
      }).catch(() => {});
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['zip', 'rar', '7z'].includes(ext || '')) {
      toast.error('Поддерживаются архивы ZIP, RAR, 7Z');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 200 МБ)');
      return;
    }
    setUploadingFile(true);
    setUploadProgress(0);
    try {
      if (file.size > DIRECT_UPLOAD_LIMIT) {
        await uploadFileChunked(file);
      } else {
        const base64 = await readAsBase64(file);
        const res = await fetch(API.products, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            action: 'upload-file',
            productId: product.id,
            file: base64,
            fileName: file.name,
          }),
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          toast.error(data.error || 'Не удалось загрузить файл');
          return;
        }
        setFileName(data.fileName);
        toast.success('Файл товара загружен');
      }
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveLink = async () => {
    if (!product) return;
    const link = fileLink.trim();
    if (!link) {
      toast.error('Введите ссылку на файл');
      return;
    }
    setSavingLink(true);
    try {
      const res = await fetch(API.products, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'set-file-link', productId: product.id, link }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось сохранить ссылку');
        return;
      }
      setFileName(data.fileName);
      toast.success('Ссылка на файл сохранена');
    } finally {
      setSavingLink(false);
    }
  };

  const isDraft = !product?.status || product.status === 'draft';

  const submit = async () => {
    if (!product) return;
    if (images.length === 0) {
      toast.error('Загрузите хотя бы один скриншот');
      return;
    }
    if (!fileName) {
      toast.error(fileMode === 'link' ? 'Укажите и сохраните ссылку на файл' : 'Загрузите файл товара (архив)');
      return;
    }

    if (!isDraft) {
      reset();
      onOpenChange(false);
      onSubmitted();
      toast.success('Медиафайлы обновлены');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API.products, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'submit-for-moderation', productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось отправить на модерацию');
        return;
      }
      toast.success(
        data.product?.status === 'approved'
          ? 'Товар опубликован в каталоге'
          : 'Товар отправлен на модерацию',
      );
      reset();
      onOpenChange(false);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-head uppercase tracking-wide">
            «{product.title}» — медиафайлы
          </DialogTitle>
          <DialogDescription>
            {isDraft
              ? 'Добавьте скриншоты и файл товара, затем отправьте на модерацию.'
              : 'Обновите скриншоты или файл товара.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Скриншоты</p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={onImageChange}
            />
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={img.url} alt="" className="aspect-video w-full object-cover" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Удалить"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-5 text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan disabled:opacity-60"
            >
              <Icon name={uploadingImage ? 'Loader2' : 'ImagePlus'} size={20} className={uploadingImage ? 'animate-spin' : ''} />
              <span className="text-xs">{uploadingImage ? 'Загрузка…' : 'Добавить скриншоты (можно несколько)'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Файл товара</p>
            <div className="flex gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setFileMode('upload')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                  fileMode === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Архив
              </button>
              <button
                type="button"
                onClick={() => setFileMode('link')}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                  fileMode === 'link'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ссылка
              </button>
            </div>

            {fileMode === 'upload' ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.rar,.7z"
                  className="hidden"
                  onChange={onFileChange}
                />
                {fileName && !uploadingFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand-green/40 bg-brand-green/5 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Icon name="FileArchive" size={16} className="text-brand-green" />
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-brand-cyan transition-colors hover:underline"
                    >
                      Заменить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-5 text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan disabled:opacity-60"
                  >
                    <Icon name={uploadingFile ? 'Loader2' : 'FileUp'} size={20} className={uploadingFile ? 'animate-spin' : ''} />
                    <span className="text-xs">
                      {uploadingFile ? `Загрузка… ${uploadProgress > 0 ? `${uploadProgress}%` : ''}` : 'Загрузить ZIP / RAR / 7Z, до 200 МБ'}
                    </span>
                    {uploadingFile && uploadProgress > 0 && (
                      <div className="mt-1 h-1.5 w-2/3 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-brand-cyan transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  После оплаты покупатель получит эту ссылку для скачивания файла с внешнего источника.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={fileLink}
                    onChange={(e) => setFileLink(e.target.value)}
                    placeholder="https://example.com/file.zip"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={saveLink}
                    disabled={savingLink}
                    className="shrink-0 rounded-md bg-primary px-3.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    Сохранить
                  </button>
                </div>
                {fileName && fileMode === 'link' && (
                  <div className="flex items-center gap-2 rounded-lg border border-brand-green/40 bg-brand-green/5 px-4 py-3">
                    <Icon name="Link" size={16} className="text-brand-green" />
                    <span className="truncate text-sm text-foreground">{fileLink}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2.5 font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {isDraft ? 'Позже' : 'Закрыть'}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name={isDraft ? 'Send' : 'Check'} size={15} />
            {isDraft ? 'Отправить на модерацию' : 'Сохранить'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductMediaDialog;