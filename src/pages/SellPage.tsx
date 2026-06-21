import { Bot, Camera, ImagePlus, PackagePlus, ShieldCheck, Sparkles, Tags, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadImage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { categoryByID, categoryByLabel, categoryOptions } from "../lib/categories";
import { initialDraft } from "../lib/fallback";
import type { AssistResult, DraftItem, DynamicPriceResult, FraudCheckResult, Item, PriceSuggestion } from "../lib/types";

async function imageFileWithBlurredBackground(file: File): Promise<File> {
  const imageURL = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("画像を読み込めませんでした"));
      nextImage.src = imageURL;
    });
    const size = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像処理を開始できませんでした");

    const coverScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const coverWidth = image.naturalWidth * coverScale;
    const coverHeight = image.naturalHeight * coverScale;
    ctx.filter = "blur(28px)";
    ctx.drawImage(image, (size - coverWidth) / 2, (size - coverHeight) / 2, coverWidth, coverHeight);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, size, size);

    const containScale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const containWidth = image.naturalWidth * containScale;
    const containHeight = image.naturalHeight * containScale;
    ctx.drawImage(image, (size - containWidth) / 2, (size - containHeight) / 2, containWidth, containHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("画像処理に失敗しました"));
      }, "image/jpeg", 0.88);
    });
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}-blurred.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageURL);
  }
}

