# How to Implement Shadcn UI with Tailwind v4 in a Turborepo | by Soumyadip Dutta | Medium

# How to Implement Shadcn UI with Tailwind v4 in a Turborepo

[

![Soumyadip Dutta](https://miro.medium.com/v2/da:true/resize:fill:51:51/0*BG1c6qxecq8PsaE4)

](/@soumyadipdutta1004?source=post_page---byline--b7853c65e699---------------------------------------)

[Soumyadip Dutta](/@soumyadipdutta1004?source=post_page---byline--b7853c65e699---------------------------------------)

Follow

6 min read

·

Nov 4, 2025

[

](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fb7853c65e699&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soumyadipdutta1004%2Fhow-to-implement-shadcn-in-a-turborepo-b7853c65e699&user=Soumyadip+Dutta&userId=106a8f93ea39&source=---header_actions--b7853c65e699---------------------clap_footer------------------)

12

1

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Frepost%2Fp%2Fb7853c65e699&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soumyadipdutta1004%2Fhow-to-implement-shadcn-in-a-turborepo-b7853c65e699&user=Soumyadip+Dutta&userId=106a8f93ea39&source=---header_actions--b7853c65e699---------------------repost_header------------------)

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fb7853c65e699&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soumyadipdutta1004%2Fhow-to-implement-shadcn-in-a-turborepo-b7853c65e699&source=---header_actions--b7853c65e699---------------------bookmark_footer------------------)

[

Listen

](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3Db7853c65e699&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soumyadipdutta1004%2Fhow-to-implement-shadcn-in-a-turborepo-b7853c65e699&source=---header_actions--b7853c65e699---------------------post_audio_button------------------)

Share

Let’s go step by step and set up Shadcn UI inside a Turborepo workspace properly.

## Start by Creating a New Monorepo

Run the following command to create a new **Turborepo**:

npx create-turbo@latest

## Integrating Shadcn UI

Your `ui` package should have a structure like this:

ui/  
├── eslint.config.mjs  
├── package.json  
├── src/  
│   ├── button.tsx  
│   ├── card.tsx  
│   └── code.tsx  
└── tsconfig.json

## Step 1: Install Tailwind CSS v4

