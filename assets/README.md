# Artwork for The Ballot Board '26

The web app's new visual theme uses the three original images supplied by the user, optimized as WebP for quick loading on phones.

Place these **three files** inside this `assets/` directory:

- `midterms-banner.webp` - wide illustrated Midterms 2026 homepage banner.
- `democratic-donkey.webp` - blue flower-and-rainbow donkey.
- `republican-elephant.webp` - red floral elephant with flag.

The website already references those paths in `index.html`.

## Install artwork from ChatGPT archive

1. Download `ballot-board-art-assets.zip` from the chat, then unzip it.
2. In the GitHub repository's `assets` directory, choose **Add file → Upload files**.
3. Drop the three WebP files inside the extracted `assets` folder.
4. Click **Commit changes**. Netlify (if connected to GitHub) will redeploy automatically.

This is a static asset upload. It is separate from configuring Supabase for login/sync.

Note: Do not upload the original multi-megabyte PNGs; the optimized versions preserve the illustrations while saving several megabytes of mobile download time.
