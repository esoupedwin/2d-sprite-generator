import { CHARACTER_PARTS } from '../data/characterParts.js';
import { resolveWeaponOffset, resolveWeaponScale, resolveAccessoryOffset, resolveAccessoryScale, resolveBodyAccessoryOffset, resolveBodyAccessoryScale } from '../utils/weaponSettings.js';
import {
  drawSkin, drawSkinImage, drawSkinPinned,
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN, LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
  HEAD_SKIN, BODY_SKIN,
} from './SkinSystem.js';

export const MELEE_WEAPONS = new Set(['sword']);

// Reorderable draw layers for the per-animation z-order editor. Listed here in
// a neutral order; the actual default depends on whether a weapon is held.
export const ORDERABLE_LAYERS = [
  { key: 'head',      label: 'Head' },
  { key: 'left_arm',  label: 'Front Arm' },
  { key: 'weapon',    label: 'Weapon' },
  { key: 'body',      label: 'Body' },
  { key: 'right_arm', label: 'Back Arm' },
  { key: 'right_leg', label: 'Right Leg' },
  { key: 'left_leg',  label: 'Left Leg' },
];
const ALL_LAYER_KEYS = ORDERABLE_LAYERS.map(l => l.key);
// Default draw order, back → front.
const DEFAULT_ORDER_ARMED   = ['left_leg', 'right_leg', 'right_arm', 'body', 'weapon', 'left_arm', 'head'];
const DEFAULT_ORDER_UNARMED = ['right_arm', 'left_leg', 'right_leg', 'body', 'weapon', 'left_arm', 'head'];

// Default back → front order for a character (unarmed tucks the support arm
// behind the legs). Exported so the editor shows the same starting order.
export function defaultLayerOrder(weapon) {
  const unarmed = !weapon || weapon === 'none';
  return (unarmed ? DEFAULT_ORDER_UNARMED : DEFAULT_ORDER_ARMED).slice();
}

// Keep the override's ordering but guarantee every layer is present.
function resolveLayerOrder(override, base) {
  if (!override || !override.length) return base;
  const valid = override.filter(k => ALL_LAYER_KEYS.includes(k));
  const seen = new Set(valid);
  const merged = valid.slice();
  for (const k of base) if (!seen.has(k)) merged.push(k);
  return merged;
}

function getColor(character, partKey) {
  if (character.customColors?.[partKey]) return character.customColors[partKey];
  const option = CHARACTER_PARTS[partKey]?.options[character[partKey]];
  return option?.color ?? '#888888';
}

function getScale(character, partKey) {
  if (partKey === 'weapon') return resolveWeaponScale(character);
  return character.partScales?.[partKey] ?? 1;
}

// Extra size multiplier for an uploaded head PNG, on top of the head part
// scale. Per-animation override falls back to a character-wide value, then 1.
function headImageScaleFor(character, animation) {
  return character.animHeadImageScales?.[animation] ?? character.headImageScale ?? 1;
}

// Longest-dimension target for user-uploaded weapon/accessory PNGs (bone-local units).
// partScales.weapon multiplies on top of this so the user can tune size.
const WEAPON_IMAGE_TARGET    = 80;
const ACCESSORY_IMAGE_TARGET = 80;
const BODY_ACCESSORY_IMAGE_TARGET = 110;

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

