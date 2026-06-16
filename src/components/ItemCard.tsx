import { Link } from "react-router-dom";
import type { Item } from "../lib/types";

export function ItemCard({ item, action }: { item: Item; action?: React.ReactNode }) {
  const statusLabel = item.status === "sold" ? "売却済み" : "";

  return (
    <article className="item-card">
      <Link to={`/items/${item.id}`} className="image-wrap">
        <img src={item.images[0] ?? "/theme-reference.png"} alt={item.title} />
        <span className="category-badge">{item.category}</span>
        <strong className="price-badge">¥{item.price.toLocaleString()}</strong>
        <small className="condition-badge">状態 {item.conditionScore}</small>
        {statusLabel && <small className="status-badge">{statusLabel}</small>}
      </Link>
      <div className="item-body">
        <h3>{item.title}</h3>
        <p>{item.context || item.description}</p>
        <div className="compact-meta">
          <small>送料 ¥{item.shippingFee.toLocaleString()}</small>
        </div>
        {action}
      </div>
    </article>
  );
}
