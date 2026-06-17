import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ItemCard } from "../components/ItemCard";
import { api, asArray } from "../lib/api";
import { useAuth } from "../lib/auth";
import { categoryOptions } from "../lib/categories";
import { fallbackItems } from "../lib/fallback";
import type { Item } from "../lib/types";

const pageSize = 12;

export function HomePage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Item[]>(fallbackItems);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recommended");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("API未接続でもデモデータで体験できます");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(1);
    void refreshItems(1, true);
  }, [q, category, sort, minPrice, maxPrice, token, user?.id]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        void refreshItems(nextPage, false);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  async function refreshItems(nextPage = 1, replace = true) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(nextPage),
        sort,
      });
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      const usePersonalized = Boolean(token && sort === "recommended" && !q.trim() && !category && !minPrice && !maxPrice);
      const path = usePersonalized ? `/ai/recommendations?${params.toString()}` : `/items?${params.toString()}`;
      const result = await api<{ items: Item[]; hasMore: boolean }>(path, token ? { token } : {});
      const nextItems = asArray(result.items).filter((item) => item.sellerId !== user?.id);
      setItems((current) => (replace ? nextItems : [...current, ...nextItems]));
      setHasMore(Boolean(result.hasMore));
      setNotice(usePersonalized ? "AIおすすめを同期しました" : "API接続中: 商品一覧を同期しました");
    } catch {
      setItems(fallbackItems);
      setHasMore(false);
      setNotice("API未接続でもデモデータで体験できます");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(item: Item) {
    if (!token) {
      setNotice("いいねするにはログインしてください");
      return;
    }
    try {
      const updated = await api<Item>(`/items/${item.id}/like`, {
        method: item.likedByMe ? "DELETE" : "POST",
        token,
        body: {},
      });
      setItems((current) => current.map((nextItem) => (nextItem.id === updated.id ? updated : nextItem)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "いいねに失敗しました");
    }
  }

  return (
    <section className="main-pane">
      <div className="notice">{notice}</div>

      <section className="toolbar marketplace-toolbar" aria-label="検索とフィルタ">
        <label className="search-field">
          <Search size={18} />
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="古着、ガジェット、推しグッズを検索" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">すべて</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="recommended">おすすめ</option>
          <option value="new">新着</option>
          <option value="popular">人気</option>
        </select>
        <input type="number" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="最低価格" />
        <input type="number" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="最高価格" />
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">RECOMMEND</p>
          <h2>あなたへのおすすめ</h2>
        </div>
        <button onClick={() => refreshItems(1, true)}>更新</button>
      </section>

      <div className="item-grid">
        {items.map((item) => (
          <ItemCard item={item} key={item.id} canLike={Boolean(token)} onLike={toggleLike} />
        ))}
      </div>
      <div ref={sentinelRef} className="load-sentinel">
        {loading ? "読み込み中" : hasMore ? "さらに読み込む" : "すべて表示しました"}
      </div>
    </section>
  );
}
