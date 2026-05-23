export interface TranslatableField {
  key: string;
  label: string;
  multiline?: boolean;
  rows?: number;
}

export const ENTITY_TRANSLATION_FIELDS: Record<string, TranslatableField[]> = {
  shop_product: [
    { key: 'title',            label: 'Title' },
    { key: 'shortDescription', label: 'Short description', multiline: true, rows: 2 },
    { key: 'description',      label: 'Description',       multiline: true, rows: 5 },
    { key: 'seoTitle',         label: 'SEO title' },
    { key: 'seoDescription',   label: 'SEO description',   multiline: true, rows: 2 },
    { key: 'featuredImageAlt', label: 'Image alt text' },
  ],
  shop_product_category: [
    { key: 'name',           label: 'Name' },
    { key: 'description',    label: 'Description', multiline: true, rows: 3 },
    { key: 'seoTitle',       label: 'SEO title' },
    { key: 'seoDescription', label: 'SEO description', multiline: true, rows: 2 },
  ],
  shop_collection: [
    { key: 'name',           label: 'Name' },
    { key: 'description',    label: 'Description',    multiline: true, rows: 3 },
    { key: 'heroTitle',      label: 'Hero title' },
    { key: 'heroSubtitle',   label: 'Hero subtitle',  multiline: true, rows: 2 },
    { key: 'seoTitle',       label: 'SEO title' },
    { key: 'seoDescription', label: 'SEO description', multiline: true, rows: 2 },
  ],
  shop_promotion: [
    { key: 'name',           label: 'Name' },
    { key: 'description',    label: 'Description',     multiline: true, rows: 3 },
    { key: 'marketingLabel', label: 'Marketing label' },
    { key: 'bannerText',     label: 'Banner text',     multiline: true, rows: 2 },
  ],
  shop_variant_attribute: [
    { key: 'name', label: 'Attribute name' },
  ],
  shop_variation_option: [
    { key: 'displayValue', label: 'Display value' },
  ],
  shop_shipping_method: [
    { key: 'name',        label: 'Name' },
    { key: 'description', label: 'Description', multiline: true, rows: 2 },
  ],
  blog_post: [
    { key: 'title',          label: 'Title' },
    { key: 'excerpt',        label: 'Excerpt',          multiline: true, rows: 3 },
    { key: 'content',        label: 'Content',          multiline: true, rows: 8 },
    { key: 'seoTitle',       label: 'SEO title' },
    { key: 'seoDescription', label: 'SEO description',  multiline: true, rows: 2 },
  ],
};
