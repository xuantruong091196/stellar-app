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
  copyrightTxHash: string | null;
  copyrightLedger: number | null;
  copyrightAt: string | null;
  createdAt: string;
  updatedAt: string;
  mockups?: Mockup[];
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
  escrow?: Escrow | null;
  store?: Store;
}

// ─── ESCROW ───────────────────────────────────

export type EscrowStatus =
  | 'LOCKING'
  | 'LOCKED'
  | 'RELEASING'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface Escrow {
  id: string;
  orderId: string;
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
  LOCKED: 'Locked',
  RELEASING: 'Releasing',
  RELEASED: 'Released',
  DISPUTED: 'Disputed',
  REFUNDED: 'Refunded',
  EXPIRED: 'Expired',
};
