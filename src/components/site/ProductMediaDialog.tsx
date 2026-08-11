import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useProductMedia, ProductDraft } from './product-media/useProductMedia';
import ProductMediaScreenshots from './product-media/ProductMediaScreenshots';
import ProductMediaFileUpload from './product-media/ProductMediaFileUpload';

interface Props {
  product: ProductDraft | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}

const ProductMediaDialog = ({ product, open, onOpenChange, onSubmitted }: Props) => {
  const {
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
  } = useProductMedia({ product, open, onOpenChange, onSubmitted });

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
          <ProductMediaScreenshots
            images={images}
            uploadingImage={uploadingImage}
            imageInputRef={imageInputRef}
            onImageChange={onImageChange}
            removeImage={removeImage}
          />

          <ProductMediaFileUpload
            fileMode={fileMode}
            setFileMode={setFileMode}
            fileName={fileName}
            uploadingFile={uploadingFile}
            uploadProgress={uploadProgress}
            fileInputRef={fileInputRef}
            onFileChange={onFileChange}
            fileLink={fileLink}
            setFileLink={setFileLink}
            savingLink={savingLink}
            saveLink={saveLink}
          />
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
