/**
 * StockSense — Mastra Agent Registry
 * ====================================
 * Central registration and metadata for all 6 Autonomous Agents (MA-01 → MA-06).
 * Each agent is bound to its TypeScript service module and exposed via the
 * /api/v1/agents API route.
 *
 * Architecture:
 *   [ Frontend Agents Hub (src/app/agents/page.tsx) ]
 *        │
 *        ▼  HTTP POST /api/v1/agents  { agent: 'MA-xx', action: '...' }
 *   [ src/app/api/v1/agents/route.ts ]
 *        │
 *        ├──► MA-01: processInboundDocument()       → smartIngestion.ts
 *        ├──► MA-02: evaluatePredictiveReordering()  → predictiveReordering.ts
 *        │           handlePODraftDecision()
 *        ├──► MA-03: processVoiceOrTextCommand()     → conversationalAssistant.ts
 *        ├──► MA-04: runAnomalyAuditor()             → anomalyAuditor.ts
 *        ├──► MA-05: runDemandForecasting()          → demandForecasting.ts
 *        └──► MA-06: updateSupplierPerformanceScores() → supplierScoring.ts
 *
 * To activate live LLM responses, set OPENAI_API_KEY or
 * GOOGLE_GENERATIVE_AI_API_KEY in .env.local and wire the generateText()
 * call inside each agent's reasoning step.
 */

export interface AgentMetadata {
  id: string;
  name: string;
  nameHindi: string;
  description: string;
  role: 'inbound' | 'reordering' | 'assistant' | 'auditor' | 'forecasting' | 'supplier';
  requiredPermission: 'any' | 'inventory_manager' | 'procurement_admin';
  triggerMode: 'manual' | 'scheduled' | 'event';
  icon: string;
  status: 'active' | 'standby' | 'paused';
}

/** Canonical registry of all Mastra agents */
export const AGENT_REGISTRY: AgentMetadata[] = [
  {
    id: 'MA-01',
    name: 'Smart Inbound Ingestion Agent',
    nameHindi: 'आवक दस्तावेज़ एजेंट',
    description:
      'Parses vendor delivery challans and PDFs from Indian suppliers (Tata, BEL, Godrej, Wipro) and maps them into structured GRN receipt drafts with confidence scoring.',
    role: 'inbound',
    requiredPermission: 'any',
    triggerMode: 'manual',
    icon: 'FileText',
    status: 'active',
  },
  {
    id: 'MA-02',
    name: 'Predictive Reordering Agent',
    nameHindi: 'स्वचालित खरीद आदेश एजेंट',
    description:
      'Monitors stock levels against burn-rate and lead-time thresholds. Auto-generates Purchase Order drafts in INR (₹) for manager sign-off. Respects Human-in-the-loop gate (FR-03).',
    role: 'reordering',
    requiredPermission: 'inventory_manager',
    triggerMode: 'scheduled',
    icon: 'RefreshCcw',
    status: 'active',
  },
  {
    id: 'MA-03',
    name: 'Warehouse Floor Assistant',
    nameHindi: 'गोदाम सहायक',
    description:
      'Natural language inventory lookup, internal stock transfer commands, and recount requests — designed for warehouse workers with minimal training requirements.',
    role: 'assistant',
    requiredPermission: 'any',
    triggerMode: 'manual',
    icon: 'MessageSquare',
    status: 'active',
  },
  {
    id: 'MA-04',
    name: 'Shrinkage & Anomaly Auditor',
    nameHindi: 'स्टॉक गड़बड़ी पहचानकर्ता',
    description:
      'Pattern scans stock adjustment reason codes (damage, theft, miscount, expiry) and flags recurring shrinkage clusters. Generates advisory recommendations and alerts managers.',
    role: 'auditor',
    requiredPermission: 'inventory_manager',
    triggerMode: 'event',
    icon: 'ShieldAlert',
    status: 'active',
  },
  {
    id: 'MA-05',
    name: 'Demand Forecasting Agent',
    nameHindi: 'माँग पूर्वानुमान एजेंट',
    description:
      'Uses burn-rate history, seasonal patterns (Indian festivals, monsoon), and open order data to generate 30/60/90-day demand forecasts per SKU and warehouse zone.',
    role: 'forecasting',
    requiredPermission: 'procurement_admin',
    triggerMode: 'scheduled',
    icon: 'TrendingUp',
    status: 'active',
  },
  {
    id: 'MA-06',
    name: 'Supplier Performance Scorer',
    nameHindi: 'आपूर्तिकर्ता मूल्यांकन एजेंट',
    description:
      'Continuously re-scores Indian suppliers (on-time delivery, rejection rate, price variance) and surfaces ranked recommendations during purchase order creation.',
    role: 'supplier',
    requiredPermission: 'procurement_admin',
    triggerMode: 'event',
    icon: 'Star',
    status: 'active',
  },
];

/** Get a single agent's metadata by ID */
export function getAgentById(id: string): AgentMetadata | undefined {
  return AGENT_REGISTRY.find(a => a.id === id);
}

/** Get agents visible to a given role */
export function getAgentsForRole(
  role: 'warehouse_staff' | 'inventory_manager' | 'procurement_admin'
): AgentMetadata[] {
  return AGENT_REGISTRY.filter(a => {
    if (a.requiredPermission === 'any') return true;
    if (a.requiredPermission === 'inventory_manager') {
      return role === 'inventory_manager' || role === 'procurement_admin';
    }
    if (a.requiredPermission === 'procurement_admin') {
      return role === 'procurement_admin';
    }
    return false;
  });
}

// Re-export all agent service functions for convenience
export { processInboundDocument } from './smartIngestion';
export { evaluatePredictiveReordering, handlePODraftDecision } from './predictiveReordering';
export { processVoiceOrTextCommand } from './conversationalAssistant';
export { runAnomalyAuditor } from './anomalyAuditor';
export { runDemandForecasting } from './demandForecasting';
export { updateSupplierPerformanceScores } from './supplierScoring';
