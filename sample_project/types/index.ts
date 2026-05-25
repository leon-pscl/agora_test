export interface FAQ {
  question: string;
  answer: string;
}

export interface ViewingSlot {
  datetime: string;
  available: boolean;
}

export interface RentalUnit {
  unit_id: string;
  name: string;
  type: 'apartment' | 'room' | 'bedspace';
  price: number;
  availability: 'available' | 'occupied' | 'reserved';
  address: string;
  max_occupants: number;
  pets_allowed: boolean;
  faqs: FAQ[];
  requirements: string[];
  rules: string[];
  viewing_slots: ViewingSlot[];
}

export interface LandlordProfile {
  landlord_id: string;
  units: RentalUnit[];
  tts_voice: string;
  agent_name: string;
  handoff_phone: string;
}

export interface QualificationResult {
  session_id: string;
  tenant_name: string;
  tenant_phone: string;
  occupant_count: number;
  has_pets: boolean;
  move_in_date: string;
  employment_status: string;
  disqualified: boolean;
  disqualification_reason: string | null;
  qualification_score: number;
}

export interface BookingRecord {
  booking_id: string;
  unit_id: string;
  landlord_id: string;
  tenant_name: string;
  tenant_phone: string;
  viewing_datetime: string;
  status: 'scheduled' | 'confirmed' | 'no_show' | 'completed' | 'cancelled';
  requirements_sent: boolean;
  confirmation_sent: boolean;
}

export interface CallSessionLog {
  session_id: string;
  agent_id: string;
  landlord_id: string;
  unit_id: string;
  call_type: 'inbound' | 'outbound_followup' | 'outbound_reminder';
  start_ts: number;
  end_ts: number;
  stage_reached: 'inquiry' | 'qualification' | 'scheduling' | 'requirements' | 'followup';
  handoff_triggered: boolean;
  transcript_url: string;
  outcome: 'booked' | 'qualified_no_booking' | 'disqualified' | 'handoff' | 'no_answer' | 'callback_requested';
}

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface UpdateAgentRequest {
  agent_id: string;
  system_messages: { role: string; content: string }[];
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: unknown;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onEndConversation: () => void;
}

export interface WebhookEvent {
  event: 'agent.joined' | 'agent.left' | 'custom.handoff_requested' | 'custom.booking_confirmed';
  session_id: string;
  agent_id: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
