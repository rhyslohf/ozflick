\# OzFlick — Product \& SEO Brief



> \*\*Purpose of this document\*\*

> This brief gives an AI agent full context about the OzFlick product so it can implement all required SEO, Open Graph, PWA, and browser-detection changes to the front-end without needing further clarification.



\---



\## 1. Product Overview



| Field | Value |

|---|---|

| \*\*App name\*\* | OzFlick |

| \*\*Tagline\*\* | \*Swipe Australia's Hottest Deals\* |

| \*\*Category\*\* | Deals discovery / price comparison |

| \*\*Target market\*\* | Australian consumers hunting for bargains |

| \*\*Core behaviour\*\* | TikTok-style full-screen vertical snap-scroll feed of live deals sourced from OzBargain's RSS feed |

| \*\*Primary URL\*\* | To be confirmed on Netlify (e.g. `https://ozflick.netlify.app` or custom domain `https://ozflick.com.au`) |

| \*\*Language / locale\*\* | `en-AU` |



\### What the app does

OzFlick is a single-page web application that reimagines the OzBargain deals catalogue as a TikTok-style swipeable feed. Each deal occupies a full-viewport card showing the product image, price, title, short description, vote count (🔥), and comment count (💬). Users scroll vertically through cards with CSS snap-scrolling, tap the comments icon to view a slide-up comments panel, and tap the cart icon to navigate to the original deal on OzBargain. Data is sourced live from the OzBargain public RSS feed (`https://www.ozbargain.com.au/deals/feed`) via a CORS proxy.



\### What it is NOT

\- It is \*\*not\*\* a server-side rendered app. It is a client-side React SPA.

\- It does \*\*not\*\* host deals itself — it is a read-only front-end for OzBargain's public RSS.

\- It does \*\*not\*\* require user authentication.



\---



\## 2. Tech Stack



| Layer | Technology |

|---|---|

| \*\*Framework\*\* | React 18 (functional components, hooks only) |

| \*\*Bundler\*\* | Vite 5 |

| \*\*Hosting\*\* | Netlify (static deployment, CDN-distributed) |

| \*\*Styling\*\* | Inline JS styles + a single `<style>` block injected into the React tree (no CSS modules, no Tailwind, no styled-components) |

| \*\*Routing\*\* | None — single page, no React Router |

| \*\*State\*\* | React `useState` / `useRef` / `useEffect` only |

| \*\*Data source\*\* | OzBargain RSS feed via `api.allorigins.win` CORS proxy |

| \*\*Fonts\*\* | Google Fonts — Oswald, DM Sans, Chakra Petch (loaded via `@import` in injected `<style>`) |

| \*\*Build output\*\* | `dist/` directory (standard Vite SPA output) |

| \*\*Entry point\*\* | `index.html` at project root |



\---



\## 3. Project File Structure



```

ozflick/

├── public/

│   ├── \_redirects          # Netlify SPA redirect rule (/\* → /index.html 200)

│   ├── favicon.ico         # ← MISSING — needs to be added

│   ├── favicon.svg         # ← MISSING — needs to be added

│   ├── apple-touch-icon.png  # ← MISSING — needs to be added

│   ├── og-image.png        # ← MISSING — needs to be added (1200×630)

│   ├── robots.txt          # ← MISSING — needs to be added

│   └── site.webmanifest    # ← MISSING — needs to be added

├── src/

│   ├── App.jsx             # Entire application (single component file)

│   └── main.jsx            # React entry point — mounts <App /> into #root

├── index.html              # ← NEEDS SEO META TAG CHANGES (see Section 5)

├── vite.config.js

└── package.json

```



\---



\## 4. Brand \& Design System



The AI agent should use these values when generating any SEO assets (OG images, manifests, meta descriptions, structured data).



\### Colours



| Token | Hex | Usage |

|---|---|---|

| `--color-primary` | `#FF5900` | OzFlick orange — logo, accents, active states |

| `--color-price` | `#FFD700` | Gold — price tags |

| `--color-bg` | `#080808` | Near-black app background |

| `--color-surface` | `#111111` | Card surfaces, panels |

| `--color-text` | `#FFFFFF` | Primary text |

| `--color-text-muted` | `rgba(255,255,255,0.35)` | Secondary / meta text |



\### Typography



| Font | Weight | Usage |

|---|---|---|

| Chakra Petch | 700 | Logo wordmark, prices |

| Oswald | 400 / 600 / 700 | Deal titles, headings, panel headers |

| DM Sans | 300 / 400 / 500 | Body text, descriptions, meta info |



\### Logo mark

