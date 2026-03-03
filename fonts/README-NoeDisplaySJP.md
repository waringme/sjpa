# NoeDisplaySJP-Bold (hero banner font)

The hero banner uses **NoeDisplaySJP-Bold**. Font loading is set up in `styles/fonts.css`:

- If you place **NoeDisplaySJP-Bold.woff2** or **NoeDisplaySJP-Bold.woff** in this `fonts/` folder, that file will be used.
- If no local file is present, a public Noe Display Bold webfont is used as fallback so the hero still renders in a matching typeface.

To use the official SJP brand font, add the file(s) from your brand pack here:

- `fonts/NoeDisplaySJP-Bold.woff2` and/or  
- `fonts/NoeDisplaySJP-Bold.woff`

No code changes are required; the existing `@font-face` in `styles/fonts.css` will pick them up.
