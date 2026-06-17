# CapCycle

AI搭載・次世代フリマアプリのMVPです。Reactフロントエンドに、Go API、JWT認証、ロール認可、出品、検索、いいね、取引、評価、AI出品補助を追加しています。

## Local development

```bash
npm install
npm run dev
```

別ターミナルでAPIを起動します。

```bash
cd hackathon-backend
go mod download
go run ./cmd/api
```

MySQLスキーマ確認用にCloud SQL互換のローカルDBも起動できます。

```bash
docker compose up -d mysql
```

APIはデフォルトでこのMySQLへ接続します。接続できない場合はメモリ保存にフォールバックします。

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=capcycle
DB_PASSWORD=capcycle
DB_NAME=capcycle
CLOUD_SQL_CONNECTION_NAME=
```

Cloud RunからCloud SQLへ接続する場合は `CLOUD_SQL_CONNECTION_NAME=<project>:<region>:<instance>` を設定します。設定時は `/cloudsql/<connection-name>` のUnixソケット接続を使います。

画像アップロードはローカルでは `hackathon-backend/uploads` に保存され、`PUBLIC_BASE_URL` から配信されます。

```text
IMAGE_STORAGE=local
UPLOAD_DIR=uploads
PUBLIC_BASE_URL=http://localhost:8080
```

Cloud Runなど永続ディスクに依存できない環境ではGCSを使います。Cloud Runのサービスアカウントには対象バケットの `roles/storage.objectCreator` を付与してください。

```text
IMAGE_STORAGE=gcs
GCS_BUCKET=<your-gcs-bucket>
GCS_PREFIX=uploads
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/<your-gcs-bucket>
```

本番ではアップロード画像に長い `Cache-Control` を付与し、Cloud CDNを有効化したBackend Bucketを作成して画像配信の最適化に使えます。公開画像は `roles/storage.legacyObjectReader` で個別オブジェクトのGETだけを許可し、バケット一覧を公開しない設定にします。HTTPSのCDN配信には独自ドメインと証明書を設定してください。

デモログイン:

```text
demo@capcycle.test / password
buyer@capcycle.test / password
```

## Gemini AI

`GEMINI_API_KEY` がある場合は `POST /ai/listing-assist`, `POST /ai/price-suggest`, `POST /ai/fraud-check`, `POST /ai/item-question` がGemini APIを呼びます。未設定時は同じレスポンス形式のモックを返します。

```bash
export GEMINI_API_KEY=<your-gemini-api-key>
export GEMINI_MODEL=gemini-2.5-flash
```

ローカルでは `hackathon-backend` のAPIサーバーを起動する同じターミナルで上記を設定してから `go run ./cmd/api` を実行します。`.env.example` はサンプルなので、自動では読み込まれません。

Gemini接続確認:

```bash
TOKEN=$(curl -s http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@capcycle.test","password":"password"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.token))')

curl -s "http://localhost:8080/ai/gemini-status?live=1" \
  -H "Authorization: Bearer $TOKEN"
```

`configured: true` かつ `live: true` なら実際にGemini APIへ到達しています。

## Deployment

詳細なGCP/Vercelセットアップ手順は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

GitHub Actions:

* `.github/workflows/ci.yml` はフロントエンドのビルドとGoテストを実行します。
* `.github/workflows/deploy-cloud-run.yml` は `main` pushまたは手動実行でCloud RunへAPIをデプロイします。

Cloud Runデプロイには以下のGitHub Secretsが必要です。

```text
GCP_PROJECT_ID
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
CORS_ORIGIN
PUBLIC_BASE_URL
GCS_BUCKET
GCS_PUBLIC_BASE_URL
CLOUD_SQL_CONNECTION_NAME
```

以下はGCP Secret Managerに `latest` バージョンとして作成してください。

```text
JWT_SECRET
DB_USER
DB_PASSWORD
DB_NAME
GEMINI_API_KEY
```

Vercelにはフロントエンド用に `VITE_API_BASE_URL=<Cloud Run API URL>` を設定します。

## Security

APIはHS256 JWTを使い、payloadに `sub`, `role`, `iat`, `exp` を含めます。通常ユーザーは `user`、管理APIは `admin` roleだけが通過できます。商品編集、削除、取引、メッセージ、評価は所有者または取引参加者だけに制限しています。