We’ll follow the official [Tailwind CSS docs](https://tailwindcss.com/docs/installation/using-postcss) with minor adjustments for our Turborepo setup.

## Install Tailwind CSS v4

Navigate to your UI package:

cd packages/ui/

Install the required packages:

npm install tailwindcss @tailwindcss/postcss postcss

Create a `postcss.config.mjs` file and configure it like this:

`/packages/ui/postcss.config.mjs`

export default {  
  plugins: {  
    "@tailwindcss/postcss": {},  
  }  
}

Next, create a `globals.css` file inside the `/src/styles` directory and import Tailwind:

`/packages/ui/src/styles/globals.css`

@import "tailwindcss";

At this point, your folder structure should look like this:

ui/  
├── eslint.config.mjs  
├── package.json  
├── postcss.config.mjs  
├── src/  
│   └── styles/  
│      └── globals.css  
└── tsconfig.json

## Step 2: Setting Up Shadcn

> _Note: The Shadcn CLI will not work out of the box in this setup because our ui package isn’t based on any specific framework (like React or Next.js). You’ll get an error similar to this:_

▲ ~ ./shadcn git:\[main\] $ npx shadcn@latest init  
✔ Preflight checks.  
✖ Verifying framework.  
  
We could not detect a supported framework at C:\\\\Users\\\\myasu\\\\Desktop\\\\Test\\\\shadcn.  
Visit <https://ui.shadcn.com/docs/installation/manual> to manually configure your project.  
Once configured, you can use the CLI to add components.

So, we’ll **manually configure Shadcn UI** for our Turborepo setup.

Navigate to your UI package:

cd packages/ui/

## Install Required Dependencies

Run the following command:

npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css

## Configure Path Aliases

Update your `tsconfig.json` as follows:

`/packages/ui/tsconfig.json`

{  
  "extends": "@repo/typescript-config/react-library.json",  
  "compilerOptions": {  
    "baseUrl": ".",  
    "paths": {  
      "@repo/ui/\*": \["./src/\*"\]  
    }  
  },  
  "include": \["src"\],  
  "exclude": \["node\_modules", "dist"\]  
}

> _You can replace @repo/ui with any alias of your choice — this is just a convention._

## Configure Global Styles

Open your `styles/globals.css` file and add the following:

`/packages/ui/src/styles/globals.css`

@import "tailwindcss";  
@import "tw-animate-css";  
  
@custom-variant dark (&:is(.dark \*));  
  
:root {  
  \--background: oklch(1 0 0);  
  \--foreground: oklch(0.145 0 0);  
  \--card: oklch(1 0 0);  
  \--card-foreground: oklch(0.145 0 0);  
  \--popover: oklch(1 0 0);  
  \--popover-foreground: oklch(0.145 0 0);  
  \--primary: oklch(0.205 0 0);  
  \--primary-foreground: oklch(0.985 0 0);  
  \--secondary: oklch(0.97 0 0);  
  \--secondary-foreground: oklch(0.205 0 0);  
  \--muted: oklch(0.97 0 0);  
  \--muted-foreground: oklch(0.556 0 0);  
  \--accent: oklch(0.97 0 0);  
  \--accent-foreground: oklch(0.205 0 0);  
  \--destructive: oklch(0.577 0.245 27.325);  
  \--destructive-foreground: oklch(0.577 0.245 27.325);  
  \--border: oklch(0.922 0 0);  
  \--input: oklch(0.922 0 0);  
  \--ring: oklch(0.708 0 0);  
  \--chart-1: oklch(0.646 0.222 41.116);  
  \--chart-2: oklch(0.6 0.118 184.704);  
  \--chart-3: oklch(0.398 0.07 227.392);  
  \--chart-4: oklch(0.828 0.189 84.429);  
  \--chart-5: oklch(0.769 0.188 70.08);  
  \--radius: 0.625rem;  
  \--sidebar: oklch(0.985 0 0);  
  \--sidebar-foreground: oklch(0.145 0 0);  
  \--sidebar-primary: oklch(0.205 0 0);  
  \--sidebar-primary-foreground: oklch(0.985 0 0);  
  \--sidebar-accent: oklch(0.97 0 0);  
  \--sidebar-accent-foreground: oklch(0.205 0 0);  
  \--sidebar-border: oklch(0.922 0 0);  
  \--sidebar-ring: oklch(0.708 0 0);  
}  
  
.dark {  
  \--background: oklch(0.145 0 0);  
  \--foreground: oklch(0.985 0 0);  
  \--card: oklch(0.145 0 0);  
  \--card-foreground: oklch(0.985 0 0);  
  \--popover: oklch(0.145 0 0);  
  \--popover-foreground: oklch(0.985 0 0);  
  \--primary: oklch(0.985 0 0);  
  \--primary-foreground: oklch(0.205 0 0);  
  \--secondary: oklch(0.269 0 0);  
  \--secondary-foreground: oklch(0.985 0 0);  
  \--muted: oklch(0.269 0 0);  
  \--muted-foreground: oklch(0.708 0 0);  
  \--accent: oklch(0.269 0 0);  
  \--accent-foreground: oklch(0.985 0 0);  
  \--destructive: oklch(0.396 0.141 25.723);  
  \--destructive-foreground: oklch(0.637 0.237 25.331);  
  \--border: oklch(0.269 0 0);  
  \--input: oklch(0.269 0 0);  
  \--ring: oklch(0.439 0 0);  
  \--chart-1: oklch(0.488 0.243 264.376);  
  \--chart-2: oklch(0.696 0.17 162.48);  
  \--chart-3: oklch(0.769 0.188 70.08);  
  \--chart-4: oklch(0.627 0.265 303.9);  
  \--chart-5: oklch(0.645 0.246 16.439);  
  \--sidebar: oklch(0.205 0 0);  
  \--sidebar-foreground: oklch(0.985 0 0);  
  \--sidebar-primary: oklch(0.488 0.243 264.376);  
  \--sidebar-primary-foreground: oklch(0.985 0 0);  
  \--sidebar-accent: oklch(0.269 0 0);  
  \--sidebar-accent-foreground: oklch(0.985 0 0);  
  \--sidebar-border: oklch(0.269 0 0);  
  \--sidebar-ring: oklch(0.439 0 0);  
}  
  
@theme inline {  
  \--color-background: var(--background);  
  \--color-foreground: var(--foreground);  
  \--color-card: var(--card);  
  \--color-card-foreground: var(--card-foreground);  
  \--color-popover: var(--popover);  
  \--color-popover-foreground: var(--popover-foreground);  
  \--color-primary: var(--primary);  
  \--color-primary-foreground: var(--primary-foreground);  
  \--color-secondary: var(--secondary);  
  \--color-secondary-foreground: var(--secondary-foreground);  
  \--color-muted: var(--muted);  
  \--color-muted-foreground: var(--muted-foreground);  
  \--color-accent: var(--accent);  
  \--color-accent-foreground: var(--accent-foreground);  
  \--color-destructive: var(--destructive);  
  \--color-destructive-foreground: var(--destructive-foreground);  
  \--color-border: var(--border);  
  \--color-input: var(--input);  
  \--color-ring: var(--ring);  
  \--color-chart-1: var(--chart-1);  
  \--color-chart-2: var(--chart-2);  
  \--color-chart-3: var(--chart-3);  
  \--color-chart-4: var(--chart-4);  
  \--color-chart-5: var(--chart-5);  
  \--radius-sm: calc(var(--radius) - 4px);  
  \--radius-md: calc(var(--radius) - 2px);  
  \--radius-lg: var(--radius);  
  \--radius-xl: calc(var(--radius) + 4px);  
  \--color-sidebar: var(--sidebar);  
  \--color-sidebar-foreground: var(--sidebar-foreground);  
  \--color-sidebar-primary: var(--sidebar-primary);  
  \--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);  
  \--color-sidebar-accent: var(--sidebar-accent);  
  \--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);  
  \--color-sidebar-border: var(--sidebar-border);  
  \--color-sidebar-ring: var(--sidebar-ring);  
}  
  
