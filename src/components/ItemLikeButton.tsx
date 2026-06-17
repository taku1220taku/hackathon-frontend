import { Heart } from "lucide-react";

export function ItemLikeButton({
  liked,
  count,
  disabled,
  onToggle,
}: {
  liked: boolean;
  count: number;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={liked ? "like-button liked" : "like-button"}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
    >
      <Heart size={16} fill={liked ? "currentColor" : "none"} />
      <span>{count}</span>
    </button>
  );
}
