# Stella's Birthday Card

A Disney-themed interactive storybook built as a personal birthday gift. Features an illustrated narrative across multiple chapters, ambient audio, a searchable slide navigator, and offline support via a service worker.

## Development

```
npm install
npm run dev
```

## Build & Deploy

```
npm run build
```

The `dist/` folder is automatically deployed to GitHub Pages on every push to `main` via the included GitHub Actions workflow. Enable it once under **Settings → Pages → Source → GitHub Actions**.

## Stack

- [Vite](https://vitejs.dev/) — build tool & dev server
- Vanilla JS / CSS — no framework dependencies
- Service Worker — cache-first offline support
