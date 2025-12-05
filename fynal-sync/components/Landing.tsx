import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Icons } from '../constants';
import { sessionService } from '../services/session';
import { Session, User } from '../types';

interface LandingProps {
  onJoin: (session: Session, user: User) => void;
}

export const Landing: React.FC<LandingProps> = ({ onJoin }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('join');
  const [isLoading, setIsLoading] = useState(false);
  
  // Create Form State
  const [createName, setCreateName] = useState('');
  const [enable2FA, setEnable2FA] = useState(false);
  const [pin, setPin] = useState('');
  const [maxUsers, setMaxUsers] = useState(5);

  // Join Form State
  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  // Validation
  const validateName = (name: string) => {
    const regex = /^[a-zA-Z0-9]{3,}$/;
    return regex.test(name);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(createName)) {
      alert("Name must be at least 3 characters long and contain only English letters and numbers.");
      return;
    }
    if (enable2FA && (!pin || pin.length !== 8)) {
      alert("PIN must be 8 digits");
      return;
    }

    setIsLoading(true);
    // Simulate delay
    setTimeout(() => {
      const session = sessionService.createSession(createName, {
        maxUsers,
        enable2FA,
        pin: enable2FA ? pin : undefined
      });
      onJoin(session, session.users[0]);
      setIsLoading(false);
    }, 600);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(joinName)) {
      alert("Name must be at least 3 characters long and contain only English letters and numbers.");
      return;
    }
    if (!roomCode) return;

    setIsLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      const result = sessionService.joinSession(roomCode, joinName, joinPin);
      
      if (result.success && result.session && result.user) {
        onJoin(result.session, result.user);
      } else {
        if (result.message === "Invalid Security PIN") {
          setShowPinInput(true);
          alert("This session requires a PIN.");
        } else {
          alert(result.message || "Failed to join");
        }
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-100 rounded-full blur-3xl opacity-50"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 mb-6 transform rotate-3">
             <Icons.Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Fynal Sync</h1>
          <p className="text-slate-500">Secure, instant file sharing & chat sessions.</p>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-4 font-medium text-sm transition-colors ${
              activeTab === 'join' 
              ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Join Session
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-4 font-medium text-sm transition-colors ${
              activeTab === 'create' 
              ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Create Session
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <Input 
                label="Room Code" 
                placeholder="10-digit code" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                required
              />
              <Input 
                label="Your Name" 
                placeholder="English letters & numbers only" 
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                required
              />
              {showPinInput && (
                 <Input 
                  label="Security PIN" 
                  type="password"
                  placeholder="8-digit PIN" 
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  maxLength={8}
                />
              )}
              <Button type="submit" fullWidth disabled={isLoading} className="mt-4">
                {isLoading ? 'Joining...' : 'Enter Room'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 animate-in slide-in-from-left-4 duration-300">
              <Input 
                label="Your Name" 
                placeholder="English letters & numbers only" 
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-brand-300 transition-colors">
                  <span className="text-sm font-medium text-slate-700">Enable 2FA (PIN)</span>
                  <input 
                    type="checkbox" 
                    checked={enable2FA}
                    onChange={(e) => setEnable2FA(e.target.checked)}
                    className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>

                {enable2FA && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <Input 
                      type="number"
                      placeholder="Set 8-digit PIN" 
                      value={pin}
                      onChange={(e) => setPin(e.target.value.slice(0, 8))}
                      maxLength={8}
                      className="font-mono tracking-widest"
                      required={enable2FA}
                    />
                    <p className="text-xs text-slate-400 mt-1">Users will need this code to join.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                   Max Users: {maxUsers}
                </label>
                <input 
                  type="range" 
                  min="2" 
                  max="20" 
                  value={maxUsers} 
                  onChange={(e) => setMaxUsers(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              <Button type="submit" fullWidth disabled={isLoading} className="mt-4">
                {isLoading ? 'Creating...' : 'Create Session'}
              </Button>
            </form>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-4 text-center w-full text-slate-400 text-xs">
         <p>Demo Mode: Uses BroadcastChannel for multi-tab testing.</p>
      </div>
    </div>
  );
};