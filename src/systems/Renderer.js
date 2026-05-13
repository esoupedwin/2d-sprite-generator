import { CHARACTER_PARTS } from '../data/characterParts.js';
import { resolveWeaponOffset, resolveWeaponScale } from '../utils/weaponSettings.js';
import {
  drawSkin, drawSkinImage, drawSkinPinned,
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN, LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
  HEAD_SKIN, BODY_SKIN,
} from './SkinSystem.js';

function getColor(character, partKey) {
  if (character.customColors?.[partKey]) return character.customColors[partKey];
  const option = CHARACTER_PARTS[partKey]?.options[character[partKey]];
  return option?.color ?? '#888888';
}

function getScale(character, partKey) {
  if (partKey === 'weapon') return resolveWeaponScale(character);
  return character.partScales?.[partKey] ?? 1;
}

// Longest-dimension target for user-uploaded weapon PNGs (bone-local units).
// partScales.weapon multiplies on top of this so the user can tune size.
const WEAPON_IMAGE_TARGET = 80;

function drawPart(ctx, partKey, character, worldTransforms, weaponImage, animation) {
  const partDef = CHARACTER_PARTS[partKey];
  if (!partDef) return;
  const option = partDef.options[character[partKey]];
  const bone = worldTransforms[partDef.boneId];
  if (!bone) return;

  const useWeaponImage = partKey === 'weapon' && weaponImage;
  if (!useWeaponImage && !option?.draw) return;

  const s = getScale(character, partKey);
  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.rotation);
  if (s !== 1) ctx.scale(s, s);
  if (partKey === 'weapon') {
    const wo = resolveWeaponOffset(character, animation);
    if (wo.x || wo.y)  ctx.translate(wo.x, wo.y);
    if (wo.rotation)   ctx.rotate(wo.rotation);
  }
  if (useWeaponImage) {
    // Convention: user uploads a PNG with the weapon's blade/muzzle pointing
    // UP in image space and the handle at the bottom-center. We rotate π and
    // anchor the image so its post-rotation top is at the bone origin (grip)
    // and the rest extends in +Y bone-local (the "forward" direction shared
    // with the procedural weapons).
    const factor = WEAPON_IMAGE_TARGET / Math.max(weaponImage.naturalWidth, weaponImage.naturalHeight);
    const w = weaponImage.naturalWidth  * factor;
    const h = weaponImage.naturalHeight * factor;
    ctx.rotate(Math.PI);
    ctx.drawImage(weaponImage, -w / 2, -h, w, h);
  } else {
    option.draw(ctx);
  }
  ctx.restore();
}

function drawExtras(ctx, partKey, character, worldTransforms) {
  const option = CHARACTER_PARTS[partKey]?.options[character[partKey]];
  if (!option?.drawExtras) return;
  const boneId = CHARACTER_PARTS[partKey].boneId;
  const bone   = worldTransforms[boneId];
  if (!bone) return;
  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.rotation);
  option.drawExtras(ctx);
  ctx.restore();
}

/**
 * Renders the character given pre-computed world transforms.
 * Caller is responsible for calling computeWorldTransforms() and caching the result.
 */