export function SellPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [draft, setDraft] = useState<DraftItem>(initialDraft);
  const [uploadPreviewUrls, setUploadPreviewUrls] = useState<string[]>([]);
  const uploadPreviewUrlsRef = useRef<string[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(user ? "" : "出品するにはログインしてください");
  const [blurBackground, setBlurBackground] = useState(false);
  const [targetSellDays, setTargetSellDays] = useState<number | "">(7);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [dynamicPrice, setDynamicPrice] = useState<DynamicPriceResult | null>(null);
  const [fraudResult, setFraudResult] = useState<FraudCheckResult | null>(null);

  useEffect(() => {
    if (user) {
      setNotice("");
    } else if (token) {
      setNotice("ログイン状態を確認中です");
    } else {
      setNotice("出品するにはログインしてください");
    }
  }, [token, user]);

  useEffect(() => {
    uploadPreviewUrlsRef.current = uploadPreviewUrls;
  }, [uploadPreviewUrls]);

  useEffect(() => () => {
    uploadPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function runTask(name: string, task: () => Promise<void>) {
    try {
      setBusy(name);
      await task();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setBusy("");
    }
  }

  async function runAssist() {
    await runTask("assist", async () => {
      const primaryImage = draft.imageUrls[0] ?? "";
      const result = await api<AssistResult>("/ai/listing-assist", {
        method: "POST",
        token,
        body: { imageUrl: primaryImage, memo: draft.memo },
      });
      const category = result.categoryId ? categoryByID(result.categoryId) : categoryByLabel(result.category);
      setPriceSuggestion(null);
      setDynamicPrice(null);
      setDraft((current) => ({
        ...current,
        title: result.title,
        description: `${result.description}\n\n状態メモ: ${result.conditionNotes}`,
        categoryId: category.id,
        category: category.label,
        conditionScore: result.conditionScore,
      }));
      setNotice(`AIが状態${result.conditionScore}点の下書きを作成しました。価格は価格提案から設定してください`);
    });
  }

  async function runPriceSuggest() {
    await runTask("price", async () => {
      const result = await api<PriceSuggestion>("/ai/price-suggest", {
        method: "POST",
        token,
        body: {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          categoryId: draft.categoryId,
          conditionScore: Number(draft.conditionScore || 75),
          targetSellDays: Number(targetSellDays || 7),
          images: draft.imageUrls,
        },
      });
      setPriceSuggestion(result);
      setDynamicPrice(null);
      setDraft((current) => ({ ...current, price: result.suggestedPrice }));
      setNotice(`AI価格提案を反映しました。${result.sellThroughDays}日以内の売却目安です`);
    });
  }

  async function runDynamicPrice() {
    await runTask("dynamic-price", async () => {
      const currentPrice = Number(draft.price || priceSuggestion?.suggestedPrice || 0);
      if (currentPrice <= 0) throw new Error("先に価格を入力するか、価格提案を実行してください");
      const result = await api<DynamicPriceResult>("/ai/dynamic-price", {
        method: "POST",
        token,
        body: {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          categoryId: draft.categoryId,
          currentPrice,
          conditionScore: Number(draft.conditionScore || 75),
          likeCount: 0,
          viewCount: 0,
          recentViewCount: 0,
          viewVelocity: 0,
          targetSellDays: Number(targetSellDays || 7),
        },
      });
      setDynamicPrice(result);
      setNotice("動的価格プランを作成しました。公開後は閲覧数といいねを反映して再計算できます");
    });
  }

  async function runFraudCheck() {
    await runTask("fraud", async () => {
      const result = await api<FraudCheckResult>("/ai/fraud-check", {
        method: "POST",
        token,
        body: {
          ...draft,
          images: draft.imageUrls,
        },
      });
      setFraudResult(result);
      setNotice(result.risk === "low" ? "出品チェック: 問題ありません" : "出品チェック: 確認ポイントがあります");
    });
  }

  async function attachImages(files: File[]) {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setNotice("画像ファイルを選択してください");
        return false;
      }
      if (file.size > 4 * 1024 * 1024) {
        setNotice("画像は4MB以下にしてください");
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    const pendingPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setUploadPreviewUrls((current) => [...current, ...pendingPreviewUrls]);
    await runTask("upload", async () => {
      if (!token) throw new Error("画像添付にはログインが必要です");
      const filesToUpload = blurBackground ? await Promise.all(validFiles.map(imageFileWithBlurredBackground)) : validFiles;
      const uploaded = await Promise.all(filesToUpload.map(async (file) => ({
        url: await uploadImage(file, token),
        name: file.name,
      })));
      setDraft((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploaded.map((item) => item.url)],
        imageNames: [...current.imageNames, ...uploaded.map((item) => item.name)],
      }));
      setNotice(blurBackground ? `${uploaded.length}枚の画像を背景ぼかし付きでアップロードしました` : `${uploaded.length}枚の画像をアップロードしました`);
    });
    pendingPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setUploadPreviewUrls((current) => current.filter((url) => !pendingPreviewUrls.includes(url)));
  }

  function removeImage(index: number) {
    setDraft((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((_, currentIndex) => currentIndex !== index),
      imageNames: current.imageNames.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function createItem(status: "draft" | "published") {
    await runTask("item", async () => {
      if (!draft.title.trim()) throw new Error("商品名を入力してください");
      if (!draft.description.trim()) throw new Error("説明文を入力してください");
      if (draft.price === "" || Number(draft.price) <= 0) throw new Error("価格を入力してください");
      const item = await api<Item>("/items", {
        method: "POST",
        token,
        body: {
          ...draft,
          price: Number(draft.price),
          conditionScore: Number(draft.conditionScore || 75),
          status,
          context: draft.description.split("\n")[0],
          images: draft.imageUrls,
        },
      });
      setNotice(status === "published" ? "商品を公開しました" : "下書きを保存しました");
      if (status === "published") navigate(`/items/${item.id}`);
    });
  }

  const displayImageUrls = [...draft.imageUrls, ...uploadPreviewUrls];

  return (
    <section className="two-column-page">
      <section className="panel">
        <div className="panel-title">
          <Sparkles size={18} />
          <h2>AI出品</h2>
        </div>
        {notice && <div className="notice">{notice}</div>}
        <div>
          <strong className="field-heading">出品画像</strong>
          <p className="field-note">商品名と説明文を自動入力します</p>
        </div>
        <div
          className={displayImageUrls.length > 0 ? "dropzone has-image" : "dropzone"}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void attachImages(Array.from(event.dataTransfer.files ?? []));
          }}
        >
          <input
            id="sell-images"
            className="image-input"
            multiple
            type="file"
            accept="image/*"
            onChange={(event) => {
              void attachImages(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {displayImageUrls.length > 0 ? (
            <>
              <div className="preview-grid">
                {displayImageUrls.map((url, index) => {
                  const isPendingPreview = index >= draft.imageUrls.length;
                  return (
                    <div key={`${url}-${index}`} className={isPendingPreview ? "preview-card pending-preview" : "preview-card"}>
                      <img src={url} alt={`出品画像 ${index + 1}`} />
                      {isPendingPreview ? (
                        <span className="preview-uploading">アップロード中</span>
                      ) : (
                        <button
                          type="button"
                          className="preview-remove"
                          aria-label={`画像 ${index + 1} を削除`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeImage(index);
                          }}
                        >
                          <X size={14} />
                          <span>削除</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                <label className="preview-add" htmlFor="sell-images">
                  <ImagePlus size={18} />
                  <span>追加</span>
                </label>
              </div>
              <span className="selected-file">
                {busy === "upload" ? "アップロード中" : `${draft.imageUrls.length}枚の画像を添付済み`}
              </span>
            </>
          ) : (
            <label className="dropzone-empty" htmlFor="sell-images">
              <strong>写真をドラッグして追加</strong>
              <span>商品の全体、詳細、文字入りの写真をアップロードしてください。</span>
              <em>-または-</em>
              <b>
                <Camera size={18} />
                画像を選択する
              </b>
            </label>
          )}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={blurBackground} onChange={(event) => setBlurBackground(event.target.checked)} />
          <span>アップロードする写真の背景を自動でぼかします</span>
        </label>
        <label>
          メモ
          <textarea
            value={draft.memo}
            placeholder="例: 通学で使ったスニーカー。つま先に少し汚れあり。"
            onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
          />
        </label>
        <button className="primary" disabled={busy === "assist" || !token} onClick={runAssist}>
          <Bot size={18} />
          {busy === "assist" ? "生成中" : "AIで下書き生成"}
        </button>
        <div className="ai-action-grid">
          <label className="compact-field">
            売りたい日数
            <input
              type="number"
              min="1"
              max="60"
              value={targetSellDays}
              placeholder="7"
              onChange={(event) => setTargetSellDays(event.target.value === "" ? "" : Number(event.target.value))}
            />
          </label>
          <button disabled={busy === "price" || !token} onClick={runPriceSuggest}>
            <Tags size={16} />
            {busy === "price" ? "提案中" : "価格提案"}
          </button>
          <button disabled={busy === "dynamic-price" || !token} onClick={runDynamicPrice}>
            <Sparkles size={16} />
            {busy === "dynamic-price" ? "計算中" : "動的価格"}
          </button>
          <button disabled={busy === "fraud" || !token} onClick={runFraudCheck}>
            <ShieldCheck size={16} />
            {busy === "fraud" ? "確認中" : "出品チェック"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <PackagePlus size={18} />
          <h2>出品フォーム</h2>
        </div>
        <label>
          商品名
          <input
            value={draft.title}
            placeholder="例: Nike Air Force 1 ホワイト"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        <label>
          カテゴリ
          <select
            value={draft.categoryId}
            onChange={(event) => {
              const category = categoryByID(Number(event.target.value));
              setDraft({ ...draft, categoryId: category.id, category: category.label });
            }}
          >
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <div className="split">
          <label>
            価格
            <input
              type="number"
              value={draft.price}
              placeholder="例: 9800"
              onChange={(event) => setDraft({ ...draft, price: event.target.value === "" ? "" : Number(event.target.value) })}
            />
          </label>
          <label>
            状態
            <input
              type="number"
              min="0"
              max="100"
              placeholder="75"
              value={draft.conditionScore}
              onChange={(event) => setDraft({ ...draft, conditionScore: event.target.value === "" ? "" : Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          説明文
          <textarea
            value={draft.description}
            placeholder="商品の状態、購入時期、使用頻度、傷や汚れの位置を書いてください。"
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </label>
        {priceSuggestion && (
          <div className="ai-result-card">
            <strong>AI価格提案</strong>
            <span>推奨 ¥{priceSuggestion.suggestedPrice.toLocaleString()}</span>
            <small>
              相場 ¥{priceSuggestion.marketRange[0].toLocaleString()} - ¥{priceSuggestion.marketRange[1].toLocaleString()} / {priceSuggestion.sellThroughDays}日以内の売却目安
            </small>
          </div>
        )}
        {dynamicPrice && (
          <div className="ai-result-card dynamic-price-card">
            <strong>動的価格プラン</strong>
            <span>初期推奨 ¥{dynamicPrice.recommendedPrice.toLocaleString()}</span>
            <small>{dynamicPrice.expectedSellDays}日目安 / 信頼度 {Math.round(dynamicPrice.confidence * 100)}%</small>
            <div className="mini-price-path">
              {dynamicPrice.pricePath.slice(0, 10).map((point) => (
                <span key={point.day}>
                  <b>{point.day}日</b>
                  <em>¥{point.price.toLocaleString()}</em>
                </span>
              ))}
            </div>
          </div>
        )}
        {fraudResult && (
          <div className={fraudResult.risk === "low" ? "ai-result-card safe-result" : "ai-result-card watch-result"}>
            <strong>出品チェック: {fraudResult.risk === "low" ? "問題なし" : "確認ポイントあり"}</strong>
            {fraudResult.reasons.map((reason) => (
              <small key={reason}>{reason}</small>
            ))}
          </div>
        )}
        <div className="action-row">
          <button disabled={Boolean(busy) || !token} onClick={() => createItem("draft")}>下書き</button>
          <button className="primary" disabled={Boolean(busy) || !token} onClick={() => createItem("published")}>
            公開
          </button>
        </div>
      </section>
    </section>
  );
}
