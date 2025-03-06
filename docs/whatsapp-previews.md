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

The key tags include:

```html
<meta property="og:image" itemProp="image" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
<meta property="og:image:secure_url" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="256" />
<meta property="og:image:height" content="256" />
<link itemProp="thumbnailUrl" href="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
```

### 3. Fixed URL Structure

- Updated the `handleShare` function to use absolute URLs
- Ensured consistent URLs between meta tags and sharing

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

## Resources

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org ImageObject](https://schema.org/ImageObject) 