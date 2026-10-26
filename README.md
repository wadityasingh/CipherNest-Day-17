# CipherNest — Password Atelier

> **"Your characters. Your control."**

CipherNest is a refined, client-side password workstation inspired by premium desktop utilities, editorial design, and minimalist tooling. Built entirely with vanilla web standards, it generates cryptographically secure, fully customizable credentials locally in your browser.

---

## Highlights

- **Cryptographically Secure**: Leverages the browser's native `crypto.getRandomValues()` Web Crypto API for non-deterministic entropy.
- **Unbiased Randomness**: Eliminates modulo bias using uniform rejection sampling over a 32-bit integer space.
- **Guaranteed Category Inclusion**: Guarantees at least one character from each selected category when length permits, followed by an in-place Fisher–Yates shuffle.
- **Precision Length Controls**: Synchronized range slider and numeric input supporting lengths from 4 to 64 characters (default: 16).
- **Independent Character Sets**: Granular toggles for Uppercase (`A–Z`), Lowercase (`a–z`), Numbers (`0–9`), and Symbols (`!@#$%^&*`).
- **Inline Validation**: Prevents empty character sets with accessible inline validation and dynamic button states.
- **Heuristic Strength Meter**: Segmented 4-level indicator (Weak, Fair, Strong, Very strong) based on character variety and length.
- **One-Click Clipboard Copy**: Seamless copying using the Async Clipboard API with automatic fallback and tactile feedback.
- **Zero Dependencies**: Pure HTML5, CSS3, and Vanilla JavaScript with no external libraries, fonts, or frameworks.
- **Privacy by Design**: Operates 100% in-memory within your current tab. Passwords are never sent over the network, logged, or saved to `localStorage`.

---

## File Structure

```text
├── index.html       # Semantic HTML5 workstation markup and accessible forms
├── style.css        # Pure CSS3 styles, custom properties, and responsive grid layout
├── script.js        # Vanilla JS logic: Web Crypto generation, validation, and UI bindings
└── README.md        # Project documentation
```

---

## Color Palette

The interface adheres to an intentional, high-contrast, editorial palette:

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| `--bg-paper` | `#F5F3EC` | Warm paper background |
| `--surface-white` | `#FFFFFF` | Surface container background |
| `--text-charcoal` | `#252923` | Primary text and headings |
| `--text-secondary` | `#74776F` | Secondary descriptions and notes |
| `--accent-forest` | `#315C45` | Primary action button, active toggles, strong states |
| `--surface-sage` | `#E8EEE5` | Accent surface backgrounds and badge fills |
| `--accent-copper` | `#B87550` | Focus outlines, warnings, and lower strength levels |
| `--border-neutral` | `#DEDDD4` | Structural hairline dividers and input borders |

---

## Cryptographic Generation Logic

### 1. Unbiased Integer Selection (Rejection Sampling)
Simple modulo operations (`rand % N`) introduce mathematical bias toward smaller integers whenever the maximum value of the random generator is not an exact multiple of `N`.

CipherNest overcomes this with rejection sampling:
```javascript
const maxUint32 = 0xffffffff;
const limit = maxUint32 - ((maxUint32 + 1) % maxExclusive);
const buffer = new Uint32Array(1);

while (true) {
  window.crypto.getRandomValues(buffer);
  const candidate = buffer[0];
  if (candidate <= limit) {
    return candidate % maxExclusive;
  }
}
```

### 2. Character Guarantee & Shuffle
1. For every active character set, a random character is drawn to ensure coverage.
2. The remaining positions up to the desired length are filled from the pooled selected sets.
3. The resulting array is shuffled using an unbiased **Fisher–Yates shuffle** so characters never sit at predictable positions.

---

## Getting Started

Because CipherNest is completely self-contained, no build steps are required.

### Option A: Direct Open
Simply open `index.html` in any modern web browser:
```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

### Option B: Local Static Server
You can also serve it with any lightweight HTTP server:
```bash
# Using Python 3
python3 -m http.server 3000

# Using Node.js npx serve
npx serve .
```

### Option C: Development Server
If using the bundled package scripts:
```bash
npm install
npm run dev
```

---

## Accessibility & Responsiveness

- **Keyboard Accessible**: All controls feature visible `:focus-visible` focus rings and standard tab sequencing.
- **Screen Reader Support**: Uses semantic form elements, explicit `label` associations, and `aria-live="polite"` regions for output status and strength changes.
- **Motion Restraint**: Includes a `@media (prefers-reduced-motion: reduce)` media query that disables transitions for users sensitive to motion.
- **Fluid Layout**: Uses a two-column desktop grid that stacks seamlessly into a clean single-column view on mobile screens without horizontal overflow.

---

## License

MIT License. Designed and crafted for high-security browser-side credential generation.
