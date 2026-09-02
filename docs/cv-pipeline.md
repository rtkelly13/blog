# Curriculum Vitae (CV) Pipeline

This directory contains the original Overleaf LaTeX resume baseline, fonts, assets, and the automated compilation workflow.

## Structure

- `cv/template.tex` — Original pristine Overleaf LaTeX CV template.
- `cv/twentysecondcv.cls` — Custom LaTeX class defining layout, colors, and sidebar geometry (requires XeLaTeX).
- `cv/fonts/` — Segoe UI Bold font for headings.
- `cv/img/` — Trophy icon and visual assets.
- `cv/screen.png` — Original visual reference screenshot.
- `public/cv.pdf` — Compiled production PDF artifact for direct downloads.
- `.github/workflows/cv-build.yml` — Automated XeLaTeX compilation workflow on GitHub Actions.
