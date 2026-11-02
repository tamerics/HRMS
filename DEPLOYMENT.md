# Withinearth HR deployment

## Online services

- API: Render using [render.yaml](render.yaml)
- Database: MongoDB Atlas
- Web app: Cloudflare Pages
- Mobile clients: Flutter using the hosted API

Set these API secrets in Render:

- MONGO_URI
- JWT_SECRET
- CLIENT_ORIGINS
- FINGERPRINT_IP and any other terminal settings

## Fingerprint terminal constraint

The ZKTeco terminal uses a private LAN address. A public Render service cannot reach a private office network directly. Keep fingerprint synchronization on a machine inside the office network, expose a secured server-side sync endpoint, or connect the office network to the cloud through a VPN. Do not expose the fingerprint terminal itself to the public internet.

## Web origin

Use the final production web origin in CLIENT_ORIGINS. During local development, keep http://localhost:5173 in the comma-separated list.
