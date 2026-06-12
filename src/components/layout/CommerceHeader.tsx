import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import ScrollAwareHeader from "./ScrollAwareHeader";
import CartHeaderIcon from "./CartHeaderIcon";
import WishlistHeaderIcon from "@/components/shop/WishlistHeaderIcon";
import CommerceCategoriesMenu from "@/components/shop/CommerceCategoriesMenu";
import SearchAutocomplete from "@/components/shop/SearchAutocomplete";
import shellStyles from "./ClientHeader.module.css";
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
              <WishlistHeaderIcon locale={locale} label={shop.wishlistNavLabel} />
              <CartHeaderIcon />
              <span className={shellStyles.navDivider} aria-hidden="true" />
              <LangSwitcher locale={locale} ariaLabel={t.nav.selectLanguage} />
            </div>

            <div className={styles.searchMobile}>
              <SearchAutocomplete locale={locale} placeholder={shop.searchPlaceholder} variant="header" />
            </div>
          </div>

          {/* ── Second row: category/discovery navigation ── */}
          <nav className={styles.menuRow} aria-label={t.nav.navAriaLabel}>
            <CommerceCategoriesMenu locale={locale} className={styles.menuItem} />
            <Link href={`/${locale}/shop#collections`} className={`${styles.menuLink} ${styles.menuItem}`}>
              {shop.collectionsLabel}
            </Link>
            <Link href={`/${locale}/shop`} className={`${styles.menuLink} ${styles.promoLink} ${styles.menuItem}`}>
              {shop.promotionsLabel}
            </Link>
            <Link href={`/${locale}`} className={`${styles.rentalsLink} ${styles.menuItem}`}>
              {t.nav.backToRentals}
            </Link>
          </nav>

        </div>
      </ScrollAwareHeader>
    </>
  );
}
