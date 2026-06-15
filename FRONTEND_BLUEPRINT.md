# FRONTEND BLUEPRINT - AgriCalc

This document outlines the UI design rules, visual aesthetics, component structures, responsive layouts, and animations that constitute the user experience of AgriCalc.

## 1. Visual Aesthetics & Theme
We utilize a modern **Eco-Glassmorphism** styling system with deep organic greens, dark backgrounds, high blur values, and subtle glowing borders.

### CSS Custom Properties (Tokens)
```css
:root {
  /* HSL Color Space */
  --bg-primary: hsl(140, 25%, 6%);
  --bg-secondary: hsl(140, 20%, 12%);
  --bg-card: hsla(140, 15%, 15%, 0.65);
  
  --primary: hsl(142, 72%, 40%);
  --primary-glow: hsla(142, 72%, 40%, 0.35);
  --accent: hsl(45, 95%, 50%);
  
  --text-main: hsl(140, 10%, 95%);
  --text-muted: hsl(140, 10%, 65%);
  
  --border-glass: hsla(142, 20%, 30%, 0.25);
  --border-focus: hsla(142, 72%, 50%, 0.6);
  
  --shadow-main: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  --glass-blur: 12px;
  --radius-lg: 16px;
  --radius-md: 8px;
}

[data-theme="light"] {
  --bg-primary: hsl(140, 30%, 96%);
  --bg-secondary: hsl(140, 20%, 90%);
  --bg-card: hsla(140, 15%, 98%, 0.8);
  
  --primary: hsl(142, 76%, 30%);
  --primary-glow: hsla(142, 76%, 30%, 0.15);
  
  --text-main: hsl(140, 30%, 15%);
  --text-muted: hsl(140, 15%, 45%);
  
  --border-glass: hsla(142, 20%, 80%, 0.5);
  --shadow-main: 0 8px 32px 0 rgba(10, 40, 10, 0.08);
}
```

---

## 2. Layout Structure
A fluid responsive flex/grid structure that seamlessly adapts across mobile, tablet, and widescreen layouts.

### Screen Layout Hierarchy
- **Header**: Contains the app title (AgriCalc), theme toggler, and language switcher (ID/EN).
- **Navigation Sidebar (Desktop) / Bottom Bar (Mobile)**:
  - 🏠 Dashboard
  - 🌱 Populasi (Population Grid simulator)
  - 🧪 Pupuk (Fertilizer Doser)
  - 💧 Pestisida (Calibration & Sprayer)
  - 📈 Ekonomi (ROI & BEP cost analyzer)
- **Main Working Space**: Area for current active module.
  - Left pane: Interactive forms with real-time numeric inputs.
  - Right pane: Calculation outputs, charts, recommendation checklists, and quick PDF export triggers.

---

## 3. Key UI Components

### A. Field Simulator Canvas (Population Module)
A dynamic HTML5 `<canvas>` which renders the physical crop spacing layout.
- If row spacing is $0.75m$ and column spacing is $0.20m$, it visually scales and draws dots representing plants in the selected configuration (rectangular vs triangular).
- Interactivity: Slider changes spacing live, redraws the crop density immediately.

### B. Dynamic Cost Breakdown Chart (Economics Module)
A clean, native HTML/SVG bar/pie chart component representing agricultural production costs:
- Land Rental, Seeds, Fertilizers, Pesticides, Labor, and Other Costs.
- Allows user to toggle and exclude items to recalculate ROI instantly.