@layer base {  
  \* {  
    @apply border-border outline-ring/50;  
  }  
  body {  
    @apply bg-background text-foreground;  
  }  
}

This defines color variables, theming, and animation support.

## Add a `cn` Utility Helper

Create a file at `/src/lib/utils.ts` and add this helper:

`/packages/ui/src/lib/utils.ts`

import { clsx, type ClassValue } from "clsx"  
import { twMerge } from "tailwind-merge"  
  
export function cn(...inputs: ClassValue\[\]) {  
  return twMerge(clsx(inputs))  
}

This function merges class names intelligently — it’s used in most Shadcn components.

## Create a `components.json` File

In the root of your `ui` package, add:

## Get Soumyadip Dutta’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

`/packages/ui/components.json`

{  
  "$schema": "<https://ui.shadcn.com/schema.json>",  
  "style": "new-york",  
  "rsc": false,  
  "tsx": true,  
  "tailwind": {  
    "config": "",  
    "css": "src/styles/globals.css",  
    "baseColor": "neutral",  
    "cssVariables": true,  
    "prefix": ""  
  },  
  "iconLibrary": "lucide",  
  "aliases": {  
    "components": "@repo/ui/components",  
    "ui": "@repo/ui/components",  
    "utils": "@repo/ui/lib/utils",  
    "lib": "@repo/ui/lib",  
    "hooks": "@repo/ui/hooks"  
  }  
}

## Important Tailwind Note

Make sure your Tailwind build includes the `ui` components by adding this to your main CSS file:

`/packages/ui/src/styles/globals.css`

@import 'tailwindcss';  
@import 'tw-animate-css';  
  
@source "../../../../packages/ui/src/\*\*/\*.{js,ts,jsx,tsx}";

This tells Tailwind to scan and include all class names from the `ui/src` directory — otherwise, they might get purged from the final CSS build.

