export interface Instance {
  id: string;
  name: string;
  url: string;
  secretKey: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  lastTested?: string;
}

export interface Lead {
  nome: string;
  email: string;
  [key: string]: string; // Support for extra columns if needed
}

export interface LeadList {
  id: string;
  name: string;
  leads: Lead[];
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  assunto: string;
  corpo: string;
  createdAt: string;
}

export interface CampaignConfig {
  intervalMin: number;
  intervalMax: number;
  responderPara: string;
  templates: EmailTemplate[]; // Updated to use the full template object
  selectedInstances: string[];
  listId: string; // Reference to the list used
}

export interface Campaign {
  id: string;
  name: string;
  config: CampaignConfig;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

// Runtime types for execution
export interface InstanceQueue {
  instanceId: string;
  instanceName: string;
  leads: Lead[];
  sent: number;
  total: number;
  status: 'idle' | 'sending' | 'done' | 'error';
  errorMessage?: string;
  currentLead?: string;
}

export interface LogEntry {
  timestamp: string;
  instanceName: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export interface DispatchPayload {
  secret: string;
  lead: { nome: string; email: string };
  template: { assunto: string; corpo: string };
  responderPara: string;
}
