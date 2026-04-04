/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  FileText, 
  Send, 
  Shield, 
  Network, 
  Database, 
  Cpu, 
  BrainCircuit, 
  Lock, 
  Layers, 
  AlertTriangle, 
  Target, 
  Users, 
  Rocket,
  Mic,
  History,
  Play,
  Square,
  Volume2,
  Trash2,
  Clock,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  X,
  BarChart2,
  Maximize2,
  Upload,
  Loader2,
  DollarSign,
  Activity,
  MessageSquare,
  RefreshCw,
  Settings,
  Download,
  Monitor,
  AlertCircle,
  Info,
  Bot
} from 'lucide-react';
import { analyzeTranscript, performOCR, validateDocumentMatch, diarizeSpeaker, detectAccent, assignRoles, transcribeAudio } from './services/geminiService';
import { cn } from './lib/utils';
import mammoth from 'mammoth';
import mermaid from 'mermaid';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [svg, setSvg] = useState<string>('');

  const cleanChart = (text: string) => {
    if (!text) return '';
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```mermaid\n?|```/g, '').trim();
    
    // Ensure it starts with a valid Mermaid keyword if not already
    if (!cleaned.startsWith('graph') && !cleaned.startsWith('classDiagram') && !cleaned.startsWith('sequenceDiagram') && !cleaned.startsWith('stateDiagram') && !cleaned.startsWith('erDiagram') && !cleaned.startsWith('gantt') && !cleaned.startsWith('pie') && !cleaned.startsWith('flowchart')) {
      // If it looks like it might be a graph but missing the header
      if (cleaned.includes('-->') || cleaned.includes('---')) {
        cleaned = 'graph TD\n' + cleaned;
      }
    }
    return cleaned;
  };

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      const cleaned = cleanChart(chart);
      if (!cleaned) return;

      setError(false);
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleaned);
        setSvg(renderedSvg);
      } catch (e) {
        console.error('Mermaid render error:', e);
        setError(true);
      }
    };

    renderChart();
  }, [chart]);

  const isMermaid = (text: string) => {
    const cleaned = cleanChart(text);
    return cleaned.startsWith('graph') || 
           cleaned.startsWith('classDiagram') || 
           cleaned.startsWith('sequenceDiagram') || 
           cleaned.startsWith('stateDiagram') || 
           cleaned.startsWith('erDiagram') || 
           cleaned.startsWith('gantt') || 
           cleaned.startsWith('pie') || 
           cleaned.startsWith('flowchart');
  };

  if (error || !isMermaid(chart)) {
    return (
      <div className="p-6 bg-black rounded-2xl overflow-x-auto custom-scrollbar relative group">
        <pre className="text-[9px] font-mono text-emerald-400 leading-[1.1] whitespace-pre">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div 
      className="flex justify-center bg-white p-4 rounded-xl overflow-x-auto w-full" 
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};


interface AnalysisResult {
  client_snapshot: {
    organization_type: string;
    technical_maturity_level: string;
  };
  recommendation: string;
  total_cost_of_ownership: {
    total_monthly_estimate: string;
    total_yearly_estimate: string;
    monthly_est_math_reasoning: string;
    monthly_breakdown: {
      category: string;
      cost: string;
      reasoning: string;
    }[];
    one_time_setup_cost: string;
    setup_cost_math_reasoning: string;
    setup_breakdown: {
      item: string;
      cost: string;
      reasoning: string;
    }[];
    three_year_roi: string;
    roi_math_reasoning: string;
    roi_breakdown: {
      metric: string;
      value: string;
      reasoning: string;
    }[];
    cost_optimization_strategy: string;
    optimization_judgment: string;
  };
  solution_set: {
    category: string;
    solutions: {
      name: string;
      estimated_monthly_cost: string;
      pricing_reasoning: string;
      cost_breakdown: {
        item: string;
        cost: string;
        reasoning: string;
      }[];
      detailed_explanation: string;
    }[];
  }[];
  client_references: {
    industry: string;
    company_size: string;
    success_story: string;
  }[];
  matched_use_cases: {
    title: string;
    client_statement: string;
    who_where: string;
    current_workflow_description: string;
    current_workflow_steps: string[];
    potential_bottlenecks: string[];
    desired_workflow_description: string;
    desired_workflow_steps: string[];
    data_integrations: string;
    value_metrics: string;
    constraints_risks: string;
    acceptance_criteria: string[];
    priority_timeline: string;
  }[];
  executive_summary: string;
  technical_architecture_diagram: string;
  sales_intelligence: {
    sentiment_score: string;
    sentiment_summary: string;
    buying_signals: {
      signal: string;
      confidence: string;
      evidence: string;
    }[];
    medpicc: {
      metrics: string;
      economic_buyer: string;
      decision_criteria: string;
      decision_process: string;
      identify_pain: string;
      champion: string;
      competition: string;
    };
  };
}

interface HistoryItem {
  id: string;
  timestamp: number;
  transcript: string;
  result: AnalysisResult;
}

const LAYER_ICONS: Record<string, React.ReactNode> = {
  Foundation: <Layers className="w-5 h-5" />,
  Identity: <Lock className="w-5 h-5" />,
  Network: <Network className="w-5 h-5" />,
  Security: <Shield className="w-5 h-5" />,
  Storage: <Database className="w-5 h-5" />,
  Compute: <Cpu className="w-5 h-5" />,
  AI: <BrainCircuit className="w-5 h-5" />,
};

const DB_NAME = 'SpikedAI_Cache';
const DB_VERSION = 3;
const TRANSCRIPTS_STORE = 'transcripts';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRANSCRIPTS_STORE)) {
        db.createObjectStore(TRANSCRIPTS_STORE, { keyPath: 'meetingId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const loadFromIndexedDB = async (storeName: string, key?: string): Promise<any> => {
  try {
    const db = await initDB();
    if (!db.objectStoreNames.contains(storeName)) return key ? null : [];
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    if (key) {
      const request = store.get(key);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    } else {
      const request = store.getAll();
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });
    }
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return key ? null : [];
  }
};

