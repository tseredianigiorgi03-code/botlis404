export type Gender = 'female' | 'male' | 'other';

export type RelationshipStatus = 
  | 'თავისუფალი 💖'
  | 'შეყვარებული 💍'
  | 'საიდუმლო სიმპატია 👀'
  | 'ფლირტის ხასიათზე 🔥'
  | 'უბრალოდ ვერთობი 🥂'
  | 'რომანტიკოსი 🌹';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  status: RelationshipStatus | string;
  bio?: string;
  isHost?: boolean;
  isBot?: boolean;
  score?: number;
  lastSeen?: number;
}

export type QuestionCategory = 'სიმართლე' | 'მოქმედება' | 'აღსარება' | 'ფლირტი' | 'კომპლიმენტი';

export interface QuestionItem {
  id: string;
  text: string;
  category: QuestionCategory;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  type?: 'chat' | 'system' | 'reaction' | 'confession';
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  fromPlayerId: string;
  toPlayerId?: string;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface RoomState {
  id: string;
  name: string;
  players: Player[];
  currentTurnIndex: number;
  bottleAngle: number;
  isSpinning: boolean;
  spinnerPlayerId: string | null;
  targetPlayerId: string | null;
  currentQuestion: QuestionItem | null;
  questions: QuestionItem[];
  chatMessages: ChatMessage[];
  lastActivity: number;
}
