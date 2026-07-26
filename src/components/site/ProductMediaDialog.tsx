import { useRef, useState } from 'react';
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

const ProductMediaDialog = ({ product, open, onOpenChange, onSubmitted }: Props) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImages([]);
    setFileName(null);
  };

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

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['zip', 'rar', '7z'].includes(ext || '')) {
      toast.error('Поддерживаются архивы ZIP, RAR, 7Z');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 50 МБ)');
      return;
    }
    setUploadingFile(true);
    try {
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
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось загрузить файл');
        return;
      }
      setFileName(data.fileName);
      toast.success('Файл товара загружен');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!product) return;
    if (images.length === 0) {
      toast.error('Загрузите хотя бы один скриншот');
      return;
    }
    if (!fileName) {
      toast.error('Загрузите файл товара (архив)');
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
            Добавьте скриншоты и файл товара, затем отправьте на модерацию.
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
            <p className="text-sm font-medium text-foreground">Файл товара (архив)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.rar,.7z"
              className="hidden"
              onChange={onFileChange}
            />
            {fileName ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-green/40 bg-brand-green/5 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Icon name="FileArchive" size={16} className="text-brand-green" />
                  {fileName}
                </span>
                <Icon name="Check" size={16} className="text-brand-green" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-5 text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan disabled:opacity-60"
              >
                <Icon name={uploadingFile ? 'Loader2' : 'FileUp'} size={20} className={uploadingFile ? 'animate-spin' : ''} />
                <span className="text-xs">{uploadingFile ? 'Загрузка…' : 'Загрузить ZIP / RAR / 7Z, до 50 МБ'}</span>
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2.5 font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            Позже
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Send" size={15} />
            Отправить на модерацию
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductMediaDialog;
