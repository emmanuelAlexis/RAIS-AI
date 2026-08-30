## Next.js Startup Frontend with Dark Mode

This repository is a small **Next.js startup frontend template** with **built‑in dark mode**, basic UI wiring, and sensible defaults. It is intended as a starting point for new projects: you get routing, theming, and a couple of reusable components so you can focus on product features instead of boilerplate.

## Features

- Next.js App Router (`src/app`), TypeScript, and React 19
- Dark / light theme support via a `ThemeProvider`
- Tailwind CSS v4 utilities for rapid styling
- Reusable UI pieces like `DarkModeToggle` and input components
- Toast notifications via [`sonner`](https://sonner.emilkowal.ski)
- Modern tooling (Turbopack dev server, TypeScript, PostCSS)

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS 4, PostCSS
- **Icons & animation helpers**: `lucide-react`, `framer-motion`, `react-icons`, `tw-animate-css`
- **Theming**: Custom `ThemeProvider` in `src/providers/ThemeProvider.tsx`

## Project Structure

```text
src/
  app/
    layout.tsx      # Root layout, wraps the app with ThemeProvider and Toaster
    page.tsx        # Home page demonstrating dark mode toggles
  components/
    DarkModeToggle.tsx
    Inputs.tsx
  providers/
    ThemeProvider.tsx
```

- `layout.tsx` registers the `ThemeProvider` and `Toaster` and sets basic layout styles.
- `page.tsx` shows how to use the `DarkModeToggle` component in different variants.

## Getting Started

Install dependencies (recommended: pnpm, but npm/yarn also work):

```bash
# with pnpm
pnpm install

# or with npm
npm install

# or with yarn
yarn install
```

Run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

The main page is defined in `src/app/page.tsx`. Changes are hot‑reloaded in development.

## Available Scripts

From the project root you can run:

- `pnpm dev` – start the dev server with Turbopack
- `pnpm build` – create an optimized production build
- `pnpm start` – run the production build
- `pnpm lint` – run Next.js linting

If you prefer npm or yarn, use the equivalent `npm run` / `yarn` commands.

## Theming & Dark Mode

- The global theming logic lives in `src/providers/ThemeProvider.tsx`.
- `DarkModeToggle` (in `src/components/DarkModeToggle.tsx`) is the main control used on the home page.
- Layout-level background and text colors come from Tailwind + theme classes applied in `layout.tsx` and `page.tsx` (`bg-background`, `text-foreground`, etc.).

To customize the look & feel:

- Adjust global styles in `src/app/globals.css` and Tailwind configuration.
- Extend or modify `ThemeProvider` to support additional themes.
- Reuse `DarkModeToggle` in your own pages or components.

## Customization Ideas

- Replace the `Home` heading in `page.tsx` with your real landing content.
- Add new routes under `src/app/` (e.g. `src/app/dashboard/page.tsx`).
- Create more shared UI components in `src/components/` and reuse them across pages.

## Deployment

You can deploy this app to any platform that supports Node.js and Next.js, such as **Vercel**, **Netlify**, or your own infrastructure. A typical production flow is:

```bash
pnpm install
pnpm build
pnpm start
```

Refer to your hosting provider’s Next.js deployment guide for exact configuration.
