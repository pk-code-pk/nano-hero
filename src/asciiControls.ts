// Frozen render config for the ASCII pass. These are the hand-tuned values the
// hero shipped with; the live tuning panel that produced them is gone.
export type AsciiControls = {
  cell: number; // glyph cell width in supersample px (height derives from it)
  ss: number; // supersample factor: render this many px per CSS px, then box-filter down
  base: number; // ambient ink floor so empty water is never pure black
  fill: number; // the cell's own scene color added flat behind the glyph mask
  ramp: number; // gamma on luminance before glyph selection
  camZ: number; // camera distance
  water: number; // underwater backdrop brightness
  caustics: number; // drifting light veins + shafts on the backdrop
  zoom: number; // caustic pattern scale: low = big soft light masses
  vignette: number; // corner falloff on the backdrop
  hot: number; // white blowout on the brightest caustic peaks
  subject: number; // gain on the koi, which sit in the dimmer colour branch
  textRamp: number; // index into TEXT_COLORS — 1 is ink
};

export const CONFIG: AsciiControls = Object.freeze({
  cell: 1,
  ss: 6,
  base: 0,
  fill: 0.8,
  ramp: 1.4,
  camZ: 1033,
  water: 1.97,
  caustics: 1.05,
  zoom: 0.63,
  vignette: 1,
  hot: 1.29,
  subject: 4,
  textRamp: 1,
});

export function useControls(): AsciiControls {
  return CONFIG;
}
