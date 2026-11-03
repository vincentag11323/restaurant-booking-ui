# DESIGN.md — ResortOS Restaurant Booking

Direction from the product owner (2026-11-03): **warm fine dining, on a friendly light blue background.**

Design Read: booking web app for resort restaurant guests and floor staff, warm fine-dining language on a friendly light blue ground.
Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Palette (2 core + 1 accent, plus neutrals)
| Token | Hex | Role | Why |
|---|---|---|---|
| `sky` | `#E4EFF7` | Page ground | Owner asked for a friendly light blue; it keeps the warmth from feeling heavy |
| `pine` | `#1E4636` | Primary: headings, primary buttons, focus ring | Deep green reads as an established dining room, not a tech product |
| `brass` | `#8A6421` | The one accent: reservation code rule, chef's pick mark | Brass fittings of a fine-dining room. Used only at the "your table is held" moment and on chef's picks |
| `ink` | `#1B2A2F` | Body text | Near-black with a blue cast to sit on the sky ground |
| `paper` | `#FFFFFF` | Cards, forms | Clean surface for reading menus and forms |

Contrast (WCAG AA, computed with the WCAG 2 luminance formula): ink on sky 12.7:1, pine on paper 10.6:1, pine on sky 9.1:1, brass on paper 5.3:1, brass on sky 4.6:1, muted `#4A5A60` on paper 7.2:1 and on sky 6.2:1, error `#9B2C2C` on paper 7.5:1.

## Typography
* Headings: **Cormorant Garamond** 600. A menu-card serif, the clearest fine-dining signal we can give without imagery.
* Body and forms: **Source Sans 3**. Humanist and highly legible at form sizes; doesn't compete with the serif.
* Self-hosted via `@fontsource` (no third-party requests).

## Shape, depth, motion
* Radius: 6px for inputs and buttons, 12px for cards. Nothing is pill-shaped.
* Shadow: only on things that float above the page (detail drawer, dialogs). Cards sit flat with a 1px border.
* Motion: hover and focus states only (MOTION 1). Respect `prefers-reduced-motion`.
* Theme: light only. The owner-specified light blue ground is the brand. There is no dark theme to ship.

## Identity motif
The **place card**: the reservation code is set in the serif at large size between two dotted brass rules, like a folded table card. It appears on the confirmation screen and on each booking card. Slot times are written the way a menu lists courses: `19:30 – 22:00`.

## Copy voice
Plain, warm, specific. "Hold this table", "Change time", "Release booking". No buzzwords, no emoji, no em dashes.
