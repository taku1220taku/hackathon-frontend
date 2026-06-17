import { useState } from "react";

const fallbackImage = "/theme-reference.png";

export function ItemImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = failed || !src ? fallbackImage : src;

  return (
    <img
      className={className}
      src={imageSrc}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
