
# GOONED — URL Submissions + Auto‑Shuffle Update

## What I changed
- **Switched Admin to Image URLs**: Replaced file uploads with a lightweight “Add by URL” flow. Paste a direct image URL (e.g., Imgur) and a name/answer.
- **Auto‑update & Shuffle**: When a new entry is added, the game tab automatically rebuilds its playlist and shuffles it (listens to `localStorage` changes).
- **Kept Admin Look**: If your original admin form exists, the script uses it. If not, it injects a minimal version that matches the existing card style.
- **Inline edit**: You can edit the answer text right in the admin list. Toggling List/Unlist or Delete updates immediately.
- **Consistent schema**: Entries use `{ src, answer, active }` — compatible with the game (`gooned.js`).

## How to use
1. Open **admin.html** in one tab and **index.html** in another.
2. In Admin, paste a **direct image URL** (ending with `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) plus the **Answer**.
3. On submit, you’ll see a quick “Publishing…” state, a thumbnail preview, and the entry goes live.
4. The game tab auto‑refreshes its internal list and **shuffles** immediately.

## Notes
- The game already rebuilds its playlist and shuffles when it sees `localStorage['GOONED_CUSTOM']` change; this update just makes Admin write to that key directly so it’s instant.
- If you keep a curated rotation, use the **List/Unlist** buttons.
- Export/clear still work; export gives you a JSON dump of admin entries.
