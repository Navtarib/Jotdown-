import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
    X,
    Moon,
    Sun,
    Palette,
    Download,
    Trash2,
    Monitor,
    User,
    Settings,
    LogOut,
    Check,
    ChevronRight,
    Sparkles,
    Zap,
    Info,
    Image
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SettingsModal = ({ isOpen, onClose, user, profile, onProfileUpdate, notes, onNotesDeleted }) => {
    const [activeSubTab, setActiveSubTab] = useState('profile');
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
    const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || '#facc15');

    // Profile state
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const avatarInputRef = useRef(null);

    // Sync profile prop changes
    useEffect(() => {
        setDisplayName(profile?.display_name || '');
        setBio(profile?.bio || '');
        setAvatarPreview(profile?.avatar_url || null);
    }, [profile]);

    // Listen for PWA install prompt
    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
    }, []);

    const saveProfile = async () => {
        setProfileSaving(true);
        let avatar_url = profile?.avatar_url || null;

        if (avatarFile) {
            const ext = avatarFile.name.split('.').pop();
            const path = `avatars/${user.id}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('note-images')
                .upload(path, avatarFile, { cacheControl: '3600', upsert: true });
            if (upErr) {
                alert('Avatar upload failed: ' + upErr.message);
                setProfileSaving(false);
                return;
            }
            const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(path);
            avatar_url = urlData.publicUrl;
        }

        const profileData = {
            id: user.id,
            display_name: displayName.trim() || null,
            bio: bio.trim() || null,
            avatar_url,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('profiles').upsert(profileData);
        if (error) {
            alert('Failed to save profile: ' + error.message);
        } else {
            setAvatarFile(null);
            if (onProfileUpdate) onProfileUpdate(profileData);
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
        }
        setProfileSaving(false);
    };

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('isDarkMode', newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const updateAccentColor = (color) => {
        setAccentColor(color);
        localStorage.setItem('accentColor', color);
        document.documentElement.style.setProperty('--accent-color', color);
        // In a real app, you'd apply this color to Tailwind theme or global CSS
    };

    const handleInstallPWA = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setInstallPrompt(null);
        } else {
            alert("App is already installed or your browser doesn't support PWA installation directly.");
        }
    };

    const exportNotes = () => {
        const doc = new jsPDF();
        let yPos = 20;

        // Title
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("My Notes - Jotdown", 20, yPos);
        yPos += 15;

        notes.forEach((note, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            // Note Header
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            const title = note.title || `Untitled Note ${index + 1}`;
            doc.text(title, 20, yPos);
            yPos += 7;

            // Date
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            doc.text(`Created on: ${new Date(note.created_at).toLocaleString()}`, 20, yPos);
            yPos += 10;

            // Content
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            const splitContent = doc.splitTextToSize(note.content, 170);
            doc.text(splitContent, 20, yPos);

            yPos += (splitContent.length * 6) + 15;

            // Separator line
            doc.setDrawColor(230, 230, 230);
            doc.line(20, yPos - 10, 190, yPos - 10);
        });

        doc.save(`my_notes_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const emptyTrash = async () => {
        const trashedNotes = notes.filter(n => n.is_trashed);
        if (trashedNotes.length === 0) {
            alert("Nothing to delete!");
            return;
        }

        if (confirm("Are you sure you want to permanently delete all items in Trash? This cannot be undone.")) {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('user_id', user.id)
                .eq('is_trashed', true);

            if (error) alert("Failed to empty trash: " + error.message);
            else {
                alert("Trash cleared successfully!");
                if (onNotesDeleted) onNotesDeleted();
            }
        }
    };

    if (!isOpen) return null;

    const menuItems = [
        { id: 'profile', label: 'Account Profile', icon: <User size={18} /> },
        { id: 'themes', label: 'Appearance', icon: <Palette size={18} /> },
        { id: 'pwa', label: 'App Install (PWA)', icon: <Monitor size={18} /> },
        { id: 'data', label: 'Data & Privacy', icon: <Zap size={18} /> },
        { id: 'about', label: 'About App', icon: <Info size={18} /> },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white dark:bg-gray-900 w-full max-w-4xl h-[600px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-yellow-100/20"
                >
                    {/* Sidebar */}
                    <div className="w-full md:w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-6 flex flex-col pt-12">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-100">
                                <Settings className="text-white" size={20} />
                            </div>
                            <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Settings</h2>
                        </div>

                        <nav className="flex-1 space-y-1">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSubTab(item.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${activeSubTab === item.id
                                        ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-sm border border-gray-100 dark:border-gray-600 font-bold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={activeSubTab === item.id ? 'text-yellow-500' : 'text-gray-400 group-hover:text-gray-600'}>
                                            {item.icon}
                                        </span>
                                        <span className="text-sm tracking-tight">{item.label}</span>
                                    </div>
                                    {activeSubTab === item.id && <ChevronRight size={14} />}
                                </button>
                            ))}
                        </nav>

                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="mt-auto flex items-center gap-3 px-4 py-4 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white dark:bg-gray-900">
                        <button
                            onClick={onClose}
                            className="absolute right-6 top-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="max-w-xl">
                            {activeSubTab === 'profile' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Account Profile</h3>

                                    {/* Avatar Upload */}
                                    <div className="flex items-center gap-6">
                                        <div className="relative shrink-0">
                                            <div className="w-20 h-20 rounded-[20px] overflow-hidden bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white text-3xl font-black border-4 border-white dark:border-gray-700 shadow-xl">
                                                {avatarPreview
                                                    ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                                                    : (displayName?.[0] || user.email[0]).toUpperCase()
                                                }
                                            </div>
                                            <button
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
                                            >
                                                <Image size={13} />
                                            </button>
                                            <input
                                                ref={avatarInputRef}
                                                type="file" accept="image/*" className="hidden"
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{displayName || user.email.split('@')[0]}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                                            <button
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="mt-2 text-xs font-bold text-primary hover:underline"
                                            >Change photo</button>
                                        </div>
                                    </div>

                                    {/* Display Name */}
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-2">Display Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={e => setDisplayName(e.target.value)}
                                            placeholder={user.email.split('@')[0]}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all"
                                        />
                                        <p className="text-xs text-gray-400 mt-1.5">This name appears on your Community posts.</p>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-2">Bio</label>
                                        <textarea
                                            value={bio}
                                            onChange={e => setBio(e.target.value)}
                                            placeholder="Tell the community a little about yourself..."
                                            rows={3}
                                            maxLength={160}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white outline-none resize-none transition-all leading-relaxed"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">{bio.length}/160</p>
                                    </div>

                                    {/* Save Button */}
                                    <button
                                        onClick={saveProfile}
                                        disabled={profileSaving}
                                        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${profileSaved
                                            ? 'bg-green-500 text-white shadow-green-100'
                                            : 'bg-primary text-gray-900 hover:bg-primary/90 shadow-primary/20'
                                            }`}
                                    >
                                        {profileSaved ? <><Check size={16} /> Saved!</> : profileSaving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </motion.div>
                            )}

                            {activeSubTab === 'themes' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Appearance</h3>
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">Dark Mode</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">Enable dark theme for eye comfort</div>
                                            </div>
                                            <button
                                                onClick={toggleDarkMode}
                                                className={`w-14 h-8 rounded-full relative p-1 transition-all ${isDarkMode ? 'bg-yellow-400' : 'bg-gray-100 dark:bg-gray-700'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: isDarkMode ? 24 : 0 }}
                                                    className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center"
                                                >
                                                    {isDarkMode ? <Moon size={12} className="text-yellow-500" /> : <Sun size={12} className="text-yellow-500" />}
                                                </motion.div>
                                            </button>
                                        </div>

                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white mb-4">Accent Color</div>
                                            <div className="flex gap-4">
                                                {['#facc15', '#6366f1', '#a855f7', '#ec4899'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateAccentColor(color)}
                                                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${accentColor === color ? 'border-gray-900 dark:border-white scale-110 shadow-lg' : 'border-white dark:border-gray-800 opacity-60 hover:opacity-100'}`}
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {accentColor === color && <Check size={20} className="text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSubTab === 'pwa' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Desktop & Mobile App</h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">Install Jotdown directly on your device for a native experience.</p>

                                    <div className="p-8 bg-gradient-to-br from-gray-900 to-black rounded-[32px] text-white relative overflow-hidden group">
                                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-700" />
                                        <Monitor className="text-yellow-400 mb-6" size={48} />
                                        <h4 className="text-xl font-black mb-2 tracking-tight">Ready to Install</h4>
                                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                            Enjoy faster loading, offline access, and an icon on your home screen or dock.
                                        </p>
                                        <button
                                            onClick={handleInstallPWA}
                                            className="w-full py-4 bg-yellow-400 text-gray-900 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all active:scale-95 shadow-xl shadow-yellow-400/20"
                                        >
                                            <Download size={20} />
                                            Install Now
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeSubTab === 'data' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Data Control</h3>
                                    <div className="space-y-4">
                                        <div className="p-6 border border-gray-100 dark:border-gray-700 rounded-3xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl">
                                                        <Download size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">Export Notes</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-black">PDF Format</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={exportNotes}
                                                    className="px-4 py-2 border-2 border-gray-100 dark:border-gray-100/10 rounded-xl text-sm font-bold hover:bg-white dark:hover:bg-gray-700 dark:text-white transition-all"
                                                >
                                                    Export
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 border border-red-50 dark:border-red-500/10 rounded-3xl bg-red-50/20 dark:bg-red-500/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-red-100 text-red-500 rounded-2xl">
                                                        <Trash2 size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">Empty Trash</div>
                                                        <div className="text-xs text-red-400 uppercase tracking-widest font-black">Permanent Delete</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={emptyTrash}
                                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100 dark:shadow-none"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSubTab === 'about' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">About App</h3>
                                    <div className="flex flex-col items-center text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700">
                                        <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-100 dark:shadow-none mb-6 italic text-white font-black text-4xl">
                                            N
                                        </div>
                                        <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Jotdown Premium</h4>
                                        <p className="text-gray-400 font-bold mb-6 italic tracking-tight">Version 2.0.4 "Super Sonic"</p>
                                        <div className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-300">System Secure</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SettingsModal;
