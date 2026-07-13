// Ported from ~/code/bopen-ai/src/components/catalog/visuals/DitherFallback.tsx
// per SPEC-OPL-2879-playground.md ("DitherAvatar ... banded hue like
// bopen-ai's DitherFallback"). Keeps the plugin tab icons on-brand
// (steel-blue / amber) instead of DitherAvatar's default rainbow hue.
import { fnv1a } from "@/components/dither-kit/pixel"

const BLUE_HUE = [195, 225] as const
const AMBER_HUE = [25, 45] as const

/** Map a stable seed into one of the site's two accent hue bands —
 * steel-blue (60%) or amber (40%) — so generated icons read as on-brand
 * rather than rainbow. Two independent hashes keep band selection and the
 * offset within the band from correlating. */
export function bandedHue(seed: string): number {
	const bandHash = fnv1a(`${seed}:band`)
	const offsetHash = fnv1a(`${seed}:hue`)
	const [min, max] = bandHash % 5 < 3 ? BLUE_HUE : AMBER_HUE
	return min + ((offsetHash % 1000) / 1000) * (max - min)
}
