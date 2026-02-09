# Knowledge Vault Extension (Chrome/Brave)

This extension provides:

- Start Pomodoro
- Stop (pause local timer only)
- Abandon Pomodoro
- Open existing frontend `New Note` page in a popup window

## Security Model

- Extension uses dedicated bearer token endpoints:
  - `POST /api/v1/auth/extension/login`
  - `POST /api/v1/auth/extension/refresh-token`
  - `POST /api/v1/auth/extension/logout`
- Access token is stored in `chrome.storage.session` (ephemeral).
- Refresh token is stored in `chrome.storage.local` and rotated on refresh.
- API requests use `Authorization: Bearer <token>`.
- Backend still supports existing cookie auth for the web app.

## Backend Prerequisites

1. Run DB migration:
   - `alembic upgrade head`
2. Add extension origin to backend env:
   - `ALLOWED_EXTENSION_ORIGINS=["chrome-extension://<your_extension_id>"]`
3. Keep `ALLOWED_ORIGINS` for web app origins.

## Load Extension (Dev)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `extension/`.

## API / Frontend URL (build time)

- API and frontend base URLs are **not** user-configurable. They are fixed at build time from `.env`.
- From repo root, run: `node scripts/build-extension-config.js` to generate `extension/lib/env.generated.js` from:
  - `VITE_API_URL` — backend API base (e.g. `https://api.yourdomain.com/api/v1`)
  - `VITE_APP_BASE_URL` — web app origin for "Open notes" (e.g. `https://app.yourdomain.com`)
- Defaults (if vars unset) are `http://localhost:8000/api/v1` and `http://localhost:5173`.
- Run the script before packaging the extension for production. Then run `node scripts/check-extension-production.js` from repo root; it fails if API/frontend URLs or manifest host_permissions are not HTTPS. See `context/extension_production_deployment.md` for the full build/package flow.
- Ensure `manifest.json` `host_permissions` include your API (and frontend if needed) origins when using production URLs.

## First Usage

1. Click extension icon to open side panel.
2. Sign in with your Knowledge Vault account.
3. Select project from active projects (`status=in_progress`) and click `Start`.
4. Use `Stop` to pause locally. Use `Start` again to resume.
5. Session auto-completes when countdown reaches zero.
6. Use `Abandon` to abandon early and close the session in backend.
7. Click `Open Quick Notes` to open the existing frontend `New Note` page in a popup.

Note:
- The notes popup is the real web app route, so web authentication cookie/session must be valid.
