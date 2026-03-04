import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabaseClient';
import NoteInput from './NoteInput';
import NoteGrid from './NoteGrid';

const SettingsModal = lazy(() => import('./SettingsModal'));
const NotesFeed = lazy(() => import('./NotesFeed'));
const ProfilePreview = lazy(() => import('./ProfilePreview'));
import {
    LogOut,
    Search,
    Bell,
    Settings,
    FileText,
    Archive,
    Trash2,
    Menu,
    X,
    Sparkles,
    Zap,
    Rss,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
    { id: 'notes', label: 'Notes', icon: <FileText size={20} /> },
    { id: 'feed', label: 'Notes Feed', icon: <Rss size={20} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
    { id: 'archive', label: 'Archive', icon: <Archive size={20} /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 size={20} /> },
];

const DesktopSidebar = ({ isOpen, activeTab, setActiveTab }) => {
    return (
        <motion.aside
            initial={false}
            animate={{ width: isOpen ? 280 : 80 }}
            className="fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 pt-24 z-20 flex flex-col hidden lg:flex"
        >
            <div className="flex-1 px-3 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === item.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'
                            }`}
                    >
                        <div className="shrink-0">{item.icon}</div>
                        {isOpen && <span className="font-bold tracking-tight">{item.label}</span>}
                    </button>
                ))}
            </div>

        </motion.aside>
    );
};

const MobileSidebar = ({ isOpen, onClose, activeTab, setActiveTab, onSignOut }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    />
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 h-full w-4/5 max-w-[320px] bg-white dark:bg-gray-900 z-50 p-6 flex flex-col lg:hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <span className="text-white font-black italic">J</span>
                                </div>
                                <span className="text-lg font-black dark:text-white text-gray-900">Jotdown!</span>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${activeTab === item.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="font-bold">{item.label}</span>
                                </button>
                            ))}

                        </div>

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    onSignOut();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold"
                            >
                                <LogOut size={20} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

const BottomNav = ({ activeTab, setActiveTab, onSearchClick }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between z-30 lg:hidden rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <button
                onClick={() => setActiveTab('notes')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'notes' ? 'text-primary' : 'text-gray-400'}`}
                aria-label="Notes Tab"
                aria-current={activeTab === 'notes' ? 'page' : undefined}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'notes' ? 'bg-primary/10' : ''}`}>
                    <FileText size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
            </button>
            <button
                onClick={() => setActiveTab('reminders')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'reminders' ? 'text-primary' : 'text-gray-400'}`}
                aria-label="Reminders Tab"
                aria-current={activeTab === 'reminders' ? 'page' : undefined}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'reminders' ? 'bg-primary/10' : ''}`}>
                    <Bell size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Reminders</span>
            </button>

            {/* Search Button in Center */}
            <button
                onClick={onSearchClick}
                className="flex flex-col items-center gap-1 -mt-8 translate-y-[-4px]"
                aria-label="Global Search"
            >
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-white dark:border-gray-900 text-white transition-transform hover:scale-110 active:scale-95">
                    <Search size={24} strokeWidth={2.5} />
                </div>
            </button>

            <button
                onClick={() => setActiveTab('feed')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'feed' ? 'text-primary' : 'text-gray-400'}`}
                aria-label="Community Feed Tab"
                aria-current={activeTab === 'feed' ? 'page' : undefined}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'feed' ? 'bg-primary/10' : ''}`}>
                    <Rss size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Feed</span>
            </button>
            <button
                onClick={() => setActiveTab('archive')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'archive' ? 'text-primary' : 'text-gray-400'}`}
                aria-label="Archive Tab"
                aria-current={activeTab === 'archive' ? 'page' : undefined}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'archive' ? 'bg-primary/10' : ''}`}>
                    <Archive size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Archive</span>
            </button>
            <button
                onClick={() => setActiveTab('trash')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'trash' ? 'text-primary' : 'text-gray-400'}`}
                aria-label="Trash Tab"
                aria-current={activeTab === 'trash' ? 'page' : undefined}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'trash' ? 'bg-primary/10' : ''}`}>
                    <Trash2 size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">Trash</span>
            </button>
        </nav>
    );
};

const Dashboard = ({ user }) => {
    const [notes, setNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('notes');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
    const [feedCount, setFeedCount] = useState(0);
    const [profile, setProfile] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const fetchProfile = useCallback(async () => {
        // Load from cache first
        const cache = localStorage.getItem('jotdown_profile');
        if (cache) setProfile(JSON.parse(cache));

        if (!navigator.onLine) return;

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            setProfile(data);
            localStorage.setItem('jotdown_profile', JSON.stringify(data));
        }
    }, [user.id]);

    const fetchNotes = useCallback(async () => {
        // Load from cache first
        const cache = localStorage.getItem('jotdown_notes');
        if (cache) setNotes(JSON.parse(cache));

        if (!navigator.onLine) return;

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching notes:', error.message);
        else {
            setNotes(data);
            localStorage.setItem('jotdown_notes', JSON.stringify(data));
        }
    }, [user.id]);

    useEffect(() => {
        fetchNotes();
        fetchProfile();

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Presence Tracking
        const presenceChannel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                setOnlineUsers(Object.keys(newState));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        const channel = supabase
            .channel('notes_db_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                },
                (payload) => {
                    console.log('Realtime event received in Dashboard:', payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (payload.new && payload.new.user_id === user.id) {
                            if (payload.eventType === 'INSERT') {
                                setNotes((prev) => {
                                    // Prevent duplicates if callback already added it
                                    if (prev.some(n => n.id === payload.new.id)) return prev;
                                    return [payload.new, ...prev];
                                });
                            } else {
                                setNotes((prev) =>
                                    prev.map((n) => (n.id === payload.new.id ? payload.new : n))
                                );
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        if (payload.old && payload.old.id) {
                            setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            presenceChannel.unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user.id, fetchNotes, fetchProfile]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const handleOptimisticDelete = (noteId) => {
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
    };

    const handleNoteCreated = (newNote) => {
        console.log('Manual note creation callback triggered:', newNote);
        setNotes((prev) => {
            if (prev.some(n => n.id === newNote.id)) return prev;
            return [newNote, ...prev];
        });
    };

    const handleNoteUpdated = (updatedNote) => {
        console.log('Manual note update callback triggered:', updatedNote);
        setNotes((prev) =>
            prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
        );
    };

    const handleFeedsUpdate = (count) => {
        setFeedCount(count);
    };

    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            const title = note.title || "";
            const content = note.content || "";
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                content.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === 'reminders') {
                return note.reminder_at !== null && !note.is_archived && !note.is_trashed;
            }

            if (activeTab === 'archive') {
                return note.is_archived === true && !note.is_trashed;
            }

            if (activeTab === 'trash') {
                return note.is_trashed === true;
            }

            if (activeTab === 'notes') {
                return note.is_archived !== true && !note.is_trashed;
            }

            if (activeTab === 'feed') return false;

            return true;
        });
    }, [notes, searchQuery, activeTab]);

    // Reminder Notification Check
    const notesWithReminders = useMemo(() => notes.filter(n => n.reminder_at), [notes]);

    useEffect(() => {
        if (notesWithReminders.length === 0) return;

        const checkReminders = () => {
            const now = new Date();
            notesWithReminders.forEach(note => {
                const reminderTime = new Date(note.reminder_at);
                const isDue = reminderTime <= now;
                const isRecent = reminderTime > new Date(now.getTime() - 5 * 60000);
                const notificationKey = `${note.id}-${note.reminder_at}`;
                const alreadyNotified = window.notifiedNotes?.includes(notificationKey);

                if (isDue && isRecent && !alreadyNotified) {
                    window.notifiedNotes = [...(window.notifiedNotes || []), notificationKey];
                    setTimeout(() => {
                        alert(`⏰ REMINDER: ${note.title || 'Untitled Note'}\n\n${note.content.substring(0, 100)}...`);
                    }, 100);
                }
            });
        };

        const interval = setInterval(checkReminders, 10 * 1000);
        return () => clearInterval(interval);
    }, [notesWithReminders]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-gray-950 selection:bg-primary/20">
            <DesktopSidebar isOpen={isSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
            <MobileSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onSignOut={handleSignOut}
            />

            {/* Header */}
            <header className="fixed top-0 right-0 left-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-30 px-4 md:px-6 h-16 md:h-20 flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between w-full max-w-6xl">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700 lg:hidden"
                            aria-label="Open Menu"
                        >
                            <Menu size={22} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hidden lg:block"
                            aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-9 md:h-9 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden border border-gray-100 dark:border-gray-700">
                            <img src="/pwa-192x192.png" alt="Jotdown Logo" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                            Jot<span className="text-primary">down</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 justify-end">
                        <button
                            onClick={() => setIsSearchOverlayOpen(true)}
                            className="p-2 md:p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-primary shadow-sm md:shadow-none"
                            aria-label="Search Notes"
                        >
                            <Search size={20} />
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 md:p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-primary"
                            aria-label="Settings"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="p-2 md:p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors text-gray-400 hover:text-red-500 hidden sm:block"
                            aria-label="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                        <div className="relative cursor-pointer" onClick={() => setShowProfilePreview(true)}>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 border-2 border-white dark:border-gray-800 ring-2 ring-gray-50 dark:ring-gray-900 text-xs md:text-base">
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="User Avatar" className="w-full h-full object-cover" loading="lazy" />
                                    : <div className="w-full h-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center">{(profile?.display_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</div>
                                }
                            </div>
                            {/* Online Indicator */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm ${onlineUsers.includes(user.id) ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Offline Banner */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center fixed top-0 left-0 right-0 z-[110]"
                    >
                        Working Offline — Changes will sync when reconnected
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Overlay */}
            <AnimatePresence>
                {isSearchOverlayOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed inset-0 z-[60] bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl p-6 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Search</h3>
                            <button
                                onClick={() => setIsSearchOverlayOpen(false)}
                                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={24} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search your thoughts..."
                                className="w-full bg-gray-50 dark:bg-gray-800 border-4 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-[32px] py-6 pl-16 pr-8 outline-none transition-all text-xl font-bold text-gray-900 dark:text-white shadow-2xl shadow-primary/10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="mt-8 flex-1 overflow-y-auto">
                            <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Quick Results</p>
                            <div className="space-y-4">
                                {filteredNotes.slice(0, 5).map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => setIsSearchOverlayOpen(false)}
                                        className="p-6 bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{note.title || 'Untitled Note'}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{note.content}</div>
                                    </div>
                                ))}
                                {filteredNotes.length === 0 && searchQuery && (
                                    <div className="text-center py-20">
                                        <div className="text-4xl mb-4">🔍</div>
                                        <p className="text-gray-400 font-bold">No thoughts found matching "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSearchOverlayOpen(false)}
                            className="mt-6 py-5 bg-primary text-white font-black rounded-[24px] shadow-xl shadow-primary/30 transition-all active:scale-95"
                        >
                            Show All Results
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main
                className={`transition-all duration-300 pt-36 sm:pt-28 pb-32 px-4 md:px-6 ${isSidebarOpen ? 'lg:pl-80' : 'lg:pl-28'
                    }`}
            >
                <div className="max-w-6xl mx-auto">
                    {/* Welcome Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 md:mb-12 relative"
                    >
                        <div className="absolute -left-10 -top-10 md:-left-20 md:-top-20 w-32 md:w-64 h-32 md:h-64 bg-primary/10 rounded-full blur-[60px] md:blur-[100px] pointer-events-none -z-10" />
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="text-primary fill-primary" size={14} md={16} />
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Personal Dashboard</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-4 capitalize">
                            {activeTab === 'notes' ? `${getGreeting()}, ` :
                                activeTab === 'feed' ? `Feed, ` :
                                    `${activeTab}, `}
                            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{profile?.display_name || user.email?.split('@')[0] || 'Explorer'}</span>.
                        </h2>
                        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium">
                            {activeTab === 'notes'
                                ? `You have ${notes.filter(n => !n.is_archived && !n.is_trashed).length} active thoughts.`
                                : activeTab === 'feed'
                                    ? `You have ${feedCount} feed items.`
                                    : `You have ${filteredNotes.length} ${activeTab} items.`}
                        </p>
                    </motion.div>

                    {activeTab === 'feed' ? (
                        <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <NotesFeed user={user} profile={profile} onFeedsUpdate={handleFeedsUpdate} onlineUsers={onlineUsers} searchQuery={searchQuery} />
                        </Suspense>
                    ) : (
                        <>
                            <div className="mb-12 md:mb-16">
                                <NoteInput user={user} profile={profile} onNoteCreated={handleNoteCreated} />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                        {activeTab === 'notes' ? 'Recent Notes' : `${activeTab} Notes`} <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    </h3>
                                </div>
                                <NoteGrid notes={filteredNotes} user={user} onOptimisticDelete={handleOptimisticDelete} onNoteUpdated={handleNoteUpdated} />
                            </div>
                        </>
                    )}
                </div>
            </main>

            <BottomNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onSearchClick={() => setIsSearchOverlayOpen(true)}
            />

            <Suspense fallback={null}>
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    user={user}
                    profile={profile}
                    onProfileUpdate={setProfile}
                    notes={notes}
                    onNotesDeleted={fetchNotes}
                />
            </Suspense>

            <Suspense fallback={null}>
                <ProfilePreview
                    profile={profile}
                    isOpen={showProfilePreview}
                    onClose={() => setShowProfilePreview(false)}
                    isOnline={onlineUsers.includes(user.id)}
                />
            </Suspense>
        </div>
    );
};


export default Dashboard;
