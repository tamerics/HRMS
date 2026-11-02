# Withinearth HR web deployment

Deploy the `frontend` directory as a Cloudflare Pages project.

Build settings:

- Framework preset: Vite
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://api.withinearthhr.com/api`

For local development, create `.env` from `.env.example` and set the API URL to the local Express server.
