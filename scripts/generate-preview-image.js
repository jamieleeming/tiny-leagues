/**
 * This script provides instructions for creating an optimized preview image for WhatsApp.
 * 
 * WhatsApp has specific requirements for preview images:
 * - Size should be under 300KB
 * - Square format (1:1 aspect ratio) works best
 * - Recommended dimensions: 256x256px
 * 
 * Instructions:
 * 
 * 1. Take the existing preview image: poker-preview.png
 * 2. Resize it to 256x256 pixels
 * 3. Optimize it to ensure file size is under 300KB
 * 4. Save as poker-preview-256.png
 * 5. Upload to Supabase storage at the same location
 * 
 * You can use tools like:
 * - Online: TinyPNG (https://tinypng.com/)
 * - Desktop: GIMP, Photoshop, or similar
 * - Command line: ImageMagick
 * 
 * Example ImageMagick command:
 * convert poker-preview.png -resize 256x256 -quality 85 poker-preview-256.png
 * 
 * After creating the image, upload it to your Supabase storage bucket:
 * https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/
 */

console.log('Please follow the instructions in this file to create an optimized preview image for WhatsApp.'); 