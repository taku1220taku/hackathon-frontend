import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ItemImage } from "../components/ItemImage";
import { ItemLikeButton } from "../components/ItemLikeButton";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fallbackItems } from "../lib/fallback";
import type { DynamicPriceResult, Item, ItemQuestionResult, Transaction } from "../lib/types";

export function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [pricePlan, setPricePlan] = useState<DynamicPriceResult | null>(null);
  const [priceBusy, setPriceBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Item>(`/items/${id}`, token ? { token } : {})
      .then(setItem)
      .catch((error) => {
        const fallback = fallbackItems.find((nextItem) => nextItem.id === Number(id));
        if (fallback) {
          setItem(fallback);
          setNotice("API未接続のためデモ商品を表示しています");
          return;
        }
        setNotice(error instanceof Error ? error.message : "商品を取得できませんでした");
      });
  }, [id, token]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setPricePlan(null);
  }, [item?.id]);

  async function requestPurchase() {
    if (!item) return;
    try {
      setBusy(true);
      const txn = await api<Transaction>(`/items/${item.id}/purchase-requests`, { method: "POST", token, body: { paymentMethod: "instant" } });
      setNotice("購入が完了しました");
      navigate(`/transactions/${txn.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "購入に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function askItemQuestion() {
    if (!item || !question.trim()) return;
    try {
      setAiBusy(true);
      const result = await api<ItemQuestionResult>("/ai/item-question", {
        method: "POST",
        token,
        body: { itemId: item.id, question },
      });
      setAnswer(result.answer);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI質問に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }

  async function stopPublishing() {
    if (!item) return;
    try {
      setBusy(true);
      const updated = await api<Item>(`/items/${item.id}`, {
        method: "PATCH",
        token,
        body: { ...item, status: "draft", images: item.images },
      });
      setItem(updated);
      setNotice("商品の公開を停止しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "公開停止に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike() {
    if (!item || !token) {
      setNotice("いいねするにはログインしてください");
      return;
    }
    try {
      const updated = await api<Item>(`/items/${item.id}/like`, {
        method: item.likedByMe ? "DELETE" : "POST",
        token,
        body: {},
      });
      setItem(updated);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "いいねに失敗しました");
    }
  }

  async function loadPricePlan() {
    if (!item || !token) return;
    try {
      setPriceBusy(true);
      const result = await api<DynamicPriceResult>("/ai/dynamic-price", {
        method: "POST",
        token,
        body: { itemId: item.id, targetSellDays: 7 },
      });
      setPricePlan(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI価格ナビの取得に失敗しました");
    } finally {
      setPriceBusy(false);
    }
  }

  if (!item) {
    return <section className="center-page"><div className="notice">{notice || "読み込み中"}</div></section>;
  }

  const isOwner = Boolean(user && item.sellerId === user.id);
  const canRequestPurchase = Boolean(user && !isOwner && item.status === "published");
  const canLoginToPurchase = Boolean(!user && item.status === "published");
  const canStopPublishing = Boolean(isOwner && item.status === "published");
  const galleryImages = item.images.length > 0 ? item.images : [undefined];
  const selectedImage = galleryImages[Math.min(selectedImageIndex, galleryImages.length - 1)];
  const maxPathPrice = Math.max(...(pricePlan?.pricePath.map((point) => point.price) ?? [1]));

  return (
    <section className="detail-page">
      <div className="detail-gallery">
        <div className="detail-media">
          <ItemImage src={selectedImage} alt={item.title} />
          {galleryImages.length > 1 && (
            <span className="gallery-counter">{selectedImageIndex + 1} / {galleryImages.length}</span>
          )}
        </div>
        {galleryImages.length > 1 && (
          <div className="gallery-thumbs" aria-label="商品画像">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={index === selectedImageIndex ? "active" : ""}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`画像 ${index + 1} を表示`}
              >
                <ItemImage src={image} alt={`${item.title} ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <section className="panel">
        <p className="eyebrow">{item.category}</p>
        <h2>{item.title}</h2>
        <div className="detail-price-row">
          <strong className="detail-price">¥{item.price.toLocaleString()}</strong>
          <ItemLikeButton liked={item.likedByMe} count={item.likeCount} disabled={!token} onToggle={toggleLike} />
        </div>
        {canRequestPurchase && (
          confirmPurchase ? (
            <section className="purchase-confirm">
              <strong>購入内容を確認</strong>
              <span>支払い手続きは省略し、この商品を購入済みにします。</span>
              <div className="action-row">
                <button disabled={busy} onClick={() => setConfirmPurchase(false)}>戻る</button>
                <button className="primary" disabled={busy} onClick={requestPurchase}>購入を確定する</button>
              </div>
            </section>
          ) : (
            <button className="primary" disabled={busy} onClick={() => setConfirmPurchase(true)}>購入する</button>
          )
        )}
        {canLoginToPurchase && (
          <Link className="primary" to="/login">ログインして購入する</Link>
        )}
        {canStopPublishing && (
          <button className="danger" disabled={busy} onClick={stopPublishing}>公開停止</button>
        )}
        <p>{item.description}</p>
        <div className="score-row">
          <meter min="0" max="100" value={item.conditionScore} />
          <span>状態 {item.conditionScore}</span>
        </div>
        {notice && <div className="notice">{notice}</div>}
        {isOwner && (
          <section className="price-navigator">
            <div className="item-title-row">
              <div>
                <p className="eyebrow">AI PRICE NAVI</p>
                <strong>動的価格プラン</strong>
              </div>
              <button disabled={priceBusy || !token} onClick={loadPricePlan}>
                {priceBusy ? "計算中" : pricePlan ? "再計算" : "計算"}
              </button>
            </div>
            <div className="metric-grid">
              <span><b>{item.viewCount}</b><small>閲覧</small></span>
              <span><b>{item.recentViewCount}</b><small>24h</small></span>
              <span><b>{item.viewVelocity.toFixed(1)}</b><small>件/日</small></span>
              <span><b>{item.likeCount}</b><small>いいね</small></span>
            </div>
            {pricePlan && (
              <>
                <div className="price-plan-summary">
                  <span>推奨価格</span>
                  <strong>¥{pricePlan.recommendedPrice.toLocaleString()}</strong>
                  <small>{pricePlan.expectedSellDays}日目安 / 信頼度 {Math.round(pricePlan.confidence * 100)}%</small>
                </div>
                <div className="price-path" aria-label="価格推移">
                  {pricePlan.pricePath.slice(0, 14).map((point) => (
                    <div key={point.day} className="price-path-day">
                      <span style={{ height: `${Math.max(18, (point.price / maxPathPrice) * 92)}px` }} />
                      <small>{point.day}日</small>
                    </div>
                  ))}
                </div>
                <p className="field-note">{pricePlan.explanation}</p>
              </>
            )}
          </section>
        )}
        {user && !isOwner && (
          <section className="ai-question-box">
            <strong>AIに商品について質問</strong>
            <div className="message-form">
              <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例: 目立つ傷はありますか？" />
              <button disabled={aiBusy || !question.trim()} onClick={askItemQuestion}>
                {aiBusy ? "回答中" : "質問"}
              </button>
            </div>
            {answer && <p>{answer}</p>}
          </section>
        )}
      </section>
    </section>
  );
}
