import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import {
  MessageSquare, Plus, Search, FileText, Image, Lock, Send, Smile, Paperclip,
  Edit2, Trash2, Reply, Forward, Check, CheckCheck, Play, CheckCircle2, Clock,
  User, Users, Bell, File, Download, Info, X, AlertCircle, Calendar, FolderOpen,
  AlertTriangle, ShieldAlert
} from 'lucide-react';

const COMMON_EMOJIS = ['😀', '😂', '👍', '🔥', '👏', '🎉', '💡', '✅', '❌', '⚠️', '👀', '❤️', '🚀'];

export default function CommunicationHub() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Lists & State
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  // UI Tabs & Toggles
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'files' | 'tasks'
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [userStatus, setUserStatus] = useState('Online');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearch, setMessageSearch] = useState('');

  // Input states
  const [messageText, setMessageText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Modals & Forms
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState({ name: '', description: '', type: 'group', members: [] });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', assignedTo: '' });
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // File Center & Task Manager state
  const [sharedFiles, setSharedFiles] = useState([]);
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [allTasks, setAllTasks] = useState([]);

  // Fetch initial data
  const socketUrl = window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin;

  const markChannelAsRead = async (channelId) => {
    try {
      const res = await api.markAsRead(channelId);
      window.dispatchEvent(new CustomEvent('unreadCountUpdated', { detail: res }));
    } catch (e) {
      console.error('Error marking channel as read:', e);
    }
  };

  useEffect(() => {
    if (activeChannel) {
      localStorage.setItem('tee_active_channel_id', activeChannel.id);
      markChannelAsRead(activeChannel.id);
    }
    return () => {
      localStorage.removeItem('tee_active_channel_id');
    };
  }, [activeChannel]);

  useEffect(() => {
    loadChannels();
    loadUsers();
    loadFileCenter();
    
    // Connect socket
    const socket = io(socketUrl);
    socketRef.current = socket;
    socket.emit('register', user.id);

    // Listeners
    socket.on('userStatusChanged', ({ userId, status, lastSeen }) => {
      setChatUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status, lastSeen } : u))
      );
    });

    socket.on('channelCreated', (newChan) => {
      setChannels((prev) => [...prev, newChan]);
    });

    socket.on('newMessage', (msg) => {
      if (activeChannel && (msg.channelId === activeChannel.id || isDMMatch(msg.channelId, activeChannel.id))) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
        markChannelAsRead(activeChannel.id);
      }
      // Re-trigger file center/tasks updates
      loadFileCenter();
    });

    socket.on('messageUpdated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    });

    socket.on('messageDeleted', (deletedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === deletedMsg.id ? deletedMsg : m))
      );
    });

    socket.on('typingStatus', ({ channelId, userId, userName, isTyping: userIsTyping }) => {
      if (activeChannel && (channelId === activeChannel.id || isDMMatch(channelId, activeChannel.id))) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (userIsTyping) {
            next[userId] = userName;
          } else {
            delete next[userId];
          }
          return next;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeChannel]);

  // Auto-navigate to correct conversation from custom notification clicks
  useEffect(() => {
    const handleGotoChannel = (e) => {
      const targetId = e.detail?.channelId || localStorage.getItem('tee_goto_channel_id');
      if (!targetId) return;

      const isDM = targetId.includes('-');
      if (isDM) {
        if (chatUsers.length > 0) {
          const parts = targetId.split('-');
          const otherUserId = parts.find(id => id !== user.id);
          const otherUser = chatUsers.find(u => u.id === otherUserId);
          if (otherUser) {
            selectUserDM(otherUser);
            localStorage.removeItem('tee_goto_channel_id');
          }
        }
      } else {
        if (channels.length > 0) {
          const channel = channels.find(c => c.id === targetId);
          if (channel) {
            selectChannel(channel);
            localStorage.removeItem('tee_goto_channel_id');
          }
        }
      }
    };

    window.addEventListener('tee_goto_channel', handleGotoChannel);

    if (channels.length > 0 && chatUsers.length > 0) {
      handleGotoChannel({ detail: {} });
    }

    return () => {
      window.removeEventListener('tee_goto_channel', handleGotoChannel);
    };
  }, [channels, chatUsers, user.id]);

  // Handle auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const isDMMatch = (id1, id2) => {
    if (!id1 || !id2) return false;
    const parts1 = id1.split('-').sort().join('-');
    const parts2 = id2.split('-').sort().join('-');
    return parts1 === parts2;
  };

  const loadChannels = async () => {
    try {
      const chans = await api.getChannels();
      setChannels(chans);
      const targetChannelId = localStorage.getItem('tee_goto_channel_id');
      if (chans.length > 0 && !activeChannel && !targetChannelId) {
        // Set TEE Official Group as default active
        const official = chans.find((c) => c.id === 'tee_official') || chans[0];
        setActiveChannel(official);
        loadMessages(official.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.getChatUsers();
      setChatUsers(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (channelId) => {
    try {
      const history = await api.getMessages(channelId);
      setMessages(history);
      setTypingUsers({});
      if (socketRef.current) {
        socketRef.current.emit('joinRoom', channelId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFileCenter = async () => {
    try {
      const files = await api.getChatFiles();
      setSharedFiles(files);
    } catch (e) {
      console.error(e);
    }
  };

  // Switch Active Channel or User DM
  const selectChannel = (chan) => {
    setActiveChannel(chan);
    setActiveTab('chat');
    loadMessages(chan.id);
  };

  const selectUserDM = (otherUser) => {
    // Generate a consistent channel ID sorted alphabetically
    const dmId = [user.id, otherUser.id].sort().join('-');
    const dmChan = {
      id: dmId,
      name: otherUser.name,
      type: 'direct',
      description: `Private chat with ${otherUser.name} (@${otherUser.username})`,
      otherUser
    };
    setActiveChannel(dmChan);
    setActiveTab('chat');
    loadMessages(dmId);
  };

  // Change local status
  const handleStatusChange = (status) => {
    setUserStatus(status);
    if (socketRef.current) {
      socketRef.current.emit('changeStatus', { userId: user.id, status });
    }
  };

  // Handle typing status broadcast
  const handleMessageChange = (e) => {
    setMessageText(e.target.value);
    
    if (!isTyping && socketRef.current && activeChannel) {
      setIsTyping(true);
      socketRef.current.emit('typing', {
        channelId: activeChannel.id,
        userId: user.id,
        userName: user.name,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current && activeChannel) {
        socketRef.current.emit('typing', {
          channelId: activeChannel.id,
          userId: user.id,
          userName: user.name,
          isTyping: false
        });
      }
    }, 1500);
  };

  // File Upload Helper (converts file to base64 string)
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type, data: reader.result }
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (idx) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Send Message Submission
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && selectedAttachments.length === 0 && !showTaskForm) return;

    try {
      const payload = {
        channelId: activeChannel.id,
        content: messageText,
        attachments: selectedAttachments,
        replyTo: replyingTo ? replyingTo.id : ''
      };

      if (showTaskForm && taskForm.title) {
        const assignedUser = chatUsers.find((u) => u.id === taskForm.assignedTo);
        payload.task = {
          title: taskForm.title,
          assignedTo: taskForm.assignedTo,
          assignedToName: assignedUser ? assignedUser.name : ''
        };
      }

      await api.sendMessage(payload);
      
      // Reset input fields
      setMessageText('');
      setSelectedAttachments([]);
      setReplyingTo(null);
      setShowTaskForm(false);
      setTaskForm({ title: '', assignedTo: '' });
      setEmojiPickerOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to send message');
    }
  };

  // Delete message (Soft delete)
  const handleDeleteMessage = async (msgId) => {
    if (confirm('Delete this message?')) {
      try {
        await api.deleteMessage(msgId);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Edit message
  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.editMessage(editingMessageId, editContent);
      setEditingMessageId(null);
      setEditContent('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Task Status
  const handleTaskStatusUpdate = async (msgId, newStatus) => {
    try {
      await api.updateTaskStatus(msgId, newStatus);
    } catch (err) {
      alert(err.message);
    }
  };

  // Custom channel creation
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelForm.name.trim()) return;
    try {
      await api.createChannel(newChannelForm);
      setShowCreateChannelModal(false);
      setNewChannelForm({ name: '', description: '', type: 'group', members: [] });
    } catch (err) {
      alert(err.message);
    }
  };

  // Render colored avatar badge initials
  const renderAvatar = (name, avatar, className = "w-8 h-8 rounded-lg") => {
    if (avatar) {
      return (
        <img 
          src={avatar} 
          alt={name} 
          className={`${className} object-cover shadow-sm`} 
        />
      );
    }
    const char = name ? name.charAt(0).toUpperCase() : '?';
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-rose-500 to-red-650 text-rose-50',
      'from-blue-650 to-indigo-700 text-blue-50',
      'from-amber-500 to-orange-650 text-amber-50',
      'from-emerald-500 to-teal-650 text-emerald-50',
      'from-purple-600 to-violet-750 text-purple-50'
    ];
    const grad = gradients[Math.abs(hash) % gradients.length];
    return (
      <div className={`${className} bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-black shadow-sm`}>
        {char}
      </div>
    );
  };

  const getAvatarForSender = (senderId) => {
    if (senderId === user.id) return user.avatar;
    const u = chatUsers.find(x => x.id === senderId);
    return u ? u.avatar : '';
  };

  // Message filters based on message query
  const filteredMessages = messages.filter((m) => {
    if (m.deleted) return true; // Show deleted place-holders
    return m.content.toLowerCase().includes(messageSearch.toLowerCase()) || 
           m.senderName.toLowerCase().includes(messageSearch.toLowerCase());
  });

  // Files in active channel
  const activeChannelFiles = sharedFiles.filter((f) => {
    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'image' && !f.fileType.startsWith('image/')) return false;
      if (fileTypeFilter === 'pdf' && !f.fileType.includes('pdf')) return false;
      if (fileTypeFilter === 'doc' && (f.fileType.startsWith('image/') || f.fileType.includes('pdf'))) return false;
    }
    return f.channelId === activeChannel?.id || isDMMatch(f.channelId, activeChannel?.id);
  });

  // All Tasks in channel
  const activeChannelTasks = messages.filter((m) => m.task);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin';

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-130px)] lg:h-[calc(100vh-80px)] overflow-hidden bg-slate-950/20 border border-slate-900 rounded-3xl relative text-slate-100 font-sans">
      
      {/* 1. Left Sidebar: Channels & Users */}
      <aside className="w-full lg:w-64 bg-slate-950/45 border-r border-slate-900 flex flex-col h-full flex-shrink-0">
        
        {/* Profile State Card */}
        <div className="p-4 border-b border-slate-900/60 bg-slate-950/20">
          <div className="flex items-center gap-3">
            {renderAvatar(user.name, user.avatar)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${userStatus === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <select
                  value={userStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold text-slate-400 focus:outline-none p-0 cursor-pointer"
                >
                  <option value="Online" className="bg-slate-900 text-slate-200">Online</option>
                  <option value="Away" className="bg-slate-900 text-slate-200">Away</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
          
          {/* Main channels section */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-2.5 mb-1.5">
              <span>Channels</span>
              <button
                onClick={() => setShowCreateChannelModal(true)}
                className="hover:text-red-400 p-0.5"
                title="Create Group"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-0.5">
              {channels.map((chan) => {
                const isSelected = activeChannel && activeChannel.id === chan.id;
                const isAnnounce = chan.id === 'announcements' || chan.type === 'announcement';
                
                return (
                  <button
                    key={chan.id}
                    onClick={() => selectChannel(chan)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                      isSelected
                        ? 'bg-red-650/15 border border-red-500/20 text-red-400 shadow-inner'
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isAnnounce ? (
                        <Lock size={12} className="text-red-400/80 flex-shrink-0" />
                      ) : (
                        <span className="text-slate-500 flex-shrink-0 font-bold">#</span>
                      )}
                      <span className="truncate">{chan.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Private Messages Section */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-2.5 mb-1.5">
              <span>Direct Messages</span>
            </div>
            <div className="space-y-0.5">
              {chatUsers
                .filter((u) => u.id !== user.id)
                .map((u) => {
                  const dmId = [user.id, u.id].sort().join('-');
                  const isSelected = activeChannel && activeChannel.id === dmId;
                  const isOnline = u.status === 'Online';
                  const isAway = u.status === 'Away';

                  return (
                    <button
                      key={u.id}
                      onClick={() => selectUserDM(u)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                        isSelected
                          ? 'bg-red-650/15 border border-red-500/20 text-red-400'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="relative">
                          {renderAvatar(u.name, u.avatar)}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                            isOnline ? 'bg-emerald-500' : isAway ? 'bg-amber-500' : 'bg-slate-650'
                          }`} />
                        </div>
                        <div className="truncate">
                          <p className="truncate leading-none font-semibold text-slate-200">{u.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">@{u.username}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Shared utilities */}
          <div className="pt-2 border-t border-slate-900/60">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-2.5 mb-1.5">
              <span>Workspace Files & Tasks</span>
            </div>
            <button
              onClick={() => { setActiveTab('files'); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                activeTab === 'files'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <FolderOpen size={13} />
              <span>Channel File Center</span>
            </button>
            <button
              onClick={() => { setActiveTab('tasks'); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                activeTab === 'tasks'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <FileText size={13} />
              <span>Channel Tasks Log</span>
            </button>
          </div>

        </div>

      </aside>

      {/* 2. Center Pane: Main Workspace (Chat view, File Center, or Tasks Log) */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/15 overflow-hidden">
        
        {/* Header toolbar */}
        <header className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/30 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {activeChannel?.type === 'direct' ? `👤 ${activeChannel.name}` : `# ${activeChannel?.name || 'Group Chat'}`}
              </h2>
              {activeChannel?.id === 'announcements' && (
                <span className="text-[9px] font-bold bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded uppercase">
                  Admin-Only Posting
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{activeChannel?.description}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search messages input */}
            {activeTab === 'chat' && (
              <div className="relative hidden sm:block">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search channel..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-40 xl:w-48 pl-8 pr-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-[10px] font-medium text-slate-200 focus:outline-none focus:border-red-500/60 focus:w-56 transition-all placeholder-slate-500"
                />
                {messageSearch && (
                  <button onClick={() => setMessageSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350">
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg"
              title="Channel Details"
            >
              <Info size={16} />
            </button>
          </div>
        </header>

        {/* Tab content area */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950/10">
          
          {/* TAB A: CHAT INTERFACE */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Message List Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <MessageSquare size={36} className="text-slate-700 mb-3" />
                    <h3 className="text-xs font-bold text-slate-400">Welcome to #{activeChannel?.name}!</h3>
                    <p className="text-[10px] text-slate-500 mt-1">This is the start of conversations in this channel.</p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isOwn = msg.senderId === user.id;
                    const isMsgEditing = editingMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 items-start group relative p-2.5 rounded-xl transition-all ${
                          msg.urgent ? 'bg-red-950/10 border border-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.05)]' : 'hover:bg-slate-900/20'
                        }`}
                      >
                        {renderAvatar(msg.senderName, getAvatarForSender(msg.senderId))}

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-200">{msg.senderName}</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              msg.senderRole === 'ADMIN' || msg.senderRole === 'admin'
                                ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {msg.senderRole}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.edited && <span className="text-[8px] text-slate-600 font-bold italic">(edited)</span>}
                          </div>

                          {/* Reply Context */}
                          {msg.replyTo && (
                            <div className="p-1.5 mb-1 bg-slate-900/40 border-l-2 border-red-500/40 text-[10px] text-slate-450 italic rounded-r truncate max-w-md">
                              Replied to: {messages.find((m) => m.id === msg.replyTo)?.content || 'Message unavailable'}
                            </div>
                          )}

                          {/* Message Content / Edit Mode */}
                          {isMsgEditing ? (
                            <div className="space-y-1.5 mt-1">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-500"
                              />
                              <div className="flex items-center gap-1.5">
                                <button onClick={handleSaveEdit} className="text-[9px] font-bold text-emerald-500 hover:underline">Save</button>
                                <button onClick={() => setEditingMessageId(null)} className="text-[9px] font-bold text-slate-500 hover:underline">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-xs leading-relaxed ${msg.deleted ? 'text-slate-650 italic' : 'text-slate-350'}`}>
                              {msg.content}
                            </p>
                          )}

                          {/* Task Card Integration */}
                          {msg.task && (
                            <div className="mt-2.5 p-3 rounded-xl border border-slate-850 bg-slate-900/30 max-w-sm">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-red-500 bg-red-950/20 px-1.5 py-0.2 rounded border border-red-500/10">Task Tracker</span>
                                  <h4 className="text-xs font-bold text-slate-200 mt-1">{msg.task.title}</h4>
                                  <p className="text-[9px] text-slate-500 mt-0.5">Assigned to: <span className="font-bold text-slate-400">{msg.task.assignedToName || 'Unassigned'}</span></p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  msg.task.status === 'Completed'
                                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                                    : msg.task.status === 'In Progress'
                                      ? 'bg-blue-950/30 text-blue-400 border-blue-500/20'
                                      : 'bg-amber-950/30 text-amber-400 border-amber-500/20'
                                }`}>
                                  {msg.task.status}
                                </span>
                              </div>

                              {/* Task Actions */}
                              {(msg.task.assignedTo === user.id || isAdmin) && msg.task.status !== 'Completed' && (
                                <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center gap-1.5">
                                  <span className="text-[9px] font-semibold text-slate-500">Update Status:</span>
                                  {msg.task.status === 'Pending' && (
                                    <button
                                      onClick={() => handleTaskStatusUpdate(msg.id, 'In Progress')}
                                      className="text-[9px] font-bold bg-blue-650 hover:bg-blue-700 px-2 py-0.5 rounded text-white"
                                    >
                                      Start Progress
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleTaskStatusUpdate(msg.id, 'Completed')}
                                    className="text-[9px] font-bold bg-emerald-650 hover:bg-emerald-700 px-2 py-0.5 rounded text-white"
                                  >
                                    Mark Completed
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Attachments List */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              {msg.attachments.map((att, i) => {
                                const isImg = att.type.startsWith('image/');
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    {isImg ? (
                                      <div className="relative rounded-lg overflow-hidden border border-slate-900 max-w-[200px] max-h-[140px]">
                                        <img src={att.data} alt={att.name} className="object-cover w-full h-full" />
                                        <a
                                          href={att.data}
                                          download={att.name}
                                          className="absolute bottom-1 right-1 p-1 bg-slate-900/80 rounded hover:bg-slate-950 text-slate-300"
                                          title="Download Image"
                                        >
                                          <Download size={10} />
                                        </a>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-900 bg-slate-900/30 text-[10px] text-slate-350">
                                        <File size={12} className="text-red-400" />
                                        <span className="truncate max-w-[150px]">{att.name}</span>
                                        <a href={att.data} download={att.name} className="text-slate-400 hover:text-slate-200">
                                          <Download size={12} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>

                        {/* Interactive Message Actions overlay */}
                        {!msg.deleted && (
                          <div className="absolute right-3 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 border border-slate-900 px-1 py-0.5 rounded-lg flex items-center gap-1 shadow-lg">
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-100 rounded"
                              title="Reply"
                            >
                              <Reply size={11} />
                            </button>
                            {isOwn && (
                              <button
                                onClick={() => startEditing(msg)}
                                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-100 rounded"
                                title="Edit"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                            {(isOwn || isAdmin) && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 hover:bg-slate-900 text-slate-450 hover:text-red-400 rounded"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                
                {/* Typing status bar */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="text-[10px] text-slate-550 italic px-2 py-1 bg-slate-900/20 rounded-lg max-w-sm flex items-center gap-1">
                    <Clock size={10} className="animate-spin text-red-500/70" />
                    <span>{Object.values(typingUsers).join(', ')} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Replying indicator panel */}
              {replyingTo && (
                <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/45 flex items-center justify-between text-[10px] text-slate-450">
                  <span className="truncate">Replying to: <strong>{replyingTo.senderName}</strong>: {replyingTo.content}</span>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-slate-350">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* File selection lists preview */}
              {selectedAttachments.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/40 flex flex-wrap gap-2">
                  {selectedAttachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300">
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-650">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input controls */}
              <div className="p-4 border-t border-slate-900 bg-slate-950/30 flex-shrink-0">
                {activeChannel?.id === 'announcements' && !isAdmin ? (
                  <div className="w-full p-3 bg-red-950/15 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                    <ShieldAlert size={14} />
                    Only administrators are permitted to post announcements.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    {/* Optional Task input form builder */}
                    {showTaskForm && (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 max-w-md">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Create Task Assignment</span>
                          <button onClick={() => setShowTaskForm(false)} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Task Title..."
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none"
                        />
                        <select
                          required
                          value={taskForm.assignedTo}
                          onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="">Assign To...</option>
                          {chatUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Chat Text Input field */}
                    <div className="relative flex items-center bg-slate-900/60 border border-slate-800 rounded-xl focus-within:border-red-500/60 focus-within:ring-1 focus-within:ring-red-500/30 transition-all p-1.5">
                      
                      {/* Attachment trigger */}
                      <label className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer">
                        <Paperclip size={15} />
                        <input
                          type="file"
                          multiple
                          onChange={handleFileAttachment}
                          className="hidden"
                        />
                      </label>

                      {/* Emoji panel toggle */}
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
                      >
                        <Smile size={15} />
                      </button>

                      <input
                        type="text"
                        placeholder={showTaskForm ? "Enter notes to attach to task..." : `Message ${activeChannel?.name || 'Group'}...`}
                        value={messageText}
                        onChange={handleMessageChange}
                        className="flex-1 bg-transparent border-none text-xs text-slate-200 px-3 py-1.5 focus:outline-none placeholder-slate-500"
                      />

                      {/* Task panel toggler */}
                      {!showTaskForm && (
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(true)}
                          className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-lg mr-1"
                        >
                          Assign Task
                        </button>
                      )}

                      <button
                        type="submit"
                        className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all shadow-md active:scale-95 flex-shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>

                    {/* Quick Emoji selection list overlay */}
                    {emojiPickerOpen && (
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex gap-1.5 flex-wrap w-fit max-w-[280px] shadow-2xl">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setMessageText((t) => t + emoji);
                              setEmojiPickerOpen(false);
                            }}
                            className="text-sm p-1.5 hover:bg-slate-800 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB B: CHANNEL FILE CENTER */}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <FolderOpen size={16} className="text-red-400" /> Shared Files Repository
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="px-3 py-1 bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-400 rounded-lg focus:outline-none"
                  >
                    <option value="all">All File Types</option>
                    <option value="image">Images</option>
                    <option value="pdf">PDFs</option>
                    <option value="doc">Documents</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {activeChannelFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <FolderOpen size={30} className="text-slate-800 mb-2" />
                    <p className="text-xs font-semibold">No files shared in this channel.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeChannelFiles.map((file, i) => {
                      const isImg = file.fileType.startsWith('image/');
                      return (
                        <div key={i} className="p-3.5 rounded-2xl border border-slate-900 bg-slate-950/20 hover:border-slate-800 transition-all flex flex-col justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800 shrink-0">
                              {isImg ? <Image size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-200 truncate">{file.fileName}</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">Shared by {file.senderName}</p>
                              <p className="text-[8px] text-slate-650 mt-0.5">{new Date(file.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end border-t border-slate-900/60 pt-3">
                            <a
                              href={file.fileData}
                              download={file.fileName}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-slate-100 rounded-lg transition-colors"
                            >
                              <Download size={11} /> Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB C: TASKS LOGS */}
          {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-red-400" /> Channel Tasks Ledger
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {activeChannelTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <FileText size={30} className="text-slate-800 mb-2" />
                    <p className="text-xs font-semibold">No tasks assigned in this channel yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeChannelTasks.map((msg) => (
                      <div key={msg.id} className="p-4 rounded-2xl border border-slate-900 bg-slate-950/20 hover:border-slate-850 transition-all">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{msg.task.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">Assigned to: <strong className="text-slate-400">{msg.task.assignedToName}</strong></p>
                            <p className="text-[9px] text-slate-550 mt-0.5">Created by {msg.senderName} on {new Date(msg.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${
                              msg.task.status === 'Completed'
                                ? 'bg-emerald-950/30 text-emerald-450 border-emerald-500/20'
                                : msg.task.status === 'In Progress'
                                  ? 'bg-blue-950/30 text-blue-400 border-blue-500/20'
                                  : 'bg-amber-950/30 text-amber-400 border-amber-500/20'
                            }`}>
                              {msg.task.status}
                            </span>
                          </div>
                        </div>

                        {/* Task Progress Log */}
                        {msg.task.history && msg.task.history.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-900/60">
                            <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2">History logs</h5>
                            <div className="space-y-2">
                              {msg.task.history.map((hist, k) => (
                                <div key={k} className="flex gap-2 text-[9px] font-medium text-slate-400 leading-normal">
                                  <Clock size={11} className="text-slate-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span>Task marked as <strong className="text-slate-300">{hist.status}</strong> by {hist.updatedBy}</span>
                                    <span className="text-slate-600 ml-1.5">({new Date(hist.time).toLocaleString()})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* 3. Right Panel: Active Details Drawer */}
      {rightPanelOpen && (
        <aside className="w-full lg:w-60 bg-slate-950/45 border-l border-slate-900 flex flex-col h-full flex-shrink-0 animate-slide-in">
          
          <div className="p-4 border-b border-slate-900 bg-slate-950/20 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Workspace</h3>
            <button onClick={() => setRightPanelOpen(false)} className="text-slate-500 hover:text-slate-350 lg:hidden">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            
            {/* Channel Details */}
            <div className="space-y-1.5 text-xs text-slate-350">
              <h4 className="font-bold text-slate-200">Channel Description</h4>
              <p className="text-[11px] leading-relaxed text-slate-400">{activeChannel?.description || 'No description set.'}</p>
              <div className="pt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                <Calendar size={11} />
                <span>Created {activeChannel?.createdAt ? new Date(activeChannel.createdAt).toLocaleDateString() : 'system-wide'}</span>
              </div>
            </div>

            {/* Pinned Announcements */}
            <div className="space-y-2 border-t border-slate-900/60 pt-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Important Warnings</h4>
              {messages.filter((m) => m.urgent).length === 0 ? (
                <p className="text-[10px] italic text-slate-550">No urgent notices posted.</p>
              ) : (
                <div className="space-y-2">
                  {messages
                    .filter((m) => m.urgent)
                    .slice(0, 3)
                    .map((m) => (
                      <div key={m.id} className="p-2 bg-red-950/15 border border-red-500/20 rounded-lg text-[10px] leading-relaxed text-red-400">
                        <strong>@{m.senderName}:</strong> {m.content}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div className="space-y-2 border-t border-slate-900/60 pt-4">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold uppercase tracking-wide">Channel Members</span>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-2 py-0.2 rounded">
                  {activeChannel?.type === 'direct' ? '2' : chatUsers.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {activeChannel?.type === 'direct' ? (
                  <>
                    <div className="flex items-center gap-2">
                      {renderAvatar(user.name, user.avatar)}
                      <span className="text-[11px] font-semibold text-slate-350">{user.name} (You)</span>
                    </div>
                    {activeChannel.otherUser && (
                      <div className="flex items-center gap-2">
                        {renderAvatar(activeChannel.otherUser.name, activeChannel.otherUser.avatar)}
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-slate-350 truncate block">{activeChannel.otherUser.name}</span>
                          <span className="text-[8px] text-slate-550 block">Status: {activeChannel.otherUser.status}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  chatUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5">
                      {renderAvatar(u.name, u.avatar)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-350 truncate block">{u.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.status === 'Online' ? 'bg-emerald-500' : u.status === 'Away' ? 'bg-amber-500' : 'bg-slate-700'}`} />
                        </div>
                        <span className="text-[8px] text-slate-500 block leading-none">@{u.username}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </aside>
      )}

      {/* 4. MODAL: Create custom chat group */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1E293B] rounded-3xl shadow-2xl border border-[#334155] max-w-md w-full overflow-hidden transform scale-100 transition-all p-6 text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-200">Create Custom Chat Channel</h3>
              <button onClick={() => setShowCreateChannelModal(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleCreateChannel} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-400">Channel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. general-discussions"
                  value={newChannelForm.name}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                  className="w-full h-[40px] px-3 bg-slate-900 border border-slate-850 rounded-xl focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Description</label>
                <textarea
                  placeholder="Channel purpose details..."
                  value={newChannelForm.description}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl focus:outline-none focus:border-red-500 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-750"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
