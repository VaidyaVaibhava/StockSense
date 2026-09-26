import { getDb, saveDb } from '../db';
import { InternalTransfer, StockLedger } from '@/types';

export interface AssistantResponse {
  intent: 'transfer' | 'location_lookup' | 'stock_check' | 'low_stock_query' | 'general_info' | 'error';
  spoken_text: string;
  display_text: string;
  requires_confirmation?: boolean;
  pending_action?: {
    action_type: 'transfer';
    sku: string;
    product_name: string;
    quantity: number;
    from_location: string;
    to_location: string;
    estimated_value: number;
  };
  data?: any;
}

export function processVoiceOrTextCommand(
  input: string,
  userName: string,
  confirmed: boolean = false,
  pendingActionPayload?: any
): AssistantResponse {
  const db = getDb();
  const text = input.trim();
  const lower = text.toLowerCase();

  // If user already confirmed a high-value pending action:
  if (confirmed && pendingActionPayload) {
    const { sku, quantity, from_location, to_location, product_name } = pendingActionPayload;
    const product = db.products.find(p => p.sku === sku);
    if (!product) {
      return {
        intent: 'error',
        spoken_text: 'Product not found for confirmation.',
        display_text: `Error: Product with SKU ${sku} was not found.`,
      };
    }

    const now = new Date();
    const trfNumber = `TRF-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const transfer: InternalTransfer = {
      id: `trf_${Date.now()}`,
      transfer_number: trfNumber,
      from_location,
      to_location,
      sku: product.sku,
      product_name: product.name,
      quantity,
      initiated_via: 'voice',
      status: 'completed',
      voice_transcript: input,
      high_value_flag: true,
      initiated_by: userName,
      timestamp: now.toISOString(),
    };

    // Ledger entry for audit
    const ledgerOut: StockLedger = {
      id: `ledg_${Date.now()}_out`,
      sku: product.sku,
      product_name: product.name,
      event_type: 'TRANSFER_OUT',
      quantity_delta: -quantity,
      resulting_balance: product.current_stock, // Total warehouse stock unchanged
      reference_id: trfNumber,
      reference_type: 'transfer',
      actor_id: 'voice_assistant',
      actor_name: userName,
      location: from_location,
      timestamp: now.toISOString(),
      notes: `Voice Assistant floor transfer to ${to_location} (High-value confirmed)`,
    };

    const ledgerIn: StockLedger = {
      id: `ledg_${Date.now()}_in`,
      sku: product.sku,
      product_name: product.name,
      event_type: 'TRANSFER_IN',
      quantity_delta: quantity,
      resulting_balance: product.current_stock,
      reference_id: trfNumber,
      reference_type: 'transfer',
      actor_id: 'voice_assistant',
      actor_name: userName,
      location: to_location,
      timestamp: now.toISOString(),
      notes: `Voice Assistant floor transfer from ${from_location}`,
    };

    product.location = to_location;
    product.updated_at = now.toISOString();

    db.transfers.unshift(transfer);
    db.ledger.unshift(ledgerIn, ledgerOut);
    saveDb(db);

    const confirmationMsg = `Confirmed. Moved ${quantity} units of ${product.name} from ${from_location} to ${to_location}. Transfer ID is ${trfNumber}.`;
    return {
      intent: 'transfer',
      spoken_text: confirmationMsg,
      display_text: confirmationMsg,
      data: transfer,
    };
  }

  // 1. Check for transfer commands ("move 20 units of SKU-HYD-101 to Rack B", "transfer ...")
  if (lower.includes('move') || lower.includes('transfer') || lower.includes('relocate')) {
    // Extract quantity
    const qtyMatch = lower.match(/(?:move|transfer|relocate)\s+(\d+)/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;

    // Extract destination location
    let toLocation = 'Rack-B2-Staging';
    const toMatch = lower.match(/(?:to|into)\s+([a-zA-Z0-9\-\s]+)$/);
    if (toMatch && toMatch[1]) {
      toLocation = toMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
    }

    // Match product by SKU or name
    let matchedProduct = db.products.find(p => lower.includes(p.sku.toLowerCase()));
    if (!matchedProduct) {
      if (lower.includes('hydraulic') || lower.includes('seal')) matchedProduct = db.products.find(p => p.sku === 'SKU-HYD-101');
      else if (lower.includes('servo') || lower.includes('motor')) matchedProduct = db.products.find(p => p.sku === 'SKU-SRV-204');
      else if (lower.includes('bolt') || lower.includes('fastener')) matchedProduct = db.products.find(p => p.sku === 'SKU-FST-305');
      else if (lower.includes('mcu') || lower.includes('controller') || lower.includes('board')) matchedProduct = db.products.find(p => p.sku === 'SKU-MCU-410');
      else if (lower.includes('thermal') || lower.includes('pad')) matchedProduct = db.products.find(p => p.sku === 'SKU-THM-502');
      else if (lower.includes('valve')) matchedProduct = db.products.find(p => p.sku === 'SKU-VAL-601');
      else matchedProduct = db.products[0];
    }

    if (!matchedProduct) {
      return {
        intent: 'error',
        spoken_text: 'No inventory items available to move.',
        display_text: 'No inventory items available to move.',
      };
    }

    const fromLocation = matchedProduct.location || 'Rack-A1-Bin3';
    const estimatedValue = quantity * matchedProduct.unit_cost;

    // Check if quantity exceeds available
    if (quantity > matchedProduct.current_stock) {
      const err = `Cannot transfer ${quantity} units of ${matchedProduct.name}. Only ${matchedProduct.current_stock} units currently available in ${fromLocation}.`;
      return {
        intent: 'error',
        spoken_text: err,
        display_text: err,
      };
    }

    // PRD Human Checkpoint: If high quantity (>25) or high value (>₹25,000), prompt for voice/UI confirmation!
    if (quantity > 25 || estimatedValue > 25000) {
      const prompt = `Warning: High-value transfer detected (${quantity} units of ${matchedProduct.name} valued at ₹${estimatedValue.toLocaleString('en-IN')}). Please confirm: move from ${fromLocation} to ${toLocation}?`;
      return {
        intent: 'transfer',
        spoken_text: prompt,
        display_text: prompt,
        requires_confirmation: true,
        pending_action: {
          action_type: 'transfer',
          sku: matchedProduct.sku,
          product_name: matchedProduct.name,
          quantity,
          from_location: fromLocation,
          to_location: toLocation,
          estimated_value: estimatedValue,
        },
      };
    }

    // Direct execution for normal transfers
    const now = new Date();
    const trfNumber = `TRF-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transfer: InternalTransfer = {
      id: `trf_${Date.now()}`,
      transfer_number: trfNumber,
      from_location: fromLocation,
      to_location: toLocation,
      sku: matchedProduct.sku,
      product_name: matchedProduct.name,
      quantity,
      initiated_via: 'voice',
      status: 'completed',
      voice_transcript: input,
      high_value_flag: false,
      initiated_by: userName,
      timestamp: now.toISOString(),
    };

    matchedProduct.location = toLocation;
    matchedProduct.updated_at = now.toISOString();

    const ledgerEntry: StockLedger = {
      id: `ledg_${Date.now()}_trf`,
      sku: matchedProduct.sku,
      product_name: matchedProduct.name,
      event_type: 'TRANSFER_IN',
      quantity_delta: 0,
      resulting_balance: matchedProduct.current_stock,
      reference_id: trfNumber,
      reference_type: 'transfer',
      actor_id: 'voice_assistant',
      actor_name: userName,
      location: toLocation,
      timestamp: now.toISOString(),
      notes: `Voice floor transfer from ${fromLocation} to ${toLocation}`,
    };

    db.transfers.unshift(transfer);
    db.ledger.unshift(ledgerEntry);
    saveDb(db);

    const speech = `Done. Transferred ${quantity} units of ${matchedProduct.name} to ${toLocation}.`;
    return {
      intent: 'transfer',
      spoken_text: speech,
      display_text: speech,
      data: transfer,
    };
  }

  // 2. Location lookup ("Where is SKU-118?", "Where are servo motors?")
  if (lower.includes('where is') || lower.includes('where are') || lower.includes('location of') || lower.includes('find')) {
    let product = db.products.find(p => lower.includes(p.sku.toLowerCase()));
    if (!product) {
      product = db.products.find(p => lower.includes(p.name.toLowerCase().split(' ')[0]));
    }
    if (!product) product = db.products[0];

    if (!product) {
      return {
        intent: 'location_lookup',
        spoken_text: 'No product information found in current database.',
        display_text: 'No product information found in current database.',
      };
    }

    const speech = `${product.name} is stored at ${product.location}. Current quantity on hand is ${product.current_stock} ${product.uom}.`;
    return {
      intent: 'location_lookup',
      spoken_text: speech,
      display_text: speech,
      data: product,
    };
  }

  // 3. Low stock check ("How many units are low stock?", "Check low stock")
  if (lower.includes('low') || lower.includes('reorder') || lower.includes('shortage')) {
    const lowStockItems = db.products.filter(p => !p.is_archived && p.current_stock <= p.reorder_threshold);
    if (lowStockItems.length === 0) {
      const speech = 'All items are currently above their reorder thresholds. Stock levels are healthy.';
      return {
        intent: 'low_stock_query',
        spoken_text: speech,
        display_text: speech,
        data: [],
      };
    }
    const itemNames = lowStockItems.map(i => `${i.name} (${i.current_stock}/${i.reorder_threshold} ${i.uom})`).join(', ');
    const speech = `There are ${lowStockItems.length} items below safety threshold: ${itemNames}.`;
    return {
      intent: 'low_stock_query',
      spoken_text: speech,
      display_text: speech,
      data: lowStockItems,
    };
  }

  // 4. Rack / Zone inspection ("Check inventory in Rack A")
  if (lower.includes('check inventory') || lower.includes('rack') || lower.includes('zone') || lower.includes('bin')) {
    const matched = db.products.filter(p => p.location.toLowerCase().includes('rack-a') || lower.includes('rack a'));
    const items = matched.length > 0 ? matched : db.products.slice(0, 3);
    const summary = items.map(i => `${i.sku}: ${i.current_stock} ${i.uom} at ${i.location}`).join('. ');
    const speech = `Inventory scan found ${items.length} items: ${summary}.`;
    return {
      intent: 'stock_check',
      spoken_text: speech,
      display_text: speech,
      data: items,
    };
  }

  // Default fallback
  const fallback = `StockSense floor assistant heard: "${text}". You can ask me to move items (e.g. "Move 15 units of hydraulic seals to Rack B"), locate SKUs, or check low stock.`;
  return {
    intent: 'general_info',
    spoken_text: fallback,
    display_text: fallback,
  };
}
