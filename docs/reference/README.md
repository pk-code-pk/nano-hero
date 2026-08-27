# Reference extractions

Design-language extractions from sites this project takes cues from. **These are
references, not our design system** — they describe someone else's site.

Generated with [designlang](https://github.com/Manavarya09/design-extract):

```bash
npx designlang https://sstr.tech/en/
```

## sstr-tech-*

Extraction of <https://sstr.tech/en/> (engineering documentation register).

What we took, in `src/site.css`:

| finding | ours |
|---|---|
| h1/h2 `line-height: 1.0` — display set solid | `--leading-solid`, applied to `.statement` |
| type ladder 85 / 43 / 28 / 21px (×2.0, ×1.5, ×1.33) | `--step-4` … `--step-1` |
| motion 50 / 100 / 160 / 300 / 500ms | `--dur-xs` … `--dur-lg` |
| dense body copy, 14.2px / 20px | `--step-0` for documentation copy |
| flat material — `avgShadowBlur: 0`, saturation 0.23 | no shadows anywhere; rules and hairlines only |
| CTA verbs: view / learn | "View case" |

What we deliberately did not take: their palette (`#fe5b2a` accent, `#2f3032`
ground), their faces (Arial / ABC Monument Grotesk), and their 7–11px radii —
this site is sharper, on 2px, and uses a chamfer instead of a radius.
