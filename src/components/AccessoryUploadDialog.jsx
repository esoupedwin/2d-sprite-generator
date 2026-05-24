import { useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export function AccessoryUploadDialog({ open, onClose, onPick, currentImage }) {
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { onPick(reader.result); onClose(); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessory-upload-title"
        className="relative w-[400px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="accessory-upload-title" className="text-sm font-semibold text-foreground">
            Upload Right Arm Accessory PNG
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Upload a PNG for your character's right arm accessory. The image is drawn
            <strong className="text-foreground"> centered on its anchor point</strong>, which is
            attached to joint 6 (dominant hand). Use the <strong className="text-foreground">Edit Animation</strong> mode
            to drag the anchor and rotation handle to position it anywhere on the character.
          </p>

          {currentImage && (
            <div className="flex items-center justify-center py-2 bg-secondary/40 rounded-md border border-border">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</span>
                <img
                  src={currentImage}
                  alt="Current accessory"
                  className="max-w-[100px] max-h-[120px] object-contain rounded border border-border bg-background/40"
                />
              </div>
            </div>
          )}

          <ul className="text-[11px] text-muted-foreground/80 list-disc list-inside space-y-0.5">
            <li>Transparent PNG recommended.</li>
            <li>Longest side scales to ~80 units; drag the anchor in Edit Animation to reposition.</li>
            <li>The right arm accessory moves with joint 6 (dominant hand) by default.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Choose PNG…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handlePick}
          />
        </div>
      </div>
    </div>
  );
}
