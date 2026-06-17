# CapCycle Frontend Deployment

This repository deploys only the Vite frontend to Vercel.

Backend repository:

```text
https://github.com/taku1220taku/hackathon-backend
```

Production URLs:

```text
Frontend: https://hackathon-frontend-chi-liard.vercel.app
Backend API: https://capcycle-api-2u3m6oblua-an.a.run.app
```

## Vercel

Configure the Vercel project with:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
VITE_API_BASE_URL=https://capcycle-api-2u3m6oblua-an.a.run.app
```

`vercel.json` rewrites all routes to `index.html`, so direct access to `/items/:id`, `/transactions`, and `/me` works with React Router.

## CI

`.github/workflows/ci.yml` runs:

```bash
npm ci
npm run build
```

There is no Cloud Run workflow in this frontend repository. Cloud Run deployment is owned by the backend repository.

## Smoke Test

```bash
curl -I https://hackathon-frontend-chi-liard.vercel.app
curl -s https://capcycle-api-2u3m6oblua-an.a.run.app/health
```

Manual checks:

- 商品一覧が表示される
- `demo@capcycle.test / password` でログインできる
- 出品、画像アップロード、購入、DM、受取完了、評価が動く
- 商品詳細で複数画像を閲覧できる
- 出品者側で閲覧数と動的価格ナビを確認できる
