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

function drawHead(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(-18, 11, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, 11, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Torso ────────────────────────────────────────────────────────────────────

function drawUpperTorso(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-27, -22);
  ctx.lineTo( 27, -22);
  ctx.lineTo( 22,  28);
  ctx.lineTo(-22,  28);
  ctx.closePath();
  ctx.fill();
}

function drawLowerTorso(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-30, -12, 60, 20, 5);
  ctx.fill();
}

// ─── Part definitions ─────────────────────────────────────────────────────────

export const CHARACTER_PARTS = {
  head: {
    label: 'Head',
    boneId: 'head',
    options: {
      red:   { label: 'Red',   draw(ctx) { drawHead(ctx, '#E53935'); } },
      blue:  { label: 'Blue',  draw(ctx) { drawHead(ctx, '#1E88E5'); } },
      green: { label: 'Green', draw(ctx) { drawHead(ctx, '#43A047'); } },
    },
  },

  body: {
    label: 'Upper Body',
    boneId: 'torso',
    options: {
      blue:  { label: 'Blue',  draw(ctx) { drawUpperTorso(ctx, '#3D6FD9'); } },
      red:   { label: 'Red',   draw(ctx) { drawUpperTorso(ctx, '#E53935'); } },
      green: { label: 'Green', draw(ctx) { drawUpperTorso(ctx, '#388E3C'); } },
    },
  },

  lower_torso: {
    label: 'Lower Body',
    boneId: 'lower_torso',
    options: {
      orange: { label: 'Orange', draw(ctx) { drawLowerTorso(ctx, '#E8871A'); } },
      tan:    { label: 'Tan',    draw(ctx) { drawLowerTorso(ctx, '#A0785A'); } },
      gray:   { label: 'Gray',   draw(ctx) { drawLowerTorso(ctx, '#757575'); } },
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
  weapon:      'none',
};
