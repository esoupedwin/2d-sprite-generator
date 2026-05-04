# 2D Character Generator

A browser-based tool for creating and animating modular 2D skeletal characters. Design a character, pose it, export sprite sheets, and author custom animations — all without leaving the browser.

![Stack](https://img.shields.io/badge/React-18-61dafb?logo=react) ![Stack](https://img.shields.io/badge/Vite-5-646cff?logo=vite) ![Stack](https://img.shields.io/badge/Canvas-2D-orange)

## Features

- **Modular character builder** — swap body parts, change colors, and scale each part independently
- **Skeletal animation** — 15-bone hierarchy with smooth keyframe interpolation
- **Built-in animations** — Idle, Walk, Run, Jump, Attack, Punch, Carry Walk
- **Ragdoll mode** — drag joints with IK to test poses interactively
- **Edit Structure** — reposition bones to reshape the character's proportions
- **Vector editor** — edit Bézier skin shapes per body part with Ctrl+click to add points
- **Pose editor** — create custom animations by posing the character across multiple frames using ragdoll IK; frames interpolate smoothly
- **Multi-character** — manage multiple characters in one session, duplicate and rename them
- **Export** — sprite sheet (PNG) and animation data (JSON)
- **Persistent saves** — characters auto-save to `characters.json` and localStorage

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:4000`.

## Usage

### Building a Character
Use the left sidebar to select body parts, adjust colors, and scale individual parts with the `−/+` controls.

### Animating
Pick an animation from the right sidebar. Switch to **Edit** mode to pose the character manually:
- **Ragdoll** — drag any joint; IK propagates naturally through the limb chain
- **Edit Structure** — reposition joints to change body proportions
- **Edit Vectors** — reshape skin outlines with Bézier handles (Ctrl+click to add points)

### Creating a Custom Animation
1. Click **+ New Animation** in the right sidebar
2. Drag joints in the canvas to pose frame 1 (uses ragdoll IK)
3. Click **+** to add more frames — each starts as a copy of the current pose
4. Adjust per-frame durations, toggle Loop, give it a name
5. Click **Create Animation** — it appears in the animation list immediately

### Exporting
- **Sprite Sheet (PNG)** — renders all frames of the current animation as a horizontal strip
- **Animation Data (JSON)** — exports keyframe data for use in a game engine

### Controls
| Action | Control |
|--------|---------|
| Zoom | Scroll wheel |
| Pan | Right-click drag |
| Undo | Ctrl+Z |
| Add vector point | Ctrl+click (in Edit Vectors mode) |

## Project Structure

```
src/
  systems/
    SkeletonSystem.js    — 15-bone hierarchy, world transform computation
    AnimationSystem.js   — keyframe animations, getPoseAtTime()
    SkinSystem.js        — Bézier skin drawing
    Renderer.js          — draw order, z-layering, renderCharacter()
    VectorEditor.js      — vector overlay, hit-testing, skin point editing
    IKSystem.js          — inverse kinematics solver
  data/
    characterParts.js    — part definitions and defaults
    defaultBuild.js      — Blue Smurf default new-character preset
  components/
    CharacterCanvas.jsx  — RAF loop, mouse interaction, zoom/pan, undo
    CharacterBuilder.jsx — left sidebar: parts, colors, scaling
    AnimationControls.jsx— right sidebar: animation buttons, playback, export
    PoseEditor.jsx       — multi-frame animation creator UI
  utils/
    transforms.js        — mergeOffsets() shared by canvas and export
    export.js            — sprite sheet and JSON export
    poseToAnimation.js   — converts pose frames to animation tracks
  App.jsx                — state owner, character CRUD, persistence
```

## Tech Stack

- **React 18** + **Vite 5** — no TypeScript, JSX only
- **HTML5 Canvas 2D** — no external rendering libraries
- **Vite dev-server plugin** — `/api/characters` endpoint persists characters to `characters.json`
