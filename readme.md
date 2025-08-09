# GOONED — Deployment Guide

This is a static site (HTML/CSS/JS). You can host it **anywhere** that serves static files.
Below are quick options, from quickest to more production-ready.

---

## 1) Run locally (quick test)

**Option A: Just open `index.html`**  
Double‑click `index.html`. Most browsers work fine for local file URLs.

**Option B: Local web server (safer for some browsers)**  
- Python 3:  
  ```bash
  cd /path/to/gooned_full_build
  python3 -m http.server 8080
  ```
  Visit: http://localhost:8080

- Node (if installed):  
  ```bash
  npx http-server . -p 8080
  ```

Open `index.html` to play and `admin.html` for the admin panel.

---

## 2) GitHub Pages (free)

1. Create a new **public** repo.
2. Upload all files in this folder to the repo root.
3. In the repo: **Settings → Pages → Source: `Deploy from a branch` → Branch: `main` (or `master`)**.
4. Wait ~1–2 minutes; it will publish at `https://<your-username>.github.io/<repo-name>/`.

> Tip: If you put files in a subfolder, set Pages to that folder.

---

## 3) Netlify (drag & drop)

1. Go to https://app.netlify.com/drop
2. Drag the **entire** `gooned_full_build` folder in.  
3. Netlify gives you a live URL immediately.

**Included config:** `deploy/netlify.toml` (optional)
```toml
[build]
  publish = "."
```

---

## 4) Vercel (no build step)

1. Install the Vercel CLI: `npm i -g vercel` (or use their web UI).
2. In this folder, run: `vercel` → accept defaults.
3. Or import the folder in the Vercel dashboard and deploy as a static site.

**Included config:** `deploy/vercel.json` (optional)
```json
{
  "version": 2,
  "public": true,
  "builds": [{ "src": "index.html", "use": "@vercel/static" }]
}
```

---

## 5) Cloudflare Pages

1. Create a new project → "Direct Upload".
2. Upload the **contents** of `gooned_full_build`.
3. It will deploy to a **pages.dev** URL.

---

## 6) Nginx/Apache (self‑hosted)

- Point the web root (e.g., `/var/www/your-site`) at the **contents** of this folder.
- Ensure these files are accessible:
  - `/index.html`
  - `/admin.html`
  - `/gooned.js`, `/admin.js`, `/styles.css`
  - `/assets/*` and `/logo.svg`

**Nginx example**:
```
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/gooned_full_build;

  location / {
    try_files $uri $uri/ =404;
  }
}
```

---

## Admin & Data Notes

- **Instant admin**: `admin.html` loads without a password in this build.
- **Uploads**: Admin uploads and user submissions are stored in the **browser’s localStorage**.
  - To clear admin entries: Admin → **Clear Admin Entries**.
- **Live game**: The game pulls from built‑in entries (none here) **+ active admin entries**.
- **Public submissions**: Users can submit images + names on `index.html`. The admin can **Approve/Reject** in `admin.html`.
- **Bulk tools**: In Admin, use checkboxes and the toolbar to **List**, **Unlist**, or **Delete** multiple entries.
- **Reordering**: If you want a drag‑to‑reorder feature, ask me and I’ll add it.

---

## Cache Busting (when updating)

If you change `gooned.js` or `styles.css` and your host caches them, append a query version in the HTML:
```html
<script src="gooned.js?v=1.0.1"></script>
<link rel="stylesheet" href="styles.css?v=1.0.1">
```

---

## File Map

- `index.html` — Game
- `admin.html` — Admin (instant access)
- `gooned.js` — Game logic (zoom‑out steps, timer, shuffle, public submissions)
- `admin.js` — Admin tools (upload, approve, bulk actions, gallery)
- `styles.css` — Comic pop theme
- `assets/placeholder.jpg` — Placeholder image
- `logo.svg` — GOONED logo
- `deploy/netlify.toml` — Optional Netlify config
- `deploy/vercel.json` — Optional Vercel config

Have questions or want me to wire automated deploys? I can set up a GitHub Action for Pages or Netlify in minutes.

---

## CI Deploy (GitHub Actions)

### GitHub Pages
This repo includes `.github/workflows/github-pages.yml`. To enable:
1. Push this folder to a repo.
2. In **Settings → Pages**, set **Source: GitHub Actions**.
3. Push to `main` (or `master`) — the site will auto‑deploy.

### Netlify
Also included: `.github/workflows/netlify.yml` (optional).  
Add repository secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Then push to `main` to auto‑deploy to Netlify.
