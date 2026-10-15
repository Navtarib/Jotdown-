import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import ProfilePreview from './ProfilePreview';
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedNoteCard = ({ note, user, isFeedOwner, onlineUsers }) => {
    const [acknowledgments, setAcknowledgments] = useState([]);
    const [hasAcknowledged, setHasAcknowledged] = useState(false);
    const [showAcks, setShowAcks] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [authorProfile, setAuthorProfile] = useState(null);
    const [showProfilePreview, setShowProfilePreview] = useState(false);

    const fetchAuthorProfile = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', note.owner_id)
            .maybeSingle();
        if (data) setAuthorProfile(data);
    }, [note.owner_id]);

    const fetchAcknowledgments = useCallback(async () => {
        const { data } = await supabase
            .from('feed_acknowledgments')
            .select('*')
            .eq('feed_note_id', note.id)
            .order('created_at', { ascending: false });
        if (data) {
            setAcknowledgments(data);
            setHasAcknowledged(!!data.find(a => a.user_id === user?.id));
        }
    }, [note.id, user?.id]);

    useEffect(() => {
        fetchAcknowledgments();
        fetchAuthorProfile();
        const channel = supabase
            .channel(`feedack-${note.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public',
                table: 'feed_acknowledgments',
                filter: `feed_note_id=eq.${note.id}`
            }, (payload) => {
                console.log(`Realtime ack change detected for note ${note.id}:`, payload);
                fetchAcknowledgments();
            })
            .subscribe((status) => {
                console.log(`Realtime ack subscription status for note ${note.id}:`, status);
            });
        return () => supabase.removeChannel(channel);
    }, [note.id, fetchAcknowledgments]);

    const handleAcknowledge = async () => {
        if (!user || loading) return;
        setLoading(true);
        if (hasAcknowledged) {
            await supabase.from('feed_acknowledgments')
                .delete().eq('feed_note_id', note.id).eq('user_id', user.id);
        } else {
            // Get profile for the name if possible, otherwise fallback to email
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', user.id)
                .maybeSingle();

            await supabase.from('feed_acknowledgments').insert([{
                feed_note_id: note.id,
                user_id: user.id,
                user_name: profile?.display_name || user.email.split('@')[0],
                user_email: user.email,
            }]);
        }
        console.log('Acknowledgment operation successful, manual fetch triggered');
        await fetchAcknowledgments();
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('Do you want to delete this note?')) return;
        setDeleting(true);
        const { error } = await supabase
            .from('feed_notes')
            .delete()
            .eq('id', note.id);

        if (error) {
            console.error('Error deleting note:', error.message);
            alert('Failed to delete note');
            setDeleting(false);
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
        >
            <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-3">
                    <div
                        onClick={() => setShowProfilePreview(true)}
                        className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-black text-sm shadow overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    >
                        {authorProfile?.avatar_url
                            ? <img src={authorProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            : (authorProfile?.display_name?.[0] || note.author_email?.[0] || 'U').toUpperCase()
                        }
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-none flex items-center gap-1.5">
                            {authorProfile?.display_name || note.author_email?.split('@')[0] || 'Feed Member'}
                            <div className={`w-2 h-2 rounded-full shadow-sm ${onlineUsers?.includes(note.owner_id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {formatDate(note.created_at)}
                        </p>
                    </div>
                </div>

                {(user?.id === note.owner_id || isFeedOwner) && (
                    <button onClick={handleDelete} disabled={deleting}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                )}
            </div>

            {/* Images Display */}
            {(() => {
                const images = (Array.isArray(note.image_urls) && note.image_urls.length > 0)
                    ? note.image_urls
                    : (typeof note.image_urls === 'string' && note.image_urls.startsWith('['))
                    ? (() => { try { return JSON.parse(note.image_urls); } catch { return []; } })()
                    : note.image_url
                    ? [note.image_url]
                    : [];

                if (images.length === 0) return null;

                return (
                    <div className="px-4 pt-2">
                        {images.length === 1 ? (
                            <img
                                src={images[0]}
                                alt="post attachment"
                                className="w-full max-h-72 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => window.open(images[0], '_blank')}
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {images.slice(0, 4).map((url, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={url}
                                            alt={`attachment ${idx + 1}`}
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => window.open(url, '_blank')}
                                        />
                                        {idx === 3 && images.length > 4 && (
                                            <div
                                                onClick={() => window.open(images[3], '_blank')}
                                                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-black text-sm cursor-pointer"
                                            >
                                                +{images.length - 3}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Content */}
            <div className="px-4 py-2">
                {note.title && <h3 className="font-black text-gray-900 dark:text-white mb-1 leading-tight">{note.title}</h3>}
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words text-sm leading-relaxed">{note.content}</p>
            </div>

            {/* Ack Count */}
            {acknowledgments.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-800/50">
                    <button onClick={() => setShowAcks(!showAcks)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
                        <div className="flex -space-x-1.5">
                            {acknowledgments.slice(0, 4).map(a => (
                                <div key={a.id} title={a.user_email}
                                    className="w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-black text-white">
                                    {a.user_name?.[0]?.toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <span className="font-bold">{acknowledgments.length} acknowledged</span>
                        {showAcks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </div>
            )}

            {/* Acknowledger List */}
            <AnimatePresence>
                {showAcks && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3 space-y-1.5 max-h-44 overflow-y-auto">
                            {acknowledgments.map(a => (
                                <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-black text-xs flex-shrink-0">
                                        {a.user_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none truncate">{a.user_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{a.user_email}</p>
                                    </div>
                                    <CheckCircle2 size={14} className="ml-auto text-green-500 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-1">
                <button onClick={handleAcknowledge} disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${hasAcknowledged
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}>
                    <CheckCircle2 size={17} className={hasAcknowledged ? 'fill-green-100' : ''} />
                    {hasAcknowledged ? 'Acknowledged ✓' : 'Acknowledge'}
                </button>
            </div>
            <ProfilePreview
                profile={authorProfile || {
                    display_name: note.author_email?.split('@')[0],
                    avatar_url: null
                }}
                isOpen={showProfilePreview}
                onClose={() => setShowProfilePreview(false)}
                isOnline={onlineUsers?.includes(note.owner_id)}
            />
        </motion.div>
    );
};

export default FeedNoteCard;