The in-app logo renders as: `⚡ OzFlick` — the lightning bolt emoji followed by the wordmark in Chakra Petch 700 at `#FF5900`. Any generated image assets should reflect this visual identity.



\---



\## 5. Required SEO Changes — `index.html`



The Vite default `index.html` has minimal meta tags. All of the following must be added or replaced inside the `<head>` block.



\### 5.1 Core meta tags



```html

<meta charset="UTF-8" />

<meta name="viewport" content="width=device-width, initial-scale=1.0" />



<title>OzFlick — Swipe Australia's Hottest Deals</title>

<meta name="description"

&#x20; content="Scroll through Australia's best deals TikTok-style. OzFlick turns the OzBargain feed into a swipeable full-screen experience — price drops, tech deals, groceries and more, updated live." />

<meta name="keywords"

&#x20; content="OzBargain, Australian deals, bargains, price drops, cheap deals Australia, deal finder, savings, discount" />

<meta name="author" content="OzFlick" />

<meta name="robots" content="index, follow" />

<link rel="canonical" href="https://ozflick.com.au" />



<!-- Language / region -->

<meta name="language" content="en-AU" />

<html lang="en-AU"> <!-- also set this attribute on the <html> element -->

```



\### 5.2 Open Graph (Facebook, LinkedIn, Discord, Slack previews)



```html

<meta property="og:type"        content="website" />

<meta property="og:url"         content="https://ozflick.com.au" />

<meta property="og:site\_name"   content="OzFlick" />

<meta property="og:title"       content="OzFlick — Swipe Australia's Hottest Deals" />

<meta property="og:description"

&#x20; content="TikTok-style deal discovery for Australians. Swipe through live bargains from OzBargain — electronics, travel, groceries, gaming and more." />

<meta property="og:image"       content="https://ozflick.com.au/og-image.png" />

<meta property="og:image:width"  content="1200" />

<meta property="og:image:height" content="630" />

<meta property="og:image:alt"   content="OzFlick — swipe through Australia's best deals" />

<meta property="og:locale"      content="en\_AU" />

```



\### 5.3 Twitter / X Card



```html

<meta name="twitter:card"        content="summary\_large\_image" />

<meta name="twitter:title"       content="OzFlick — Swipe Australia's Hottest Deals" />

<meta name="twitter:description"

&#x20; content="TikTok-style deal discovery. Swipe live bargains from OzBargain — electronics, travel, groceries and more." />

<meta name="twitter:image"       content="https://ozflick.com.au/og-image.png" />

<meta name="twitter:image:alt"   content="OzFlick app screenshot" />

```



\### 5.4 Favicon \& icons



```html

<link rel="icon"             href="/favicon.ico" sizes="any" />

<link rel="icon"             href="/favicon.svg" type="image/svg+xml" />

<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<link rel="manifest"         href="/site.webmanifest" />

```



\### 5.5 Browser / mobile chrome theming



```html

<!-- Android Chrome toolbar colour -->

<meta name="theme-color" content="#FF5900" />



<!-- iOS Safari status bar -->

<meta name="apple-mobile-web-app-capable"          content="yes" />

<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<meta name="apple-mobile-web-app-title"            content="OzFlick" />



<!-- Windows tile -->

<meta name="msapplication-TileColor" content="#FF5900" />

```



\### 5.6 Font preloading (performance)



Add these \*\*before\*\* any other `<link>` tags to eliminate render-blocking:



```html

<link rel="preconnect" href="https://fonts.googleapis.com" />

<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<link

&#x20; rel="preload"

&#x20; as="style"

&#x20; href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700\&family=DM+Sans:wght@300;400;500;600\&family=Chakra+Petch:wght@600;700\&display=swap"

/>

<link

&#x20; rel="stylesheet"

&#x20; href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700\&family=DM+Sans:wght@300;400;500;600\&family=Chakra+Petch:wght@600;700\&display=swap"

/>

```



> \*\*Note:\*\* Also remove the `@import` of the Google Fonts URL from inside `App.jsx`'s injected `<style>` block after moving it here, to avoid loading fonts twice.



\### 5.7 JSON-LD Structured Data



Add a `<script type="application/ld+json">` block inside `<head>`:



```json

{

&#x20; "@context": "https://schema.org",

&#x20; "@type": "WebApplication",

&#x20; "name": "OzFlick",

&#x20; "url": "https://ozflick.com.au",

&#x20; "description": "TikTok-style deal discovery app for Australian bargain hunters. Powered by the OzBargain live RSS feed.",

&#x20; "applicationCategory": "ShoppingApplication",

&#x20; "operatingSystem": "Web",

&#x20; "browserRequirements": "Requires JavaScript",

&#x20; "inLanguage": "en-AU",

&#x20; "offers": {

&#x20;   "@type": "Offer",

&#x20;   "price": "0",

&#x20;   "priceCurrency": "AUD"

&#x20; },

&#x20; "author": {

&#x20;   "@type": "Organization",

&#x20;   "name": "OzFlick"

&#x20; }

}

```



