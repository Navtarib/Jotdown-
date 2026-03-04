import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Mail, User, ShieldCheck } from 'lucide-react';

const ProfilePreview = ({ profile, isOpen, onClose, isOnline }) => {
    if (!profile) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Joined recently';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-950/40 backdrop-blur-md"
                    />

                    {/* Content Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-800"
                    >
                        {/* Header Background / Gradient */}
                        <div className="h-32 bg-gradient-to-br from-primary via-orange-500 to-pink-500 w-full relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-all backdrop-blur-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Profile Info Section */}
                        <div className="px-8 pb-10 pt-0 -mt-16 text-center">
                            {/* Avatar */}
                            <div className="inline-block relative">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', damping: 12 }}
                                    className="w-32 h-32 rounded-[40px] border-4 border-white dark:border-gray-900 overflow-hidden shadow-xl bg-gradient-to-tr from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                                >
                                    {profile.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt={profile.display_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-black text-primary bg-primary/10">
                                            {(profile.display_name?.[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                </motion.div>
                                <div className="absolute -bottom-1 -right-1 p-1.5 bg-green-500 border-4 border-white dark:border-gray-900 rounded-full shadow-lg" />
                            </div>

                            {/* Text Info */}
                            <div className="mt-6">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                                    {profile.display_name || 'Anonymous User'}
                                    <ShieldCheck size={20} className="text-blue-500" />
                                </h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
                                    Member of Jotdown
                                </p>
                            </div>

                            {/* Bio */}
                            <div className="mt-8 px-4">
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium italic">
                                    "{profile.bio || 'This user is busy writing brilliant ideas on Jotdown! No bio yet.'}"
                                </p>
                            </div>

                            {/* Stats/Details Grid */}
                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                    <div className="flex flex-col items-center gap-1">
                                        <Calendar size={16} className="text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Joined</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                                            {formatDate(profile.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                    <div className="flex flex-col items-center gap-1">
                                        <User size={16} className="text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</span>
                                        <span className="text-xs font-bold text-green-500">Active Now</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onClose}
                                className="w-full mt-8 py-4 bg-gray-900 dark:bg-primary dark:text-gray-900 text-white font-black rounded-[20px] text-sm shadow-xl shadow-gray-200 dark:shadow-none transition-all"
                            >
                                Close Preview
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProfilePreview;
