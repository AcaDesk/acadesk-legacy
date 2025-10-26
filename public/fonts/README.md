# Fonts for PDF Generation

This directory contains fonts used by @react-pdf/renderer for generating PDF documents.

## Required Fonts

Download the following Korean fonts and place them in this directory:

### Noto Sans KR (Google Fonts)

1. Visit: https://fonts.google.com/noto/specimen/Noto+Sans+KR
2. Download the font family
3. Extract and copy these files to this directory:
   - `NotoSansKR-Regular.ttf` (400 weight)
   - `NotoSansKR-Bold.ttf` (700 weight)
   - `NotoSansKR-Medium.ttf` (500 weight - optional)

### Alternative: Direct Download

You can also download from:
- GitHub: https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF/Korean
- Google Fonts Helper: https://gwfh.mranftl.com/fonts/noto-sans-kr

## File Structure

After downloading, your directory should look like:

```
public/fonts/
├── README.md (this file)
├── NotoSansKR-Regular.ttf
├── NotoSansKR-Bold.ttf
└── NotoSansKR-Medium.ttf (optional)
```

## Usage in Code

Fonts are registered in:
- `src/components/features/reports/ReportPdfDocument.tsx`

```typescript
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: '/fonts/NotoSansKR-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansKR-Bold.ttf', fontWeight: 700 },
  ],
})
```
