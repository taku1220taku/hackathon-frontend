# CapCycle Frontend

React/Vite frontend for CapCycle, an AI-assisted next-generation marketplace MVP.

Backend repository: `https://github.com/taku1220taku/hackathon-backend`

## Local Development

```bash
npm install
npm run dev
```

Set the API base URL in `.env`:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Production currently uses:

```text
VITE_API_BASE_URL=https://capcycle-api-2u3m6oblua-an.a.run.app
```

## Features

- User registration and login against the Go API
- Listing, search, item detail, purchase flow, transactions, messages, and reviews
- Image upload UI with full-image preview and multi-image item detail gallery
- Likes, view metrics, and seller-facing dynamic price navigation
- Gemini-backed listing assist, price suggestion, listing check, and item Q&A

## Deployment

Vercel owns frontend deployment for this repository.

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_API_BASE_URL=https://capcycle-api-2u3m6oblua-an.a.run.app
```

GitHub Actions in this repository only runs the frontend build. Backend CI/CD and Cloud Run deployment live in the backend repository.

## Demo Users

```text
demo@capcycle.test / password
buyer@capcycle.test / password
```
