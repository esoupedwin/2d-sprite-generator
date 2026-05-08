import { useEffect, useRef } from 'react';
import { computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { mergeOffsets } from '../utils/transforms.js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { Copy, Plus, X } from 'lucide-react';

const THUMB_W      = 72;
const THUMB_H      = 110;
const THUMB_SCALE  = 0.47;
const THUMB_ORIGIN_X = THUMB_W / 2;
const THUMB_ORIGIN_Y = THUMB_H - 4;

function FrameThumb({ character, frame, skinOverrides, isActive, index, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);

    const fullPose       = mergeOffsets({}, frame.boneOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);
    const skins = {};
    for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);

    renderCharacter(ctx, character, worldTransforms, {
      originX:   THUMB_ORIGIN_X,
      originY:   THUMB_ORIGIN_Y,
      scale:     THUMB_SCALE,
      showBones: false,
      skins,
      animation: 'edit',
    });
  }, [character, frame.boneOffsets, skinOverrides]);

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-md border-2 overflow-hidden cursor-pointer transition-colors',
        isActive ? 'border-primary ring-2 ring-primary/35' : 'border-border hover:border-primary',
      )}
    >
      <canvas ref={canvasRef} width={THUMB_W} height={THUMB_H} />
      <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-mono text-white/55 pointer-events-none">
        F{index + 1}
      </div>
    </div>
  );
}

export function PoseEditor({
  character,
  skinOverrides,
  frames,
  activeFrame,
  animName,
  animLoop,
  onFrameSelect,
  onFrameAdd,
  onFrameDelete,
  onFrameDuplicate,
  onFrameDurationChange,
  onNameChange,
  onLoopChange,
  onCreate,
  onClose,
}) {
  const totalDuration = frames.reduce((s, f) => s + f.duration, 0);

  return (
    <div className="w-full max-w-[820px] bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <SectionTitle className="whitespace-nowrap">Pose Editor</SectionTitle>

        <Input
          value={animName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Animation name"
          spellCheck={false}
          className="w-40 h-8 text-sm"
        />

        <div className="flex items-center gap-1.5">
          <Checkbox id="pose-loop" checked={animLoop} onCheckedChange={onLoopChange} />
          <Label htmlFor="pose-loop" className="text-xs text-muted-foreground select-none cursor-pointer">
            Loop
          </Label>
        </div>

        <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
          {totalDuration.toFixed(1)}s total
        </span>

        <div className="flex-1" />

        <Button type="button" size="chip" onClick={onCreate} className="rounded-full font-semibold">
          Create Animation
        </Button>
        <Button
          type="button"
          variant="outline"
          size="chip"
          onClick={onClose}
          className="rounded-full text-muted-foreground hover:border-destructive hover:text-destructive"
        >
          Cancel
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto py-1 items-start">
        {frames.map((frame, i) => (
          <div key={frame.id} className="flex flex-col items-center gap-1 shrink-0">
            <FrameThumb
              character={character}
              frame={frame}
              skinOverrides={skinOverrides}
              isActive={i === activeFrame}
              index={i}
              onClick={() => onFrameSelect(i)}
            />
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                value={frame.duration}
                min={0.05}
                max={10}
                step={0.05}
                onChange={e => onFrameDurationChange(i, parseFloat(e.target.value) || 0.1)}
                className="w-11 bg-secondary border border-border text-foreground text-[11px] font-mono rounded px-1 py-0.5 text-center outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground">s</span>
              <button
                title="Duplicate frame"
                onClick={() => onFrameDuplicate(i)}
                className="w-5 h-5 rounded border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary flex items-center justify-center transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
              {frames.length > 1 && (
                <button
                  title="Delete frame"
                  onClick={() => onFrameDelete(i)}
                  className="w-5 h-5 rounded border border-border bg-secondary text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={onFrameAdd}
          title="Add frame"
          className="self-center w-9 h-9 rounded-full bg-secondary border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center shrink-0 mt-9 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="text-[11px] text-muted-foreground text-center">
        Drag joints in the canvas to pose each frame · Pose is saved when switching frames
      </div>
    </div>
  );
}