const saveToIndexedDB = async (storeName: string, data: any): Promise<void> => {
  try {
    const db = await initDB();
    if (!db.objectStoreNames.contains(storeName)) return;
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(data);
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
};

const SAMPLE_TRANSCRIPT = `Architect: Thanks for joining today. I understand your team is looking to modernize the core claims processing system. Can you walk me through the current state?
CTO: Right now, we're on-prem. It's a monolithic Java app running on aging hardware. We're seeing 15-minute downtime windows every Tuesday during deployments.
Architect: That's significant. What's the business impact?
VP Ops: It's costing us about $50k per hour in lost productivity for our adjusters. We need to get to a 99.99% availability target.
Architect: Understood. How are you handling identity and security today?
Security Lead: It's all LDAP. We want to move to a Zero Trust model but the board is worried about the cost of a full overhaul.
Architect: What about data?
Data Engineer: We have 40TB of claims data in a legacy SQL Server. It's slow. We want to run some ML models for fraud detection but the database can't handle the analytical load.
Architect: So, the goals are: high availability, Zero Trust security, and an AI-ready data platform. Any constraints?
CTO: We have a hard deadline of 6 months for the pilot because our data center lease is up. And we need to keep monthly OpEx under $20k for the initial phase.`;

const SAMPLE_DOCUMENT = `Project: Claims Modernization 2026
Organization: InsureTech Global
Technical Environment:
- Primary App: Java 8 Monolith (Spring 4)
- Database: Microsoft SQL Server 2014 (40TB)
- Identity: Local Active Directory / LDAP
- Infrastructure: Dell PowerEdge Servers (End of Life)
Compliance Requirements:
- SOC2 Type II
- GDPR
- Data Residency in US-East
Financial Constraints:
- Initial Pilot Budget: $120k CapEx, $20k/mo OpEx
- Target ROI: 24 months
- Current Downtime Cost: $50k/hr`;

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<{ id?: string, speaker: string, text: string, timestamp: string, role?: string, is_partial?: boolean }[]>([]);
  const [speakerAccents, setSpeakerAccents] = useState<Record<string, string>>({});
  const [speakerRoles, setSpeakerRoles] = useState<Record<string, string>>({});
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'live' | 'upload' | 'bot' | 'sdk' | 'system'>('paste');
  const [sdkState, setSdkState] = useState<'idle' | 'initializing' | 'recording' | 'error'>('idle');
  const [systemAudioState, setSystemAudioState] = useState<'idle' | 'recording' | 'error'>('idle');
  const [systemAudioError, setSystemAudioError] = useState<string | null>(null);
  const [systemAudioStream, setSystemAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const transcriptionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [sdkUploadId, setSdkUploadId] = useState<string | null>(null);
  const [sdkUploadToken, setSdkUploadToken] = useState<string | null>(null);
  const [isPreFetchingSdk, setIsPreFetchingSdk] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [botId, setBotId] = useState<string | null>(null);
  const [isBotJoining, setIsBotJoining] = useState(false);
  const [botStatus, setBotStatus] = useState<string>('joining');
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [isSyncingFull, setIsSyncingFull] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Participant Tracking (from Electron snippet)
  const participantsRef = React.useRef<Map<string, { id: string, name: string, lastActive: number }>>(new Map());
  const currentSpeakerIdRef = React.useRef<string | null>(null);
  const PLACEHOLDER_NAMES = ['Unknown', 'Guest', 'Host', 'You', 'guest', 'host', 'you'];

  const isPlaceholder = (name: string) => {
    return !name || PLACEHOLDER_NAMES.includes(name.trim());
  };

  const updateParticipant = (participantData: any) => {
    if (!participantData || participantData.id == null) return;
    const id = String(participantData.id);
    const incoming = (participantData.name || '').trim();
    const existing = participantsRef.current.get(id);

    let finalName;
    if (existing && !isPlaceholder(existing.name)) finalName = existing.name;
    else if (!isPlaceholder(incoming)) finalName = incoming;
    else finalName = existing ? existing.name : incoming;

    if (!existing || existing.name !== finalName) {
      console.log(`[SDK] Participant Update: ${existing?.name || 'New'} -> ${finalName} (ID: ${id})`);
    }

    participantsRef.current.set(id, { 
      id, 
      name: finalName || 'Unknown',
      lastActive: Date.now()
    });
  };

  const resolveName = (participantData: any) => {
    if (!participantData || participantData.id == null) return 'Unknown';
    const id = String(participantData.id);
    const stored = participantsRef.current.get(id);

    // 1. Direct ID match has a real name
    if (stored && !isPlaceholder(stored.name)) return stored.name;

    // 2. Incoming transcript event has a real name
    const incoming = (participantData.name || '').trim();
    if (!isPlaceholder(incoming)) {
      if (stored) stored.name = incoming;
      return incoming;
    }

    // 3. SMART FIX: Fallback to the Active Speaker ID
    if (currentSpeakerIdRef.current) {
      const activeSpeaker = participantsRef.current.get(currentSpeakerIdRef.current);
      if (activeSpeaker && !isPlaceholder(activeSpeaker.name)) {
        return activeSpeaker.name;
      }
    }

    // 4. SMART FIX: Global Fallback. If "Host", just find the latest real name we saw.
    let bestName = null;
    let latestTime = 0;
    for (const p of participantsRef.current.values()) {
      if (!isPlaceholder(p.name) && p.lastActive > latestTime) {
        bestName = p.name;
        latestTime = p.lastActive;
      }
    }
    
    if (bestName) return bestName;
    return (stored && stored.name) || incoming || 'Unknown';
  };

  // Recall.ai Browser SDK Mock/Wrapper
  const RecallAiWebSdk = React.useMemo(() => ({
    init: (config: { apiUrl: string }) => {
      console.log('[SDK] Initializing with API:', config.apiUrl);
      setSdkState('initializing');
      setTimeout(() => setSdkState('idle'), 1000);
    },
    requestPermission: async (type: string) => {
      console.log('[SDK] Requesting permission:', type);
      try {
        if (type === 'system-audio') {
          if (!navigator.mediaDevices.getDisplayMedia) {
            throw new Error('System audio capture not supported in this browser');
          }
        }
        console.log(`[SDK] Permission ${type} granted`);
        return true;
      } catch (err: any) {
        console.error(`[SDK] Permission ${type} denied:`, err);
        setSdkError(`Permission ${type} denied: ${err.message}`);
        return false;
      }
    },
    addEventListener: (event: string, callback: (evt: any) => void) => {
      console.log('[SDK] Event listener added for:', event);
      // In a real SDK, this would hook into system events
      // For this web mock, we'll simulate a meeting detection if the user clicks a button
    },
    startRecording: async (config: { windowId?: string, uploadToken: string }) => {
      console.log('[SDK] Starting recording with token:', config.uploadToken);
      setSdkState('recording');
      try {
        // In a real browser SDK, this would use getDisplayMedia
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        console.log('[SDK] Recording started successfully');
        // In a real SDK, the stream would be sent to Recall.ai using the uploadToken
        return { success: true };
      } catch (err: any) {
        console.error('[SDK] Failed to start recording:', err);
        setSdkState('idle');
        setSdkError(`Failed to start recording: ${err.message}`);
        throw err;
      }
    }
  }), []);

  // Pre-fetch SDK token when entering SDK mode to preserve user gesture for prompts
  useEffect(() => {
    const preFetchToken = async () => {
      if (inputMode === 'sdk' && !sdkUploadToken && !isPreFetchingSdk) {
        setIsPreFetchingSdk(true);
        try {
          const res = await fetch('/api/recall/sdk-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recording_config: {
                transcript: { provider: { recallai_streaming: {} } },
                realtime_endpoints: [
                  { type: 'desktop_sdk_callback', events: ['transcript.data', 'participant_events.join'] }
                ]
              }
            })
          });
          if (res.ok) {
            const payload = await res.json();
            setSdkUploadId(payload.id);
            setSdkUploadToken(payload.upload_token);
          } else {
            const errorText = await res.text();
            console.error('Failed to pre-fetch SDK token (Server Error):', res.status, errorText);
          }
        } catch (err) {
          console.error('Failed to pre-fetch SDK token (Network Error):', err);
        } finally {
          setIsPreFetchingSdk(false);
        }
      }
    };
    preFetchToken();
  }, [inputMode, sdkUploadToken, isPreFetchingSdk]);

  const handleStartSdkRecording = async () => {
    if (!sdkUploadToken) {
      setSdkError("SDK not ready. Please wait a moment or refresh.");
      return;
    }

    setSdkError(null);
    try {
      // 1. Initialize (Synchronous)
      RecallAiWebSdk.init({ apiUrl: "https://us-west-2.recall.ai" });
      
      // 2. Request Permissions (Directly from user gesture)
      const audioGranted = await RecallAiWebSdk.requestPermission("system-audio");
      if (!audioGranted) return;

      // 3. Start Recording
      await RecallAiWebSdk.startRecording({
        uploadToken: sdkUploadToken
      });

    } catch (err: any) {
      setSdkError(err.message);
      setSdkState('error');
    }
  };

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (transcriptSegments.length > 0) {
      scrollToBottom();
    }
  }, [transcriptSegments]);

  const getSpeakerColor = (speaker: string) => {
    const s = speaker.toLowerCase();
    if (s.includes('customer')) return "bg-blue-100 text-blue-600";
    if (s.includes('architect')) return "bg-emerald-100 text-emerald-600";
    if (s.includes('bot') || s.includes('recall')) return "bg-purple-100 text-purple-600";
    
    // Hash-based color for others
    const colors = [
      "bg-amber-100 text-amber-600",
      "bg-rose-100 text-rose-600",
      "bg-indigo-100 text-indigo-600",
      "bg-cyan-100 text-cyan-600",
      "bg-orange-100 text-orange-600",
      "bg-lime-100 text-lime-600",
      "bg-pink-100 text-pink-600"
    ];
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTranscriptTimestamp = (seconds: number | null) => {
    if (seconds === null) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // If it's a large number, assume it's a unix timestamp
    if (seconds > 1000000000) {
      return new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    // Otherwise assume it's relative seconds
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const activeId = inputMode === 'bot' ? botId : (inputMode === 'sdk' ? sdkUploadId : null);
    if (!activeId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      console.log('[WS] Connected to server');
      socket.send(JSON.stringify({ type: 'subscribe', botId: activeId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
          console.log('[WS] Received transcript update:', data.transcript);
          
          // Handle participant event (if broadcasted as a transcript type with event_type)
          if (data.transcript.event_type === 'participant_event') {
            const pEvent = data.transcript.event;
            const pData = data.transcript.data?.participant || data.transcript.data?.data?.participant;
            
            if (pEvent === 'participant_events.speech_on') {
              if (pData && pData.id != null) {
                currentSpeakerIdRef.current = String(pData.id);
                updateParticipant(pData);
              }
            } else if (['participant_events.join', 'participant_events.update'].includes(pEvent)) {
              if (pData) updateParticipant(pData);
            }
            return;
          }

          const normalize = (s: any) => {
            if (!s) return null;
            let text = s.text || '';
            let startTime = s.start_time ?? s.words?.[0]?.start_timestamp?.relative ?? null;
            
            // Use resolveName for speaker identification
            const participant = s.participant || (s.words?.[0]?.participant);
            const speaker = resolveName(participant) || s.speaker || 'Unknown';

            if (!text && s.words && Array.isArray(s.words)) {
              text = s.words.map((w: any) => w.text || w.word || '').join(' ').trim();
              if (startTime === null && s.words[0]) {
                startTime = s.words[0].start_time ?? s.words[0].start_timestamp?.relative ?? null;
              }
            }
            if (!text) return null;
            return {
              speaker,
              text,
              is_partial: s.is_partial || false,
              timestamp: formatTranscriptTimestamp(startTime)
            };
          };

          const segment = normalize(data.transcript);
          if (segment) {
            // Detect accent for new speakers
            if (!speakerAccents[segment.speaker]) {
              detectAccent(segment.text).then(accent => {
                setSpeakerAccents(prev => ({ ...prev, [segment.speaker]: accent }));
              });
            }

            setTranscriptSegments(prev => {
              // If the last segment is partial and from the same speaker, replace it
              const last = prev[prev.length - 1];
              if (last && last.speaker === segment.speaker && last.is_partial) {
                return [...prev.slice(0, -1), segment];
              }
              // If it's a new segment or not partial, append it
              return [...prev, segment];
            });
          }
        }
      } catch (e) {
        console.error('[WS] Error handling message:', e);
      }
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected from server');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [botId, sdkUploadId, inputMode]);

  useEffect(() => {
    if (transcriptSegments.length > 0) {
      const fullTranscript = transcriptSegments.map(s => `${s.speaker}: ${s.text}${s.is_partial ? '...' : ''}`).join('\n');
      setTranscript(fullTranscript);
    }
  }, [transcriptSegments]);

  const fetchDebugLogs = async () => {
    try {
      const response = await fetch('/api/debug/webhooks');
      const data = await response.json();
      setDebugLogs(data);
    } catch (error) {
      console.error('Failed to fetch debug logs:', error);
    }
  };

  const testWebhook = async () => {
    if (!botId) return;
    try {
      await fetch('/api/debug/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });
      // The server's test-webhook endpoint should also broadcast via WS
      setTimeout(fetchDebugLogs, 1000);
    } catch (error) {
      console.error('Failed to trigger test webhook:', error);
    }
  };
  const [livePerson1, setLivePerson1] = useState('');
  const [livePerson2, setLivePerson2] = useState('');
  const [person1VoiceSample, setPerson1VoiceSample] = useState<string | null>(null);
  const [person2VoiceSample, setPerson2VoiceSample] = useState<string | null>(null);
  const [isAutoDiarizationEnabled, setIsAutoDiarizationEnabled] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2>(1);
  const [isRecording, setIsRecording] = useState(false);

  // Refs for speech recognition to avoid effect restarts
  const activeSpeakerRef = React.useRef(activeSpeaker);
  const isAutoDiarizationEnabledRef = React.useRef(isAutoDiarizationEnabled);
  const livePerson1Ref = React.useRef(livePerson1);
  const livePerson2Ref = React.useRef(livePerson2);
  const isRecordingRef = React.useRef(isRecording);

  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);
  useEffect(() => { isAutoDiarizationEnabledRef.current = isAutoDiarizationEnabled; }, [isAutoDiarizationEnabled]);
  useEffect(() => { livePerson1Ref.current = livePerson1; }, [livePerson1]);
  useEffect(() => { livePerson2Ref.current = livePerson2; }, [livePerson2]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from server
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/history');
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };
    fetchHistory();
  }, []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  useEffect(() => {
    let recognition: any = null;
    let shouldRestart = true;
    
    if (isRecording && inputMode === 'live') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = async (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript || interimTranscript) {
            let targetSpeaker = activeSpeakerRef.current;
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const speakerName = targetSpeaker === 1 ? 'Customer' : 'Architect';
            
            const textToProcess = finalTranscript || interimTranscript;
            const isFinal = !!finalTranscript;

            if (isFinal && isAutoDiarizationEnabledRef.current) {
              // Smart Diarization: Guess speaker based on content
              targetSpeaker = await diarizeSpeaker(textToProcess, livePerson1Ref.current, livePerson2Ref.current);
              setActiveSpeaker(targetSpeaker);
            }

            setTranscriptSegments(prev => {
              const newSegments = [...prev];
              // If the last segment was partial and from the same speaker, replace it
              if (newSegments.length > 0 && newSegments[newSegments.length - 1].is_partial && newSegments[newSegments.length - 1].speaker === speakerName) {
                newSegments[newSegments.length - 1] = {
                  speaker: speakerName,
                  text: textToProcess.trim(),
                  timestamp,
                  is_partial: !isFinal
                };
              } else {
                newSegments.push({ 
                  speaker: speakerName, 
                  text: textToProcess.trim(), 
                  timestamp,
                  is_partial: !isFinal
                });
              }
              return newSegments;
            });

            if (isFinal) {
              // Detect accent for the speaker if not already detected
              if (!speakerAccents[speakerName]) {
                detectAccent(textToProcess.trim()).then(accent => {
                  setSpeakerAccents(prev => ({ ...prev, [speakerName]: accent }));
                });
              }

              if (targetSpeaker === 1) {
                setLivePerson1(prev => prev + (prev ? ' ' : '') + textToProcess.trim());
              } else {
                setLivePerson2(prev => prev + (prev ? ' ' : '') + textToProcess.trim());
              }
              
              setTranscript(prev => prev + (prev ? '\n' : '') + `${speakerName}: ${textToProcess.trim()}`);
            }
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          // 'aborted' often happens when we stop it manually or it's interrupted
          if (event.error === 'aborted') return;
          
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please check your browser settings or try opening the app in a new tab to bypass iframe restrictions.');
          } else if (event.error !== 'no-speech') {
            setError(`Speech recognition error: ${event.error}`);
          }

          if (event.error !== 'no-speech') {
            setIsRecording(false);
          }
        };
        
        recognition.onend = () => {
          if (isRecordingRef.current && shouldRestart && inputMode === 'live') {
            try {
              recognition.start();
            } catch (e) {
              // Ignore if already started
            }
          }
        };
        
        recognition.start();
      } else {
        setError('Speech recognition is not supported in this browser.');
        setIsRecording(false);
      }
    }
    
    return () => {
      shouldRestart = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isRecording, inputMode]);

  const loadSample = () => {
    if (inputMode === 'paste') {
      setTranscript(SAMPLE_TRANSCRIPT);
    } else {
      setLivePerson1("[Concerned Tone] We're seeing 15-minute downtime windows every Tuesday during deployments. It's costing us about $50k per hour.");
      setLivePerson2("[Professional Tone] Understood. AWS can help modernize this with a serverless architecture to eliminate that downtime.");
    }
  };
  const loadSampleDoc = () => setDocumentText(SAMPLE_DOCUMENT);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError(null);
    setDocumentText('');
    setDocumentName(file.name);

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        // Handle Word Document (.docx)
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extractedText = result.value;
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text could be extracted from this Word document.');
        }
        
        setDocumentText(extractedText);
        setIsOcrLoading(false);
      } else {
        // Handle Images and PDFs via Gemini OCR
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const extractedText = await performOCR(base64, file.type);
            
            if (!extractedText || extractedText.trim().length === 0) {
              throw new Error('No text could be extracted from this document.');
            }
            
            setDocumentText(extractedText);
          } catch (err: any) {
            console.error(err);
            setOcrError(
              `OCR Extraction Failed: ${err.message || 'Unknown error'}. \n\nPossible reasons:\n• Unsupported or corrupt file format\n• Image quality is too low, blurry, or low-contrast\n• Document is password protected\n• File size is too large for processing`
            );
          } finally {
            setIsOcrLoading(false);
          }
        };
        reader.onerror = () => {
          setOcrError('Failed to read file. Please check if the file is accessible.');
          setIsOcrLoading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
      setOcrError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
      setIsOcrLoading(false);
    }
  };

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscriptLoading(true);
    setError(null);
    setTranscript('');

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extractedText = result.value;
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text could be extracted from this Word document.');
        }
        
        setTranscript(extractedText);
      } else {
        // For transcripts, we might also want to support text files or even images/PDFs if they are scans of transcripts
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const extractedText = await performOCR(base64, file.type);
            
            if (!extractedText || extractedText.trim().length === 0) {
              throw new Error('No text could be extracted from this document.');
            }
            
            setTranscript(extractedText);
          } catch (err: any) {
            console.error(err);
            setError(`Transcript Extraction Failed: ${err.message || 'Unknown error'}`);
          } finally {
            setIsTranscriptLoading(false);
          }
        };
        reader.onerror = () => {
          setError('Failed to read file.');
          setIsTranscriptLoading(false);
        };
        reader.readAsDataURL(file);
        return; // Exit early as reader.onload handles the rest
      }
    } catch (err: any) {
      console.error(err);
      setError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleJoinBot = async () => {
    if (!meetingUrl) return;
    setIsBotJoining(true);
    setError(null);
    try {
      const response = await fetch('/api/recall/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_url: meetingUrl, bot_name: 'SpikedAI Assistant' })
      });
      
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
      }

      if (data.id) {
        setBotId(data.id);
        // Start polling for transcript
        pollTranscript(data.id);
      } else {
        throw new Error(data.error || 'Failed to join bot');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join bot');
    } finally {
      setIsBotJoining(false);
    }
  };

  const pollTranscript = async (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setIsFetchingTranscript(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/recall/bot/${id}`);
        if (!response.ok) {
          console.warn(`[Poll] Server returned ${response.status} for bot ${id}`);
          return;
        }
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error('Failed to parse poll response:', text);
          return;
        }
        
        if (data.status) {
          setBotStatus(data.status);
        }

        // Recall.ai transcript: segments may use { speaker, text } or v2 { speaker, words:[{text,start_time}] }
        if (data.transcript) {
          const rawSegments = (Array.isArray(data.transcript) ? data.transcript : [data.transcript]);
          console.log(`[Poll] Received ${rawSegments.length} segments for bot ${id}`);
          
          // Normalize each segment regardless of Recall.ai version
          const normalize = (s: any) => {
            if (!s) return null;
            // Handle both raw Recall.ai format and our normalized DB format
            let text = s.text || '';
            let startTime = s.start_time ?? s.words?.[0]?.start_timestamp?.relative ?? null;
            
            // Use resolveName for speaker identification
            const participant = s.participant || (s.words?.[0]?.participant);
            if (participant) updateParticipant(participant);
            const speaker = resolveName(participant) || s.speaker || 'Unknown';

            if (!text && s.words && Array.isArray(s.words)) {
              text = s.words.map((w: any) => w.text || w.word || '').join(' ').trim();
              if (startTime === null && s.words[0]) {
                startTime = s.words[0].start_time ?? s.words[0].start_timestamp?.relative ?? null;
              }
            }
            if (!text) return null;
            return {
              speaker,
              text,
              is_partial: s.is_partial || false,
              timestamp: startTime !== null
                ? new Date(startTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
          };
          const segments = rawSegments.map(normalize).filter(Boolean) as { speaker: string, text: string, timestamp: string, is_partial: boolean }[];
          
          if (segments.length > 0) {
            setTranscriptSegments(segments);
            const fullTranscript = segments.map(s => `${s.speaker}: ${s.text}${s.is_partial ? '...' : ''}`).join('\n');
            setTranscript(fullTranscript);
            
            // Detect accents for new speakers
            segments.forEach(async (s) => {
              if (!speakerAccents[s.speaker]) {
                const accent = await detectAccent(s.text);
                setSpeakerAccents(prev => ({ ...prev, [s.speaker]: accent }));
              }
            });
          }
        }

        if (data.status === 'done' || data.status === 'fatal' || data.status === 'completed' || data.status === 'transcript.done') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsFetchingTranscript(false);
        }
      } catch (err: any) {
        // Only log if it's not a transient network error during dev server restart
        if (err.name !== 'TypeError' || !err.message.includes('Failed to fetch')) {
          console.error('Polling error:', err);
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const fetchFullTranscript = async () => {
    const activeId = botId || sdkUploadId;
    if (!activeId) return;
    setIsSyncingFull(true);
    try {
      const response = await fetch(`/api/recall/bot/${activeId}?force=true`);
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Failed to parse full transcript response:', text);
        return;
      }
      
      if (data.transcript) {
        const rawSegments = (Array.isArray(data.transcript) ? data.transcript : [data.transcript]);
        const normalize = (s: any) => {
          if (!s) return null;
          let text = s.text || '';
          let startTime = s.start_time ?? s.words?.[0]?.start_timestamp?.relative ?? null;
          const speaker = s.speaker || s.participant?.name || 'Unknown';
          if (!text && s.words && Array.isArray(s.words)) {
            text = s.words.map((w: any) => w.text || w.word || '').join(' ').trim();
            if (startTime === null && s.words[0]) {
              startTime = s.words[0].start_time ?? s.words[0].start_timestamp?.relative ?? null;
            }
          }
          if (!text) return null;
          return {
            speaker,
            text,
            is_partial: s.is_partial || false,
            timestamp: startTime !== null
              ? new Date(startTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        };
        const segments = rawSegments.map(normalize).filter(Boolean) as { speaker: string, text: string, timestamp: string, is_partial: boolean }[];
        if (segments.length > 0) {
          setTranscriptSegments(segments);
        }
      }
    } catch (err) {
      console.error('Failed to fetch full transcript:', err);
    } finally {
      setIsSyncingFull(false);
    }
  };

  const handleStartSystemAudio = async () => {
    setSystemAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error("No audio track found in the selected share. Please ensure 'Share audio' is checked.");
      }

      setSystemAudioStream(stream);
      setSystemAudioState('recording');
      setIsRecording(true); // Reuse the recording state for transcription logic

      // Handle stream stop (e.g. user clicks "Stop sharing" in browser UI)
      audioTracks[0].onended = () => {
        setSystemAudioState('idle');
        setIsRecording(false);
        setSystemAudioStream(null);
      };

    } catch (err: any) {
      console.error('[System Audio] Error:', err);
      setSystemAudioError(err.message || "Failed to capture system audio");
      setSystemAudioState('error');
    }
  };

  const handleStopSystemAudio = () => {
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach(track => track.stop());
      setSystemAudioStream(null);
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
    }
    setSystemAudioState('idle');
    setIsRecording(false);
  };

  useEffect(() => {
    if (systemAudioStream && systemAudioState === 'recording') {
      const mediaRecorder = new MediaRecorder(systemAudioStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const processAudio = async () => {
        if (audioChunksRef.current.length > 0) {
          const chunksToProcess = [...audioChunksRef.current];
          audioChunksRef.current = []; // Clear for next batch
          
          const blob = new Blob(chunksToProcess, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            try {
              const text = await transcribeAudio(base64Audio, 'audio/webm');
              if (text && text.trim()) {
                const newSegment = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  speaker: "System Audio",
                  text: text.trim(),
                  timestamp: new Date().toLocaleTimeString(),
                  role: "Participant"
                };
                setTranscriptSegments(prev => [...prev, newSegment]);
              }
            } catch (err) {
              console.error("Transcription error:", err);
            }
          };
        }
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processAudio();
      };

      mediaRecorder.start(1000); // Collect data every second

      // Set up interval to transcribe every 6 seconds for better real-time feel
      transcriptionIntervalRef.current = setInterval(async () => {
        await processAudio();
      }, 6000);

      return () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
        }
      };
    }
  }, [systemAudioStream, systemAudioState]);

  const handleAutoLabelRoles = async () => {
    if (transcriptSegments.length === 0) return;
    setIsDiarizing(true);
    try {
      const speakers = Array.from(new Set(transcriptSegments.map(s => s.speaker)));
      const fullText = transcriptSegments.map(s => `${s.speaker}: ${s.text}`).join('\n');
      const roles = await assignRoles(fullText, speakers);
      setSpeakerRoles(prev => ({ ...prev, ...roles }));
    } catch (err) {
      console.error('Failed to auto-label roles:', err);
    } finally {
      setIsDiarizing(false);
    }
  };

  const handleAnalyze = async () => {
    let finalTranscript = '';
    
    if (inputMode === 'paste' || inputMode === 'upload' || inputMode === 'bot') {
      finalTranscript = transcript;
    } else if (inputMode === 'live') {
      finalTranscript = `Customer: ${livePerson1}\nArchitect: ${livePerson2}`;
    } else if (inputMode === 'system') {
      finalTranscript = transcriptSegments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    }

    if (!finalTranscript.trim()) return;
    
    setIsAnalyzing(true);
    setCurrentStep(2);
    setError(null);
    setValidationError(null);
    setProgress(0);
    setLoadingMessage('Initializing cognitive engine...');

    const steps = [
      { to: 30, message: 'Ingesting transcript data...' },
      { to: 60, message: 'Analyzing requirements...' },
      { to: 90, message: 'Generating strategy...' },
    ];

    let currentProgress = 0;
    const runProgress = async () => {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setLoadingMessage(step.message);
        const target = step.to;
        const diff = target - currentProgress;
        const increments = 10;
        const stepTime = 50;
        
        for(let j = 1; j <= increments; j++) {
          currentProgress += diff / increments;
          setProgress(currentProgress);
          await new Promise(r => setTimeout(r, stepTime));
        }
      }
    };

    runProgress();

    try {
      if (documentText.trim()) {
        const validation = await validateDocumentMatch(documentText, finalTranscript);
        if (!validation.matches) {
          setValidationError(validation.reason || "Missing document context.");
          setIsAnalyzing(false);
          return;
        }
      }

      const data = await analyzeTranscript(finalTranscript, documentText);
      setProgress(100);
      setLoadingMessage('Analysis complete.');
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        transcript: finalTranscript,
        result: data
      };

      // Save to server
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newHistoryItem)
        });
        setHistory(prev => [newHistoryItem, ...prev]);
      } catch (error) {
        console.error('Failed to save history:', error);
        // Fallback to local state if server fails
        setHistory(prev => [newHistoryItem, ...prev]);
      }

      setTimeout(() => {
        setResult(data);
        setIsAnalyzing(false);
      }, 300);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze transcript.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-black/5 bg-white sticky top-0 z-50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-black text-xl">!</span>
            </div>
            <div>
              <h1 className="font-black tracking-tighter text-2xl leading-none">
                SPIKED<span className="text-red-600">AI</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40 mt-1">
                Cognitive Intelligence for Cloud Architect Recommendation Simulator
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 px-3 py-1 border border-black/5 rounded-full">Enterprise Edition v1.0</span>
          </div>
        </div>
      </header>
      
      {/* Step Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-8 flex gap-4">
        <button 
          onClick={() => setCurrentStep(1)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2",
            currentStep === 1 
              ? "bg-black border-black text-white shadow-xl shadow-black/10 scale-[1.02]" 
              : "bg-white border-black/5 text-black/30 hover:border-black/10 hover:text-black"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
            currentStep === 1 ? "bg-white text-black" : "bg-black/5 text-black/40"
          )}>1</div>
          Input & Context
        </button>
        <button 
          onClick={() => setCurrentStep(2)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2",
            currentStep === 2 
              ? "bg-black border-black text-white shadow-xl shadow-black/10 scale-[1.02]" 
              : "bg-white border-black/5 text-black/30 hover:border-black/10 hover:text-black"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
            currentStep === 2 ? "bg-white text-black" : "bg-black/5 text-black/40"
          )}>2</div>
          Analysis & History
        </button>
      </div>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {currentStep === 1 ? (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Context (OCR) Section */}
              <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-black/40">
                    <Upload className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Context (OCR)</span>
                  </div>
                  <button onClick={loadSampleDoc} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample Doc</button>
                </div>
                <div className={cn(
                  "relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-4 min-h-[200px]",
                  documentText ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                )}>
                  {isOcrLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black/20" />
                  ) : documentText ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                        <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-widest truncate max-w-[250px]">{documentName}</span>
                        <button onClick={() => { setDocumentText(''); setDocumentName(''); }}><X className="w-4 h-4 text-emerald-600" /></button>
                      </div>
                      <div className="w-full p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/40 mb-2">OCR Result Preview</p>
                        <p className="text-[11px] text-emerald-900/60 line-clamp-6 text-left leading-relaxed">{documentText}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-black/20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Upload Context Document</p>
                        <p className="text-[9px] text-black/40 font-medium">Support for Images, PDF, and Word</p>
                      </div>
                      <label className="cursor-pointer bg-black text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-lg shadow-black/10">
                        Select File
                        <input type="file" className="hidden" accept="image/*,application/pdf,.docx" onChange={handleFileUpload} />
                      </label>
                    </>
                  )}
                </div>
              </section>

              {/* Transcript Section */}
              <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex bg-black/5 p-1 rounded-lg">
                    <button 
                      onClick={() => setInputMode('paste')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'paste' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Paste
                    </button>
                    <button 
                      onClick={() => setInputMode('upload')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'upload' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Upload
                    </button>
                    <button 
                      onClick={() => setInputMode('live')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'live' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Live
                    </button>
                    <button 
                      onClick={() => setInputMode('bot')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'bot' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Bot
                    </button>
                    <button 
                      onClick={() => setInputMode('sdk')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'sdk' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      SDK
                    </button>
                    <button 
                      onClick={() => setInputMode('system')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'system' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      System Audio
                    </button>
                  </div>
                  <button onClick={loadSample} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample</button>
                </div>

                <div className="flex items-center justify-between text-black/40 mt-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Transcript Section</span>
                  </div>
                  {inputMode === 'paste' && transcript.trim() && (
                    <button 
                      onClick={() => setTranscript('')} 
                      className="text-[9px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {inputMode === 'paste' ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste transcript here..."
                    className="w-full h-[300px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                  />
                ) : inputMode === 'upload' ? (
                  <div className="space-y-4">
                    <div className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-4",
                      transcript ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                    )}>
                      {isTranscriptLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-black/20" />
                      ) : transcript ? (
                        <div className="flex flex-col items-center gap-3">
                          <FileCheck className="w-8 h-8 text-emerald-600" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Transcript Loaded</p>
                            <p className="text-[9px] text-emerald-600/60 font-medium">Ready for analysis</p>
                          </div>
                          <button 
                            onClick={() => setTranscript('')}
                            className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                          >
                            Clear and Re-upload
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-black/20" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest">Upload Transcript</p>
                            <p className="text-[9px] text-black/40 font-medium">Support for .docx, .pdf, and images</p>
                          </div>
                          <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-lg shadow-black/10">
                            Select File
                            <input type="file" className="hidden" accept=".docx,application/pdf,image/*" onChange={handleTranscriptUpload} />
                          </label>
                        </>
                      )}
                    </div>
                    {transcript && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Extracted Content Preview</label>
                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          className="w-full h-[150px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                ) : inputMode === 'sdk' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-white" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-black uppercase tracking-widest">Browser Recording SDK</p>
                            <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Direct Browser-to-Recall Stream</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            sdkState === 'recording' ? "bg-red-500 animate-pulse" : "bg-black/20"
                          )} />
                          <span className="text-[8px] font-black uppercase tracking-widest text-black/40">
                            {sdkState === 'recording' ? "Recording" : "Idle"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-black/5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-black/5">
                            <Settings className="w-3 h-3 text-black/60" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest">SDK Control</p>
                            <p className="text-[8px] text-black/40 font-medium leading-relaxed">
                              The Browser SDK records your meeting audio directly from the browser tab. 
                              Make sure to check "Share audio" when selecting the meeting tab.
                            </p>
                          </div>
                        </div>

                        {sdkError && (
                          <div className="p-2 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <p className="text-[8px] font-bold text-red-600 uppercase tracking-widest">{sdkError}</p>
                          </div>
                        )}

                        <button
                          onClick={handleStartSdkRecording}
                          disabled={sdkState === 'recording' || sdkState === 'initializing' || (!sdkUploadToken && isPreFetchingSdk)}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            sdkState === 'recording' 
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                              : (!sdkUploadToken && isPreFetchingSdk)
                                ? "bg-black/5 text-black/20 cursor-not-allowed"
                                : "bg-black text-white shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                          )}
                        >
                          {sdkState === 'initializing' || (!sdkUploadToken && isPreFetchingSdk) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : sdkState === 'recording' ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          {sdkState === 'initializing' ? "Initializing..." : (!sdkUploadToken && isPreFetchingSdk) ? "Preparing SDK..." : sdkState === 'recording' ? "Recording..." : "Start SDK Recording"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
                          <div className="flex items-start gap-3">
                            <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[8px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                                Important: Browser SDK requires a "Secure Context" and specific permissions.
                              </p>
                              <p className="text-[8px] text-amber-600/80 font-medium leading-relaxed">
                                If you encounter "Permission Denied" errors, try opening the app in a new tab to bypass iframe restrictions.
                              </p>
                            </div>
                          </div>
                          <a 
                            href={window.location.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open in New Tab
                          </a>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-black/5 border border-black/5 flex items-start gap-3">
                          <Info className="w-3 h-3 text-black/40 shrink-0 mt-0.5" />
                          <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-relaxed">
                            Note: If you need to switch to the Desktop SDK for Zoom/Teams native apps, 
                            please download the Recall.ai Desktop Client.
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-black uppercase tracking-widest">SDK Meeting Transcripts</p>
                              {sdkState === 'recording' && (
                                <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Live Feed</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Real-time Conversation Stream</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full animate-pulse",
                              sdkState === 'recording' ? "bg-emerald-500" : "bg-red-500"
                            )} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Status: {sdkState}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={handleAutoLabelRoles}
                              disabled={isDiarizing || transcriptSegments.length === 0}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                isDiarizing || transcriptSegments.length === 0
                                  ? "bg-black/5 text-black/20 cursor-not-allowed" 
                                  : "bg-black/5 text-black/60 hover:bg-black/10"
                              )}
                            >
                              {isDiarizing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Users className="w-3 h-3" />
                              )}
                              {isDiarizing ? "Diarizing..." : "Auto-Label Roles"}
                            </button>
                            <button 
                              onClick={fetchFullTranscript}
                              disabled={isSyncingFull}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                isSyncingFull 
                                  ? "bg-black/5 text-black/20 cursor-not-allowed" 
                                  : "bg-black/5 text-black/60 hover:bg-black/10"
                              )}
                            >
                              {isSyncingFull ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              {isSyncingFull ? "Syncing..." : "Fetch Complete Transcript"}
                            </button>
                            <button 
                              onClick={() => sdkUploadId && pollTranscript(sdkUploadId)}
                              className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                              title="Refresh Transcript"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5 text-black/40", isFetchingTranscript && "animate-spin")} />
                            </button>
                            <button 
                              onClick={() => {
                                setShowDebug(!showDebug);
                                if (!showDebug) fetchDebugLogs();
                              }}
                              className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                              title="Debug Info"
                            >
                              <Settings className="w-3.5 h-3.5 text-black/40" />
                            </button>
                          </div>
                        </div>

                        {showDebug && (
                          <div className="mb-4 p-3 bg-black/5 rounded-xl border border-black/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-black/60">Debug: Webhook Logs</h4>
                              <div className="flex gap-2">
                                <button onClick={testWebhook} className="text-[8px] font-bold uppercase text-emerald-600 hover:underline">Test Webhook</button>
                                <button onClick={fetchDebugLogs} className="text-[8px] font-bold uppercase text-blue-600 hover:underline">Refresh Logs</button>
                              </div>
                            </div>
                            <div className="max-h-[150px] overflow-y-auto text-[8px] font-mono space-y-1 custom-scrollbar">
                              {debugLogs.length > 0 ? (
                                debugLogs.map((log, i) => (
                                  <div key={i} className="border-b border-black/5 pb-1">
                                    <span className="text-black/40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                                    <span className="text-blue-600">{log.event}</span>{" "}
                                    <span className="text-black/60">Bot: {log.bot_id}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-black/30 italic">No logs yet...</div>
                              )}
                            </div>
                            {sdkUploadId && (
                              <div className="text-[8px] text-black/40 break-all">
                                Current SDK Upload ID: <span className="text-black/80 font-bold">{sdkUploadId}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-white rounded-xl border border-black/5 p-4 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar relative">
                          <AnimatePresence mode="popLayout">
                            {transcriptSegments.length > 0 ? (
                              <div className="space-y-4">
                                {transcriptSegments.map((segment, index) => (
                                  <motion.div
                                    key={`${segment.timestamp}-${index}`}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn(
                                      "group p-4 rounded-2xl transition-all duration-300",
                                      segment.is_partial 
                                        ? "bg-emerald-50/30 border border-dashed border-emerald-200/50" 
                                        : "bg-white border border-black/5 hover:border-black/10 hover:shadow-md"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black uppercase shadow-sm",
                                          getSpeakerColor(segment.speaker)
                                        )}>
                                          {segment.speaker[0]}
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-black/80">{segment.speaker}</span>
                                            {speakerAccents[segment.speaker] && (
                                              <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                <Globe className="w-2.5 h-2.5 text-blue-500" />
                                                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                                                  {speakerAccents[segment.speaker]} Accent
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[8px] font-bold text-black/30 uppercase tracking-widest">
                                            <Clock className="w-2.5 h-2.5" />
                                            <span>{segment.timestamp}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {segment.is_partial && (
                                          <div className="flex items-center gap-1.5 bg-emerald-100/50 px-2 py-1 rounded-full border border-emerald-200/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <p className={cn(
                                      "text-[13px] leading-relaxed font-medium pl-11",
                                      segment.is_partial ? "text-black/50 italic" : "text-black/80"
                                    )}>
                                      {segment.text}
                                      {segment.is_partial && <span className="inline-block w-1 h-4 ml-1 bg-emerald-500/50 animate-pulse align-middle" />}
                                    </p>
                                  </motion.div>
                                ))}
                                <div ref={transcriptEndRef} />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center">
                                  <Activity className="w-8 h-8 text-black/20" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[11px] font-black uppercase tracking-widest text-black/40">Waiting for SDK Audio</p>
                                  <p className="text-[9px] text-black/20 font-bold uppercase tracking-widest max-w-[200px]">
                                    Once you start recording and meeting audio is detected, transcripts will appear here in real-time.
                                  </p>
                                </div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : inputMode === 'system' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-black uppercase tracking-widest">System Audio Capture</p>
                            <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Direct System-to-Transcript</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            systemAudioState === 'recording' ? "bg-red-500 animate-pulse" : "bg-black/20"
                          )} />
                          <span className="text-[8px] font-black uppercase tracking-widest text-black/40">
                            {systemAudioState === 'recording' ? "Capturing" : "Idle"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-black/5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-black/5">
                            <Settings className="w-3 h-3 text-black/60" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest">Capture Control</p>
                            <p className="text-[8px] text-black/40 font-medium leading-relaxed">
                              This feature captures audio directly from your system or a specific tab. 
                              When the browser prompt appears, select the tab/window and ensure <strong>"Share audio"</strong> is enabled.
                            </p>
                          </div>
                        </div>

                        {systemAudioError && (
                          <div className="p-2 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <p className="text-[8px] font-bold text-red-600 uppercase tracking-widest">{systemAudioError}</p>
                          </div>
                        )}

                        <button
                          onClick={systemAudioState === 'recording' ? handleStopSystemAudio : handleStartSystemAudio}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            systemAudioState === 'recording' 
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                              : "bg-black text-white shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                          )}
                        >
                          {systemAudioState === 'recording' ? (
                            <Square className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          {systemAudioState === 'recording' ? "Stop Capture" : "Start System Audio Capture"}
                        </button>
                      </div>

                      <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-black/40">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Live Transcripts</span>
                          </div>
                          <button 
                            onClick={handleAutoLabelRoles}
                            disabled={isDiarizing || transcriptSegments.length === 0}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isDiarizing || transcriptSegments.length === 0
                                ? "bg-black/5 text-black/20 cursor-not-allowed" 
                                : "bg-black/5 text-black/60 hover:bg-black/10"
                            )}
                          >
                            {isDiarizing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {isDiarizing ? "Diarizing..." : "Auto-Label Roles"}
                          </button>
                        </div>

                        <div className="bg-white rounded-xl border border-black/5 p-4 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar space-y-6 shadow-inner">
                          {transcriptSegments.length > 0 ? (
                            transcriptSegments.map((segment, index) => (
                              <motion.div 
                                key={segment.id || index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-2 group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black uppercase shadow-sm",
                                      getSpeakerColor(segment.speaker)
                                    )}>
                                      {segment.speaker[0]}
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-black/80">{segment.speaker}</span>
                                        {speakerRoles[segment.speaker] && (
                                          <div className="flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded-full border border-black/5">
                                            <Shield className="w-2.5 h-2.5 text-black/40" />
                                            <span className="text-[8px] font-black text-black/60 uppercase tracking-widest">
                                              {speakerRoles[segment.speaker]}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[8px] font-bold text-black/30 uppercase tracking-widest">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>{segment.timestamp}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[13px] leading-relaxed font-medium pl-11 text-black/80">
                                  {segment.text}
                                </p>
                              </motion.div>
                            ))
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-20">
                              <Activity className="w-8 h-8" />
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for Audio</p>
                                <p className="text-[8px] font-medium uppercase tracking-widest max-w-[200px]">Transcripts will appear here once audio is detected from the captured stream.</p>
                              </div>
                            </div>
                          )}
                          <div ref={transcriptEndRef} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : inputMode === 'bot' ? (
                  <div className="flex flex-col gap-6">
                    <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black uppercase tracking-widest">Recall.ai Bot</p>
                          <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Autonomous Meeting Intelligence</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Meeting URL (Zoom, Google Meet, Teams)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={meetingUrl}
                            onChange={(e) => setMeetingUrl(e.target.value)}
                            placeholder="https://zoom.us/j/..."
                            className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                          />
                          <button 
                            onClick={handleJoinBot}
                            disabled={isBotJoining || !meetingUrl}
                            className={cn(
                              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2",
                              isBotJoining || !meetingUrl
                                ? "bg-black/5 text-black/20 cursor-not-allowed"
                                : "bg-black text-white hover:bg-black/90 shadow-lg shadow-black/10 active:scale-95"
                            )}
                          >
                            {isBotJoining ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                Join Bot
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {botId && (
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all",
                          botStatus === 'recording' ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
                        )}>
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            botStatus === 'recording' ? "bg-emerald-500" : "bg-blue-500"
                          )} />
                          <div className="flex-1">
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              botStatus === 'recording' ? "text-emerald-800" : "text-blue-800"
                            )}>
                              Bot {botStatus.replace('_', ' ')}
                            </p>
                            <p className={cn(
                              "text-[8px] font-medium",
                              botStatus === 'recording' ? "text-emerald-600" : "text-blue-600"
                            )}>ID: {botId}</p>
                          </div>
                          {isFetchingTranscript && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live Feed</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-black/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black uppercase tracking-widest">Bot Meeting Transcripts</p>
                          <p className="text-[9px] text-black/40 font-bold uppercase tracking-widest">Live Conversation Feed</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            botStatus === 'recording' ? "bg-emerald-500" : "bg-red-500"
                          )} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Status: {botStatus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleAutoLabelRoles}
                            disabled={isDiarizing || transcriptSegments.length === 0}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isDiarizing || transcriptSegments.length === 0
                                ? "bg-black/5 text-black/20 cursor-not-allowed" 
                                : "bg-black/5 text-black/60 hover:bg-black/10"
                            )}
                          >
                            {isDiarizing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {isDiarizing ? "Diarizing..." : "Auto-Label Roles"}
                          </button>
                          <button 
                            onClick={fetchFullTranscript}
                            disabled={isSyncingFull}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isSyncingFull 
                                ? "bg-black/5 text-black/20 cursor-not-allowed" 
                                : "bg-black/5 text-black/60 hover:bg-black/10"
                            )}
                          >
                            {isSyncingFull ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            {isSyncingFull ? "Syncing..." : "Fetch Complete Transcript"}
                          </button>
                          <button 
                            onClick={() => botId && pollTranscript(botId)}
                            className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                            title="Refresh Transcript"
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5 text-black/40", isFetchingTranscript && "animate-spin")} />
                          </button>
                          <button 
                            onClick={() => {
                              setShowDebug(!showDebug);
                              if (!showDebug) fetchDebugLogs();
                            }}
                            className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                            title="Debug Info"
                          >
                            <Settings className="w-3.5 h-3.5 text-black/40" />
                          </button>
                        </div>
                      </div>

                      {showDebug && (
                        <div className="mb-4 p-3 bg-black/5 rounded-xl border border-black/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-bold uppercase tracking-widest text-black/60">Debug: Webhook Logs</h4>
                            <div className="flex gap-2">
                              <button onClick={testWebhook} className="text-[8px] font-bold uppercase text-emerald-600 hover:underline">Test Webhook</button>
                              <button onClick={fetchDebugLogs} className="text-[8px] font-bold uppercase text-blue-600 hover:underline">Refresh Logs</button>
                            </div>
                          </div>
                          <div className="max-h-[150px] overflow-y-auto text-[8px] font-mono space-y-1 custom-scrollbar">
                            {debugLogs.length > 0 ? (
                              debugLogs.map((log, i) => (
                                <div key={i} className="border-b border-black/5 pb-1">
                                  <span className="text-black/40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                                  <span className="text-blue-600">{log.event}</span>{" "}
                                  <span className="text-black/60">Bot: {log.bot_id}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-black/30 italic">No logs yet...</div>
                            )}
                          </div>
                          {botId && (
                            <div className="text-[8px] text-black/40 break-all">
                              Current Bot ID: <span className="text-black/80 font-bold">{botId}</span>
                            </div>
                          )}
                        </div>
                      )}

                        <div className="w-full h-[400px] bg-white border border-black/10 rounded-xl p-4 overflow-y-auto custom-scrollbar space-y-4 shadow-sm relative">
                        <AnimatePresence initial={false}>
                          {transcriptSegments.length > 0 ? (
                            transcriptSegments.map((segment, index) => (
                              <motion.div 
                                key={`${segment.timestamp}-${index}`}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                  "p-3 rounded-xl transition-all border group relative",
                                  segment.is_partial 
                                    ? "bg-emerald-50/30 border-emerald-100/50 border-dashed" 
                                    : "bg-black/[0.02] border-transparent hover:border-black/5 hover:bg-black/[0.03]"
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      segment.speaker === 'Architect' ? "bg-red-500" : "bg-black/40"
                                    )} />
                                    <span className={cn(
                                      "text-[8px] font-black uppercase tracking-widest",
                                      segment.speaker === 'Architect' || speakerRoles[segment.speaker] === 'Architect' ? "text-red-600" : "text-black"
                                    )}>
                                      {speakerRoles[segment.speaker] ? `${segment.speaker} (${speakerRoles[segment.speaker]})` : segment.speaker}
                                    </span>
                                    {speakerAccents[segment.speaker] && (
                                      <span className="text-[7px] font-bold text-black/30 uppercase tracking-tighter bg-black/5 px-1 rounded">
                                        {speakerAccents[segment.speaker]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {segment.is_partial && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                                      </span>
                                    )}
                                    <span className="text-[7px] font-mono text-black/20 group-hover:text-black/40 transition-colors">
                                      {segment.timestamp}
                                    </span>
                                  </div>
                                </div>
                                <p className={cn(
                                  "text-[11px] text-black/70 leading-relaxed font-medium",
                                  segment.is_partial && "text-black/50"
                                )}>
                                  {segment.text}
                                  {segment.is_partial && (
                                    <span className="inline-flex ml-1">
                                      <span className="animate-[bounce_1s_infinite] delay-0">.</span>
                                      <span className="animate-[bounce_1s_infinite] delay-150">.</span>
                                      <span className="animate-[bounce_1s_infinite] delay-300">.</span>
                                    </span>
                                  )}
                                </p>
                              </motion.div>
                            ))
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-20">
                              {botId ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for transcript...</p>
                                  <p className="text-[9px] font-medium">Bot is in the meeting — transcript will appear here</p>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-6 h-6" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">Join a meeting to start</p>
                                  <p className="text-[9px] font-medium">Enter a meeting URL above and click Join Bot</p>
                                </>
                              )}
                            </div>
                          )}
                        </AnimatePresence>
                        <div ref={transcriptEndRef} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      {transcriptSegments.length > 0 && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Full Meeting Transcript</label>
                              <button 
                                onClick={() => {
                                  const text = transcriptSegments.map(s => `[${s.timestamp}] ${s.speaker}${speakerAccents[s.speaker] ? ` (${speakerAccents[s.speaker]} Accent)` : ''}: ${s.text}`).join('\n');
                                  navigator.clipboard.writeText(text);
                                }}
                                className="text-[8px] font-bold text-black/40 hover:text-black uppercase tracking-widest transition-colors"
                              >
                                Copy Text
                              </button>
                            </div>
                            <textarea
                              readOnly
                              value={transcriptSegments.map(s => `[${s.timestamp}] ${s.speaker}${speakerAccents[s.speaker] ? ` (${speakerAccents[s.speaker]} Accent)` : ''}: ${s.text}`).join('\n')}
                              className="w-full h-[150px] bg-black/[0.02] border border-black/10 rounded-2xl p-4 text-[11px] text-black/70 font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar shadow-inner"
                              placeholder="Full transcript will appear here..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transcriptSegments.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Live Conversation Stream</label>
                        <div className="w-full h-[250px] bg-white border border-black/10 rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-4 shadow-sm">
                          {transcriptSegments.map((segment, index) => (
                            <div key={index} className={cn(
                              "p-3 rounded-xl transition-all border",
                              segment.speaker === (activeSpeaker === 1 ? 'Customer' : 'Architect') && isRecording && index === transcriptSegments.length - 1
                                ? "bg-red-50 border-red-100 shadow-sm" 
                                : "bg-black/[0.02] border-transparent"
                            )}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest",
                                    segment.speaker === 'Architect' ? "text-red-600" : "text-black"
                                  )}>
                                    {segment.speaker}
                                  </span>
                                  {speakerAccents[segment.speaker] && (
                                    <span className="text-[7px] font-bold text-black/30 uppercase tracking-tighter">
                                      ({speakerAccents[segment.speaker]} Accent)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[7px] font-mono text-black/20">
                                  {segment.is_partial && (
                                    <span className="mr-2 text-red-400 font-black animate-pulse">PARTIAL</span>
                                  )}
                                  {segment.timestamp}
                                </span>
                              </div>
                              <p className={cn(
                                "text-[11px] text-black/70 leading-relaxed font-medium",
                                segment.is_partial && "italic opacity-60"
                              )}>
                                {segment.text}{segment.is_partial && "..."}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Voice Profiles Section */}
                    <div className="bg-black/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-black/40">
                          <Users className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Voice Profiles</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="flex flex-col items-end mr-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">Auto-Detect</span>
                            <span className="text-[6px] font-bold uppercase tracking-widest text-emerald-500/60">Voice Tone AI</span>
                          </div>
                          <div 
                            onClick={() => setIsAutoDiarizationEnabled(!isAutoDiarizationEnabled)}
                            className={cn(
                              "w-8 h-4.5 rounded-full transition-all relative",
                              isAutoDiarizationEnabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-black/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm",
                              isAutoDiarizationEnabled ? "left-4" : "left-0.5"
                            )} />
                          </div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-black/30">Person 1</p>
                          <label className={cn(
                            "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer transition-all",
                            person1VoiceSample ? "border-emerald-200 bg-emerald-50/30" : "border-black/10 hover:bg-black/5"
                          )}>
                            <Volume2 className={cn("w-3 h-3 mb-1", person1VoiceSample ? "text-emerald-500" : "text-black/20")} />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-black/40">
                              {person1VoiceSample ? "Sample Loaded" : "Upload Voice"}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="audio/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setPerson1VoiceSample(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-black/30">Person 2</p>
                          <label className={cn(
                            "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer transition-all",
                            person2VoiceSample ? "border-emerald-200 bg-emerald-50/30" : "border-black/10 hover:bg-black/5"
                          )}>
                            <Volume2 className={cn("w-3 h-3 mb-1", person2VoiceSample ? "text-emerald-500" : "text-black/20")} />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-black/40">
                              {person2VoiceSample ? "Sample Loaded" : "Upload Voice"}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="audio/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setPerson2VoiceSample(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "space-y-2 p-2 rounded-2xl transition-all border border-transparent",
                      activeSpeaker === 1 && isRecording && "bg-red-50/50 border-red-100 shadow-sm"
                    )}>
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Person 1 (Customer)</label>
                        {isRecording && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full border border-red-100">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-2 bg-red-400 animate-[bounce_1s_infinite_0ms]" />
                              <div className="w-0.5 h-3 bg-red-500 animate-[bounce_1s_infinite_200ms]" />
                              <div className="w-0.5 h-2 bg-red-400 animate-[bounce_1s_infinite_400ms]" />
                            </div>
                            <span className="text-[7px] font-black text-red-600 uppercase tracking-widest">Analyzing Tone</span>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={livePerson1}
                        onChange={(e) => setLivePerson1(e.target.value)}
                        onFocus={() => setActiveSpeaker(1)}
                        placeholder="Customer speaking..."
                        className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                      />
                    </div>
                    <div className={cn(
                      "space-y-2 p-2 rounded-2xl transition-all border border-transparent",
                      activeSpeaker === 2 && isRecording && "bg-red-50/50 border-red-100 shadow-sm"
                    )}>
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Person 2 (Architect)</label>
                        {isRecording && activeSpeaker === 2 && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">Listening</span>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={livePerson2}
                        onChange={(e) => setLivePerson2(e.target.value)}
                        onFocus={() => setActiveSpeaker(2)}
                        placeholder="Architect speaking..."
                        className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                      />
                    </div>
                    <button 
                      onClick={() => setIsRecording(!isRecording)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        isRecording ? "bg-red-600 border-red-700 text-white shadow-lg shadow-red-500/20" : "bg-black/5 border-transparent text-black/40 hover:bg-black/10"
                      )}
                    >
                      {isRecording ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      {isRecording ? "Stop Listening" : "Start Real-time Transcription"}
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div className="max-w-xl mx-auto pt-8">
              <button
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing || 
                  isOcrLoading || 
                  (inputMode === 'paste' && !transcript.trim()) ||
                  (inputMode === 'live' && !livePerson1.trim() && !livePerson2.trim()) ||
                  (inputMode === 'upload' && !transcript.trim())
                }
                className={cn(
                  "w-full flex items-center justify-center gap-3 px-8 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl",
                  isAnalyzing ? "bg-black/10 text-black/40 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-red-600/20"
                )}
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isAnalyzing ? "Analyzing..." : "Generate Strategy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Step 2 Left: History (col-span-3) */}
            <div className="col-span-12 lg:col-span-3 space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-black/40">
                  <History className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">History</span>
                </div>
              </div>

              <div className="bg-white border border-black/5 rounded-3xl p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar shadow-sm">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <History className="w-8 h-8 text-black/5" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">No history yet</p>
                  </div>
                ) : (
                  history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setResult(item.result);
                        setTranscript(item.transcript);
                      }}
                      className={cn(
                        "w-full text-left p-4 hover:bg-black/5 rounded-2xl transition-all border group",
                        result?.recommendation === item.result.recommendation ? "bg-black/5 border-black/10" : "border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-black/40">{new Date(item.timestamp).toLocaleDateString()}</span>
                        <Trash2 
                          className="w-3 h-3 text-black/0 group-hover:text-red-400 transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await fetch(`/api/history/${item.id}`, { method: 'DELETE' });
                              setHistory(prev => prev.filter(h => h.id !== item.id));
                            } catch (error) {
                              console.error('Failed to delete history item:', error);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{item.result.recommendation}</p>
                      <p className="text-[9px] text-black/40 line-clamp-2 mt-1 font-medium">{item.transcript}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Step 2 Right: Result Section (col-span-9) */}
            <div className="col-span-12 lg:col-span-9">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-black/20" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase italic">Ready for Analysis</h2>
                    <p className="text-sm text-black/40 max-w-xs mx-auto font-medium">
                      Provide a transcript or start a live conversation to generate your enterprise strategy.
                    </p>
                  </div>
                </motion.div>
              ) : isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center min-h-[600px] space-y-12"
                >
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-32 h-32">
                      <defs>
                        <clipPath id="cloud-clip">
                          <path d="M17.5 19c.5 0 1-.1 1.5-.4 1.5-.7 2.5-2.2 2.5-3.6 0-2-1.5-3.5-3.5-3.5-.2 0-.5 0-.7.1C16.5 8.6 14.5 7 12 7c-2.8 0-5.1 2.1-5.5 4.8-.2-.1-.5-.1-.7-.1-2.2 0-4 1.8-4 4s1.8 4 4 4h11.7z" />
                        </clipPath>
                      </defs>
                      <path d="M17.5 19c.5 0 1-.1 1.5-.4 1.5-.7 2.5-2.2 2.5-3.6 0-2-1.5-3.5-3.5-3.5-.2 0-.5 0-.7.1C16.5 8.6 14.5 7 12 7c-2.8 0-5.1 2.1-5.5 4.8-.2-.1-.5-.1-.7-.1-2.2 0-4 1.8-4 4s1.8 4 4 4h11.7z" className="fill-black/5 stroke-black/10" strokeWidth="0.5" />
                      <g clipPath="url(#cloud-clip)">
                        <motion.rect x="0" y={24 - (24 * progress / 100)} width="24" height="24" className="fill-red-600" transition={{ type: 'spring', bounce: 0, duration: 0.5 }} />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                      <span className="text-3xl font-black tracking-tighter text-black">{Math.round(progress)}%</span>
                      <Cloud className="w-4 h-4 text-black/20 animate-bounce mt-1" />
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-black tracking-tight uppercase italic">Synthesizing Intelligence</h3>
                    <p className="text-sm font-bold text-black/40 uppercase tracking-widest">{loadingMessage}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                        <span className="text-white font-black text-sm">!</span>
                      </div>
                      <h2 className="text-xl font-black tracking-tight uppercase italic">Analysis Result</h2>
                    </div>
                    <button 
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `SpikedAI_Strategy_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-lg shadow-black/10"
                    >
                      <Upload className="w-3 h-3 rotate-180" />
                      Export Strategy
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-8">
                    {/* Left Column: Sales Intelligence, Use Case, Client References (col-span-5) */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                      {/* Sales Intelligence Section */}
                      <section className="bg-black text-white rounded-3xl p-8 shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white/40">
                            <BrainCircuit className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Sales Intelligence (Spiked Engine)</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
                            <span className="text-[10px] font-black uppercase tracking-widest">Sentiment: {result?.sales_intelligence.sentiment_score}%</span>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">Sentiment Summary</p>
                            <p className="text-[11px] text-white/70 leading-relaxed italic">"{result?.sales_intelligence.sentiment_summary}"</p>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Buying Signals Detected</p>
                            <div className="space-y-2">
                              {result?.sales_intelligence.buying_signals.map((signal, i) => (
                                <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-red-400">{signal.signal}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{signal.confidence} Confidence</span>
                                  </div>
                                  <p className="text-[10px] text-white/60 leading-relaxed">"{signal.evidence}"</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">MEDPICC Analysis</p>
                            <div className="grid grid-cols-1 gap-2">
                              {Object.entries(result?.sales_intelligence.medpicc || {}).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                  <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-black uppercase">{key.charAt(0)}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">{key.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-white/80 leading-tight">{value}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Use Case Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Target className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Use Case Analysis</span>
                        </div>
                        
                        <div className="space-y-8">
                          {result?.matched_use_cases.map((uc, i) => (
                            <div key={i} className="space-y-6">
                              <div className="space-y-2">
                                <h4 className="text-lg font-black tracking-tight uppercase italic text-red-600">{uc.title}</h4>
                                <p className="text-xs font-serif italic text-black/60">"{uc.client_statement}"</p>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4 text-[11px]">
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Who / Where</p>
                                  <p className="font-medium">{uc.who_where}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Current Workflow</p>
                                  <p className="text-black/70 leading-relaxed mb-2">{uc.current_workflow_description}</p>
                                  <div className="space-y-2 pl-2 border-l border-black/5">
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-black/20">Process Steps</p>
                                      <ul className="list-decimal list-inside space-y-0.5 text-black/60">
                                        {uc.current_workflow_steps.map((step, j) => <li key={j}>{step}</li>)}
                                      </ul>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-600/30">Potential Bottlenecks</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-red-600/60">
                                        {uc.potential_bottlenecks.map((bn, j) => <li key={j}>{bn}</li>)}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Desired Workflow</p>
                                  <p className="text-black/70 leading-relaxed mb-2">{uc.desired_workflow_description}</p>
                                  <div className="space-y-1 pl-2 border-l border-black/5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/30">Modernized Steps</p>
                                    <ul className="list-decimal list-inside space-y-0.5 text-emerald-600/60">
                                      {uc.desired_workflow_steps.map((step, j) => <li key={j}>{step}</li>)}
                                    </ul>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="font-bold uppercase tracking-widest text-black/30">Data & Integrations</p>
                                    <p className="text-black/70">{uc.data_integrations}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-bold uppercase tracking-widest text-black/30">Value & Metrics</p>
                                    <p className="text-black/70">{uc.value_metrics}</p>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Acceptance Criteria</p>
                                  <ul className="list-disc list-inside space-y-0.5 text-black/70">
                                    {uc.acceptance_criteria.map((ac, j) => <li key={j}>{ac}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Client References Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Users className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Client References</span>
                        </div>
                        <div className="space-y-4">
                          {result?.client_references.map((ref, i) => (
                            <div key={i} className="p-4 border border-black/5 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{ref.industry}</span>
                                <span className="text-[9px] font-medium px-2 py-0.5 bg-black/5 rounded-full">{ref.company_size}</span>
                              </div>
                              <p className="text-[11px] text-black/70 leading-relaxed italic">"{ref.success_story}"</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Technical Architecture Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-black/40">
                            <Network className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Technical Architecture</span>
                          </div>
                          <button 
                            onClick={() => {
                              if (result?.technical_architecture_diagram) {
                                navigator.clipboard.writeText(result.technical_architecture_diagram);
                              }
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            Copy Diagram
                          </button>
                        </div>
                        <div className="p-6 bg-white rounded-2xl overflow-x-auto custom-scrollbar relative group border border-black/5">
                          <Mermaid chart={result?.technical_architecture_diagram || ''} />
                        </div>
                      </section>
                    </div>

                    {/* Right Column: Solution Set & Pricing, TCO (col-span-7) */}
                    <div className="col-span-12 lg:col-span-7 space-y-8">
                      {/* Solution Set & Pricing Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Layers className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Solution Set & Detailed Pricing</span>
                        </div>
                        <div className="space-y-8">
                          {result?.solution_set.map((set, i) => (
                            <div key={i} className="space-y-4">
                              <h5 className="text-xs font-black uppercase tracking-widest text-red-600 border-b border-red-100 pb-2">{set.category}</h5>
                              <div className="h-[150px] w-full mb-6 bg-black/[0.01] rounded-xl p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={set.solutions.map(sol => ({
                                    name: sol.name,
                                    cost: parseFloat(sol.estimated_monthly_cost.replace(/[^0-9.]/g, ''))
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: 'none', color: '#fff' }}
                                      itemStyle={{ fontSize: '10px', color: '#fff' }}
                                    />
                                    <Bar dataKey="cost" fill="#000" radius={[2, 2, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="grid grid-cols-1 gap-6">
                                {set.solutions.map((sol, j) => (
                                  <div key={j} className="p-6 bg-black/[0.02] border border-black/5 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1">
                                        <h6 className="text-sm font-black uppercase tracking-tight">{sol.name}</h6>
                                        <p className="text-[11px] text-black/60 leading-relaxed">{sol.detailed_explanation}</p>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs font-mono font-bold text-emerald-600 block">{sol.estimated_monthly_cost}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-black/20">Monthly</span>
                                      </div>
                                    </div>
                                    <div className="pt-4 border-t border-black/5 space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Pricing Overview</p>
                                        <p className="text-[11px] text-black/70 italic leading-relaxed">{sol.pricing_reasoning}</p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Cost Breakdown</p>
                                        <div className="space-y-2">
                                          {sol.cost_breakdown.map((item, k) => (
                                            <div key={k} className="p-3 bg-white border border-black/5 rounded-xl space-y-1">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-black/80">{item.item}</span>
                                                <span className="text-[10px] font-mono font-bold text-emerald-600">{item.cost}</span>
                                              </div>
                                              <p className="text-[9px] text-black/40 leading-relaxed">{item.reasoning}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Total Cost of Ownership Section */}
                      <section className="bg-red-50 border border-red-100 rounded-3xl p-8 space-y-8">
                        <div className="flex items-center gap-2 text-red-600/60">
                          <Activity className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">TCO Analysis & Financial Reasoning</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Monthly & Yearly Estimate */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Monthly Est.</p>
                                <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.total_monthly_estimate}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Yearly Est.</p>
                                <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.total_yearly_estimate}</p>
                              </div>
                            </div>
                        <div className="space-y-6">
                          <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">Cost Breakdown Visualization</p>
                            <div className="h-[200px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={result?.total_cost_of_ownership.monthly_breakdown.map(item => ({
                                  name: item.category,
                                  cost: parseFloat(item.cost.replace(/[^0-9.]/g, ''))
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fee2e2" />
                                  <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 8, fontWeight: 700, fill: '#991b1b' }}
                                  />
                                  <YAxis hide />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}
                                  />
                                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                                    {result?.total_cost_of_ownership.monthly_breakdown.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={['#dc2626', '#ef4444', '#f87171', '#fca5a5'][index % 4]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">Math & Reasoning</p>
                            <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.monthly_est_math_reasoning}</p>
                          </div>
                              <div className="space-y-2">
                                {result?.total_cost_of_ownership.monthly_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.category}</p>
                                      <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-red-600 shrink-0">{item.cost}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Setup Cost */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Setup Cost</p>
                              <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.one_time_setup_cost}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">Math & Reasoning</p>
                                <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.setup_cost_math_reasoning}</p>
                              </div>
                              <div className="space-y-2">
                                {result?.total_cost_of_ownership.setup_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.item}</p>
                                      <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-red-600 shrink-0">{item.cost}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t border-red-100">
                          {/* ROI */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">3-Year ROI Projection</p>
                              <p className="text-xl font-black text-red-900">{result?.total_cost_of_ownership.three_year_roi}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">ROI Reasoning</p>
                                <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.roi_math_reasoning}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {result?.total_cost_of_ownership.roi_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg space-y-1">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.metric}</p>
                                      <span className="text-[10px] font-mono font-bold text-red-600">{item.value}</span>
                                    </div>
                                    <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Optimization & Judgment */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Optimization Strategy</p>
                              <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.cost_optimization_strategy}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Expert Judgment</p>
                              <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20">
                                <p className="text-[11px] font-medium leading-relaxed italic">"{result?.total_cost_of_ownership.optimization_judgment}"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>

                  {/* Bottom: Core Recommendation (Full Width) */}
                  <section className="bg-black text-white rounded-3xl p-12 shadow-xl space-y-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-white/40">
                      <Rocket className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Core Strategic Recommendation</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-tight">
                      {result?.recommendation}
                    </h3>
                    <div className="pt-8 border-t border-white/10 max-w-3xl mx-auto">
                      <p className="text-lg text-white/60 font-serif italic leading-relaxed">
                        {result?.executive_summary}
                      </p>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
      {/* Diagram Modal removed */}
    </div>
  );
}