## You’re Done with UI Setup!

Now you can start adding Shadcn components using the CLI — just make sure you’re inside the `ui` directory:

▲ ~ ./ui git:\[main\] $ npx shadcn@latest add button  
✔ Checking registry.  
✔ Installing dependencies.  
✔ Created 1 file:  
  - src\\\\\\\\components\\\\\\\\button.tsx

## Step 3: Using Shadcn Components in Next.js Projects

Modify your `ui` package’s `package.json` to export your files properly:

`/packages/ui/package.json`

"exports": {  
    "./globals.css": "./src/styles/globals.css",  
    "./postcss.config": "./postcss.config.mjs",  
    "./lib/\*": "./src/lib/\*.ts",  
    "./hooks/\*": \[  
      "./src/hooks/\*.ts",  
      "./src/hooks/\*.tsx"  
    \],  
    "./components/\*": "./src/components/\*.tsx"  
 }

## Setting Up in the Next.js App

Your Next.js app structure should look like this:

web/  
  ├── app/  
  │   ├── favicon.ico  
  │   ├── fonts/  
  │   ├── globals.css  
  │   ├── layout.tsx  
  │   ├── page.module.css  
  │   └── page.tsx  
  ├── eslint.config.js  
  ├── next.config.js  
  ├── package.json  
  ├── public/  
  ├── README.md  
  └── tsconfig.json

## Add the UI Package

If it’s not already included, add `@repo/ui` as a dependency:

`/apps/web/package.json`

"dependencies": {  
  "@repo/ui": "\*",  
  // other dependencies  
}

Then run:

npm install

## Create a PostCSS Config

Create a `postcss.config.mjs` file in your Next.js project root:

`/apps/web/postcss.config.mjs`

export { default } from "@repo/ui/postcss.config";

## Add Path Aliases

Update your `tsconfig.json` file:

`/apps/web/tsconfig.json`

"paths": {  
  "@/\*": \["./src/\*"\],  
  "@repo/ui/\*": \["../../packages/ui/src/\*"\]  
}

## Update `next.config.ts`

`/apps/web/next.config.ts`

import type { NextConfig } from 'next';  
  
const nextConfig: NextConfig = {  
  transpilePackages: \["@repo/ui"\], // ensures UI package is compiled  
};  
  
export default nextConfig;

> _This tells Next.js to transpile your @repo/ui code (since it’s symlinked into node\_modules). Without this, Next.js would treat it as a precompiled dependency — causing errors._

## Create a `components.json` File

In your Next.js project root, add:

`/apps/web/components.json`

{  
  "$schema": "<https://ui.shadcn.com/schema.json>",  
  "style": "new-york",  
  "rsc": true,  
  "tsx": true,  
  "tailwind": {  
    "config": "",  
    "css": "../../packages/ui/src/styles/globals.css",  
    "baseColor": "neutral",  
    "cssVariables": true  
  },  
  "iconLibrary": "lucide",  
  "aliases": {  
    "components": "@/components",  
    "hooks": "@/hooks",  
    "lib": "@/lib",  
    "utils": "@repo/ui/lib/utils",  
    "ui": "@repo/ui/components"  
  }  
}

## Import Global Styles

Delete the default `globals.css` file in your Next.js app and import the shared styles in `layout.tsx`:

`/apps/web/app/layout.tsx`

import '@repo/ui/globals.css';

## That’s It 🎉

You can now use Shadcn components anywhere in your Next.js app like this:

import { Button, buttonVariants } from '@repo/ui/components/button';

Your final Next.js project structure will look like this:

web/  
  ├── app/  
  │   ├── favicon.ico  
  │   ├── fonts/  
  │   ├── layout.tsx  
  │   └── page.tsx  
  ├── components.json  
  ├── eslint.config.js  
  ├── next.config.js  
  ├── package.json  
  ├── postcss.config.mjs  
  ├── public/  
  ├── README.md  
  └── tsconfig.json

✅ **You now have a fully functional Turborepo setup with Shadcn UI components, Tailwind v4, and Next.js — all working together seamlessly.**

## Embedded Content

---