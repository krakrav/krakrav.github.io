import React, { useState, useEffect, useRef } from 'react';
import { Session, User, Message, UserRole, Theme } from '../types';
import { sessionService } from '../services/session';
import { Icons } from '../constants';
import { Button } from './Button';

interface SessionViewProps {
  initialSession: Session;
  currentUser: User;
  onLeave: () => void;
  currentTheme: Theme;
  onThemeChange: (t: Theme) => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ 
  initialSession, 
  currentUser, 
  onLeave,
  currentTheme,
  onThemeChange
}) => {
  const [session, setSession] = useState<Session>(initialSession);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHost = currentUser.role === UserRole.HOST;

  // Theme Styles Configuration
  const themeStyles = {
    light: {
      bg: 'bg-white',
      text: 'text-slate-900',
      textSec: 'text-slate-500',
      header: 'bg-white border-slate-100',
      sidebar: 'bg-white border-slate-100',
      chatArea: 'bg-slate-50',
      messageReceived: 'bg-white border border-slate-200 text-slate-800',
      messageSent: 'bg-brand-600 text-white',
      inputArea: 'bg-white border-slate-100',
      input: 'bg-slate-50 focus:bg-white text-slate-900',
    },
    dark: {
      bg: 'bg-slate-900',
      text: 'text-white',
      textSec: 'text-slate-400',
      header: 'bg-slate-900 border-slate-800',
      sidebar: 'bg-slate-900 border-slate-800',
      chatArea: 'bg-slate-950',
      messageReceived: 'bg-slate-800 border border-slate-700 text-white',
      messageSent: 'bg-brand-600 text-white',
      inputArea: 'bg-slate-900 border-slate-800',
      input: 'bg-slate-800 focus:bg-slate-700 text-white placeholder-slate-500',
    },
    transparent: {
      bg: 'bg-transparent',
      text: 'text-white',
      textSec: 'text-white/70',
      header: 'bg-white/10 backdrop-blur-md border-white/20',
      sidebar: 'bg-white/10 backdrop-blur-md border-white/20',
      chatArea: 'bg-transparent',
      messageReceived: 'bg-white/10 backdrop-blur-md border border-white/20 text-white',
      messageSent: 'bg-brand-500/80 backdrop-blur-md text-white',
      inputArea: 'bg-white/10 backdrop-blur-md border-t border-white/20',
      input: 'bg-white/10 backdrop-blur-md focus:bg-white/20 text-white placeholder-white/50 border border-white/10',
    }
  };

  const currentStyles = themeStyles[currentTheme];

  useEffect(() => {
    const unsubscribe = sessionService.subscribe((event) => {
      switch (event.type) {
        case 'SYNC_SESSION':
          setSession(event.payload);
          break;
        case 'NEW_MESSAGE':
          setMessages(prev => [...prev, event.payload]);
          break;
        case 'KICKED':
          if (event.payload.userId === currentUser.id) {
            alert('You have been kicked from the session.');
            onLeave();
          }
          break;
        case 'SESSION_ENDED':
          alert('The host has ended the session.');
          onLeave();
          break;
      }
    });
    return () => unsubscribe();
  }, [currentUser.id, onLeave]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processCommands = (text: string) => {
    if (text.toLowerCase() === '/date') {
      // Friday December 2025 (05/12/25)
      const now = new Date();
      const longDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' });
      const shortDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
      return `${longDate} (${shortDate})`;
    }
    if (text.toLowerCase() === '/myip') {
      return currentUser.ip || 'Unknown IP';
    }
    if (text.toLowerCase() === '/mydevice') {
      return `Currently device: ${currentUser.deviceInfo}`;
    }
    return text;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    let content = inputText.trim();
    content = processCommands(content);

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: content,
      timestamp: Date.now(),
      type: 'text'
    };

    sessionService.sendMessage(newMessage);
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      
      const fileMessage: Message = {
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: `Shared a file: ${file.name}`,
        timestamp: Date.now(),
        type: 'file',
        fileData: {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: base64
        }
      };

      sessionService.sendMessage(fileMessage);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleKick = (userId: string) => {
    if (confirm("Are you sure you want to kick this user?")) {
      sessionService.kickUser(userId);
    }
  };

  const handleEndSession = () => {
    if (confirm("Are you sure? This will delete all history and disconnect everyone.")) {
      sessionService.endSession();
      onLeave();
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(session.id);
    alert('Room code copied!');
  };
  
  const copyPin = () => {
    if (session.config.pin) {
      navigator.clipboard.writeText(session.config.pin);
      alert('PIN copied!');
    }
  };

  const toggleTheme = () => {
    if (currentTheme === 'light') onThemeChange('dark');
    else if (currentTheme === 'dark') onThemeChange('transparent');
    else onThemeChange('light');
  };

  const ThemeIcon = () => {
    if (currentTheme === 'light') return <Icons.Sun className="w-5 h-5" />;
    if (currentTheme === 'dark') return <Icons.Moon className="w-5 h-5" />;
    return <Icons.Droplet className="w-5 h-5" />;
  };

  const renderFilePreview = (fileData: Exclude<Message['fileData'], undefined>) => {
    const isImage = fileData.type.startsWith('image/');
    const isVideo = fileData.type.startsWith('video/');
    const isAudio = fileData.type.startsWith('audio/');

    if (isImage) {
      return (
        <img 
          src={fileData.dataUrl} 
          alt={fileData.name} 
          className="max-w-full h-auto rounded-lg mb-2 max-h-[300px] object-cover"
        />
      );
    }
    if (isVideo) {
      return (
        <video 
          src={fileData.dataUrl} 
          controls 
          className="max-w-full rounded-lg mb-2 max-h-[300px]"
        />
      );
    }
    if (isAudio) {
      return (
        <audio 
          src={fileData.dataUrl} 
          controls 
          className="w-full mb-2" 
        />
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-screen ${currentStyles.bg} transition-colors duration-300`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 border-b ${currentStyles.header} shadow-sm z-10`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className={`text-xl font-bold tracking-tight ${currentStyles.text}`}>Fynal Sync</h1>
            <div className={`flex items-center gap-2 text-sm ${currentStyles.textSec}`}>
              <span className={`font-mono px-2 py-0.5 rounded ${currentTheme === 'transparent' ? 'bg-white/20' : 'bg-slate-100'} ${currentTheme === 'light' ? 'text-slate-700' : 'text-white'}`}>
                {session.id}
              </span>
              <button onClick={copyRoomCode} className="hover:text-brand-500 font-medium transition-colors">Copy</button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={toggleTheme}
             className={`p-2 rounded-full transition-colors ${currentTheme === 'transparent' ? 'text-white hover:bg-white/20' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
             title="Change Theme"
           >
             <ThemeIcon />
           </button>
           
           <button 
             onClick={() => setShowUsers(!showUsers)}
             className={`md:hidden p-2 rounded-full ${currentStyles.textSec} hover:opacity-80`}
           >
             <Icons.User className="w-5 h-5" />
           </button>

           {isHost && (
             <Button variant="danger" size="sm" onClick={handleEndSession}>
               End
             </Button>
           )}
           <Button variant="ghost" size="sm" onClick={onLeave} className={currentTheme !== 'light' ? '!text-white hover:!bg-white/10' : ''}>
             <Icons.LogOut className="w-4 h-4 mr-2" />
             Leave
           </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chat/File Area */}
        <main className={`flex-1 flex flex-col ${currentStyles.chatArea} min-w-0 transition-colors duration-300`}>
          
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-center my-4">
              <span className={`text-xs px-3 py-1 rounded-full border ${currentTheme === 'transparent' ? 'bg-white/10 border-white/20 text-white' : 'bg-brand-50 text-brand-700 border-brand-100'}`}>
                Session started • {new Date(session.createdAt).toLocaleDateString()}
              </span>
            </div>

            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className={`text-xs mb-1 ml-1 ${currentStyles.textSec}`}>{msg.senderName}</span>
                    
                    <div className={`p-3 rounded-2xl shadow-sm ${
                      isMe 
                        ? currentStyles.messageSent + ' rounded-tr-none' 
                        : currentStyles.messageReceived + ' rounded-tl-none'
                    }`}>
                      {/* Text Content */}
                      {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                      {/* File Content */}
                      {msg.type === 'file' && msg.fileData && (
                        <div className={`mt-2 ${isMe ? '' : 'pt-2'}`}>
                          {renderFilePreview(msg.fileData)}
                          
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-black/20' : (currentTheme === 'light' ? 'bg-slate-100' : 'bg-black/20')}`}>
                            <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : (currentTheme === 'light' ? 'bg-white' : 'bg-white/10')}`}>
                              <Icons.File className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : currentStyles.text}`}>
                                {msg.fileData.name}
                              </p>
                              <p className={`text-xs opacity-70`}>
                                {(msg.fileData.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <a 
                              href={msg.fileData.dataUrl} 
                              download={msg.fileData.name}
                              className={`p-2 rounded-full hover:bg-black/10 transition-colors`}
                              title="Download"
                            >
                               <Icons.Upload className="w-5 h-5 rotate-180" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 ${currentStyles.textSec}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t ${currentStyles.inputArea}`}>
             <div className="max-w-4xl mx-auto flex items-end gap-2">
               <input 
                 type="file" 
                 ref={fileInputRef}
                 className="hidden" 
                 onChange={handleFileUpload}
               />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className={`p-3 rounded-xl transition-colors ${currentTheme === 'light' ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/10'}`}
                 title="Upload File"
                 disabled={isUploading}
               >
                 <Icons.Upload className="w-6 h-6" />
               </button>

               <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                 <input
                   type="text"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   placeholder="Type a message... (/date, /myip, /mydevice)"
                   className={`flex-1 px-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${currentStyles.input}`}
                 />
                 <button 
                   type="submit"
                   disabled={!inputText.trim() && !isUploading}
                   className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                 >
                   <Icons.Send className="w-5 h-5" />
                 </button>
               </form>
             </div>
          </div>
        </main>

        {/* User Sidebar */}
        <aside className={`
          fixed inset-y-0 right-0 z-20 w-80 border-l transform transition-all duration-300 ease-in-out
          md:relative md:translate-x-0
          ${showUsers ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}
          ${currentStyles.sidebar}
        `}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`font-semibold ${currentStyles.text}`}>Participants ({session.users.length})</h2>
              <button onClick={() => setShowUsers(false)} className={`md:hidden ${currentStyles.textSec}`}>
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {session.users.map(user => (
                <div key={user.id} className={`flex items-center justify-between group p-3 rounded-lg transition-colors ${currentTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${currentTheme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white'}`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium flex items-center gap-1 ${currentStyles.text}`}>
                        {user.name}
                        {user.role === UserRole.HOST && (
                          <span className="text-[10px] bg-brand-500/20 text-brand-600 px-1.5 py-0.5 rounded">HOST</span>
                        )}
                      </span>
                      <span className={`text-xs ${currentStyles.textSec} flex items-center gap-1`}>
                        {user.deviceInfo}
                      </span>
                      {isHost && (
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                           IP: {user.ip}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isHost && user.id !== currentUser.id && (
                    <button 
                      onClick={() => handleKick(user.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Kick user"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className={`mt-auto pt-6 border-t ${currentTheme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className={`p-3 rounded-lg ${currentTheme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${currentStyles.textSec}`}>Session Info</h4>
                <div className={`space-y-3 text-sm ${currentStyles.text}`}>
                   <div className="flex justify-between">
                     <span className={currentStyles.textSec}>Max Users</span>
                     <span>{session.config.maxUsers}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className={currentStyles.textSec}>Security</span>
                     <span className="flex items-center gap-1">
                       {session.config.enable2FA ? (
                         <><Icons.Shield className="w-3 h-3 text-green-500"/> Enabled</>
                       ) : 'Standard'}
                     </span>
                   </div>
                   <div className="flex justify-between">
                      <span className={currentStyles.textSec}>Room ID</span>
                      <span className="font-mono text-xs">{session.id}</span>
                   </div>
                   
                   {isHost && session.config.enable2FA && (
                     <div className="pt-2 border-t border-slate-200/20">
                       <div className="flex justify-between items-center mb-1">
                         <span className={currentStyles.textSec}>2FA PIN</span>
                         <button onClick={copyPin} className="text-brand-500 hover:text-brand-400">
                           <Icons.Copy className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="flex items-center justify-between bg-black/5 rounded p-2">
                          <span className="font-mono tracking-widest">
                            {showPin ? session.config.pin : '••••••••'}
                          </span>
                          <button onClick={() => setShowPin(!showPin)} className={currentStyles.textSec}>
                             <Icons.Eye className="w-4 h-4" />
                          </button>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Overlay for mobile sidebar */}
        {showUsers && (
          <div 
            className="fixed inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm"
            onClick={() => setShowUsers(false)}
          />
        )}
      </div>
    </div>
  );
};