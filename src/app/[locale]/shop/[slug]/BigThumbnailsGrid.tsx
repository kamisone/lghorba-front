"use client";

import { MediaThumb, type GalleryMediaItem } from "./ProductGallery";
import styles from "./ProductGallery.module.css";

/**
 * Desktop-only 2-column grid of large product-image thumbnails, rendered
 * directly below the main gallery image + thumbnail strip inside the sticky
 * `.galleryCol` — so it sits right at the bottom of the gallery, not further
 * down the page. Clicking a thumbnail opens the same lightbox via the
 * ProductGallery ref (see ProductGalleryHandle.openAt).
 *
 * Trade-off: because this adds real height to `.galleryCol`, the CSS-grid
 * sticky-sidebar trick — which needs the sticky column to stay shorter than
 * its sibling (.details) to have "room" to stick — releases sooner on
 * products with a short buy box/description. This is the same behavior any
 * sticky sidebar has once its own content grows past its sibling's height;
 * it isn't a bug, just a smaller stick window than before this grid existed.
 */
export default function BigThumbnailsGrid({ media, onOpen }: {
  media: GalleryMediaItem[];
  onOpen: (index: number) => void;
}) {
  if (media.length < 2) return null;

  return (
    <div className={styles.bigThumbGrid}>
      {media.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i)}
          className={styles.bigThumb}
          aria-label={`Open ${item.type === "video" ? "video" : "image"} ${i + 1} of ${media.length}`}
        >
          <MediaThumb item={item} sizes="(max-width: 900px) 0px, 240px" />
        </button>
      ))}
    </div>
  );
}
