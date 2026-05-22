/**
 * Character part definitions.
 * Arms and legs are rendered as continuous skin paths by SkinSystem.js.
 * Only head, torso, and weapon parts have draw() functions here.
 *
 * draw(ctx) is called with the context already translated + rotated to the
 * bone's world transform. Draw in bone-local space (origin = bone pivot).
 * Y increases downward.
 */

// ─── Head ─────────────────────────────────────────────────────────────────────

function drawEyes(ctx) {
  ctx.fillStyle = '#111';
  // Pill shape: roundRect with radius = half-width for fully rounded short sides
  ctx.beginPath();
  ctx.roundRect(-15, 1, 10, 22, 5);  // left eye  (centred at x=−10, y=12)
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(19, 1, 10, 22, 5);   // right eye (centred at x=24, y=12)
  ctx.fill();
}

// ─── Torso ────────────────────────────────────────────────────────────────────


// ─── Part definitions ─────────────────────────────────────────────────────────

export const CHARACTER_PARTS = {
  head: {
    label: 'Head',
    boneId: 'head',
    options: {
      red:   { label: 'Red',   color: '#E53935', drawExtras: drawEyes },
      blue:  { label: 'Blue',  color: '#1E88E5', drawExtras: drawEyes },
      green: { label: 'Green', color: '#43A047', drawExtras: drawEyes },
    },
  },

  body: {
    label: 'Upper Body',
    boneId: 'torso',
    options: {
      blue:  { label: 'Blue',  color: '#3D6FD9' },
      red:   { label: 'Red',   color: '#E53935' },
      green: { label: 'Green', color: '#388E3C' },
    },
  },

  lower_torso: {
    label: 'Lower Body',
    boneId: 'lower_torso',
    options: {
      orange: { label: 'Orange', color: '#E8871A' },
      tan:    { label: 'Tan',    color: '#A0785A' },
      gray:   { label: 'Gray',   color: '#757575' },
    },
  },

  // Arms — color only; rendering is handled by SkinSystem as one continuous blob
  left_arm: {
    label: 'Left Arm',
    boneId: 'left_arm',
    options: {
      green:  { label: 'Green',  color: '#4CAF50' },
      blue:   { label: 'Blue',   color: '#1E88E5' },
      red:    { label: 'Red',    color: '#E53935' },
    },
  },

  right_arm: {
    label: 'Right Arm',
    boneId: 'right_arm',
    options: {
      purple: { label: 'Purple', color: '#9C27B0' },
      orange: { label: 'Orange', color: '#F57C00' },
      teal:   { label: 'Teal',   color: '#00897B' },
    },
  },

  // Legs — color only; rendering is handled by SkinSystem as one continuous blob
  left_leg: {
    label: 'Left Leg',
    boneId: 'left_leg',
    options: {
      darkred: { label: 'Dark Red',   color: '#C62828' },
      navy:    { label: 'Navy',       color: '#1A237E' },
      brown:   { label: 'Brown',      color: '#5D4037' },
    },
  },

  right_leg: {
    label: 'Right Leg',
    boneId: 'right_leg',
    options: {
      darkgreen: { label: 'Dark Green', color: '#2E7D32' },
      purple:    { label: 'Purple',     color: '#6A1B9A' },
      gray:      { label: 'Gray',       color: '#546E7A' },
    },
  },

  // Prop balanced on head — drawn above the head skin
  head_prop: {
    label: 'Head Prop',
    boneId: 'head',
    options: {
      none: {
        label: 'None',
        draw() {},
      },
      box: {
        label: 'Box',
        draw(ctx) {
          const w = 58, h = 40;
          const bx = -w / 2;
          const by = -55 - h;  // sits on top of head circle (radius 55)

          // Main crate face
          ctx.fillStyle = '#C49A45';
          ctx.fillRect(bx, by, w, h);

          // Darker top strip — top-face depth illusion
          ctx.fillStyle = '#A87830';
          ctx.fillRect(bx, by, w, 7);

          // Vertical plank dividers
          ctx.strokeStyle = '#8B6015';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx + w / 3,     by + 7); ctx.lineTo(bx + w / 3,     by + h);
          ctx.moveTo(bx + 2 * w / 3, by + 7); ctx.lineTo(bx + 2 * w / 3, by + h);
          ctx.stroke();

          // Horizontal mid-band
          ctx.beginPath();
          ctx.moveTo(bx, by + h / 2); ctx.lineTo(bx + w, by + h / 2);
          ctx.stroke();

          // Outline
          ctx.strokeStyle = '#6B4A0A';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, w, h);
        },
      },
    },
  },

  // Weapon attaches to the hand (right_hand bone = end of arm chain)
  weapon: {
    label: 'Weapon',
    boneId: 'right_hand',
    options: {
      none: {
        label: 'None',
        draw() {},
      },
      sword: {
        label: 'Melee',
        draw(ctx) {
          // Handle at y≈16 (hand level near bottom of forearm blob)
          ctx.fillStyle = '#7B4F2E';
          ctx.fillRect(-4, 16, 8, 14);
          // Guard
          ctx.fillStyle = '#C8922A';
          ctx.fillRect(-13, 28, 26, 6);
          // Blade
          ctx.fillStyle = '#D0D8E0';
          ctx.beginPath();
          ctx.moveTo(-4, 34);
          ctx.lineTo( 4, 34);
          ctx.lineTo( 1.5, 90);
          ctx.lineTo(-1.5, 90);
          ctx.closePath();
          ctx.fill();
          // Edge highlight
          ctx.fillStyle = '#F0F6FF';
          ctx.beginPath();
          ctx.moveTo(0, 34); ctx.lineTo(1, 34); ctx.lineTo(0.5, 90); ctx.lineTo(-0.5, 90);
          ctx.closePath();
          ctx.fill();
        },
      },
      rifle: {
        label: 'Rifle',
        draw(ctx) {
          // Barrel runs along Y axis (Y+ = muzzle/forward, Y- = stock/butt)
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(-2, -8, 4, 58);    // barrel shaft

          // Receiver block (where hand grips)
          ctx.fillStyle = '#2E2E2E';
          ctx.fillRect(-5, -8, 10, 26);   // receiver body

          // Stock (butt end — behind the grip in -Y direction)
          ctx.fillStyle = '#7B5E2A';
          ctx.fillRect(-5, -34, 10, 28);  // stock
          ctx.fillRect(-8, -38, 16, 8);   // butt plate

          // Pistol grip
          ctx.fillStyle = '#5C3D12';
          ctx.fillRect(-3, 16, 6, 16);

          // Box magazine
          ctx.fillStyle = '#444';
          ctx.fillRect(-3, 4, 6, 16);

          // Muzzle
          ctx.fillStyle = '#111';
          ctx.fillRect(-3, 46, 6, 6);
        },
      },
      bow: {
        label: 'Bow',
        draw(ctx) {
          const LIMB    = '#7B5218';
          const LIMB_DK = '#5C3A0A';
          const SINEW   = '#DDD0A8';
          const SHAFT   = '#C8A840';
          const TIP     = '#B0B0C8';
          const VANE    = '#EFE0C0';

          // Grip at origin (right_hand bone = bow arm hand).
          // Limbs extend in ±X (up/down in world when arm aims right).
          // Arrow points in +Y (toward target). String pulled back in -Y.
          const limbLen  = 50;   // grip → limb tip distance (X axis)
          const tipY     = -8;   // tips lean back toward string side
          const pullY    = -22;  // string drawn back to this -Y position
          const arrowLen = 55;

          // Upper limb
          ctx.strokeStyle = LIMB;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.bezierCurveTo(-limbLen * 0.45, 8, -limbLen * 0.85, tipY + 6, -limbLen, tipY);
          ctx.stroke();
          // Lower limb
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.bezierCurveTo(limbLen * 0.45, 8, limbLen * 0.85, tipY + 6, limbLen, tipY);
          ctx.stroke();

          // Grip wrap
          ctx.strokeStyle = LIMB_DK;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(0, 12);
          ctx.stroke();

          // Bowstring V — from upper tip, pulled to draw point, to lower tip
          ctx.strokeStyle = SINEW;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-limbLen, tipY);
          ctx.lineTo(0, pullY);
          ctx.lineTo(limbLen, tipY);
          ctx.stroke();

          // Arrow shaft (nocked at pullY, tip at +Y)
          ctx.strokeStyle = SHAFT;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, pullY);
          ctx.lineTo(0, arrowLen);
          ctx.stroke();

          // Arrowhead
          ctx.fillStyle = TIP;
          ctx.beginPath();
          ctx.moveTo(-3, arrowLen);
          ctx.lineTo( 3, arrowLen);
          ctx.lineTo( 0, arrowLen + 12);
          ctx.closePath();
          ctx.fill();

          // Fletching (two vanes at nock)
          ctx.strokeStyle = VANE;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, pullY); ctx.lineTo(-6, pullY - 14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, pullY); ctx.lineTo( 6, pullY - 14); ctx.stroke();
        },
      },
      rocket: {
        label: 'Rocket',
        draw(ctx) {
          // Shoulder-fired launcher. Fatter tube than the rifle, extends both
          // behind the hand (back-blast) and forward (muzzle). +Y = forward,
          // +X = top of tube, -X = grip side.
          const STEEL    = '#3a3a3a';
          const STEEL_DK = '#1a1a1a';
          const WOOD     = '#5c4530';
          const ACCENT   = '#9a9a9a';
          const FUEL     = '#b94a2a';

          // Rear back-blast collar (fattest part)
          ctx.fillStyle = STEEL_DK;
          ctx.beginPath();
          ctx.moveTo( 0, -34);
          ctx.lineTo(20, -34);
          ctx.lineTo(22, -28);
          ctx.lineTo(-2, -28);
          ctx.closePath();
          ctx.fill();

          // Main tube body
          ctx.fillStyle = STEEL;
          ctx.fillRect(2, -28, 18, 76);   // tube from rear collar to muzzle

          // Top highlight stripe (gives the tube some volume)
          ctx.fillStyle = ACCENT;
          ctx.fillRect(3, -26, 2, 72);

          // Warhead nose ring (forward)
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(0, 48, 22, 6);

          // Painted hazard stripe near the warhead
          ctx.fillStyle = FUEL;
          ctx.fillRect(4, 38, 14, 6);

          // Carry / cheek grip on top
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(8, -14, 6, 4);

          // Rear iron sight bump
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(20, -10, 3, 5);
          // Front iron sight bump
          ctx.fillRect(20, 22, 3, 5);

          // Pistol grip (where the trigger hand wraps the bone origin)
          ctx.fillStyle = WOOD;
          ctx.beginPath();
          ctx.moveTo(-5, -2);
          ctx.lineTo( 2, -2);
          ctx.lineTo( 3,  9);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          // Grip ridges
          ctx.strokeStyle = '#3a2a18';
          ctx.lineWidth   = 0.5;
          ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(-3, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-1, 1); ctx.lineTo(-1, 8); ctx.stroke();

          // Trigger guard
          ctx.strokeStyle = STEEL;
          ctx.lineWidth   = 1.2;
          ctx.beginPath();
          ctx.arc(-1, 5, 3.5, 0, Math.PI * 2);
          ctx.stroke();

          // Forward support grip (for support hand)
          ctx.fillStyle = WOOD;
          ctx.fillRect(-4, 22, 6, 12);
        },
      },
      grenade_launcher: {
        label: 'Grenade Launcher',
        draw(ctx) {
          // M32-style 6-shot 40mm revolver. Hand grips at origin (0, 0).
          // +Y = forward (muzzle), -Y = back (folding stock),
          // +X = top of weapon, -X = grip side underneath.
          const STEEL    = '#2e2e2e';
          const STEEL_DK = '#161616';
          const STEEL_LT = '#5a5a5a';
          const DRUM     = '#363636';
          const DRUM_DK  = '#1c1c1c';
          const BARREL   = '#222';
          const HOLE     = '#0a0a0a';
          const WOOD     = '#5c4530';

          // Folding stock (rear) — tubular skeleton stock.
          ctx.strokeStyle = STEEL;
          ctx.lineWidth   = 2;
          ctx.beginPath();
          ctx.moveTo(-2, -30);
          ctx.lineTo(-2, -10);
          ctx.moveTo( 6, -30);
          ctx.lineTo( 6, -10);
          ctx.stroke();
          // Butt pad
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(-4, -34, 12, 5);

          // Receiver body — connects stock to drum.
          ctx.fillStyle = STEEL;
          ctx.fillRect(-3, -10, 10, 12);

          // Top rail / sight on the receiver
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(7, -8, 3, 8);

          // Cylindrical revolver drum — the signature M32 feature.
          // Big fat drum spans roughly y = 2 → y = 26, sticks out in +X.
          ctx.fillStyle = DRUM;
          ctx.beginPath();
          ctx.ellipse(2, 14, 13, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = DRUM_DK;
          ctx.beginPath();
          ctx.ellipse(2, 14, 13, 14, 0, 0, Math.PI * 2);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = STEEL_DK;
          ctx.stroke();

          // Drum chamber holes (peek at 3 of the 6 facing the viewer)
          ctx.fillStyle = HOLE;
          for (const [cx, cy] of [[-4, 8], [ 2, 4], [ 8, 8], [-4, 20], [ 2, 24], [ 8, 20]]) {
            ctx.beginPath();
            ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Drum hub (center pin)
          ctx.fillStyle = STEEL_LT;
          ctx.beginPath();
          ctx.arc(2, 14, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Short stubby barrel emerging from the front of the drum
          ctx.fillStyle = BARREL;
          ctx.fillRect(-2, 28, 8, 14);
          // Muzzle ring
          ctx.fillStyle = STEEL_DK;
          ctx.fillRect(-3, 42, 10, 4);
          // Muzzle hole
          ctx.fillStyle = HOLE;
          ctx.beginPath();
          ctx.arc(2, 44, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Pistol grip (where the trigger hand wraps the bone origin)
          ctx.fillStyle = WOOD;
          ctx.beginPath();
          ctx.moveTo(-5, -2);
          ctx.lineTo( 2, -2);
          ctx.lineTo( 3, 10);
          ctx.lineTo(-6, 11);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#3a2a18';
          ctx.lineWidth   = 0.5;
          ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(-3, 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-1, 1); ctx.lineTo(-1, 9); ctx.stroke();

          // Trigger guard
          ctx.strokeStyle = STEEL;
          ctx.lineWidth   = 1.2;
          ctx.beginPath();
          ctx.arc(-1, 5, 3.5, 0, Math.PI * 2);
          ctx.stroke();
        },
      },
    },
  },
};

export const DEFAULT_CHARACTER = {
  head:        'red',
  body:        'blue',
  lower_torso: 'orange',
  left_arm:    'green',
  right_arm:   'purple',
  left_leg:    'darkred',
  right_leg:   'darkgreen',
  head_prop:   'none',
  weapon:      'none',
};
