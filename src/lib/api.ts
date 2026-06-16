type ApiEnvelope<T> = { data: T; error: string | null };

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function api<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("APIに接続できません。バックエンドが起動しているか確認してください。");
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`APIレスポンスを読み取れませんでした (${response.status})`);
  }

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error ?? "API error");
  }
  return envelope.data;
}

export async function uploadImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new Error("画像アップロードAPIに接続できません。");
  }

  let envelope: ApiEnvelope<{ imageUrl: string }>;
  try {
    envelope = (await response.json()) as ApiEnvelope<{ imageUrl: string }>;
  } catch {
    throw new Error(`画像アップロードのレスポンスを読み取れませんでした (${response.status})`);
  }

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error ?? "画像アップロードに失敗しました");
  }
  return envelope.data.imageUrl;
}

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