\---



\## 6. Required New Files in `public/`



\### 6.1 `public/robots.txt`



```

User-agent: \*

Allow: /



Sitemap: https://ozflick.com.au/sitemap.xml

```



\### 6.2 `public/site.webmanifest`



```json

{

&#x20; "name": "OzFlick",

&#x20; "short\_name": "OzFlick",

&#x20; "description": "Swipe Australia's hottest deals",

&#x20; "start\_url": "/",

&#x20; "display": "standalone",

&#x20; "orientation": "portrait",

&#x20; "background\_color": "#080808",

&#x20; "theme\_color": "#FF5900",

&#x20; "categories": \["shopping", "lifestyle"],

&#x20; "lang": "en-AU",

&#x20; "icons": \[

&#x20;   { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },

&#x20;   { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }

&#x20; ],

&#x20; "screenshots": \[

&#x20;   {

&#x20;     "src": "/og-image.png",

&#x20;     "sizes": "1200x630",

&#x20;     "type": "image/png",

&#x20;     "label": "OzFlick deal feed"

&#x20;   }

&#x20; ]

}

```



\### 6.3 `public/\_redirects` (already described in setup, included here for completeness)



```

/\*    /index.html   200

```



\---



\## 7. OG Image Specification (`public/og-image.png`)



The AI should generate or instruct the creation of a `1200×630px` PNG with:



\- \*\*Background:\*\* `#080808` (near-black)

