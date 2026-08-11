import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

export interface ProductDraft {
  id: number;
  title: string;
  status?: string;
}

export interface ImageItem {
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

interface UseProductMediaArgs {
  product: ProductDraft | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}

export const useProductMedia = ({ product, open, onOpenChange, onSubmitted }: UseProductMediaArgs) => {
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

  return {
    images,
    uploadingImage,
    fileName,
    uploadingFile,
    uploadProgress,
    submitting,
    fileMode,
    setFileMode,
    fileLink,
    setFileLink,
    savingLink,
    imageInputRef,
    fileInputRef,
    onImageChange,
    removeImage,
    onFileChange,
    saveLink,
    isDraft,
    submit,
  };
};
