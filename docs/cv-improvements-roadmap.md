# LaTeX CV: Baseline Comparison & Enhancement Roadmap

This document analyzes the design, typography, and component differences between the **original baseline template (`screen.png`)** and the **current generation pipeline (`cv_rendered.png`)**, and details actionable enhancements for future iterations.

---

## 1. Visual & Structural Comparison

```
Original Template (screen.png)                 Current Pipeline (cv_rendered.png)
┌──────────────────┬────────────────────────┐  ┌──────────────────┬────────────────────────┐
│ [HARSH GADGIL]   │ [Edu]cation            │  │ [RYAN KELLY]     │ [Per]sonal Profile     │
│ Data Engineer    │ 2015-2017 MSc (GPA 3.7)│  │ Principal SWE    │ Career narrative...    │
│                  │                        │  │                  │                        │
│ 📱 Phone         │ [Res]earch             │  │ ✉️ Email         │ [Emp]loyment History   │
│ 🌐 Website       │ 2015-2017 MSc Thesis   │  │ 🔗 LinkedIn      │ 2019-Present Sentric   │
│ ✉️ Email         │ • Bullet achievements  │  │ 🐙 GitHub        │ • Scale royalties      │
│ 🔗 LinkedIn      │ • Tools: R, Python...  │  │                  │ • Modern .NET & React  │
│ 🐙 GitHub        │                        │  │ [Tech]nologies   │ • AI Code Agents       │
│                  │ [Pub]lications         │  │ Overview text    │ • Observability & IAC  │
│ [Skills]──────── │ Conference papers...   │  │                  │                        │
│ 🔘 SmartDiagram  │                        │  │ • Core Langs     │ 2017-2019 Zuto         │
│   Bubble Chart   │ [Exp]erience           │  │ • Cloud / Data   │ • Cloud fintech APIs   │
│                  │ 2017-Pres Data Engineer│  │ • Practices      │                        │
│ [Prog]ramming─── │ • Realtime Kafka pipeline│ │                  │ 2014-2017 AutoCoding   │
│ 📊 TikZ LOC Bars │                        │  │ [Ref]erences──── │ • Factory automation   │
│   HTML, Java, C  │                        │  │ Robert Roe       │                        │
│                  │                        │  │ Dan Cartwright   │ [Edu]cation            │
│ [Proj]ects────── │                        │  │ Details: Request │ 2012-2016 BSc CS (1st) │
│ DecAR, CIS*6320..│                        │  │                  │ 2010-2012 A-Levels     │
└──────────────────┴────────────────────────┘  └──────────────────┴────────────────────────┘
```

---

## 2. Identified Differences & Lessons from Original

| Area | Original Template (`screen.png`) | Current Implementation (`cv/template.tex`) | Opportunity / Analysis |
| :--- | :--- | :--- | :--- |
| **Header Accent** | First 3 letters of each section title highlighted in cyan box (`\round` / `\@sectioncolor`) with crisp geometric contrast. | Currently active, but title hierarchy and padding can be tuned. | Refine vertical baseline and line-height alignment between the 3-letter accent and heading text. |
| **Skills Visualization** | **SmartDiagram Bubble Chart** showing interconnected technical domains (OOP, Full Stack, Data Eng, ML). | Replaced with textual categorized bullet lists. | The bubble diagram provides instant visual weight and domain balance; could be added as an optional modular chart. |
| **Proficiency Bar Chart** | **TikZ Horizontal LOC / Proficiency Bars** (`0 LOC ───> 5000 LOC` or skill levels). | Removed in favor of text bullets. | Visual bars provide high scannability for primary languages (C#, F#, TypeScript, Python, SQL). |
| **Contact Icons** | Circular rounded icon backgrounds (`\icon`) with precise vertical alignment. | Plain FontAwesome glyphs with custom tabular baseline adjustments. | Clean up tabular icon grid alignment and standardize baseline icon sizing. |
| **Typography & Fonts** | Rendered via `ClearSans` with `segoeuib.ttf` for bold headings; distinct weight hierarchy between job titles and company links. | Identical fonts, but itemized list line heights and bullet margins were tightened to prevent page overrun. | Fine-tune `twentyitem` paragraph line-spread to achieve maximum sharpness and clarity. |

---

## 3. Potential Improvements & Actionable Roadmap

### Phase 1: High-Fidelity Typography & Section Layout
- [ ] **Section Header Tuning**: Calibrate the `\@sectioncolor` macro in `cv/twentysecondcv.cls` so multi-word headings have crisp, uniform baseline alignment across all engines.
- [ ] **Dual Column Weighting**: Adjust sidebar width ratio (currently `7.6cm` left margin on `letterpaper`) to balance sidebar density against high-density job bullet points.
- [ ] **Typography Hierarchy**: Use distinct font weights for `Job Title` (Bold Segoe UI) vs `Company / Organization` (Subtle tint/italic link) vs `Period` (Muted monospace/small caps).

### Phase 2: Re-introducing Modular Visual Components
- [ ] **SmartDiagram Bubble Diagram**: Re-integrate the `\smartdiagram[bubble diagram]` macro driven by `data/about/skills.json` (e.g. Center: *Principal Engineer*, Orbiting: *Distributed Systems*, *Compilers / Source Generators*, *Cloud Architecture*, *AI Agents*, *Data Engineering*).
- [ ] **Skill Proficiency Indicators**: Offer an optional TikZ proficiency/experience scale component configurable via JSON (`"level": 90%`).
- [ ] **Featured Open Source Callout**: Add structured badges/chips in the sidebar for top GitHub projects (`Resultful`, `Parquet.SourceGenerator`, `Mermaid Toolkit`).

### Phase 3: Enhanced Automated Baselining & Multi-Format PDF Testing
- [ ] **PDF Visual Regression Testing**: Add automated visual snapshot diffing for `cv.pdf` using `pdftoppm` / `pdf2image` inside Playwright / Vitest CI to prevent unintended layout shift.
- [ ] **A4 & Letterpaper Dual Target**: Support both standard US Letter and international A4 formats dynamically from `scripts/generate-cv-tex.mjs`.
- [ ] **Custom Color Palette Themes**: Expose theme color definitions (`pblue`, `sidecolor`, `headercolor`) in `data/about/profile.json` so the LaTeX CV and website share matching hex tokens.
