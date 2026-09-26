import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Product,
  Supplier,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  PurchaseOrderDraft,
  StockLedger,
  AuthAuditLog,
  Notification,
  AnomalyReport,
  DemandForecast,
  UserInvite,
  OTPRecord,
  QueuedTransaction
} from '@/types';

export interface DatabaseSchema {
  users: User[];
  invites: UserInvite[];
  otps: OTPRecord[];
  products: Product[];
  suppliers: Supplier[];
  receipts: Receipt[];
  deliveries: DeliveryOrder[];
  transfers: InternalTransfer[];
  adjustments: StockAdjustment[];
  po_drafts: PurchaseOrderDraft[];
  ledger: StockLedger[];
  auth_audit_logs: AuthAuditLog[];
  notifications: Notification[];
  anomalies: AnomalyReport[];
  forecasts: DemandForecast[];
  queued_transactions: QueuedTransaction[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'stocksense_db.json');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return;
  fs.mkdirSync(dirname, { recursive: true });
}

function getInitialSeed(): DatabaseSchema {
  const now = new Date().toISOString();
  const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

  // Salt & hash passwords
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@12345678', salt);
  const managerHash = bcrypt.hashSync('Manager@12345678', salt);
  const warehouseHash = bcrypt.hashSync('Warehouse@12345678', salt);

  const users: User[] = [
    {
      id: 'usr_admin_01',
      email: 'admin@stocksense.io',
      password_hash: adminHash,
      name: 'Priya Sharma',
      role: 'procurement_admin',
      warehouse_scope: 'All India Facilities',
      failed_attempts: 0,
      cooldown_tier: 0,
      created_at: pastDate(90),
    },
    {
      id: 'usr_mgr_01',
      email: 'manager@stocksense.io',
      password_hash: managerHash,
      name: 'Rajesh Kumar',
      role: 'inventory_manager',
      warehouse_scope: 'Mumbai Distribution Hub',
      failed_attempts: 0,
      cooldown_tier: 0,
      created_at: pastDate(90),
    },
    {
      id: 'usr_wh_01',
      email: 'warehouse@stocksense.io',
      password_hash: warehouseHash,
      name: 'Vikram Singh',
      role: 'warehouse_staff',
      warehouse_scope: 'Mumbai Hub - Floor A',
      failed_attempts: 0,
      cooldown_tier: 0,
      created_at: pastDate(60),
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup_01',
      name: 'Tata Precision Hydraulics',
      contact_email: 'orders@tatahydraulics.in',
      contact_phone: '+91 22 4567 8901',
      avg_lead_time_days: 7,
      on_time_rate: 96.8,
      short_ship_rate: 1.4,
      lead_time_variance_days: 0.8,
      status: 'preferred',
    },
    {
      id: 'sup_02',
      name: 'Bharat Electronics Ltd (BEL)',
      contact_email: 'supply@bel-india.in',
      contact_phone: '+91 80 2503 4142',
      avg_lead_time_days: 14,
      on_time_rate: 98.2,
      short_ship_rate: 0.8,
      lead_time_variance_days: 1.2,
      status: 'preferred',
    },
    {
      id: 'sup_03',
      name: 'Godrej Industrial Fasteners',
      contact_email: 'sales@godrejfasteners.in',
      contact_phone: '+91 22 6872 9910',
      avg_lead_time_days: 4,
      on_time_rate: 88.5,
      short_ship_rate: 4.8,
      lead_time_variance_days: 2.5,
      status: 'under_review',
    },
    {
      id: 'sup_04',
      name: 'Wipro Microelectronics',
      contact_email: 'fulfillment@wiproelectronics.in',
      contact_phone: '+91 80 2901 4432',
      avg_lead_time_days: 10,
      on_time_rate: 92.4,
      short_ship_rate: 2.1,
      lead_time_variance_days: 1.5,
      status: 'active',
    },
  ];

  const products: Product[] = [
    {
      id: 'prod_01',
      sku: 'SKU-HYD-101',
      name: 'High-Pressure Hydraulic Seal 45mm',
      category: 'Hydraulics',
      uom: 'pcs',
      initial_stock: 450,
      current_stock: 75, // Below reorder threshold (80)
      reorder_threshold: 80,
      supplier_id: 'sup_01',
      unit_cost: 1200.00,
      unit_price: 2350.00,
      location: 'Rack-A1-Bin3',
      is_archived: false,
      batch_tracking_enabled: true,
      expiry_tracking_enabled: true,
      burn_rate_daily: 4.2,
      batches: [
        { batch_number: 'LOT-2026-H1', quantity: 75, expiry_date: '2027-03-15', received_date: pastDate(40) }
      ],
      created_at: pastDate(90),
      updated_at: pastDate(2),
    },
    {
      id: 'prod_02',
      sku: 'SKU-SRV-204',
      name: 'Ultra-Torque Brushless Servo Motor 750W',
      category: 'Robotics',
      uom: 'pcs',
      initial_stock: 60,
      current_stock: 12, // Critical low stock (threshold 15)
      reorder_threshold: 15,
      supplier_id: 'sup_02',
      unit_cost: 15400.00,
      unit_price: 28500.00,
      location: 'Rack-B2-Bin1',
      is_archived: false,
      batch_tracking_enabled: true,
      expiry_tracking_enabled: false,
      burn_rate_daily: 1.1,
      batches: [
        { batch_number: 'SRV-BATCH-99', quantity: 12, expiry_date: '2030-01-01', received_date: pastDate(25) }
      ],
      created_at: pastDate(90),
      updated_at: pastDate(1),
    },
    {
      id: 'prod_03',
      sku: 'SKU-FST-305',
      name: 'M8 Grade 10.9 Flanged Hex Bolts (Box 500)',
      category: 'Fasteners',
      uom: 'box',
      initial_stock: 120,
      current_stock: 48,
      reorder_threshold: 30,
      supplier_id: 'sup_03',
      unit_cost: 2650.00,
      unit_price: 4850.00,
      location: 'Rack-C4-Bulk',
      is_archived: false,
      batch_tracking_enabled: false,
      expiry_tracking_enabled: false,
      burn_rate_daily: 2.5,
      created_at: pastDate(90),
      updated_at: pastDate(4),
    },
    {
      id: 'prod_04',
      sku: 'SKU-MCU-410',
      name: 'Industrial Cortex-M7 Controller Board',
      category: 'Electronics',
      uom: 'pcs',
      initial_stock: 200,
      current_stock: 35, // Low stock (threshold 40)
      reorder_threshold: 40,
      supplier_id: 'sup_04',
      unit_cost: 3990.00,
      unit_price: 7900.00,
      location: 'Rack-A2-Bin4',
      is_archived: false,
      batch_tracking_enabled: true,
      expiry_tracking_enabled: false,
      burn_rate_daily: 3.2,
      batches: [
        { batch_number: 'MCU-X7-440', quantity: 35, expiry_date: '2029-12-31', received_date: pastDate(30) }
      ],
      created_at: pastDate(90),
      updated_at: pastDate(3),
    },
    {
      id: 'prod_05',
      sku: 'SKU-THM-502',
      name: 'Silicone Thermal Interface Pad 100x100mm',
      category: 'Thermal',
      uom: 'pack',
      initial_stock: 300,
      current_stock: 180,
      reorder_threshold: 50,
      supplier_id: 'sup_04',
      unit_cost: 680.00,
      unit_price: 1375.00,
      location: 'Rack-B1-Bin2',
      is_archived: false,
      batch_tracking_enabled: true,
      expiry_tracking_enabled: true,
      burn_rate_daily: 4.0,
      batches: [
        { batch_number: 'THM-L2', quantity: 180, expiry_date: '2027-08-20', received_date: pastDate(15) }
      ],
      created_at: pastDate(90),
      updated_at: pastDate(5),
    },
    {
      id: 'prod_06',
      sku: 'SKU-VAL-601',
      name: 'Proportional Pneumatic Control Valve 24V',
      category: 'Pneumatics',
      uom: 'pcs',
      initial_stock: 80,
      current_stock: 22,
      reorder_threshold: 20,
      supplier_id: 'sup_01',
      unit_cost: 5990.00,
      unit_price: 11250.00,
      location: 'Rack-A3-Bin1',
      is_archived: false,
      batch_tracking_enabled: false,
      expiry_tracking_enabled: false,
      burn_rate_daily: 1.4,
      created_at: pastDate(90),
      updated_at: pastDate(6),
    }
  ];

  const ledger: StockLedger[] = [
    {
      id: 'ledg_init_01',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      event_type: 'INITIAL',
      quantity_delta: 450,
      resulting_balance: 450,
      reference_id: 'SYSTEM_INIT',
      reference_type: 'system',
      actor_id: 'usr_admin_01',
      actor_name: 'Priya Sharma',
      location: 'Rack-A1-Bin3',
      timestamp: pastDate(90),
      notes: 'Initial stock register migration',
    },
    {
      id: 'ledg_init_02',
      sku: 'SKU-SRV-204',
      product_name: 'Ultra-Torque Brushless Servo Motor 750W',
      event_type: 'INITIAL',
      quantity_delta: 60,
      resulting_balance: 60,
      reference_id: 'SYSTEM_INIT',
      reference_type: 'system',
      actor_id: 'usr_admin_01',
      actor_name: 'Priya Sharma',
      location: 'Rack-B2-Bin1',
      timestamp: pastDate(90),
      notes: 'Initial stock register migration',
    },
    {
      id: 'ledg_rec_01',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      event_type: 'RECEIPT',
      quantity_delta: 50,
      resulting_balance: 100,
      reference_id: 'REC-2026-001',
      reference_type: 'receipt',
      actor_id: 'usr_wh_01',
      actor_name: 'Vikram Singh',
      location: 'Rack-A1-Bin3',
      timestamp: pastDate(12),
      notes: 'Validated PO-8902 shipment',
    },
    {
      id: 'ledg_deliv_01',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      event_type: 'DELIVERY',
      quantity_delta: -25,
      resulting_balance: 75,
      reference_id: 'DO-2026-104',
      reference_type: 'delivery',
      actor_id: 'usr_wh_01',
      actor_name: 'Vikram Singh',
      location: 'Rack-A1-Bin3',
      timestamp: pastDate(2),
      notes: 'Shipped to Tata Motors Pune Assembly',
    },
  ];

  const receipts: Receipt[] = [
    {
      id: 'rec_01',
      receipt_number: 'REC-2026-001',
      supplier_id: 'sup_01',
      supplier_name: 'Tata Precision Hydraulics',
      status: 'validated',
      source: 'manual',
      po_reference: 'PO-8902',
      line_items: [
        {
          sku: 'SKU-HYD-101',
          product_name: 'High-Pressure Hydraulic Seal 45mm',
          ordered_qty: 50,
          received_qty: 50,
          unit_cost: 1200.00,
          batch_number: 'LOT-2026-H1',
          expiry_date: '2027-03-15',
        }
      ],
      created_at: pastDate(13),
      validated_at: pastDate(12),
      validated_by: 'Vikram Singh',
      notes: 'Dock 4 inspected and cleared at Mumbai Hub',
    },
    {
      id: 'rec_02',
      receipt_number: 'REC-2026-002',
      supplier_id: 'sup_02',
      supplier_name: 'Bharat Electronics Ltd (BEL)',
      status: 'pending_validation',
      source: 'MA-01',
      po_reference: 'PO-9104',
      raw_document_name: 'BEL_Delivery_Slip_INV4409.pdf',
      line_items: [
        {
          sku: 'SKU-SRV-204',
          product_name: 'Ultra-Torque Brushless Servo Motor 750W',
          ordered_qty: 25,
          received_qty: 25,
          unit_cost: 15400.00,
          batch_number: 'SRV-BATCH-102',
          expiry_date: '2030-01-01',
        }
      ],
      created_at: pastDate(1),
      notes: 'AI Extracted via Smart Ingestion Workflow (MA-01). Awaiting warehouse staff verification.',
    }
  ];

  const deliveries: DeliveryOrder[] = [
    {
      id: 'do_01',
      order_number: 'DO-2026-104',
      customer_ref: 'Tata Motors Pune Assembly (PO #TML-77)',
      destination: 'Pune Facility Bay 3',
      status: 'shipped',
      backorder_flag: false,
      line_items: [
        {
          sku: 'SKU-HYD-101',
          product_name: 'High-Pressure Hydraulic Seal 45mm',
          ordered_qty: 25,
          picked_qty: 25,
          unit_price: 2350.00,
          allocated_batches: [{ batch_number: 'LOT-2026-H1', qty: 25, expiry_date: '2027-03-15' }]
        }
      ],
      created_at: pastDate(3),
      shipped_at: pastDate(2),
      shipped_by: 'Vikram Singh',
    },
    {
      id: 'do_02',
      order_number: 'DO-2026-108',
      customer_ref: 'Mahindra & Mahindra Nashik (PO #M&M-802)',
      destination: 'Nashik Production Plant',
      status: 'pending',
      backorder_flag: true,
      backorder_shortfall: 8,
      line_items: [
        {
          sku: 'SKU-SRV-204',
          product_name: 'Ultra-Torque Brushless Servo Motor 750W',
          ordered_qty: 20, // Only 12 in stock! 8 shortfall
          picked_qty: 12,
          unit_price: 28500.00,
        }
      ],
      created_at: pastDate(1),
      notes: 'Shortfall flagged (FR-12). Linked to MA-02 Predictive Reordering Queue.',
    }
  ];

  const transfers: InternalTransfer[] = [
    {
      id: 'trf_01',
      transfer_number: 'TRF-2026-081',
      from_location: 'Rack-A1-Bin3',
      to_location: 'Rack-A4-AssemblyStage',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      quantity: 10,
      initiated_via: 'voice',
      status: 'completed',
      voice_transcript: 'Move 10 units of hydraulic seals to Assembly Stage',
      high_value_flag: false,
      initiated_by: 'Vikram Singh',
      timestamp: pastDate(4),
    }
  ];

  const adjustments: StockAdjustment[] = [
    {
      id: 'adj_01',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      delta: -5,
      resulting_stock: 75,
      reason_code: 'damage',
      location: 'Rack-A1-Bin3',
      notes: 'Crushed packaging detected during morning cycle count',
      user_id: 'usr_wh_01',
      user_name: 'Vikram Singh',
      flagged_by_MA04: false,
      timestamp: pastDate(5),
    },
    {
      id: 'adj_02',
      sku: 'SKU-SRV-204',
      product_name: 'Ultra-Torque Brushless Servo Motor 750W',
      delta: -2,
      resulting_stock: 12,
      reason_code: 'theft',
      location: 'Rack-B2-Bin1',
      notes: 'Unaccounted discrepancy during spot audit',
      user_id: 'usr_wh_01',
      user_name: 'Vikram Singh',
      flagged_by_MA04: true,
      timestamp: pastDate(2),
    },
    {
      id: 'adj_03',
      sku: 'SKU-SRV-204',
      product_name: 'Ultra-Torque Brushless Servo Motor 750W',
      delta: -1,
      resulting_stock: 14,
      reason_code: 'theft',
      location: 'Rack-B2-Bin1',
      notes: 'Unaccounted discrepancy during night shift',
      user_id: 'usr_wh_01',
      user_name: 'Vikram Singh',
      flagged_by_MA04: true,
      timestamp: pastDate(9),
    }
  ];

  const po_drafts: PurchaseOrderDraft[] = [
    {
      id: 'pod_01',
      po_number: 'DRAFT-PO-2026-091',
      sku: 'SKU-SRV-204',
      product_name: 'Ultra-Torque Brushless Servo Motor 750W',
      supplier_id: 'sup_02',
      supplier_name: 'Bharat Electronics Ltd (BEL)',
      current_stock: 12,
      reorder_threshold: 15,
      recommended_qty: 35,
      unit_cost: 15400.00,
      estimated_total: 539000.00,
      status: 'pending',
      source_agent: 'MA-02',
      confidence_score: 94.8,
      reasoning: 'Stock level (12 units) has fallen below reorder threshold (15 units). Active backorder DO-2026-108 requires 8 units. With BEL lead time of 14 days and daily burn rate of 1.1 units, recommended reorder is 35 units to ensure 45-day runway.',
      burn_rate_input: 1.1,
      lead_time_input: 14,
      backorder_qty: 8,
      created_at: pastDate(1),
    },
    {
      id: 'pod_02',
      po_number: 'DRAFT-PO-2026-092',
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      supplier_id: 'sup_01',
      supplier_name: 'Tata Precision Hydraulics',
      current_stock: 75,
      reorder_threshold: 80,
      recommended_qty: 150,
      unit_cost: 1200.00,
      estimated_total: 180000.00,
      status: 'pending',
      source_agent: 'MA-02',
      confidence_score: 91.2,
      reasoning: 'Stock (75) is below safety point (80). Daily burn rate is 4.2 units. Tata lead time is 7 days. Replenishment of 150 units will cover 35 days buffer.',
      burn_rate_input: 4.2,
      lead_time_input: 7,
      backorder_qty: 0,
      created_at: pastDate(2),
    }
  ];

  const auth_audit_logs: AuthAuditLog[] = [
    {
      id: 'aud_01',
      user_id: 'usr_admin_01',
      user_email: 'admin@stocksense.io',
      event_type: 'LOGIN_SUCCESS',
      ip_device_fingerprint: '192.168.1.45 (Chrome 128 / Windows 11)',
      outcome: 'SUCCESS',
      details: 'Admin console access authenticated',
      timestamp: pastDate(1),
    },
    {
      id: 'aud_02',
      user_id: 'usr_mgr_01',
      user_email: 'manager@stocksense.io',
      event_type: 'LOGIN_SUCCESS',
      ip_device_fingerprint: '192.168.1.82 (Firefox 130 / Windows 11)',
      outcome: 'SUCCESS',
      details: 'Manager session established',
      timestamp: pastDate(1),
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_01',
      target_role: 'inventory_manager',
      title: 'AI Purchase Order Draft Ready',
      message: 'MA-02 drafted PO for 35 units of SKU-SRV-204 (BEL). Manager approval required.',
      type: 'po_approval',
      read: false,
      link: '/agents',
      created_at: pastDate(1),
    },
    {
      id: 'notif_02',
      target_role: 'all',
      title: 'Low Stock Alert: SKU-HYD-101',
      message: 'Current stock is 75 units, falling below reorder threshold of 80 units.',
      type: 'low_stock',
      read: false,
      link: '/products',
      created_at: pastDate(2),
    },
    {
      id: 'notif_03',
      target_role: 'inventory_manager',
      title: 'Shrinkage Cluster Flagged (MA-04)',
      message: 'High-frequency theft discrepancies detected in Zone B (Rack B2) over the past 14 days.',
      type: 'anomaly_flag',
      read: false,
      link: '/agents',
      created_at: pastDate(2),
    },
  ];

  const anomalies: AnomalyReport[] = [
    {
      id: 'anom_01',
      detected_at: pastDate(2),
      title: 'Recurring Discrepancy Cluster in Zone B (Rack B2)',
      severity: 'high',
      zone: 'Mumbai Hub - Zone B',
      sku: 'SKU-SRV-204',
      pattern_type: 'recurring_theft',
      description: '3 negative adjustments marked as "theft" or "miscount" recorded within 10 days for high-value SKU-SRV-204 (unit cost ₹15,400). Total discrepancy loss: ₹46,200.',
      recommendation: 'Initiate physical cage audit for Rack B2; verify badge entry logs for night shift access.',
      affected_adjustments: ['adj_02', 'adj_03'],
      status: 'active',
    }
  ];

  const forecasts: DemandForecast[] = [
    {
      sku: 'SKU-HYD-101',
      product_name: 'High-Pressure Hydraulic Seal 45mm',
      category: 'Hydraulics',
      historical_burn_rate: 4.2,
      seasonal_multiplier: 1.15,
      forecast_30d: 145,
      forecast_60d: 295,
      forecast_90d: 450,
      mape: 8.4,
      confidence_level: 94.0,
      trend: 'increasing',
      recommendation: 'Q4 maintenance cycle creates 15% demand uplift. Maintain safety stock >= 85 units.',
      last_updated: now,
    },
    {
      sku: 'SKU-SRV-204',
      product_name: 'Ultra-Torque Brushless Servo Motor 750W',
      category: 'Robotics',
      historical_burn_rate: 1.1,
      seasonal_multiplier: 1.05,
      forecast_30d: 35,
      forecast_60d: 70,
      forecast_90d: 105,
      mape: 9.1,
      confidence_level: 92.5,
      trend: 'stable',
      recommendation: 'Steady automated line demand. Minimum batch order of 30 units recommended for volume pricing.',
      last_updated: now,
    },
    {
      sku: 'SKU-FST-305',
      name: 'M8 Grade 10.9 Flanged Hex Bolts (Box 500)',
      category: 'Fasteners',
      historical_burn_rate: 2.5,
      seasonal_multiplier: 0.95,
      forecast_30d: 72,
      forecast_60d: 145,
      forecast_90d: 215,
      mape: 11.2,
      confidence_level: 89.0,
      trend: 'stable',
      recommendation: 'Fastener usage predictable. Existing stock (48 boxes) adequate for 19 days.',
      last_updated: now,
    } as any
  ];

  return {
    users,
    invites: [],
    otps: [],
    products,
    suppliers,
    receipts,
    deliveries,
    transfers,
    adjustments,
    po_drafts,
    ledger,
    auth_audit_logs,
    notifications,
    anomalies,
    forecasts,
    queued_transactions: [],
  };
}

export function getDb(): DatabaseSchema {
  ensureDirectoryExistence(DB_FILE);
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading DB, re-seeding:', err);
    const initial = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export function saveDb(data: DatabaseSchema): void {
  ensureDirectoryExistence(DB_FILE);
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}
