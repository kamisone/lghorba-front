"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/shop/WishlistContext";
import styles from "@/components/layout/HeaderIconButton.module.css";

interface Props {
  locale: string;
  label: string;
}

export default function WishlistHeaderIcon({ locale, label }: Props) {
  const { wishlist } = useWishlist();
  const count = wishlist.length;

  return (
    <Link href={`/${locale}/shop/wishlist`} className={styles.iconBtn} aria-label={label}>
      <Heart size={19} strokeWidth={2} aria-hidden="true" />
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
