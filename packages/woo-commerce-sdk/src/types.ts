export interface ProductData {
  id: string;
  name: string;
  url: string;
  slug?: string;
  product_id?: number;
  price?: string;
  regular_price?: string;
  type?: string;
  status?: string;
  attributes?: WooProductAttribute[];
  description?: string;
  short_description?: string;
  categories?: WooProductCategory[];
  images?: WooProductImage[];
  configurationId?: string;
  sku: string;
}

export interface WooProductDownload {
  id: string;
  name: string;
  file: string;
}

export interface WooProductDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooProductCategory {
  id: number;
  name: string; // read-only
  slug: string; // read-only
}

export interface WooProductTag {
  id: number;
  name: string; // read-only
  slug: string; // read-only
}

export interface WooProductImage {
  id: number;
  date_created: string; // read-only
  date_created_gmt: string; // read-only
  date_modified: string; // read-only
  date_modified_gmt: string; // read-only
  src: string;
  name: string;
  alt: string;
}

export interface WooProductAttribute {
  id: number | string;
  name: string;
  slug?: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooProductDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooProductMetaData {
  id: number; // read-only
  key: string;
  value: string;
}

export type WooProductType = 'simple' | 'grouped' | 'external' | 'variable';
export type WooProductStatus = 'draft' | 'pending' | 'private' | 'publish';
export type WooProductCatalogVisibility = 'visible' | 'catalog' | 'search' | 'hidden';
export type WooProductTaxStatus = 'taxable' | 'shipping' | 'none';
export type WooProductStockStatus = 'instock' | 'outofstock' | 'onbackorder';
export type WooProductBackorderStatus = 'no' | 'notify' | 'yes';

export interface WooProduct {
  id: number; // read-only
  name: string;
  slug: string;
  permalink: string; // read-only
  date_created: string; // read-only
  date_created_gmt: string; // read-only
  date_modified: string; // read-only
  date_modified_gmt: string; // read-only
  type: WooProductType;
  status: WooProductStatus;
  featured: boolean;
  catalog_visibility: WooProductCatalogVisibility;
  description: string;
  short_description: string;
  sku: string;
  price: string; // read-only
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  price_html: string; // read-only
  on_sale: boolean; // read-only
  purchasable: boolean; // read-only
  total_sales: number; // read-only
  virtual: boolean;
  downloadable: boolean;
  downloads: WooProductDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: WooProductTaxStatus;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: WooProductStockStatus;
  backorders: WooProductBackorderStatus;
  backorders_allowed: boolean; // read-only
  backordered: boolean; // read-only
  sold_individually: boolean;
  weight: string;
  dimensions: WooProductDimensions;
  shipping_required: boolean; // read-only
  shipping_taxable: boolean; // read-only
  shipping_class: string;
  shipping_class_id: number; // read-only
  reviews_allowed: boolean;
  average_rating: string; // read-only
  rating_count: number; // read-only
  related_ids: number[]; // read-only
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooProductCategory[];
  tags: WooProductTag[];
  images: WooProductImage[];
  attributes: WooProductAttribute[];
  default_attributes: WooProductDefaultAttribute[];
  variations: number[]; // read-only
  grouped_products: number[];
  menu_order: number;
  meta_data: WooProductMetaData[];
}

// Type for creating/updating a product
export type WooProductCreate = Omit<
  WooProduct,
  | 'id'
  | 'permalink'
  | 'date_created'
  | 'date_created_gmt'
  | 'date_modified'
  | 'date_modified_gmt'
  | 'price'
  | 'price_html'
  | 'on_sale'
  | 'purchasable'
  | 'total_sales'
  | 'backorders_allowed'
  | 'backordered'
  | 'shipping_required'
  | 'shipping_taxable'
  | 'shipping_class_id'
  | 'average_rating'
  | 'rating_count'
  | 'related_ids'
  | 'variations'
>;

// Type for updating a product
export type WooProductUpdate = Partial<WooProductCreate>;
