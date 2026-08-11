import { RefObject } from 'react';
import Icon from '@/components/ui/icon';
import { ImageItem } from './useProductMedia';

interface Props {
  images: ImageItem[];
  uploadingImage: boolean;
  imageInputRef: RefObject<HTMLInputElement>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (imageId: number) => void;
}

const ProductMediaScreenshots = ({ images, uploadingImage, imageInputRef, onImageChange, removeImage }: Props) => {
  return (
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
  );
};

export default ProductMediaScreenshots;
