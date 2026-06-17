# CapCycle Deployment

1週間以内にデモ可能な本番環境を作るための標準手順です。GCPリソースは新規作成し、フロントエンドはVercelのGit連携でデプロイします。

## Standard names

```text
REGION=asia-northeast1
SERVICE=capcycle-api
ARTIFACT_REPO=capcycle
CLOUD_SQL_INSTANCE=capcycle-mysql
DB_NAME=capcycle
DB_USER=capcycle
GCS_BUCKET=<project-id>-capcycle-uploads
```

## 1. GCP resources

```bash
export PROJECT_ID=<your-gcp-project-id>
export REGION=asia-northeast1
export SERVICE=capcycle-api
export ARTIFACT_REPO=capcycle
export CLOUD_SQL_INSTANCE=capcycle-mysql
export DB_NAME=capcycle
export DB_USER=capcycle
export GCS_BUCKET="${PROJECT_ID}-capcycle-uploads"

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com cloudresourcemanager.googleapis.com

gcloud artifacts repositories create "$ARTIFACT_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="CapCycle API images"

gcloud sql instances create "$CLOUD_SQL_INSTANCE" \
  --database-version=MYSQL_8_0 \
  --region="$REGION" \
  --tier=db-f1-micro \
  --storage-size=10GB

gcloud sql databases create "$DB_NAME" --instance="$CLOUD_SQL_INSTANCE"
gcloud sql users create "$DB_USER" --instance="$CLOUD_SQL_INSTANCE" --password="<strong-db-password>"

gcloud storage buckets create "gs://${GCS_BUCKET}" --location="$REGION" --uniform-bucket-level-access
```

Cloud Runの実行サービスアカウントにはCloud SQLとGCSアクセスを付与します。デフォルト実行サービスアカウントを使う場合:

```bash
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/cloudsql.client"

gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"
```

## 2. Secret Manager

```bash
printf '%s' '<jwt-secret>' | gcloud secrets create JWT_SECRET --data-file=-
printf '%s' "$DB_USER" | gcloud secrets create DB_USER --data-file=-
printf '%s' '<strong-db-password>' | gcloud secrets create DB_PASSWORD --data-file=-
printf '%s' "$DB_NAME" | gcloud secrets create DB_NAME --data-file=-
printf '%s' '<gemini-api-key>' | gcloud secrets create GEMINI_API_KEY --data-file=-
```

既にsecretがある場合は `gcloud secrets versions add <NAME> --data-file=-` で最新版を追加します。

## 3. GitHub Actions settings

GitHub ActionsのWorkload Identity Federationを設定し、デプロイ用サービスアカウントにCloud Run/Artifact Registry/Cloud SQL attach権限を付与します。

GitHub Secrets:

```text
GCP_PROJECT_ID=<project-id>
GCP_WORKLOAD_IDENTITY_PROVIDER=<projects/.../providers/...>
GCP_SERVICE_ACCOUNT=<deploy-sa>@<project-id>.iam.gserviceaccount.com
CORS_ORIGIN=http://localhost:5173,https://<your-vercel-domain>
PUBLIC_BASE_URL=https://<cloud-run-url>
GCS_BUCKET=<project-id>-capcycle-uploads
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/<project-id>-capcycle-uploads
CLOUD_SQL_CONNECTION_NAME=<project-id>:asia-northeast1:capcycle-mysql
```

Required roles for the deploy service account:

```text
roles/run.admin
roles/artifactregistry.writer
roles/cloudsql.client
roles/iam.serviceAccountUser
```

After setting secrets, run **Deploy Cloud Run** manually once from GitHub Actions. The first Cloud Run URL becomes the value for `PUBLIC_BASE_URL`; update the secret and run the workflow again.

## 4. Vercel

Connect the GitHub repository to Vercel.

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_API_BASE_URL=https://<cloud-run-url>
```

`vercel.json` rewrites all routes to `index.html`, so direct access to `/items/:id`, `/transactions`, and `/me` works with React Router.

After the Vercel production URL is created, add it to `CORS_ORIGIN` and redeploy Cloud Run.

## 5. Production smoke test

```bash
API=https://<cloud-run-url>

curl -s "$API/health"

TOKEN=$(curl -s "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@capcycle.test","password":"password"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.token))')

curl -s "$API/ai/gemini-status?live=1" -H "Authorization: Bearer $TOKEN"
```

Manual checks:

- Vercelから商品一覧が取得できる
- 画像アップロード後のURLがGCS URLになる
- 商品作成後、Cloud Run再起動後もCloud SQLに残る
- `demo@capcycle.test` と `buyer@capcycle.test` で出品者/購入者のデモができる
- AI出品補助、価格提案、出品チェックがGemini設定時に動く
- 購入、取引メッセージ、受取完了、評価、評価待ち/完了表示が動く
