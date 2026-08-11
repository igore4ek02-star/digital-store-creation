import { RefObject } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  fileMode: 'upload' | 'link';
  setFileMode: (mode: 'upload' | 'link') => void;
  fileName: string | null;
  uploadingFile: boolean;
  uploadProgress: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileLink: string;
  setFileLink: (v: string) => void;
  savingLink: boolean;
  saveLink: () => void;
}

const ProductMediaFileUpload = ({
  fileMode,
  setFileMode,
  fileName,
  uploadingFile,
  uploadProgress,
  fileInputRef,
  onFileChange,
  fileLink,
  setFileLink,
  savingLink,
  saveLink,
}: Props) => {
  return (
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
  );
};

export default ProductMediaFileUpload;
