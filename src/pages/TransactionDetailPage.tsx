import { CheckCircle2, CreditCard, PackageCheck, SendHorizontal, Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ItemImage } from "../components/ItemImage";
import { api, asArray } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Message, Review, Transaction } from "../lib/types";

const transactionSteps = ["支払い", "発送", "受取", "完了"];

function transactionDoneLabel(transaction: Transaction | undefined) {
  if (!transaction) return "完了済み";
  return transaction.myReviewed && transaction.partnerReviewed ? "完了" : "評価待ち";
}

export function TransactionDetailPage() {
  const { id } = useParams();
  const txnID = Number(id);
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const transaction = transactions.find((txn) => txn.id === txnID);
  const isBuyer = Boolean(transaction && transaction.buyerId === user?.id);
  const isSeller = Boolean(transaction && transaction.sellerId === user?.id);
  const canPay = Boolean(isBuyer && transaction?.status === "pending");
  const canComplete = Boolean(isBuyer && transaction?.status === "active");
  const myReview = reviews.find((review) => review.reviewerId === user?.id && review.transactionId === txnID);

  useEffect(() => {
    if (!token || !txnID) {
      setTransactions([]);
      setMessages([]);
      setReviews([]);
      return;
    }
    refresh();
  }, [token, txnID]);

  async function refresh() {
    try {
      const [txnResult, msgResult, reviewResult] = await Promise.all([
        api<{ transactions: Transaction[] }>("/transactions", { token }),
        api<{ messages: Message[] }>(`/transactions/${txnID}/messages`, { token }),
        api<{ reviews: Review[] }>(`/transactions/${txnID}/reviews`, { token }),
      ]);
      setTransactions(asArray(txnResult.transactions));
      setMessages(asArray(msgResult.messages));
      setReviews(asArray(reviewResult.reviews));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "取引を取得できませんでした");
    }
  }

  async function completeTransaction() {
    try {
      setBusy("transaction");
      await api<Transaction>(`/transactions/${txnID}/complete`, { method: "POST", token, body: {} });
      setNotice("受取完了を送信しました");
      refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "取引更新に失敗しました");
    } finally {
      setBusy("");
    }
  }

  async function payTransaction() {
    try {
      setBusy("transaction");
      await api<Transaction>(`/transactions/${txnID}/pay`, { method: "POST", token, body: {} });
      setNotice("支払い完了として取引を開始しました");
      refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "支払い更新に失敗しました");
    } finally {
      setBusy("");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy("message");
      const body = messageBody.trim();
      if (!body) return;
      const msg = await api<Message>(`/transactions/${txnID}/messages`, { method: "POST", token, body: { body } });
      setMessages((current) => [...current, msg]);
      setMessageBody("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "メッセージ送信に失敗しました");
    } finally {
      setBusy("");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy("review");
      const review = await api<Review>(`/transactions/${txnID}/reviews`, { method: "POST", token, body: { rating, comment } });
      setReviews((current) => {
        const next = current.filter((item) => item.transactionId !== review.transactionId || item.reviewerId !== review.reviewerId);
        return [...next, review];
      });
      setTransactions((current) => current.map((txn) => (txn.id === txnID ? { ...txn, myReviewed: true } : txn)));
      setRating(5);
      setComment("");
      setNotice("評価を送信しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "評価送信に失敗しました");
    } finally {
      setBusy("");
    }
  }

  const statusLabel = transaction?.status === "pending" ? "支払い待ち" : transaction?.status === "done" ? transactionDoneLabel(transaction) : "取引中";
  const statusClass = transaction?.status === "done" && !(transaction.myReviewed && transaction.partnerReviewed) ? "review_wait" : transaction?.status;
  const activeStep = transaction?.status === "pending" ? 0 : transaction?.status === "active" ? 2 : 3;
  const statusCopy = (() => {
    if (!transaction) return "";
    if (transaction.status === "pending") {
      return isBuyer ? "支払いを完了すると出品者に発送依頼が届きます" : "購入者の支払い完了を待っています";
    }
    if (transaction.status === "active") {
      return isBuyer ? "商品が届いたら中身を確認して受取完了を送信してください" : "発送後は購入者の受取完了を待ちます";
    }
    if (!transaction.myReviewed) return "取引は完了しています。相手を評価してください";
    if (!transaction.partnerReviewed) return "相手の評価を待っています";
    return "取引は完了しています";
  })();

  return (
    <section className="transaction-page">
      <section className="transaction-screen">
        <div className="transaction-header">
          <div>
            <p className="eyebrow">TRANSACTION</p>
            <h2>取引 #{txnID}</h2>
          </div>
          {transaction && <b className={`txn-status ${statusClass}`}>{statusLabel}</b>}
        </div>
        {notice && <div className="notice">{notice}</div>}
        {transaction && (
          <div className="transaction-progress" aria-label="取引ステータス">
            {transactionSteps.map((step, index) => (
              <div key={step} className={index <= activeStep ? "progress-step active" : "progress-step"}>
                <span>{index + 1}</span>
                <b>{step}</b>
              </div>
            ))}
          </div>
        )}
        {transaction && (
          <Link className="transaction-item-summary" to={`/items/${transaction.itemId}`}>
            <ItemImage src={transaction.item?.images[0]} alt="" />
            <div>
              <h3>{transaction.item?.title ?? `Item ${transaction.itemId}`}</h3>
              <strong>{transaction.item ? `¥${transaction.item.price.toLocaleString()}` : ""}</strong>
              <p>{isBuyer ? "購入した商品" : "販売した商品"}</p>
            </div>
          </Link>
        )}
        {transaction && transaction.status !== "done" && (
          <section className="transaction-action-panel">
            <div className="transaction-complete-copy">
              <strong>{transaction.status === "pending" ? "支払い" : "受取完了"}</strong>
              <span>{statusCopy}</span>
            </div>
            {canPay ? (
              <button className="primary" disabled={busy === "transaction"} onClick={payTransaction}>
                <CreditCard size={16} />
                支払い完了
              </button>
            ) : canComplete ? (
              <button className="primary" disabled={busy === "transaction"} onClick={completeTransaction}>
                <PackageCheck size={16} />
                受取完了
              </button>
            ) : (
              <button disabled>
                <CheckCircle2 size={16} />
                待機中
              </button>
            )}
          </section>
        )}
        <section className="transaction-messages-panel">
          <div className="txn-section-title">
            <Star size={17} />
            <h3>取引メッセージ</h3>
          </div>
          <div className="messages">
            {messages.length === 0 && <p className="message-empty">取引メッセージはまだありません。</p>}
            {messages.map((msg) => (
              <p key={msg.id} className={msg.senderId === user?.id ? "mine" : ""}>
                {msg.body}
              </p>
            ))}
          </div>
          <form className="message-form" onSubmit={sendMessage}>
            <input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="取引メッセージ" />
            <button type="submit" className="send-button" disabled={busy === "message" || !messageBody.trim()} aria-label="メッセージを送信">
              <SendHorizontal size={18} />
            </button>
          </form>
        </section>
        {transaction?.status === "done" && isSeller && !transaction.partnerReviewed && !myReview && (
          <div className="done-summary">購入者の評価を待っています。購入者が評価すると、出品者も評価できます。</div>
        )}
        {transaction?.status === "done" && !myReview && !(isSeller && !transaction.partnerReviewed) && (
          <form className="review-form" onSubmit={submitReview}>
            <label>
              評価
              <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
                <option value={2}>2</option>
                <option value={1}>1</option>
              </select>
            </label>
            <label>
              コメント
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="取引の感想" />
            </label>
            <button className="primary" disabled={busy === "review"}>評価を送信</button>
          </form>
        )}
        {myReview && <div className="review-sent">評価送信済み</div>}
        {transaction?.status === "done" && reviews.length > 0 && (
          <section className="review-list">
            <div className="txn-section-title">
              <Star size={17} />
              <h3>取引評価</h3>
            </div>
            {reviews.map((review) => (
              <article key={review.id} className="review-card">
                <div className="review-card-head">
                  <strong>{review.reviewerId === user?.id ? "あなた" : (review.reviewerName ?? `User ${review.reviewerId}`)}</strong>
                  <span>{review.reviewerRole ?? "取引相手"}から{review.revieweeRole ? `${review.revieweeRole}へ` : ""}</span>
                  <b>★{review.rating}</b>
                </div>
                {review.comment && <p>{review.comment}</p>}
              </article>
            ))}
          </section>
        )}
        {transaction?.status === "done" && (
          <div className="done-summary">取引は完了しています。レビューは相手ごとに1回だけ送れます。</div>
        )}
      </section>
    </section>
  );
}
