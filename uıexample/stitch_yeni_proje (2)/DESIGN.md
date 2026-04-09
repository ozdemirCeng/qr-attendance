# Design System Specification: The Kinetic Precision Framework

## 1. Overview & Creative North Star
### The Creative North Star: "The Digital Pulse"
This design system moves away from static, boxy administration tools toward a "living" interface. We are building **The Digital Pulse**—a system defined by high-velocity interactions and editorial clarity. While most attendance systems feel like spreadsheets, this system feels like a premium flight deck.

We achieve this by breaking the "template" look through:
*   **Intentional Asymmetry:** Off-setting header content against wide-margin body text to create a high-end editorial rhythm.
*   **Tonal Depth:** Replacing harsh lines with a "stacking" philosophy that mimics physical glass panes.
*   **Kinetic Typography:** Using massive scale contrasts between `display-lg` numbers (for attendance counts) and `label-sm` metadata to guide the eye instantly.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Deep Sea" logic: high-contrast legibility in the foreground with deep, immersive layers in the background.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections.
*   **Separation through Tone:** Use the shift from `surface` (#f8f9ff) to `surface_container_low` (#eff4ff) to define headers or sidebars.
*   **Separation through Space:** Increase vertical padding to let the eye perceive grouping without "fencing" content in.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to create "nested" depth:
1.  **Base Layer:** `surface` (#f8f9ff) - The canvas.
2.  **Structural Sections:** `surface_container_low` (#eff4ff) - For sidebars or secondary navigation.
3.  **Actionable Cards:** `surface_container_lowest` (#ffffff) - Pure white "cards" that sit atop the greyish-blue base to pop forward.
4.  **Floating Elements:** `surface_container_highest` (#d3e4fe) - For active states or high-priority modals.

### The "Glass & Gradient" Rule
To escape the "flat" look, CTAs and Scanner Overlays must use:
*   **Primary Gradient:** From `primary` (#0058be) to `primary_container` (#2170e4) at a 135° angle.
*   **Glassmorphism:** For mobile scanner overlays, use `surface_container_low` at 70% opacity with a `20px` backdrop-blur. This ensures the camera feed is visible but the UI remains legible.

---

## 3. Typography
We utilize a dual-font approach to balance "High-Tech" authority with "Human" readability.

*   **Manrope (Headlines/Display):** Used for all `display` and `headline` tokens. Its geometric yet slightly rounded nature feels modern and "tech-oriented." 
*   **Inter (Body/UI):** Used for `title`, `body`, and `label` tokens. Inter’s high x-height ensures that student names and timestamps are legible even on small mobile screens during rapid scanning.

**The Power Scale:**
*   Use `display-lg` for the "Live Count" of students present.
*   Use `label-md` in `on_surface_variant` (#424754) for secondary metadata like "Last scanned 2m ago."

---

## 4. Elevation & Depth
We eschew traditional "Drop Shadows" for **Tonal Layering**.

*   **The Layering Principle:** A "Secondary Action" card should not have a shadow; it should simply be a `surface_container_lowest` block on a `surface` background.
*   **Ambient Shadows:** Use only for floating elements (e.g., the "Start Scan" FAB).
    *   *Shadow Specs:* Blur: `32px`, Spread: `-4px`, Color: `rgba(0, 88, 190, 0.08)` (a tinted primary).
*   **The Ghost Border:** If a boundary is required for accessibility (e.g., input fields), use `outline_variant` (#c2c6d6) at **15% opacity**. It should feel like a suggestion, not a constraint.

---

## 5. Components

### The "Pulse" Scanner (Mobile-First)
The QR viewfinder should not be a simple box. Use "Ghost Borders" on the corners only, using `primary_fixed` (#d8e2ff) to create a high-tech framing effect.

### Buttons (The Kinetic Trigger)
*   **Primary:** Gradient (`primary` to `primary_container`). `xl` roundedness (0.75rem). Subtle inner-glow on hover.
*   **Secondary:** No background. `surface_tint` text. High-contrast interaction.
*   **Status Buttons:** For "Attendance Confirmed," use `tertiary` (#006947) with a haptic vibration micro-interaction.

### Input Fields
*   **Style:** `surface_container_low` background, no border. On focus, transition to `surface_container_lowest` with a 1px `primary` "Ghost Border."
*   **Labeling:** Use `label-md` positioned strictly above the field, never as a placeholder.

### Cards & Lists (The Editorial Feed)
*   **Rule:** Forbid divider lines. 
*   **Execution:** Group student records by `surface_container_low` blocks. Use `body-md` for the name and `label-sm` for the timestamp. The "Success" dot (Emerald Green) should be a `12px` circle with a `tertiary_fixed` glow.

### Additional Relevant Components
*   **Status Pill:** A compact `tertiary_container` chip with `on_tertiary_container` text for "Present" or "Late."
*   **Scanning HUD:** A semi-transparent overlay at the bottom of the screen using Glassmorphism to show the last 3 people scanned in real-time.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `manrope` for numbers. It conveys a "high-tech" dashboard feel.
*   **Do** use massive whitespace (e.g., `48px` or `64px`) between major dashboard modules to emphasize the premium, editorial nature.
*   **Do** use "Surface Stacking" (White on Grey-Blue) to denote interactivity.

### Don't
*   **Don't** use black (#000000) for text. Always use `on_surface` (#0b1c30) for a softer, premium ink-like feel.
*   **Don't** use 1px borders to separate list items. Use vertical rhythm and color shifts.
*   **Don't** use standard "Success" greens. Use the specific `tertiary` (#006947) and `tertiary_fixed` (#6ffbbe) tokens to maintain the system's unique signature.
*   **Don't** use sharp corners. Every element must adhere to the `roundedness` scale, with a preference for `xl` (0.75rem) for main containers to keep the "User-friendly" promise.