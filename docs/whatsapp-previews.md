# WhatsApp Link Preview Guide

This document explains how to ensure WhatsApp properly displays link previews for shared Tiny Leagues game links.

## Requirements for WhatsApp Previews

WhatsApp has specific requirements for link previews:

1. **Image Size**: 
   - Must be under 300KB
   - Square format (1:1 aspect ratio) works best
   - Recommended dimensions: 256x256px

2. **Meta Tags**:
   - Must include specific Open Graph tags
   - Must include additional schema.org markup
   - Image URLs must use HTTPS

3. **URL Structure**:
   - Must use absolute URLs (not relative)
   - URLs should be consistent between meta tags and sharing

## GitHub Pages SPA Issue

When hosting a Single Page Application (SPA) on GitHub Pages, there's a critical issue that affects WhatsApp previews:

1. **The Problem**:
   - GitHub Pages serves a minimal HTML file with a JavaScript redirect for all non-root routes
   - WhatsApp's crawler doesn't execute JavaScript and only reads the initial HTML
   - This means WhatsApp doesn't see any of your meta tags when crawling shared links

2. **The Solution**:
   - Create a dedicated static preview page (`game-preview.html`) for sharing
   - Update the `404.html` file to include all necessary meta tags
   - Modify the share function to use the static preview page instead of direct game links
   - This ensures WhatsApp's crawler sees the meta tags before any redirect happens

## Implemented Solutions

The following changes have been made to fix WhatsApp previews:

### 1. Optimized Preview Image

- Created a smaller, square version of the preview image (256x256px)
- Ensured file size is under 300KB
- Uploaded to Supabase storage as `poker-preview-256.png`

### 2. Updated Meta Tags

Added WhatsApp-specific meta tags to:
- `GameDetails.tsx`
- `GamePreview.tsx`
- `public/preview.html`
- `public/404.html` (critical for GitHub Pages)
- `public/game-preview.html` (dedicated page for game sharing)
- `index.html` (root file)

The key tags include:

```html
<meta property="og:image" itemProp="image" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
<meta property="og:image:secure_url" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="256" />
<meta property="og:image:height" content="256" />
<link itemProp="thumbnailUrl" href="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
```

### 3. Created Dedicated Preview Page

- Created `game-preview.html` specifically for WhatsApp sharing
- This page:
  - Extracts the game ID from the URL
  - Sets the proper meta tags
  - Redirects to the actual game page after a short delay
  - Preserves referral codes and other parameters

### 4. Fixed URL Structure

- Updated the `handleShare` function to use the dedicated preview page
- Changed from: `https://jamieleeming.github.io/tiny-leagues/games/{gameId}`
- To: `https://jamieleeming.github.io/tiny-leagues/game-preview.html?id={gameId}`
- Added cache-busting parameters to help with WhatsApp's aggressive caching

## Testing WhatsApp Previews

When testing WhatsApp previews:

1. **Clear WhatsApp Cache**:
   - Force close WhatsApp
   - Reopen the app

2. **Use Cache Busting**:
   - Add a query parameter to force a refresh: `?v=123`
   - Use a different parameter each time

3. **Wait for Preview**:
   - WhatsApp may take a few seconds to fetch the preview
   - Type the URL, wait for the preview to appear, then send

## Troubleshooting

If previews still don't work:

1. **Check Image Size**:
   - Ensure the image is under 300KB
   - Verify dimensions are 256x256px

2. **Validate Meta Tags**:
   - Use [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Check for any errors or warnings

3. **Test on Different Devices**:
   - Try both Android and iOS devices
   - Test with different WhatsApp versions

4. **Verify Static HTML**:
   - Use "View Page Source" on your deployed site
   - Confirm that meta tags are present in the HTML before any JavaScript runs
   - For GitHub Pages, check both the root URL and a game URL

## Resources

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org ImageObject](https://schema.org/ImageObject)
- [GitHub Pages SPA Redirect](https://github.com/rafgraph/spa-github-pages) 