function drawAccessory(ctx, character, worldTransforms, accessoryImage, animation) {
  if (!accessoryImage) return;
  const bone = worldTransforms['left_hand'];
  if (!bone) return;
  const ao = resolveAccessoryOffset(character, animation);
  const s  = resolveAccessoryScale(character);
  const factor = ACCESSORY_IMAGE_TARGET / Math.max(accessoryImage.naturalWidth, accessoryImage.naturalHeight);
  const w = accessoryImage.naturalWidth  * factor;
  const h = accessoryImage.naturalHeight * factor;
  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.rotation);
  if (ao.x || ao.y) ctx.translate(ao.x, ao.y);
  if (ao.rotation)  ctx.rotate(ao.rotation);
  if (s !== 1)      ctx.scale(s, s);
  ctx.drawImage(accessoryImage, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawBodyAccessory(ctx, character, worldTransforms, bodyAccessoryImage, animation) {
  if (!bodyAccessoryImage) return;
  const bone = worldTransforms['torso'];
  if (!bone) return;
  const ao = resolveBodyAccessoryOffset(character, animation);
  const s  = resolveBodyAccessoryScale(character);
  const factor = BODY_ACCESSORY_IMAGE_TARGET / Math.max(bodyAccessoryImage.naturalWidth, bodyAccessoryImage.naturalHeight);
  const w = bodyAccessoryImage.naturalWidth  * factor;
  const h = bodyAccessoryImage.naturalHeight * factor;
  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.rotation);
  if (ao.x || ao.y) ctx.translate(ao.x, ao.y);
  if (ao.rotation)  ctx.rotate(ao.rotation);
  if (s !== 1)      ctx.scale(s, s);
  ctx.drawImage(bodyAccessoryImage, -w / 2, -h / 2, w, h);
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
    skins = {}, bodyImage = null, headImage = null, weaponImage = null, accessoryImage = null,
    bodyAccessoryImage = null,
    animation = '',
    // isMelee: pass explicitly when the caller has access to customWeapons
    // so that custom weapons (key='cw_…') whose template='sword' draw behind
    // the head rather than in front of it.  Falls back to the MELEE_WEAPONS
    // set check when omitted.
    isMelee: isMeleeOpt = null,
    // partsFilter: null/undefined draws everything. Otherwise an object of
    // group flags { legs, head, others } — set a group to false to omit it.
    // Used by split-export to render legs / head / body onto separate sprite
    // sheets at identical frame coords so they overlay exactly downstream.
    //   others = back arm, body accessory, body, weapon, front arm, hand accessory
    //   head   = head skin (+ extras) and the head prop
    //   legs   = the two legs
    partsFilter = null,
    // partZOrder: optional back → front array of layer keys (see ORDERABLE_LAYERS)
    // overriding the default draw order — used by the per-animation z-order editor.
    partZOrder = null,
  } = options;

  const pf = partsFilter || {};
  const includeLegs   = pf.legs   !== false;
  const includeHead   = pf.head   !== false;
  const includeOthers = pf.others !== false;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  // Z-order, back → front. Each body part is a "layer" drawn in the order below
  // (default) or in a per-animation override (partZOrder). Head prop rides with
  // the head, the body accessory with the body, and the hand accessory always
  // sits on top of everything (not reorderable).
  //
  // Bone-name caveat: `right_arm` = character's LEFT (support) arm;
  //                   `left_arm`  = character's RIGHT (dominant) arm.
  void isMeleeOpt; // melee/ranged no longer changes the order
  const wt = worldTransforms;
  const armBehindLegs = character.weapon === 'none' || !character.weapon;

  const layerDraw = {
    right_arm: () => drawSkin(ctx, skins.right_arm || RIGHT_ARM_SKIN, wt, getColor(character, 'right_arm'), getScale(character, 'right_arm')),
    left_arm:  () => drawSkin(ctx, skins.left_arm  || LEFT_ARM_SKIN,  wt, getColor(character, 'left_arm'),  getScale(character, 'left_arm')),
    left_leg:  () => drawSkin(ctx, skins.left_leg  || LEFT_LEG_SKIN,  wt, getColor(character, 'left_leg'),  getScale(character, 'left_leg')),
    right_leg: () => drawSkin(ctx, skins.right_leg || RIGHT_LEG_SKIN, wt, getColor(character, 'right_leg'), getScale(character, 'right_leg')),
    weapon:    () => drawPart(ctx, 'weapon', character, wt, weaponImage, animation),
    body: () => {
      // Body accessory (cape / wings / backpack) sits just behind the body fill.
      drawBodyAccessory(ctx, character, wt, bodyAccessoryImage, animation);
      const bodyTmpl  = skins.body || BODY_SKIN;
      const bodyScale = getScale(character, 'body');
      if (bodyImage) drawSkinImage(ctx, bodyTmpl, wt, bodyImage, bodyScale);
      else           drawSkin(ctx, bodyTmpl, wt, getColor(character, 'body'), bodyScale);
    },
    head: () => {
      const headTmpl  = skins.head || HEAD_SKIN;
      const headScale = getScale(character, 'head');
      if (headImage) {
        drawSkinPinned(ctx, headTmpl, wt, headImage, headScale, headImageScaleFor(character, animation));
      } else {
        drawSkin(ctx, headTmpl, wt, getColor(character, 'head'), headScale);
        drawExtras(ctx, 'head', character, wt);
      }
      drawPart(ctx, 'head_prop', character, wt); // head prop rides with the head
    },
  };
  const includeFor = (key) =>
    (key === 'left_leg' || key === 'right_leg') ? includeLegs
    : key === 'head' ? includeHead
    : includeOthers;

  const order = resolveLayerOrder(partZOrder, armBehindLegs ? DEFAULT_ORDER_UNARMED : DEFAULT_ORDER_ARMED);
  for (const key of order) {
    if (includeFor(key)) layerDraw[key]();
  }

  // Hand accessory always sits on top of everything (not reorderable).
  if (includeOthers) drawAccessory(ctx, character, wt, accessoryImage, animation);

  if (showBones) {
    renderBones(ctx, worldTransforms, highlightBone);
  }

  ctx.restore();
}

