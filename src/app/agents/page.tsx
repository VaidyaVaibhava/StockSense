'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  FileText,
  TrendingUp,
  Mic,
  MicOff,
  ShieldAlert,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Send,
  Upload,
  Layers,
  ArrowRight,
  Clock,
  Volume2
} from 'lucide-react';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { PurchaseOrderDraft, AnomalyReport, DemandForecast, Supplier, Receipt } from '@/types';

export default function AgentsHubPage() {
  const { user, permissions } = useStockSense();

  const [activeAgentTab, setActiveAgentTab] = useState<'ma01' | 'ma02' | 'ma03' | 'ma04' | 'ma05' | 'ma06'>('ma01');

  // Agent Data State
  const [poDrafts, setPoDrafts] = useState<PurchaseOrderDraft[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<Receipt[]>([]);

  // MA-01 State
  const [ma01DocName, setMa01DocName] = useState('Bharat_Electronics_Challan_BEL4409.pdf');
  const [ma01DocText, setMa01DocText] = useState('BHARAT ELECTRONICS LTD (BEL)\nDELIVERY CHALLAN & INVOICE #BEL-4409\nPO REF: PO-9104\nItem: Ultra-Torque Brushless Servo Motor 750W\nSKU: SKU-SRV-204\nQuantity: 25 pcs\nBatch: SRV-BATCH-102\nDock: Bay 2 - Mumbai Inbound Dock');
  const [ma01Processing, setMa01Processing] = useState(false);
  const [ma01Result, setMa01Result] = useState<any | null>(null);

  // MA-02 State
  const [ma02Evaluating, setMa02Evaluating] = useState(false);
  const [ma02Feedback, setMa02Feedback] = useState<string | null>(null);

  // MA-03 Conversational Assistant State
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'agent'; text: string; time: string; confirmationRequired?: boolean; pendingAction?: any }[]>([
    {
      sender: 'agent',
      text: 'StockSense Floor Assistant active. You can speak or type warehouse commands, such as: "Move 15 units of hydraulic seals to Rack B", "Where is SKU-204?", or "How many units are low stock?".',
      time: 'Just now',
    }
  ]);
  const [pendingConfirmation, setPendingConfirmation] = useState<any | null>(null);

  // MA-04 State
  const [ma04Scanning, setMa04Scanning] = useState(false);
  const [ma04ScanMsg, setMa04ScanMsg] = useState<string | null>(null);

  // MA-05 State
  const [ma05Updating, setMa05Updating] = useState(false);

  const fetchAgentData = async () => {
    try {
      const res = await fetch('/api/v1/agents');
      if (res.ok) {
        const data = await res.json();
        setPoDrafts(data.ma02_all_drafts || []);
        setAnomalies(data.ma04_anomalies || []);
        setForecasts(data.ma05_forecasts || []);
        setSuppliers(data.ma06_suppliers || []);
        setPendingReceipts(data.ma01_pending_receipts || []);
      }
    } catch (err) {
      console.error('Failed to load agent hub data:', err);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, []);

  // Web Speech API Voice Recognition (MA-03 Hands-free Floor Operation)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported by your browser. Please type your command in the prompt input.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceInput(transcript);
      handleSendCommand(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  // MA-01 Document Ingestion
  const handleRunMa01 = async () => {
    setMa01Processing(true);
    setMa01Result(null);
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'MA-01',
          fileName: ma01DocName,
          rawText: ma01DocText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMa01Result(data.result);
        fetchAgentData();
      }
    } catch (err) {
      console.error('MA-01 error:', err);
    } finally {
      setMa01Processing(false);
    }
  };

  // MA-02 Trigger Evaluation
  const handleRunMa02 = async () => {
    setMa02Evaluating(true);
    setMa02Feedback(null);
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'MA-02', action: 'evaluate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMa02Feedback(`Evaluation complete: ${data.result.evaluated_count} SKUs analyzed against lead-time models. ${data.result.drafts_generated} new reorder drafts generated.`);
        fetchAgentData();
      }
    } catch (err) {
      console.error('MA-02 error:', err);
    } finally {
      setMa02Evaluating(false);
    }
  };

  // MA-02 Approve / Reject PO Draft (Manager Checkpoint)
  const handlePoDecision = async (draftId: string, decision: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'MA-02',
          action: 'decision',
          draftId,
          decision,
          managerNotes: `${decision === 'approve' ? 'Approved' : 'Rejected'} in Mastra Agents Hub`,
        }),
      });
      if (res.ok) {
        setMa02Feedback(`PO Draft marked as ${decision.toUpperCase()}. Rejection feedback incorporated into threshold model.`);
        fetchAgentData();
      }
    } catch (err) {
      console.error('PO decision error:', err);
    }
  };

  // MA-03 Conversational Floor Assistant
  const handleSendCommand = async (textToSend?: string) => {
    const commandText = textToSend || voiceInput;
    if (!commandText.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: commandText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setVoiceInput('');

    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'MA-03',
          command: commandText,
          confirmed: false,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const resp = data.response;
        if (resp.requires_confirmation) {
          setPendingConfirmation(resp.pending_action);
        }

        const agentMsg = {
          sender: 'agent' as const,
          text: resp.display_text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confirmationRequired: resp.requires_confirmation,
          pendingAction: resp.pending_action,
        };
        setChatMessages(prev => [...prev, agentMsg]);

        // Text-to-speech feedback simulation
        if ('speechSynthesis' in window && resp.spoken_text) {
          const utterance = new SpeechSynthesisUtterance(resp.spoken_text);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.error('Assistant error:', err);
    }
  };

  // MA-03 Confirm High-Value Transfer
  const handleConfirmAction = async (pendingActionPayload: any) => {
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'MA-03',
          command: 'Confirm transfer',
          confirmed: true,
          pendingActionPayload,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingConfirmation(null);
        const agentMsg = {
          sender: 'agent' as const,
          text: data.response.display_text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => [...prev, agentMsg]);
        fetchAgentData();
      }
    } catch (err) {
      console.error('Confirm transfer error:', err);
    }
  };

  // MA-04 Run Anomaly Auditor Scan
  const handleRunMa04 = async () => {
    setMa04Scanning(true);
    setMa04ScanMsg(null);
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'MA-04' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMa04ScanMsg(`Scanned ${data.result.scanned_adjustments} stock adjustment records over past 30 days. Pattern auditor generated ${data.result.anomalies_detected} advisory reports.`);
        fetchAgentData();
      }
    } catch (err) {
      console.error('MA-04 error:', err);
    } finally {
      setMa04Scanning(false);
    }
  };

  // MA-05 Run Demand Forecasting
  const handleRunMa05 = async () => {
    setMa05Updating(true);
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'MA-05' }),
      });
      const data = await res.json();
      if (res.ok) {
        setForecasts(data.forecasts || []);
      }
    } catch (err) {
      console.error('MA-05 error:', err);
    } finally {
      setMa05Updating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Mastra Agentic AI Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30">
              Mastra 3.0 Orchestration
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous multi-agent architecture with human-in-the-loop checkpoints and explainable decision trails.
          </p>
        </div>
      </div>

      {/* Agents Tabs Navigation (MA-01 to MA-06) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { id: 'ma01', name: 'MA-01 Smart Ingestion', desc: 'Vendor Document OCR', icon: FileText, color: 'text-cyan-400' },
          { id: 'ma02', name: 'MA-02 Reorder Agent', desc: 'Predictive Purchasing', icon: Bot, color: 'text-emerald-400' },
          { id: 'ma03', name: 'MA-03 Floor Voice Assistant', desc: 'Hands-Free Mobile Ops', icon: Mic, color: 'text-teal-400' },
          { id: 'ma04', name: 'MA-04 Shrinkage Auditor', desc: 'Discrepancy Patterns', icon: ShieldAlert, color: 'text-rose-400' },
          { id: 'ma05', name: 'MA-05 Demand Forecasting', desc: 'Seasonal Multipliers', icon: TrendingUp, color: 'text-indigo-400' },
          { id: 'ma06', name: 'MA-06 Supplier Scoring', desc: 'Lead Time Variance', icon: Building, color: 'text-amber-400' },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeAgentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveAgentTab(item.id as any)}
              className={`p-3 rounded-2xl text-left border transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/50 shadow-glow'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`h-4 w-4 ${item.color}`} />
                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </div>
              <div className="font-bold text-xs text-white truncate">{item.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MA-01: SMART INBOUND INGESTION WORKFLOW */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma01' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MA-01: Smart Inbound Ingestion Workflow</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Target: ≥70% data entry reduction
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Chains document parsing tools (OCR + LLM extraction) with schema validation to draft inbound receipts without human transcription errors.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400">Human Checkpoint:</span>
                <div className="text-xs font-semibold text-emerald-400">Staff review required before stock write</div>
              </div>
            </div>

            {/* Ingestion Sandbox Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Simulate Delivery Document / Packing Slip
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ma01DocName}
                    onChange={e => setMa01DocName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <button
                    onClick={() => {
                      setMa01DocName('Tata_Hydraulics_Delivery_Challan_TH8801.pdf');
                      setMa01DocText('TATA PRECISION HYDRAULICS\nDELIVERY CHALLAN #TH-8801\nPO REFERENCE: PO-8902\nItem: High-Pressure Hydraulic Seal 45mm\nSKU: SKU-HYD-101\nQuantity: 50 units\nUnit Cost: ₹1,200.00\nBatch: LOT-2026-H1\nExp: 2027-03-15');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 whitespace-nowrap"
                  >
                    Load Tata Slip
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={ma01DocText}
                  onChange={e => setMa01DocText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 focus:border-cyan-500 text-xs text-slate-300 font-mono outline-none"
                />

                <button
                  onClick={handleRunMa01}
                  disabled={ma01Processing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2"
                >
                  {ma01Processing ? (
                    <span>Parsing Document (OCR + Mastra Schema Validation)...</span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Execute Smart Ingestion Workflow</span>
                    </>
                  )}
                </button>
              </div>

              {/* Extraction Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-bold text-xs text-white">Mastra Schema Validation & Receipt Draft</span>
                    {ma01Result && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Confidence: {ma01Result.confidence_score}%
                      </span>
                    )}
                  </div>

                  {!ma01Result ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      Upload or enter text and click Execute to test document parsing.
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                        Draft Receipt <b>{ma01Result.receipt_number}</b> queued in <i>Pending Validation</i>.
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Supplier: <b className="text-white">{ma01Result.supplier_name}</b></div>
                        <div>PO Reference: <b className="text-white font-mono">{ma01Result.po_reference}</b></div>
                        <div>Shipping Carrier: <b className="text-white">{ma01Result.extracted_fields.carrier}</b></div>
                        <div>Tracking: <b className="text-white font-mono">{ma01Result.extracted_fields.tracking_number}</b></div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="font-semibold text-slate-300">Extracted Line Items:</div>
                        {ma01Result.line_items.map((li: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-lg bg-slate-800/60 flex items-center justify-between font-mono text-[11px]">
                            <span>{li.sku} ({li.product_name})</span>
                            <span className="text-emerald-400 font-bold">{li.received_qty} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500">
                  Per PRD MA-01: The agent drafts the record; warehouse staff must verify physical counts before posting to central ledger.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MA-02: PREDICTIVE REORDERING AGENT */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma02' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MA-02: Predictive Reordering Agent</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Stockout Target: ≥40% reduction
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluates historical burn rate, actual supplier lead times (±variance), safety stocks, and open backorders.
                </p>
              </div>

              <button
                onClick={handleRunMa02}
                disabled={ma02Evaluating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow hover:opacity-95 disabled:opacity-50"
              >
                <RotateCw className={`h-4 w-4 ${ma02Evaluating ? 'animate-spin' : ''}`} />
                <span>{ma02Evaluating ? 'Running Model...' : 'Trigger Predictive Evaluation'}</span>
              </button>
            </div>

            {ma02Feedback && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {ma02Feedback}
              </div>
            )}

            {/* PO Drafts Queue */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Autonomous Draft Purchase Orders:</span>
                <span>{poDrafts.length} Total Records</span>
              </div>

              {poDrafts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No draft purchase orders found. Click Trigger Predictive Evaluation to analyze stockout risks.
                </div>
              ) : (
                <div className="space-y-3">
                  {poDrafts.map(draft => (
                    <div
                      key={draft.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 space-y-3 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{draft.product_name}</span>
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              {draft.sku}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                draft.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : draft.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {draft.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                            <span>Supplier: <b className="text-slate-200">{draft.supplier_name}</b></span>
                            <span>•</span>
                            <span>Agent Confidence: <b className="text-emerald-400 font-mono">{draft.confidence_score}%</b></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-extrabold text-white font-mono">
                            {draft.recommended_qty} Units
                          </div>
                          <div className="text-xs text-emerald-400 font-mono">
                            Estimated: ₹{draft.estimated_total.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        <span className="text-emerald-400 font-semibold">Model Explanation:</span> {draft.reasoning}
                      </div>

                      {/* Manager Checkpoint Buttons */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-mono">PO ID: {draft.po_number}</span>

                        {draft.status === 'pending' && permissions.canApprovePODrafts && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePoDecision(draft.id, 'reject')}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1.5"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Decline (Feedback Model)</span>
                            </button>
                            <button
                              onClick={() => handlePoDecision(draft.id, 'approve')}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-glow hover:opacity-95 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve Order</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MA-03: CONVERSATIONAL WAREHOUSE FLOOR ASSISTANT */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma03' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MA-03: Conversational Warehouse Floor Assistant</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Hands-Free Operations
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enables warehouse staff to execute stock transfers, query SKU locations, and check low-stock items by voice or text.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSpeechRecognition}
                  className={`p-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40'
                      : 'bg-emerald-500 text-slate-950 shadow-glow hover:opacity-95'
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isListening ? 'Listening...' : 'Voice Input (Floor Mic)'}</span>
                </button>
              </div>
            </div>

            {/* Quick Floor Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 font-semibold shrink-0">Sample Floor Prompts:</span>
              {[
                'Move 15 units of hydraulic seals to Rack B',
                'Where is SKU-SRV-204?',
                'How many units are low stock?',
                'Move 30 units of SKU-SRV-204 to Rack C', // Triggers high value confirmation
              ].map(cmd => (
                <button
                  key={cmd}
                  onClick={() => handleSendCommand(cmd)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 text-[11px]"
                >
                  "{cmd}"
                </button>
              ))}
            </div>

            {/* Chat Log Window */}
            <div className="h-96 rounded-2xl bg-slate-950/80 border border-slate-800 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                    }`}
                  >
                    <div>{msg.text}</div>

                    {/* High-Value / High-Quantity Confirmation Dialog (PRD MA-03 Human Checkpoint) */}
                    {msg.confirmationRequired && msg.pendingAction && (
                      <div className="pt-2 border-t border-slate-800 mt-2 space-y-2">
                        <div className="text-[11px] text-amber-300 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Safeguard Checkpoint: Explicit confirmation required before committing transfer.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConfirmAction(msg.pendingAction)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-glow"
                          >
                            Confirm Transfer
                          </button>
                          <button
                            onClick={() => setPendingConfirmation(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Command Text Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={voiceInput}
                onChange={e => setVoiceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendCommand()}
                placeholder="Type or speak warehouse command (e.g. Move 10 units of SKU-HYD-101 to Dock 2)..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 focus:border-teal-500 text-xs text-white outline-none"
              />
              <button
                onClick={() => handleSendCommand()}
                disabled={!voiceInput.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-glow hover:opacity-95 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MA-04: INVENTORY ANOMALY & SHRINKAGE AUDITOR */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma04' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MA-04: Inventory Anomaly & Shrinkage Auditor</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Detection Target: ≤7 days from onset
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Surfaces recurring theft clusters, handling damage patterns, and shift-level discrepancies before month-end reviews.
                </p>
              </div>

              <button
                onClick={handleRunMa04}
                disabled={ma04Scanning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-xs shadow-glow hover:opacity-95 disabled:opacity-50"
              >
                <RotateCw className={`h-4 w-4 ${ma04Scanning ? 'animate-spin' : ''}`} />
                <span>{ma04Scanning ? 'Scanning Ledger...' : 'Run 30-Day Anomaly Audit'}</span>
              </button>
            </div>

            {ma04ScanMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {ma04ScanMsg}
              </div>
            )}

            {/* Anomalies List */}
            <div className="space-y-3 pt-2">
              {anomalies.map(anom => (
                <div
                  key={anom.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-rose-400" />
                      <span className="font-bold text-sm text-white">{anom.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {anom.severity} Severity
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{anom.description}</p>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-emerald-400">
                    <span className="font-bold text-white">Advisory Guidance: </span>
                    {anom.recommendation}
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                    <span>Zone: {anom.zone} • SKU: {anom.sku}</span>
                    <span>Detected: {new Date(anom.detected_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MA-05: DEMAND FORECASTING & SEASONAL TREND AGENT */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma05' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MA-05: Demand Forecasting & Seasonal Trend Agent</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    MAPE Target: ≤15% for A-Class SKUs
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Generates 30/60/90-day demand curves per SKU with seasonal and promotional trend adjustments.
                </p>
              </div>

              <button
                onClick={handleRunMa05}
                disabled={ma05Updating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-glow hover:opacity-95 disabled:opacity-50"
              >
                <RotateCw className={`h-4 w-4 ${ma05Updating ? 'animate-spin' : ''}`} />
                <span>{ma05Updating ? 'Recalculating...' : 'Recalculate 90-Day Forecasts'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {forecasts.map(fc => (
                <div
                  key={fc.sku}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{fc.product_name}</div>
                      <div className="text-[11px] font-mono text-indigo-400">{fc.sku}</div>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                      {fc.trend.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">30 Days</div>
                      <div className="text-sm font-bold text-white">{fc.forecast_30d}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">60 Days</div>
                      <div className="text-sm font-bold text-white">{fc.forecast_60d}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">90 Days</div>
                      <div className="text-sm font-bold text-white">{fc.forecast_90d}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Forecast Error (MAPE): <b className="text-emerald-400 font-mono">{fc.mape}%</b></span>
                    <span>Confidence: <b className="text-emerald-400 font-mono">{fc.confidence_level}%</b></span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 {fc.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MA-06: SUPPLIER PERFORMANCE SCORING AGENT */}
      {/* ========================================================= */}
      {activeAgentTab === 'ma06' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>MA-06: Supplier Performance Scoring Agent</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FR-16 Live Scorecards
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Computes on-time fulfillment rates, short-ship percentages, and lead-time variance from validated receipts to continuously calibrate MA-02.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {suppliers.map(s => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.contact_email}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        s.status === 'preferred'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : s.status === 'active'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500">On-Time Rate</div>
                      <div className="text-sm font-bold text-emerald-400">{s.on_time_rate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Short-Ship Rate</div>
                      <div className="text-sm font-bold text-amber-400">{s.short_ship_rate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Lead Time Var.</div>
                      <div className="text-sm font-bold text-white">±{s.lead_time_variance_days}d</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Average Stated Lead Time: <b className="text-white font-mono">{s.avg_lead_time_days} days</b></span>
                    <span className="text-emerald-400">Calibrates MA-02</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
