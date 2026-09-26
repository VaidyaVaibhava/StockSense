export type UserRole = 'inventory_manager' | 'warehouse_staff' | 'procurement_admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  warehouse_scope: string; // e.g. "Main Warehouse - Dallas", "All Facilities"
  failed_attempts: number;
  locked_until?: string | null;
  cooldown_tier: number; // 0: none, 1: 5 min, 2: 30 min, 3: requires OTP
  last_passwords?: string[]; // stored hashes of last 3 passwords (FR-02 Step 3)
  created_at: string;
}

export interface UserInvite {
  id: string;
  email: string;
  role: UserRole;
  warehouse_scope: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_by: string;
  created_at: string;
}

export interface OTPRecord {
  email: string;
  code: string;
  expires_at: string;
  attempts: number;
  verified: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string; // e.g., 'pcs', 'box', 'kg', 'pallet'
  initial_stock: number;
  current_stock: number;
  reorder_threshold: number;
  supplier_id: string;
  unit_cost: number;
  unit_price: number;
  location: string; // default bin/rack, e.g. "Rack-A3"
  is_archived: boolean;
  batch_tracking_enabled: boolean;
  expiry_tracking_enabled: boolean;
  batches?: BatchLot[];
  burn_rate_daily: number; // average consumption/day
  created_at: string;
  updated_at: string;
}

export interface BatchLot {
  batch_number: string;
  quantity: number;
  expiry_date: string; // ISO date string
  received_date: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  avg_lead_time_days: number;
  on_time_rate: number; // percentage, e.g. 96.5
  short_ship_rate: number; // percentage, e.g. 2.1
  lead_time_variance_days: number; // variance in days
  status: 'active' | 'under_review' | 'preferred';
}

export interface ReceiptLineItem {
  sku: string;
  product_name: string;
  ordered_qty?: number;
  received_qty: number;
  unit_cost: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  supplier_id: string;
  supplier_name: string;
  status: 'draft' | 'pending_validation' | 'validated' | 'cancelled';
  source: 'manual' | 'MA-01';
  po_reference?: string;
  line_items: ReceiptLineItem[];
  created_at: string;
  validated_at?: string;
  validated_by?: string;
  notes?: string;
  raw_document_name?: string;
}

export interface DeliveryLineItem {
  sku: string;
  product_name: string;
  ordered_qty: number;
  picked_qty: number;
  unit_price: number;
  allocated_batches?: { batch_number: string; qty: number; expiry_date: string }[];
}

export interface DeliveryOrder {
  id: string;
  order_number: string;
  customer_ref: string;
  destination: string;
  status: 'pending' | 'picking' | 'packed' | 'shipped' | 'cancelled';
  backorder_flag: boolean;
  backorder_shortfall?: number;
  line_items: DeliveryLineItem[];
  created_at: string;
  shipped_at?: string;
  shipped_by?: string;
  notes?: string;
}

export interface InternalTransfer {
  id: string;
  transfer_number: string;
  from_location: string;
  to_location: string;
  sku: string;
  product_name: string;
  quantity: number;
  initiated_via: 'ui' | 'voice';
  status: 'completed' | 'pending_confirmation';
  voice_transcript?: string;
  high_value_flag?: boolean;
  initiated_by: string;
  timestamp: string;
}

export interface StockAdjustment {
  id: string;
  sku: string;
  product_name: string;
  delta: number; // positive or negative
  resulting_stock: number;
  reason_code: 'damage' | 'theft' | 'miscount' | 'expiry' | 'other';
  location: string;
  notes?: string;
  user_id: string;
  user_name: string;
  flagged_by_MA04: boolean;
  timestamp: string;
}

export interface PurchaseOrderDraft {
  id: string;
  po_number: string;
  sku: string;
  product_name: string;
  supplier_id: string;
  supplier_name: string;
  current_stock: number;
  reorder_threshold: number;
  recommended_qty: number;
  unit_cost: number;
  estimated_total: number;
  status: 'pending' | 'approved' | 'rejected';
  source_agent: 'MA-02';
  confidence_score: number;
  reasoning: string;
  burn_rate_input: number;
  lead_time_input: number;
  backorder_qty: number;
  manager_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface StockLedger {
  id: string;
  sku: string;
  product_name: string;
  event_type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'INITIAL';
  quantity_delta: number;
  resulting_balance: number;
  reference_id: string;
  reference_type: 'receipt' | 'delivery' | 'transfer' | 'adjustment' | 'system';
  actor_id: string;
  actor_name: string;
  location?: string;
  timestamp: string;
  notes?: string;
}

export interface AuthAuditLog {
  id: string;
  user_id?: string;
  user_email: string;
  event_type: 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILURE' 
    | 'LOGOUT' 
    | 'PASSWORD_RESET_REQUEST' 
    | 'PASSWORD_RESET_VERIFY' 
    | 'PASSWORD_RESET_COMPLETE' 
    | 'ACCOUNT_LOCKED' 
    | 'ACCOUNT_UNLOCKED' 
    | 'INVITE_SENT' 
    | 'INVITE_ACCEPTED' 
    | 'INVITE_REVOKED' 
    | 'ROLE_CHANGE'
    | 'PORTAL_MISMATCH';
  ip_device_fingerprint: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  details?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  target_role?: UserRole | 'all';
  user_id?: string;
  title: string;
  message: string;
  type: 'low_stock' | 'po_approval' | 'anomaly_flag' | 'security_alert' | 'system';
  read: boolean;
  link?: string;
  created_at: string;
}

export interface AnomalyReport {
  id: string;
  detected_at: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  zone: string;
  sku: string;
  pattern_type: 'recurring_theft' | 'frequent_miscount' | 'damage_cluster' | 'off_shift_adjustments';
  description: string;
  recommendation: string;
  affected_adjustments: string[];
  status: 'active' | 'investigated' | 'resolved';
}

export interface DemandForecast {
  sku: string;
  product_name: string;
  category: string;
  historical_burn_rate: number;
  seasonal_multiplier: number;
  forecast_30d: number;
  forecast_60d: number;
  forecast_90d: number;
  mape: number; // Mean Absolute Percentage Error (PRD target: <= 15% for A-class SKUs)
  confidence_level: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
  last_updated: string;
}

export interface QueuedTransaction {
  id: string;
  idempotency_key: string;
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  payload: any;
  created_at: string;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}
