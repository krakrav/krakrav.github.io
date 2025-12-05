export enum UserRole {
  HOST = 'HOST',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: number;
  deviceInfo: string;
  ip: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'file' | 'system';
  fileData?: {
    name: string;
    size: number;
    type: string;
    dataUrl: string; // Base64 for demo purposes
  };
}

export interface SessionConfig {
  maxUsers: number;
  enable2FA: boolean;
  pin?: string;
}

export interface Session {
  id: string; // Room Code
  hostId: string;
  createdAt: number;
  config: SessionConfig;
  users: User[];
  isActive: boolean;
}

export interface JoinRequest {
  code: string;
  name: string;
  pin?: string;
}

export type Theme = 'light' | 'dark' | 'transparent';

// Event types for our mock network service
export type NetworkEvent = 
  | { type: 'SYNC_SESSION'; payload: Session }
  | { type: 'NEW_MESSAGE'; payload: Message }
  | { type: 'KICKED'; payload: { userId: string } }
  | { type: 'SESSION_ENDED'; payload: null };