\- \*\*Left half:\*\* A mock deal card — dark card with an orange gradient glow at top-left, a gold price tag (e.g. `$29`), a white Oswald-font deal title (e.g. "Samsung 65" 4K OLED TV"), and an orange `⚡ OzFlick` logo in the top-left corner

\- \*\*Right half:\*\* Three stacked mini deal cards at a slight angle to imply a scrollable stack

\- \*\*Bottom-right:\*\* Text in DM Sans: \*"Swipe Australia's Hottest Deals"\* in white

\- \*\*Accent:\*\* A subtle `#FF5900` radial glow behind the main card



\---



\## 8. Completed `index.html` Template



Below is the full target state of `index.html` after all changes are applied. The AI agent should produce exactly this file (substituting the correct Netlify/custom domain for all URLs):



```html

<!DOCTYPE html>

<html lang="en-AU">

&#x20; <head>

&#x20;   <meta charset="UTF-8" />

&#x20;   <meta name="viewport" content="width=device-width, initial-scale=1.0" />



&#x20;   <!-- Fonts — preconnect + preload to avoid render-blocking -->

&#x20;   <link rel="preconnect" href="https://fonts.googleapis.com" />

&#x20;   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

&#x20;   <link rel="preload" as="style"

&#x20;     href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700\&family=DM+Sans:wght@300;400;500;600\&family=Chakra+Petch:wght@600;700\&display=swap" />

&#x20;   <link rel="stylesheet"

&#x20;     href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700\&family=DM+Sans:wght@300;400;500;600\&family=Chakra+Petch:wght@600;700\&display=swap" />



&#x20;   <!-- Primary SEO -->

&#x20;   <title>OzFlick — Swipe Australia's Hottest Deals</title>

&#x20;   <meta name="description"

&#x20;     content="Scroll through Australia's best deals TikTok-style. OzFlick turns the OzBargain feed into a swipeable full-screen experience — price drops, tech deals, groceries and more, updated live." />

&#x20;   <meta name="keywords"

&#x20;     content="OzBargain, Australian deals, bargains, price drops, cheap deals Australia, deal finder, savings, discount" />

&#x20;   <meta name="author"   content="OzFlick" />

&#x20;   <meta name="robots"   content="index, follow" />

&#x20;   <meta name="language" content="en-AU" />

&#x20;   <link rel="canonical" href="https://ozflick.com.au" />



&#x20;   <!-- Open Graph -->

&#x20;   <meta property="og:type"         content="website" />

&#x20;   <meta property="og:url"          content="https://ozflick.com.au" />

&#x20;   <meta property="og:site\_name"    content="OzFlick" />

&#x20;   <meta property="og:title"        content="OzFlick — Swipe Australia's Hottest Deals" />

&#x20;   <meta property="og:description"

&#x20;     content="TikTok-style deal discovery for Australians. Swipe through live bargains from OzBargain — electronics, travel, groceries, gaming and more." />

&#x20;   <meta property="og:image"        content="https://ozflick.com.au/og-image.png" />

&#x20;   <meta property="og:image:width"  content="1200" />

&#x20;   <meta property="og:image:height" content="630" />

&#x20;   <meta property="og:image:alt"    content="OzFlick — swipe through Australia's best deals" />

&#x20;   <meta property="og:locale"       content="en\_AU" />



&#x20;   <!-- Twitter / X -->

&#x20;   <meta name="twitter:card"        content="summary\_large\_image" />

&#x20;   <meta name="twitter:title"       content="OzFlick — Swipe Australia's Hottest Deals" />

&#x20;   <meta name="twitter:description"

&#x20;     content="TikTok-style deal discovery. Swipe live bargains from OzBargain — electronics, travel, groceries and more." />

&#x20;   <meta name="twitter:image"       content="https://ozflick.com.au/og-image.png" />

&#x20;   <meta name="twitter:image:alt"   content="OzFlick app screenshot" />



&#x20;   <!-- Icons + manifest -->

&#x20;   <link rel="icon"             href="/favicon.ico" sizes="any" />

&#x20;   <link rel="icon"             href="/favicon.svg" type="image/svg+xml" />

&#x20;   <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

&#x20;   <link rel="manifest"         href="/site.webmanifest" />



&#x20;   <!-- Browser / OS chrome theming -->

&#x20;   <meta name="theme-color"                        content="#FF5900" />

&#x20;   <meta name="apple-mobile-web-app-capable"       content="yes" />

&#x20;   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

&#x20;   <meta name="apple-mobile-web-app-title"         content="OzFlick" />

&#x20;   <meta name="msapplication-TileColor"            content="#FF5900" />



&#x20;   <!-- JSON-LD structured data -->

&#x20;   <script type="application/ld+json">

&#x20;   {

&#x20;     "@context": "https://schema.org",

&#x20;     "@type": "WebApplication",

&#x20;     "name": "OzFlick",

&#x20;     "url": "https://ozflick.com.au",

&#x20;     "description": "TikTok-style deal discovery app for Australian bargain hunters. Powered by the OzBargain live RSS feed.",

&#x20;     "applicationCategory": "ShoppingApplication",

&#x20;     "operatingSystem": "Web",

&#x20;     "browserRequirements": "Requires JavaScript",

&#x20;     "inLanguage": "en-AU",

&#x20;     "offers": { "@type": "Offer", "price": "0", "priceCurrency": "AUD" },

&#x20;     "author": { "@type": "Organization", "name": "OzFlick" }

&#x20;   }

&#x20;   </script>

&#x20; </head>

&#x20; <body>

&#x20;   <div id="root"></div>

&#x20;   <script type="module" src="/src/main.jsx"></script>

&#x20; </body>

</html>

```



\---



\## 9. Change to `src/App.jsx`



After fonts are moved to `index.html`, remove the `@import` line from the injected `<style>` block inside `App.jsx` to prevent double-loading:



\*\*Find and delete this line\*\* (it appears near the top of the CSS string inside the `<style>` tag in the component):



```css

/\* DELETE THIS LINE from the <style> block in App.jsx \*/

@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700\&family=DM+Sans:wght@300;400;500;600\&family=Chakra+Petch:wght@600;700\&display=swap');

```



\---



\## 10. Checklist for the AI Agent



Work through these in order. Each item is independently verifiable.



\- \[ ] Replace `index.html` with the completed template from Section 8

\- \[ ] Set `lang="en-AU"` on the `<html>` element

\- \[ ] Move Google Fonts `@import` from `App.jsx` to `index.html` as `<link>` tags with `preconnect` and `preload`

\- \[ ] Create `public/robots.txt` (Section 6.1)

\- \[ ] Create `public/site.webmanifest` (Section 6.2)

\- \[ ] Confirm `public/\_redirects` exists with `/\* /index.html 200`

\- \[ ] Generate or source `public/og-image.png` at 1200×630 (Section 7 spec)

\- \[ ] Generate or source `public/favicon.ico`, `public/favicon.svg`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` using the brand colours in Section 4

\- \[ ] Update all placeholder URLs (`https://ozflick.com.au`) to match the live Netlify domain if a custom domain has not yet been set

\- \[ ] Run `npm run build` and verify no console errors

\- \[ ] Validate Open Graph output at \[https://www.opengraph.xyz](https://www.opengraph.xyz)

\- \[ ] Validate structured data at \[https://validator.schema.org](https://validator.schema.org)

\- \[ ] Test PWA install prompt in Chrome DevTools → Application → Manifest



