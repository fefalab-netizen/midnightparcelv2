# Mawhound asset notes

- Source: user-supplied `F:\Docu\DOWNLOADS\Mawhound.glb`; preserved verbatim as `Mawhound.glb`.
- Derived asset: `Mawhound-game.glb`, with 17 smoothly weighted joints and eight clips: Idle breathing, Walking, Rear-leg stand, Play bow, Curious head tilt, Happy greeting, Sniff around and Shake off.
- Colour: muted violet-grey fur, pale face/chest/horn regions and dark paws, stored as vertex colours. The embedded PNG supplies subtle procedural fur grain; colour is not baked into that grayscale PNG alone.
- Rebuild: `node tools/make-fur.mjs`, then `node tools/bake-mawhound.mjs`, from the WebXR folder. No external packages needed.
- Texture method: deterministic procedural pixels and a dependency-free PNG writer; no image-generation model used.
- Source mesh resolution is retained. Walking loops in place. The quadruped rig has articulated legs and paws, but no jaw/toe joints; navigation and camera tracking are provided by game code, rather than the GLB.



