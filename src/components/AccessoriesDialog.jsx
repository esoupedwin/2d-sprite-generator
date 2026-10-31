import { ImageUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEscapeToClose } from '@/lib/useEscapeToClose.js';
import {
  resolveWeaponOffset, resolveWeaponScale,
  resolveAccessoryOffset, resolveAccessoryScale,
  resolveBodyAccessoryOffset, resolveBodyAccessoryScale,
  resolveBodyFrontAccessoryOffset, resolveBodyFrontAccessoryScale,
  weaponAttached,
} from '../utils/weaponSettings.js';

const WEAPON_SCALE    = { min: 0.1, max: 3.0, step: 0.1 };
const ACCESSORY_SCALE = { min: 0.1, max: 3.0, step: 0.1 };

const STEP_BTN = 'w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors';

// − 100% + stepper; the value is clamped to [min, max] and rounded to 2 dp so
// repeated 0.1 steps don't accumulate float noise.
function ScaleStepper({ label, value, range: { min, max, step }, onChange }) {
  const nudge = (dir) => onChange(Math.min(max, Math.max(min, +((value + dir * step).toFixed(2)))));
  return (
    <div className="flex items-center justify-end gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">{label}</span>
      <button type="button" onClick={() => nudge(-1)} disabled={value <= min} className={STEP_BTN}>−</button>
      <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(value - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
        {Math.round(value * 100)}%
      </span>
      <button type="button" onClick={() => nudge(1)} disabled={value >= max} className={STEP_BTN}>+</button>
    </div>
  );
}

// Rendered only while the resolved offset is non-zero (there's nothing to reset otherwise).
function ResetOffsetButton({ offset, label, title, onClick }) {
  if (offset.x === 0 && offset.y === 0 && offset.rotation === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors self-end"
      title={title}
    >
      {label}
    </button>
  );
}

// One PNG slot: upload/replace button, remove (×) once an image is set, an
// optional scale stepper, and whatever the caller appends (reset buttons).
function ImageSlot({ image, uploadLabel, editLabel, uploadTitle, editTitle, removeTitle, onUpload, onRemove, scale, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onUpload} title={image ? editTitle : uploadTitle}>
          <ImageUp className="h-3.5 w-3.5 mr-1.5" />
          {image ? editLabel : uploadLabel}
        </Button>
        {image && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(null)}
            title={removeTitle}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {scale && <ScaleStepper {...scale} />}
      {children}
    </div>
  );
}

/**
 * "Weapon & Accessories" — the four PNG slots of a character (weapon skin,
 * right-arm accessory, body back/front accessories) with their scales and the
 * per-animation offset resets. Each `on*` group is { upload, remove, scale,
 * resetOffset }; `upload` opens that slot's upload dialog.
 *
 * Weapon and right-arm offsets are per-animation only, so their reset shows
 * just in Edit Animation. The torso accessories also carry a character-wide
 * offset edited in Edit Body, hence the "(all animations)" variant there.
 *
 * `escapeBlocked` — true while one of the upload dialogs is stacked on top,
 * so Escape closes only that one.
 */
