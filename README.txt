Y2S1 Timetable — Static Site (WORKS OFFLINE)

This version fixes:
- Blank table when opened locally (file://). Data is embedded inline, and an external `timetable.json` is optional.
- Week dropdown not populating (now filled from embedded/default JSON, or from a chosen file).
- Editor page blocking on fetch. Editor starts with embedded JSON or lets you load a file and then populates all dropdowns.
- Manual file loading now repopulates all controls and you can download a new JSON.

FILES
-----
- index.html     → UI + table grid + week dropdown + local JSON loader
- style.css      → Styles
- script.js      → Logic (offline-first with inline fallback + optional fetch)
- timetable.json → (Optional) external data file; you can replace it on your host
- update.html    → Editor to add/clear cells, parse free-text, and download JSON
- README.txt     → This help

USAGE
-----
Open `index.html` by double-click (works offline), or host the folder.
- To preview another dataset: click "Load JSON", choose your `timetable.json`.
- To update data: open `update.html`, load your JSON or click "Use default", make changes, then click "Download timetable.json". Replace the file on your host.

HOSTING (recommended)
---------------------
For best results, host these files (GitHub Pages / Netlify / Vercel). When hosted, `index.html` will auto-fetch `timetable.json` if present; otherwise it uses the embedded dataset.
