import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ItemImage } from "../components/ItemImage";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fallbackItems } from "../lib/fallback";
import type { Item, ItemQuestionResult, Transaction } from "../lib/types";

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

  if (!item) {
    return <section className="center-page"><div className="notice">{notice || "読み込み中"}</div></section>;
  }

  const isOwner = Boolean(user && item.sellerId === user.id);
  const canRequestPurchase = Boolean(user && !isOwner && item.status === "published");
  const canLoginToPurchase = Boolean(!user && item.status === "published");
  const canStopPublishing = Boolean(isOwner && item.status === "published");

  return (
    <section className="detail-page">
      <div className="detail-media">
        <ItemImage src={item.images[0]} alt={item.title} />
      </div>
      <section className="panel">
        <p className="eyebrow">{item.category}</p>
        <h2>{item.title}</h2>
        <strong className="detail-price">¥{item.price.toLocaleString()}</strong>
        <p>{item.description}</p>
        <div className="score-row">
          <meter min="0" max="100" value={item.conditionScore} />
          <span>状態 {item.conditionScore}</span>
        </div>
        {notice && <div className="notice">{notice}</div>}
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
