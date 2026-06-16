import { MessageCircle, PackageCheck, ShoppingBag, Store, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api, asArray } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Transaction } from "../lib/types";

function transactionStatusLabel(status: Transaction["status"]) {
  if (status === "pending") return "支払い待ち";
  if (status === "active") return "取引中";
  return "完了";
}

function transactionDisplayStatus(txn: Transaction) {
  if (txn.status !== "done") return txn.status;
  return txn.myReviewed && txn.partnerReviewed ? "done" : "review_wait";
}

function transactionDisplayLabel(txn: Transaction) {
  const displayStatus = transactionDisplayStatus(txn);
  if (displayStatus === "review_wait") return "評価待ち";
  return transactionStatusLabel(txn.status);
}

function transactionTodo(txn: Transaction, userID?: number) {
  const isBuyer = txn.buyerId === userID;
  if (txn.status === "pending") return isBuyer ? "支払いを完了してください" : "購入者の支払い待ちです";
  if (txn.status === "active") return isBuyer ? "到着後に受取完了をしてください" : "発送後は受取完了を待ちます";
  if (!txn.myReviewed) return "相手を評価してください";
  if (!txn.partnerReviewed) return "相手の評価を待っています";
  return "取引が完了しました";
}

function transactionRank(txn: Transaction) {
  if (txn.status === "pending" || txn.status === "active") return 0;
  if (transactionDisplayStatus(txn) === "review_wait") return 1;
  return 2;
}

function sortTransactions(items: Transaction[]) {
  return [...items].sort((a, b) => transactionRank(a) - transactionRank(b) || b.id - a.id);
}

export function TransactionsPage() {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState(user ? "" : "ログインすると取引履歴を確認できます");
  const buying = useMemo(() => sortTransactions(transactions.filter((txn) => txn.buyerId === user?.id)), [transactions, user?.id]);
  const selling = useMemo(() => sortTransactions(transactions.filter((txn) => txn.sellerId === user?.id)), [transactions, user?.id]);

  useEffect(() => {
    if (!token) {
      setTransactions([]);
      return;
    }
    api<{ transactions: Transaction[] }>("/transactions", { token })
      .then((result) => setTransactions(asArray(result.transactions)))
      .catch((error) => setNotice(error instanceof Error ? error.message : "取引履歴を取得できませんでした"));
  }, [token]);

  async function deleteTransaction(id: number) {
    try {
      setBusy(id);
      await api<{ deleted: boolean }>(`/transactions/${id}`, { method: "DELETE", token });
      setTransactions((current) => current.filter((txn) => txn.id !== id));
      setNotice("取引履歴から削除しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "取引履歴の削除に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  function renderTransactions(items: Transaction[], emptyText: string) {
    if (items.length === 0) return <p className="muted">{emptyText}</p>;
    return items.map((txn) => (
      <article key={txn.id} className="txn-card-row">
        <Link className="txn-card" to={`/transactions/${txn.id}`}>
          <img src={txn.item?.images[0] ?? "/theme-reference.png"} alt="" />
          <span className="txn-card-body">
            <span className="txn-card-title">{txn.item?.title ?? `Item ${txn.itemId}`}</span>
            <span className="txn-card-todo">{transactionTodo(txn, user?.id)}</span>
          </span>
          <b className={`txn-status ${transactionDisplayStatus(txn)}`}>{transactionDisplayLabel(txn)}</b>
        </Link>
        {transactionDisplayStatus(txn) === "done" && (
          <button className="icon-action danger-action" disabled={busy === txn.id} onClick={() => deleteTransaction(txn.id)} aria-label="取引履歴から削除">
            <Trash2 size={16} />
          </button>
        )}
        {transactionDisplayStatus(txn) !== "done" && <span className="txn-card-action-placeholder" aria-hidden="true" />}
      </article>
    ));
  }

  return (
    <section className="transaction-page">
      <section className="transaction-screen">
        <div className="panel-title">
          <MessageCircle size={18} />
          <h2>取引</h2>
        </div>
        {notice && <div className="notice">{notice}</div>}
        <div className="transaction-columns">
          <section className="txn-section">
            <div className="txn-section-title">
              <ShoppingBag size={17} />
              <h3>購入した商品</h3>
            </div>
            <div className="txn-list">{renderTransactions(buying, "購入後に取引が表示されます。")}</div>
          </section>
          <section className="txn-section">
            <div className="txn-section-title">
              <Store size={17} />
              <h3>出品した商品</h3>
            </div>
            <div className="txn-list">{renderTransactions(selling, "商品が売れると取引が表示されます。")}</div>
          </section>
        </div>
        <div className="txn-help-row">
          <PackageCheck size={16} />
          <span>支払い、発送、受取完了の順に取引が進みます。</span>
        </div>
      </section>
    </section>
  );
}