export function AccessoriesDialog({
  open, onClose, escapeBlocked = false,
  parts, currentAnimation, editAnimPose,
  weapon, handAccessory, backAccessory, frontAccessory,
}) {
  useEscapeToClose(open, onClose, escapeBlocked);
  if (!open) return null;

  const weaponKey  = parts.weapon ?? 'none';
  const weaponName = weaponKey === 'none' ? 'weapon' : weaponKey;
  const editBody   = currentAnimation === 'edit';
  const torsoReset = editAnimPose || editBody;

  // The weapon slot is always offered: `parts.weapon` is only the key the PNG
  // is stored under (and the animation-set selector), not an armed flag. The
  // scale/offset controls appear once something is in the hand — a PNG, or a
  // built-in type's procedural drawing.
  const weaponImage    = parts.weaponImages?.[weaponKey];
  const armed          = weaponAttached(parts);
  const handImage      = parts.accessoryImages?.[weaponKey];
  const backImage      = parts.bodyAccessoryImage;
  const frontImage     = parts.bodyFrontAccessoryImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessories-dialog-title"
        className="relative w-[420px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="accessories-dialog-title" className="text-sm font-semibold text-foreground">Weapon &amp; Accessories</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <ImageSlot
            image={weaponImage}
            uploadLabel="Upload Weapon PNG"
            editLabel="Edit Weapon's Skin"
            uploadTitle={`Upload a PNG to skin the ${weaponName}`}
            editTitle={`Replace ${weaponName} PNG`}
            removeTitle={weaponKey === 'none' ? 'Remove weapon image' : `Remove ${weaponKey} image (revert to procedural)`}
            onUpload={weapon.upload}
            onRemove={weapon.remove}
            scale={armed && { label: 'Weapon scale', value: resolveWeaponScale(parts), range: WEAPON_SCALE, onChange: weapon.scale }}
          >
            {armed && editAnimPose && (
              <ResetOffsetButton
                offset={resolveWeaponOffset(parts, currentAnimation)}
                label="Reset offset"
                title="Reset weapon offset"
                onClick={weapon.resetOffset}
              />
            )}
          </ImageSlot>

          <ImageSlot
            image={handImage}
            uploadLabel="Upload Right Arm Accessory"
            editLabel="Edit Right Arm's Skin"
            uploadTitle="Upload a PNG for the right arm accessory"
            editTitle="Replace right arm accessory PNG"
            removeTitle="Remove right arm accessory image"
            onUpload={handAccessory.upload}
            onRemove={handAccessory.remove}
            scale={handImage && { label: 'Right arm scale', value: resolveAccessoryScale(parts), range: ACCESSORY_SCALE, onChange: handAccessory.scale }}
          >
            {handImage && editAnimPose && (
              <ResetOffsetButton
                offset={resolveAccessoryOffset(parts, currentAnimation)}
                label="Reset right arm offset"
                title="Reset right arm accessory offset"
                onClick={handAccessory.resetOffset}
              />
            )}
          </ImageSlot>

          <ImageSlot
            image={backImage}
            uploadLabel="Upload Body's Back Accessory"
            editLabel="Edit Body's Back Accessory"
            uploadTitle="Upload a PNG anchored behind the body"
            editTitle="Replace body's back accessory PNG"
            removeTitle="Remove body accessory image"
            onUpload={backAccessory.upload}
            onRemove={backAccessory.remove}
            scale={backImage && { label: 'Body scale', value: resolveBodyAccessoryScale(parts), range: ACCESSORY_SCALE, onChange: backAccessory.scale }}
          >
            {backImage && torsoReset && (
              <ResetOffsetButton
                offset={resolveBodyAccessoryOffset(parts, currentAnimation)}
                label={editBody ? 'Reset back position (all animations)' : 'Reset back position (this animation)'}
                title={editBody ? 'Reset the back accessory position used by every animation' : "Reset this animation's back accessory position"}
                onClick={backAccessory.resetOffset}
              />
            )}
          </ImageSlot>

          <ImageSlot
            image={frontImage}
            uploadLabel="Upload Body's Front Accessory"
            editLabel="Edit Body's Front Accessory"
            uploadTitle="Upload a PNG drawn over both arms, under the head"
            editTitle="Replace body's front accessory PNG"
            removeTitle="Remove body front accessory image"
            onUpload={frontAccessory.upload}
            onRemove={frontAccessory.remove}
            scale={frontImage && { label: 'Front scale', value: resolveBodyFrontAccessoryScale(parts), range: ACCESSORY_SCALE, onChange: frontAccessory.scale }}
          >
            {frontImage && torsoReset && (
              <ResetOffsetButton
                offset={resolveBodyFrontAccessoryOffset(parts, currentAnimation)}
                label={editBody ? 'Reset front position (all animations)' : 'Reset front position (this animation)'}
                title={editBody ? 'Reset the front accessory position used by every animation' : "Reset this animation's front accessory position"}
                onClick={frontAccessory.resetOffset}
              />
            )}
          </ImageSlot>
        </div>

        <div className="flex justify-end px-4 py-3 border-t border-border">
          <Button type="button" size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
