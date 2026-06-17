import { Link } from "react-router-dom";
import type { Item } from "../lib/types";
import { ItemImage } from "./ItemImage";
import { ItemLikeButton } from "./ItemLikeButton";

export function ItemCard({
  item,
  action,
  canLike = false,
  onLike,
}: {
  item: Item;
  action?: React.ReactNode;
  canLike?: boolean;
  onLike?: (item: Item) => void;
}) {
  const statusLabel = item.status === "sold" ? "売却済み" : "";

  return (
    <article className="item-card">
      <Link to={`/items/${item.id}`} className="image-wrap">
        <ItemImage src={item.images[0]} alt={item.title} />
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
          <ItemLikeButton
            liked={item.likedByMe}
            count={item.likeCount}
            disabled={!canLike || !onLike}
            onToggle={() => onLike?.(item)}
          />
        </div>
        {action}
      </div>
    </article>
  );
}
