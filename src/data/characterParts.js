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
        label: 'Sword',
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
      staff: {
        label: 'Staff',
        draw(ctx) {
          ctx.fillStyle = '#7B5E2A';
          ctx.fillRect(-3, 14, 6, 80);
          ctx.fillStyle = '#4A3010';
          ctx.beginPath();
          ctx.arc(0, 10, 10, 0, Math.PI * 2);
          ctx.fill();
          const grad = ctx.createRadialGradient(-3, 6, 2, 0, 10, 10);
          grad.addColorStop(0, '#A0E8FF');
          grad.addColorStop(0.6, '#4488CC');
          grad.addColorStop(1, '#1A2A66');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 10, 9, 0, Math.PI * 2);
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
    },
  },
};

/**
 * Back-to-front draw order.
 * Left side (behind body) → body → right side (in front).
 * Forearms drawn immediately after their upper arm.
 */
// DRAW_ORDER is kept for legacy reference; Renderer now handles limbs via SkinSystem.
export const DRAW_ORDER = [
  'lower_torso',
  'body',
  'head',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
  'weapon',
];

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
