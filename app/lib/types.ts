// ═══════════════════════════════════════════════
// STELLARPOD — Shared TypeScript types
// Matching API response shapes from stellarpod-api
// ═══════════════════════════════════════════════

// ─── STORE ────────────────────────────────────

export interface Store {
  id: string;
  shopifyDomain: string;
  name: string;
  email: string;
  plan: string;
  stellarAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── PROVIDER ─────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
  stellarAddress: string;
  verified: boolean;
  rating: number;
  totalOrders: number;
  completionRate: number;
  specialties: string[];
  minOrderQty: number;
  avgLeadDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProvider {
  id: string;
  storeId: string;
  providerId: string;
  status: string;
  agreedRate: number | null;
  provider?: Provider;
}

// ─── DESIGN ───────────────────────────────────

export interface Design {
  id: string;
  storeId: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSha256: string;
  fileSizeBytes: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
  mockups?: Mockup[];
  provenance?: {
    status: 'MINTING' | 'MINTED' | 'MINT_FAILED' | 'BURNED';
    assetCode: string | null;
    mintTxHash: string | null;
    mintLedger: number | null;
    createdAt: string;
  } | null;
}

export interface Mockup {
  id: string;
  designId: string;
  productType: string;
  variant: string;
  imageUrl: string;
  createdAt: string;
}

// ─── ORDER ────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'ESCROW_LOCKED'
  | 'SENT_TO_PROVIDER'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'ESCROW_RELEASED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  designId: string | null;
  productType: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  storeId: string;
  providerId: string | null;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  status: OrderStatus;
  customerName: string;
  shippingAddress: Record<string, unknown>;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  subtotalUsdc: number;
  platformFeeUsdc: number;
  providerPayUsdc: number;
  totalUsdc: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  escrows?: Escrow[];
  store?: Store;
}

// ─── ESCROW ───────────────────────────────────

export type EscrowStatus =
  | 'LOCKING'
  | 'LOCK_FAILED'
  | 'LOCKED'
  | 'RELEASING'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'EXPIRED';

export interface Escrow {
  id: string;
  orderId: string;
  providerOrderId: string | null;
  storeId: string;
  providerId: string | null;
  status: EscrowStatus;
  contractId: string | null;
  lockTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
  amountUsdc: number;
  platformFee: number;
  providerAmount: number;
  lockedAt: string | null;
  releasedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  disputes?: Dispute[];
}

export interface Dispute {
  id: string;
  escrowId: string;
  raisedBy: 'merchant' | 'provider';
  reason: string;
  evidence: Record<string, unknown> | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ─── PROVIDER PRODUCT (Catalog) ───────────────

export interface PrintArea {
  name: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

export interface ProviderProduct {
  id: string;
  providerId: string;
  productType: string;
  name: string;
  brand: string | null;
  description: string | null;
  baseCost: number;
  printAreas: PrintArea[];
  blankImages: Record<string, string>;
  sizeChart: Record<string, Record<string, number>> | null;
  weightGrams: number | null;
  productionDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProviderProductVariant[];
  provider?: Provider;
}

export interface ProviderProductVariant {
  id: string;
  providerProductId: string;
  size: string;
  color: string;
  colorHex: string | null;
  sku: string;
  additionalCost: number;
  inStock: boolean;
}

// ─── MERCHANT PRODUCT (Store ↔ Shopify) ───────

export interface PrintConfig {
  printArea: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export type MerchantProductStatus = 'draft' | 'publishing' | 'published' | 'error';

export interface MerchantProduct {
  id: string;
  storeId: string;
  designId: string;
  providerProductId: string;
  shopifyProductId: string | null;
  shopifyProductGid: string | null;
  title: string;
  description: string | null;
  retailPrice: number;
  baseCost: number;
  profitMargin: number;
  printConfig: PrintConfig;
  status: MerchantProductStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  design?: Design;
  providerProduct?: ProviderProduct;
  store?: { shopifyDomain: string; name: string };
  salesPerformance?: {
    dailyBuckets: number[];
    totalUnits: number;
    totalRevenue: number;
    changePercent: number;
  };
  technicalSpecs?: Array<{ label: string; value: string }>;
  smartContractRules?: Array<{ icon: string; title: string; description: string }>;
  isBurnToClaim?: boolean;
  maxSupply?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoTags?: string[];
  seoHandle?: string | null;
}

export interface PricingBreakdown {
  baseCost: number;
  retailPrice: number;
  platformFee: number;
  platformFeeRate: number;
  profitMargin: number;
  profitPercent: number;
}

// ─── PROVIDER ORDER ───────────────────────────

export type ProviderOrderStatus =
  | 'pending' | 'accepted' | 'printing'
  | 'quality_check' | 'packing' | 'shipped' | 'delivered';

export interface ProviderOrder {
  id: string;
  orderId: string;
  providerId: string;
  status: ProviderOrderStatus;
  totalBaseCost: number;
  platformFee: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingCompany: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  provider?: Provider;
}

// ─── PAGINATED RESPONSE ───────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── STATUS HELPERS ───────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ESCROW_LOCKED: 'Escrow Locked',
  SENT_TO_PROVIDER: 'Sent to Provider',
  IN_PRODUCTION: 'In Production',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  ESCROW_RELEASED: 'Released',
  DISPUTED: 'Disputed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  LOCKING: 'Locking',
  LOCK_FAILED: 'Lock Failed',
  LOCKED: 'Locked',
  RELEASING: 'Releasing',
  RELEASED: 'Released',
  DISPUTED: 'Disputed',
  REFUNDING: 'Refunding',
  REFUNDED: 'Refunded',
  EXPIRED: 'Expired',
};

// ─── TREND INSIGHTS ───────────────────────────

/**
 * One ranked trend insight cell — (niche × styleTag × priceBand) for the
 * current 7-day window. Returned by `GET /trends/insights`. Score is 0-100,
 * decayed by age. `topEvidenceKeyword` is the human-readable label from the
 * highest-engagement underlying trend item (e.g. "Minimalist Mama Tee").
 */
export interface TrendInsight {
  id: string;
  niche: string;
  styleTag: string;
  priceBandLow: number;
  priceBandHigh: number;
  score: number;
  sources: Record<string, unknown>;
  topEvidenceKeyword: string | null;
  evidenceItemIds: string[];
  windowStart: string;
}

// ─── ROYALTY SPLITS ───────────────────────────

export interface RoyaltySplit {
  id: string;
  scopeType: 'DESIGN' | 'MERCHANT_PRODUCT';
  scopeId: string;
  walletAddress: string;
  percentBps: number;
  role: string;
  label: string | null;
  verified: boolean;
}
