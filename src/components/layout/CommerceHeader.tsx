import Image from "next/image";
import Link from "next/link";
import { Car, Package } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import ScrollAwareHeader from "./ScrollAwareHeader";
import CartHeaderIcon from "./CartHeaderIcon";
import WishlistHeaderIcon from "@/components/shop/WishlistHeaderIcon";
import CommerceCategoryNav from "@/components/shop/CommerceCategoryNav";
import SearchAutocomplete from "@/components/shop/SearchAutocomplete";
import shellStyles from "./ClientHeader.module.css";
import iconStyles from "./HeaderIconButton.module.css";
import styles from "./CommerceHeader.module.css";

interface Props {
  locale: string;
}

export default function CommerceHeader({ locale }: Props) {
  const t = getTranslations(locale);
  const shop = t.shop;

  return (
    <>
      <div className={styles.headerSpacer} aria-hidden="true" />
      <ScrollAwareHeader>
        <div className={styles.inner}>

          {/* ── Top row: logo, search, account/wishlist/cart ── */}
          <div className={styles.topRow}>
            <Link href={`/${locale}/shop`} className={`${shellStyles.logo} ${styles.logoOrder}`} aria-label={t.nav.logoAriaLabel}>
              <Image
                src="/assets/logo_vitecamion_icon.png"
                alt=""
                aria-hidden={true}
                width={34}
                height={34}
                className={shellStyles.logoIcon}
                priority
              />
              <Image
                src="/assets/logo_vitecamion_text.png"
                alt="vitecamion"
                width={120}
                height={20}
                className={shellStyles.logoTextImg}
                priority
              />
            </Link>

            <div className={styles.searchDesktop}>
              <SearchAutocomplete locale={locale} placeholder={shop.searchPlaceholder} variant="header" />
            </div>

            <div className={`${shellStyles.navRight} ${styles.iconsOrder}`}>
              <LangSwitcher locale={locale} ariaLabel={t.nav.selectLanguage} />
              <Link href={`/${locale}`} className={styles.crossLink} title={t.nav.backToRentals}>
                <Car size={16} strokeWidth={2} aria-hidden="true" />
                <span className={styles.crossLinkLabel}>{t.nav.backToRentals}</span>
              </Link>
              <span className={shellStyles.navDivider} aria-hidden="true" />
              <Link href={`/${locale}/shop/orders/track`} className={iconStyles.iconBtn} aria-label={shop.trackMyOrder} title={shop.trackMyOrder}>
                <Package size={18} strokeWidth={1.75} />
              </Link>
              <WishlistHeaderIcon locale={locale} label={shop.wishlistNavLabel} />
              <CartHeaderIcon label={shop.cartNavLabel} />
            </div>

            <div className={styles.searchMobile}>
              <SearchAutocomplete locale={locale} placeholder={shop.searchPlaceholder} variant="header" />
            </div>
          </div>

          {/* ── Second row: category/discovery navigation ── */}
          <nav className={styles.menuRow} aria-label={t.nav.navAriaLabel}>
            <CommerceCategoryNav locale={locale} className={styles.menuItem} />
          </nav>

        </div>
      </ScrollAwareHeader>
    </>
  );
}