export function renderCharacter(ctx, character, worldTransforms, options = {}) {
  const {
    originX = 0, originY = 0, scale = 1,
    showBones = false, highlightBone = null,
    skins = {}, bodyImage = null, headImage = null, weaponImage = null,
    animation = '',
  } = options;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  // Back to front: right arm → legs → body → weapon → head → left arm → prop.
  // Weapons sit above right arm + body (visible in front of the torso) but
  // below the left arm (so the left hand can read as gripping the front of
  // the weapon).
  drawSkin(ctx, skins.right_arm   || RIGHT_ARM_SKIN,   worldTransforms, getColor(character, 'right_arm'),   getScale(character, 'right_arm'));
  drawSkin(ctx, skins.left_leg    || LEFT_LEG_SKIN,    worldTransforms, getColor(character, 'left_leg'),    getScale(character, 'left_leg'));
  drawSkin(ctx, skins.right_leg   || RIGHT_LEG_SKIN,   worldTransforms, getColor(character, 'right_leg'),   getScale(character, 'right_leg'));
  {
    const bodyTmpl  = skins.body || BODY_SKIN;
    const bodyScale = getScale(character, 'body');
    if (bodyImage) {
      drawSkinImage(ctx, bodyTmpl, worldTransforms, bodyImage, bodyScale);
    } else {
      drawSkin(ctx, bodyTmpl, worldTransforms, getColor(character, 'body'), bodyScale);
    }
  }
  // Some weapons (e.g. rocket launcher on the shoulder) render ABOVE the
  // head so the tube passes in front of the cheek. Flagged on the weapon
  // option's part def — see CHARACTER_PARTS.weapon.options.*.aboveHead.
  const weaponAboveHead = !!CHARACTER_PARTS.weapon.options[character.weapon]?.aboveHead;
  if (!weaponAboveHead) drawPart(ctx, 'weapon', character, worldTransforms, weaponImage, animation);
  {
    const headTmpl  = skins.head || HEAD_SKIN;
    const headScale = getScale(character, 'head');
    if (headImage) {
      // Image replaces the head blob entirely: skip both the colored fill
      // and the eye extras so the full PNG is visible.
      drawSkinPinned(ctx, headTmpl, worldTransforms, headImage, headScale);
    } else {
      drawSkin(ctx, headTmpl, worldTransforms, getColor(character, 'head'), headScale);
      drawExtras(ctx, 'head', character, worldTransforms);
    }
  }
  if (weaponAboveHead) drawPart(ctx, 'weapon', character, worldTransforms, weaponImage, animation);
  drawSkin(ctx, skins.left_arm    || LEFT_ARM_SKIN,    worldTransforms, getColor(character, 'left_arm'),    getScale(character, 'left_arm'));
  drawPart(ctx, 'head_prop', character, worldTransforms);

  if (showBones) {
    renderBones(ctx, worldTransforms, highlightBone);
  }

  ctx.restore();
}

// Stable numeric IDs for each bone joint, shown in the debug overlay.
const BONE_IDS = {
  torso:         1,
  head:          2,
  lower_torso:   3,
  left_arm:      4,
  left_forearm:  5,
  left_hand:     6,
  right_arm:     7,
  right_forearm: 8,
  right_hand:    9,
  left_leg:      10,
  left_shin:     11,
  left_foot:     12,
  right_leg:     13,
  right_shin:    14,
  right_foot:    15,
};

function renderBones(ctx, worldTransforms, highlightBone = null) {
  const BONE_COLOR  = 'rgba(255, 200, 0, 0.9)';
  const JOINT_FILL  = 'rgba(255, 200, 0, 1)';
  const JOINT_R     = 3.125;

  const connections = [
    ['torso',         'lower_torso'],
    ['torso',         'head'],
    ['torso',         'left_arm'],
    ['left_arm',      'left_forearm'],
    ['left_forearm',  'left_hand'],
    ['torso',         'right_arm'],
    ['right_arm',     'right_forearm'],
    ['right_forearm', 'right_hand'],
    ['lower_torso',   'left_leg'],
    ['left_leg',      'left_shin'],
    ['left_shin',     'left_foot'],
    ['lower_torso',   'right_leg'],
    ['right_leg',     'right_shin'],
    ['right_shin',    'right_foot'],
  ];

  // Bone lines
  ctx.lineWidth = 2 / 1.4;
  ctx.strokeStyle = BONE_COLOR;
  for (const [a, b] of connections) {
    const wa = worldTransforms[a];
    const wb = worldTransforms[b];
    if (!wa || !wb) continue;
    ctx.beginPath();
    ctx.moveTo(wa.x, wa.y);
    ctx.lineTo(wb.x, wb.y);
    ctx.stroke();
  }

  // Joint circles + ID labels
  for (const [boneId, bone] of Object.entries(worldTransforms)) {
    const id = BONE_IDS[boneId];
    if (id === undefined) continue;

    const active = boneId === highlightBone;
    const r      = active ? JOINT_R * 1.5 : JOINT_R;

    ctx.fillStyle = active ? '#FF5555' : JOINT_FILL;
    ctx.beginPath();
    ctx.arc(bone.x, bone.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = active ? '#FFF' : '#000';
    ctx.font = `bold ${active ? 5.5 : 4.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(id), bone.x, bone.y);
  }
}
