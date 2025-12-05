import React, { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { SessionView } from './components/SessionView';
import { Session, User, Theme } from './types';
import { sessionService } from './services/session';

export default function App() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Attempt to restore session from local storage on reload
    const storedSession = sessionService.getSessionLocal();
    const storedUser = sessionService.getUserLocal();

    if (storedSession && storedUser && storedSession.isActive) {
      // Check if user is actually in session
      const userInSession = storedSession.users.find(u => u.id === storedUser.id);
      if (userInSession) {
        setCurrentSession(storedSession);
        setCurrentUser(storedUser);
      }
    }
    setLoading(false);
  }, []);

  const handleJoinSession = (session: Session, user: User) => {
    setCurrentSession(session);
    setCurrentUser(user);
  };

  const handleLeaveSession = () => {
    if (currentUser) {
       // If host, we already called endSession in the view, but safe to call leave logic
       if (currentUser.role !== 'HOST') {
          sessionService.leaveSession(currentUser.id);
       }
    }
    localStorage.removeItem('fynal_sync_session');
    localStorage.removeItem('fynal_sync_current_user');
    setCurrentSession(null);
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-brand-600">Loading...</div>;
  }

  return (
    <div className={`min-h-screen ${theme === 'transparent' ? 'bg-abstract' : (theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50')}`}>
      {currentSession && currentUser ? (
        <SessionView 
          initialSession={currentSession} 
          currentUser={currentUser} 
          onLeave={handleLeaveSession}
          currentTheme={theme}
          onThemeChange={setTheme}
        />
      ) : (
        <Landing onJoin={handleJoinSession} />
      )}
    </div>
  );
}