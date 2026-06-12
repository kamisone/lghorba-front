"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/shop/WishlistContext";
import styles from "@/components/layout/HeaderIconButton.module.css";

interface Props {
  label: string;
  comingSoon: string;
}

export default function WishlistHeaderIcon({ label, comingSoon }: Props) {
  const { wishlist } = useWishlist();
  const count = wishlist.length;

  return (
    <button
      type="button"
      className={styles.iconBtn}
      aria-label={label}
      title={comingSoon}
      disabled
    >
      <Heart size={19} strokeWidth={2} aria-hidden="true" />
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
