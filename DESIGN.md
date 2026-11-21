# DESIGN SYSTEM SPECIFICATION: CELERITY / AURORA ETHEREAL

> **Design Directive**: All UI surfaces and components across the entire project must strictly derive from the reference design language: organic frosted aurora mesh gradients, tactile film noise/grain, translucent glassmorphism cards, and high-trust midnight sapphire typography accented with electric lime highlights.

---

## 1. Visual World & Aesthetic Identity

| Attribute | Specification |
|---|---|
| **Aesthetic Paradigm** | *Neo-Ethereal Aurora & Frosted Glassmorphism* with tactile micro-grain |
| **Mood & Emotion** | Calm, modern, ultra-premium, trustworthy, fluid, luminous |
| **Materiality** | Sandblasted frosted glass, soft diffused radial lighting, subtle analog film grain |
| **Typography Contrast** | Crisp geometric sans-serif in deep midnight sapphire navy against luminous pastel backdrops, paired with editorial italic highlights |

---

## 2. Color Palette & Token Definitions (Official Swatch Match)

### Primary Tones (Light Spectrum)
- **Warm Mist**: `#E9E9D9` (Veil and subtle ground transitions)
- **Mint**: `#C8E8D9` (Ambient glow and translucent frosted card wash)
- **Commerce Green**: `#65B99B` (Brand action, speed streaks, success badges)
- **Soft Gold**: `#E8C86B` / `#E8D58A` (Solar chamomile glow, highlight chips)
- **Ivory**: `#F8F8F3` (Core canvas ground and light card bodies)

### Dark Sections & Cinematic Depth
- **Carbon**: `#101413` (Deep void black for cinematic product showcase)
- **Deep Forest**: `#26352F` (Atmospheric chassis and contrast cards)
- **Sage**: `#A4B8AC` (Muted technical metadata, borders, supporting labels)
- **Celerity Midnight Sapphire**: `#0A2540` / `#07152B` (High-trust brand headings and buttons)

---

## 3. Signature Aurora Mesh Gradient & Grain Recipe

### CSS Mesh Gradient Formula
```css
.bg-aurora-mesh {
  background-color: #E2ECF2;
  background-image: 
    radial-gradient(at 15% 20%, rgba(245, 222, 152, 0.75) 0px, transparent 55%),
    radial-gradient(at 85% 15%, rgba(203, 211, 220, 0.85) 0px, transparent 50%),
    radial-gradient(at 25% 85%, rgba(158, 215, 183, 0.85) 0px, transparent 60%),
    radial-gradient(at 80% 80%, rgba(245, 222, 152, 0.60) 0px, transparent 55%),
    radial-gradient(at 50% 50%, rgba(226, 236, 242, 0.50) 0px, transparent 70%);
}
```

### Granular Film Grain Overlay
To achieve the exact tactile grain from Reference 1 and 3 without heavy image assets:
```html
<svg class="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.055] mix-blend-overlay">
  <filter id="aurora-noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
  </filter>
  <rect width="100%" height="100%" filter="url(#aurora-noise)" />
</svg>
```

---

## 4. Frosted Glass Cards (Zenvo Style)

### Mint / Travel Glass Card
```css
.glass-card-sage {
  background: rgba(158, 215, 183, 0.35);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 
    0 20px 40px -15px rgba(94, 170, 132, 0.15),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.6);
  border-radius: 28px;
}
```

### Gold / Crypto Glass Card
```css
.glass-card-gold {
  background: rgba(245, 222, 152, 0.38);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 
    0 20px 40px -15px rgba(229, 184, 66, 0.15),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.6);
  border-radius: 28px;
}
```

### Neutral White Frosted Card (Reference 1 Squircle)
```css
.glass-card-white {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 16px 36px -12px rgba(10, 37, 64, 0.08);
  border-radius: 26px;
}
```

---

## 5. Watermark Typography & Layout Rules
- **Large Translucent Watermarks**: Render brand names (e.g., `CELERITY` or `ZENVO`) in large bold sans-serif across the lower viewport section with `opacity: 0.12 - 0.22`, `letter-spacing: 0.08em`, and color `rgba(255, 255, 255, 0.6)`.
- **Card Badges & Glyphs**: Circular glass icon anchors (`w-12 h-12 rounded-full bg-white/20 flex items-center justify-center`) with top-right action arrows (`↗`).
- **Speed Trails**: Subtle linear gradient streaks fading smoothly (`linear-gradient(90deg, #10A37F, rgba(16, 163, 127, 0))`).

---

## 6. Installed Skills Reference
1. **Impeccable Design Engine**: `.agents/skills/impeccable` (CLI & audit/critique/polish tools)
2. **Taste Skill Frontend**: `.agents/skills/design-taste-frontend` (Anti-slop figma/x.ai quality standard)
3. **Image to Code**: `.agents/skills/image-to-code` (Design reference analysis and reproduction)
