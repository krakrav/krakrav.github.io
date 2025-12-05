import { Session, User, Message, NetworkEvent, UserRole } from '../types';

// Mock DB in memory (persisted to localStorage for reload safety in this demo)
const STORAGE_KEY_SESSION = 'fynal_sync_session';
const STORAGE_KEY_USER = 'fynal_sync_current_user';

class SessionService {
  private channel: BroadcastChannel;
  private listeners: ((event: NetworkEvent) => void)[] = [];

  constructor() {
    this.channel = new BroadcastChannel('fynal_sync_channel');
    this.channel.onmessage = (ev) => {
      const event = ev.data as NetworkEvent;
      this.notify(event);
    };
  }

  public subscribe(callback: (event: NetworkEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(event: NetworkEvent) {
    this.listeners.forEach(cb => cb(event));
  }

  private broadcast(event: NetworkEvent) {
    this.channel.postMessage(event);
    this.notify(event);
  }

  // --- Session Management ---

  public createSession(hostName: string, config: { maxUsers: number; enable2FA: boolean; pin?: string }): Session {
    const code = this.generateRoomCode();
    const hostUser = this.createUser(hostName, UserRole.HOST);

    const newSession: Session = {
      id: code,
      hostId: hostUser.id,
      createdAt: Date.now(),
      config,
      users: [hostUser],
      isActive: true
    };

    this.saveSessionLocal(newSession);
    this.saveUserLocal(hostUser);
    
    return newSession;
  }

  public joinSession(code: string, userName: string, pin?: string): { success: boolean; message?: string; session?: Session; user?: User } {
    const session = this.getSessionLocal();

    if (!session || session.id !== code || !session.isActive) {
      return { success: false, message: "Session not found or ended." };
    }

    if (session.config.enable2FA && session.config.pin !== pin) {
      return { success: false, message: "Invalid Security PIN." };
    }

    if (session.users.length >= session.config.maxUsers) {
      return { success: false, message: "Session is full." };
    }

    const newUser = this.createUser(userName, UserRole.GUEST);

    const updatedSession = {
      ...session,
      users: [...session.users, newUser]
    };

    this.saveSessionLocal(updatedSession);
    this.saveUserLocal(newUser);
    this.broadcast({ type: 'SYNC_SESSION', payload: updatedSession });

    return { success: true, session: updatedSession, user: newUser };
  }

  public leaveSession(userId: string) {
    const session = this.getSessionLocal();
    if (!session) return;

    const updatedSession = {
      ...session,
      users: session.users.filter(u => u.id !== userId)
    };

    this.saveSessionLocal(updatedSession);
    this.broadcast({ type: 'SYNC_SESSION', payload: updatedSession });
  }

  public kickUser(userIdToKick: string) {
    const session = this.getSessionLocal();
    if (!session) return;

    const updatedSession = {
      ...session,
      users: session.users.filter(u => u.id !== userIdToKick)
    };

    this.saveSessionLocal(updatedSession);
    this.broadcast({ type: 'SYNC_SESSION', payload: updatedSession });
    this.broadcast({ type: 'KICKED', payload: { userId: userIdToKick } });
  }

  public endSession() {
    this.broadcast({ type: 'SESSION_ENDED', payload: null });
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }

  public sendMessage(message: Message) {
    this.broadcast({ type: 'NEW_MESSAGE', payload: message });
  }

  // --- Helpers ---

  public getSessionLocal(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  }

  public getUserLocal(): User | null {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  }

  private saveSessionLocal(session: Session) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  }

  private saveUserLocal(user: User) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }

  private generateRoomCode(): string {
    // 10 digit number string
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  private createUser(name: string, role: UserRole): User {
    return {
      id: crypto.randomUUID(),
      name: name,
      role: role,
      joinedAt: Date.now(),
      deviceInfo: this.getDeviceInfo(),
      ip: this.getMockIP()
    };
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone (Mobile)';
    if (/iPad/.test(ua)) return 'iPad (Tablet)';
    if (/Android/.test(ua)) return 'Android (Mobile)';
    if (/Windows/.test(ua)) return 'Windows (Desktop)';
    if (/Macintosh/.test(ua)) return 'Mac (Desktop)';
    if (/Linux/.test(ua)) return 'Linux (Desktop)';
    return 'Unknown Device';
  }

  private getMockIP(): string {
    // Generate a realistic looking random IP
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
}

export const sessionService = new SessionService();