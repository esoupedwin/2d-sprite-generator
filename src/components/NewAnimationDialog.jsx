import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export function NewAnimationDialog({ open, onClose, templates, onDeleteTemplate, onBlank, onFromTemplate }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (open) setSelected(null); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const selectedTemplate = templates.find(t => t.id === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-anim-title"
        className="relative w-[380px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="new-anim-title" className="text-sm font-semibold text-foreground">New Animation</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3">
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              No templates saved yet. In <span className="text-teal-400">Edit Animation</span> mode,
              use <span className="font-mono">Save as template</span> to add one.
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors border ${
                    selected === t.id
                      ? 'bg-primary/20 border-primary/40'
                      : 'border-transparent hover:bg-secondary'
                  }`}
                >
                  <div className="flex flex-col gap-px">
                    <span className="text-sm text-foreground">{t.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {t.duration?.toFixed(2)}s · {t.loop ? 'loop' : 'once'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteTemplate(t.id);
                      if (selected === t.id) setSelected(null);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded ml-2 shrink-0"
                    title="Delete template"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 px-4 py-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { onClose(); onBlank(); }}
          >
            Blank
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedTemplate}
            onClick={() => { if (selectedTemplate) onFromTemplate(selectedTemplate); }}
          >
            Use template
          </Button>
        </div>
      </div>
    </div>
  );
}
