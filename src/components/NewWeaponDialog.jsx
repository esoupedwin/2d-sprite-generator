import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

const WEAPON_TEMPLATES = [
  { key: 'none',             label: 'None' },
  { key: 'sword',            label: 'Melee' },
  { key: 'rifle',            label: 'Rifle' },
  { key: 'pistol',           label: 'Pistol' },
  { key: 'bow',              label: 'Bow' },
  { key: 'rocket',           label: 'Rocket' },
  { key: 'grenade_launcher', label: 'Grenade Launcher' },
];

export function NewWeaponDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('none');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTemplate('none');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-weapon-title"
        className="relative w-[380px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="new-weapon-title" className="text-sm font-semibold text-foreground">New Weapon Mode</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Weapon name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Animation set</label>
            <div className="flex flex-wrap gap-1.5">
              {WEAPON_TEMPLATES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplate(t.key)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs border transition-colors',
                    template === t.key
                      ? 'bg-primary border-primary text-primary-foreground font-semibold'
                      : 'bg-secondary border-border text-foreground hover:border-primary',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 leading-snug">
              Determines which animations are available for this weapon.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={!name.trim()} onClick={handleSave}>Create</Button>
        </div>
      </div>
    </div>
  );
}