/**
 * Renders a single named part group onto the current ctx.
 * The ctx must already have translate + scale set up so that character-local
 * coordinates map to the desired canvas region (same convention as renderCharacter).
 */
export function renderPartGroup(ctx, groupId, character, worldTransforms, options = {}) {
  const { skins = {}, bodyImage = null, headImage = null, weaponImage = null, animation = '' } = options;
  switch (groupId) {
    case 'head':
      if (headImage) {
        drawSkinPinned(ctx, skins.head || HEAD_SKIN, worldTransforms, headImage, getScale(character, 'head'), headImageScaleFor(character, animation));
      } else {
        drawSkin(ctx, skins.head || HEAD_SKIN, worldTransforms, getColor(character, 'head'), getScale(character, 'head'));
        drawExtras(ctx, 'head', character, worldTransforms);
      }
      break;
    case 'body':
      if (bodyImage) {
        drawSkinImage(ctx, skins.body || BODY_SKIN, worldTransforms, bodyImage, getScale(character, 'body'));
      } else {
        drawSkin(ctx, skins.body || BODY_SKIN, worldTransforms, getColor(character, 'body'), getScale(character, 'body'));
      }
      break;
    case 'right_arm':
      drawSkin(ctx, skins.right_arm || RIGHT_ARM_SKIN, worldTransforms, getColor(character, 'right_arm'), getScale(character, 'right_arm'));
      break;
    case 'left_arm':
      drawSkin(ctx, skins.left_arm || LEFT_ARM_SKIN, worldTransforms, getColor(character, 'left_arm'), getScale(character, 'left_arm'));
      break;
    case 'right_leg':
      drawSkin(ctx, skins.right_leg || RIGHT_LEG_SKIN, worldTransforms, getColor(character, 'right_leg'), getScale(character, 'right_leg'));
      break;
    case 'left_leg':
      drawSkin(ctx, skins.left_leg || LEFT_LEG_SKIN, worldTransforms, getColor(character, 'left_leg'), getScale(character, 'left_leg'));
      break;
    case 'weapon':
      drawPart(ctx, 'weapon', character, worldTransforms, weaponImage, animation);
      break;
  }
}

// Stable numeric IDs for each bone joint, shown in the debug overlay.
export const BONE_IDS = {
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
