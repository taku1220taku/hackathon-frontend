import { Layers3, PackageCheck, PencilLine, Plus, Star, Store, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, asArray } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Item, Review } from "../lib/types";

export function MyPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"published" | "drafts" | "sold" | "reviews">("published");

  const drafts = useMemo(() => items.filter((item) => item.status === "draft"), [items]);
  const published = useMemo(() => items.filter((item) => item.status === "published"), [items]);
  const sold = useMemo(() => items.filter((item) => item.status === "sold"), [items]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    refreshItems();
    refreshReviews();
  }, [token]);

  async function refreshItems() {
    try {
      const result = await api<{ items: Item[] }>("/me/items", { token });
      setItems(asArray(result.items));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "出品一覧を取得できませんでした");
    }
  }

  async function refreshReviews() {
    try {
      const result = await api<{ reviews: Review[] }>("/me/reviews", { token });
      setReviews(asArray(result.reviews));
    } catch {
      setReviews([]);
    }
  }

  async function publishDraft(item: Item) {
    try {
      setBusy(item.id);
      const updated = await api<Item>(`/items/${item.id}`, {
        method: "PATCH",
        token,
        body: { ...item, status: "published", images: item.images },
      });
      setItems((current) => current.map((next) => (next.id === updated.id ? updated : next)));
      setNotice("下書きを公開しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "公開に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function deleteItem(item: Item) {
    try {
      setBusy(item.id);
      await api<{ deleted: boolean }>(`/items/${item.id}`, { method: "DELETE", token });
      setItems((current) => current.filter((next) => next.id !== item.id));
      setNotice("出品一覧から削除しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  function renderItems(list: Item[], emptyText: string, draftActions = false) {
    if (list.length === 0) return <p className="muted">{emptyText}</p>;
    return (
      <div className="my-item-list">
        {list.map((item) => (
          <article key={item.id} className="my-item-row">
            <Link to={`/items/${item.id}`} className="my-item-thumb">
              <img src={item.images[0] ?? "/theme-reference.png"} alt="" />
            </Link>
            <Link to={`/items/${item.id}`} className="my-item-info">
              <strong>{item.title}</strong>
              <span>{item.category}</span>
              <b>¥{item.price.toLocaleString()}</b>
            </Link>
            <div className="my-item-actions">
              {draftActions && (
                <button disabled={busy === item.id} onClick={() => publishDraft(item)}>
                  公開
                </button>
              )}
              <button className="icon-action danger-action" disabled={busy === item.id} onClick={() => deleteItem(item)} aria-label="削除">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  const tabs = [
    { key: "published" as const, label: "出品中", count: published.length, icon: Layers3 },
    { key: "drafts" as const, label: "下書き", count: drafts.length, icon: PencilLine },
    { key: "sold" as const, label: "売却済み", count: sold.length, icon: PackageCheck },
    { key: "reviews" as const, label: "評価", count: reviews.length, icon: Star },
  ];

  return (
    <section className="my-page">
      <section className="my-profile-panel">
        {user ? (
          <>
            <div className="my-profile-main">
              <div className="avatar-placeholder">{user.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <p className="eyebrow">MY PAGE</p>
                <h2>{user.displayName}</h2>
                <span>{user.email}</span>
              </div>
              <Link className="primary compact-sell-button" to="/sell">
                <Plus size={16} />
                出品
              </Link>
            </div>
            <div className="my-stats">
              <span><b>{published.length}</b>出品中</span>
              <span><b>{sold.length}</b>売却済み</span>
              <span><b>{user.rating.toFixed(1)}</b>評価</span>
            </div>
          </>
        ) : (
          <>
            <div className="panel-title">
              <Store size={18} />
              <h2>マイページ</h2>
            </div>
            <p className="muted">ログインするとプロフィールと履歴を確認できます。</p>
            <Link className="primary" to="/login">ログイン</Link>
          </>
        )}
        {notice && <div className="notice">{notice}</div>}
      </section>

      <section className="my-dashboard">
        <div className="my-tabs" role="tablist" aria-label="マイページの表示切替">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
                <Icon size={16} />
                <span>{tab.label}</span>
                <b>{tab.count}</b>
              </button>
            );
          })}
        </div>

        <div className="my-tab-content">
          {activeTab === "published" && renderItems(published, "公開中の商品はありません。")}
          {activeTab === "drafts" && renderItems(drafts, "保存した下書きはありません。", true)}
          {activeTab === "sold" && renderItems(sold, "販売済みの商品はありません。")}
          {activeTab === "reviews" && (
            reviews.length === 0 ? (
              <p className="muted">まだ評価はありません。</p>
            ) : (
              <div className="review-list compact-review-list">
                {reviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-card-head">
                      <strong>{review.reviewerName ?? `User ${review.reviewerId}`}</strong>
                      <span>{review.reviewerRole ?? "取引相手"}からの評価</span>
                      <b>★{review.rating}</b>
                    </div>
                    {review.comment && <p>{review.comment}</p>}
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </section>
    </section>
  );
}
