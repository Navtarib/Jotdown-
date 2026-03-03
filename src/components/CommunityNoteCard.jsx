import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import NoteCard from './NoteCard';
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CommunityNoteCard = ({ note, user }) => {
    const [likes, setLikes] = useState([]);
    const [comments, setComments] = useState([]);
    const [hasLiked, setHasLiked] = useState(false);
    const [showLikers, setShowLikers] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [likeLoading, setLikeLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);
    const commentInputRef = useRef(null);

    const fetchLikes = useCallback(async () => {
        const { data } = await supabase
            .from('note_likes')
            .select('*')
            .eq('note_id', note.id)
            .order('created_at', { ascending: false });
        if (data) {
            setLikes(data);
            setHasLiked(!!data.find(l => l.user_id === user?.id));
        }
    }, [note.id, user?.id]);

    const fetchComments = useCallback(async () => {
        const { data } = await supabase
            .from('note_comments')
            .select('*')
            .eq('note_id', note.id)
            .order('created_at', { ascending: true });
        if (data) setComments(data);
    }, [note.id]);

    useEffect(() => {
        fetchLikes();
        fetchComments();

        // Real-time likes
        const likesChannel = supabase
            .channel(`likes-${note.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'note_likes',
                filter: `note_id=eq.${note.id}`
            }, fetchLikes)
            .subscribe();

        // Real-time comments
        const commentsChannel = supabase
            .channel(`comments-${note.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'note_comments',
                filter: `note_id=eq.${note.id}`
            }, fetchComments)
            .subscribe();

        return () => {
            supabase.removeChannel(likesChannel);
            supabase.removeChannel(commentsChannel);
        };
    }, [note.id, fetchLikes, fetchComments]);

    const handleLike = async () => {
        if (!user || likeLoading) return;
        setLikeLoading(true);
        if (hasLiked) {
            await supabase.from('note_likes')
                .delete().eq('note_id', note.id).eq('user_id', user.id);
        } else {
            await supabase.from('note_likes').insert([{
                note_id: note.id,
                user_id: user.id,
                user_name: user.email.split('@')[0],
            }]);
        }
        setLikeLoading(false);
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || commentLoading) return;
        setCommentLoading(true);
        await supabase.from('note_comments').insert([{
            note_id: note.id,
            user_id: user.id,
            author_name: user.email.split('@')[0],
            content: newComment.trim(),
        }]);
        setNewComment('');
        setCommentLoading(false);
    };

    const handleDeleteComment = async (commentId) => {
        await supabase.from('note_comments').delete().eq('id', commentId);
    };

    const formatTime = (d) => {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm">
            {/* Author Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20 border-2 border-white dark:border-gray-800 shrink-0 overflow-hidden">
                    {note.author_avatar
                        ? <img src={note.author_avatar} alt={note.author_name} className="w-full h-full object-cover" />
                        : (note.author_name || 'A')[0].toUpperCase()
                    }
                </div>
                <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-none">
                        {note.author_name || 'Anonymous'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {formatTime(note.created_at)}
                    </p>
                </div>
            </div>

            {/* Note Content (via NoteCard, no actions) */}
            <div className="px-2">
                <NoteCard
                    note={note}
                    onOptimisticDelete={() => { }}
                    onNoteUpdated={() => { }}
                    isOwner={user?.id === note.user_id}
                />
            </div>

            {/* Like count + Likers list */}
            {likes.length > 0 && (
                <div className="px-5 py-1">
                    <button
                        onClick={() => setShowLikers(!showLikers)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-primary transition-colors font-bold"
                    >
                        <div className="flex -space-x-1">
                            {likes.slice(0, 5).map(l => (
                                <div key={l.id}
                                    className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-black text-red-500"
                                    title={l.user_name}
                                >
                                    {l.user_name?.[0]?.toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <span>{likes.length} {likes.length === 1 ? 'like' : 'likes'}</span>
                        {showLikers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <AnimatePresence>
                        {showLikers && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-2 space-y-1">
                                    {likes.map(l => (
                                        <div key={l.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <Heart size={10} className="text-red-400 fill-red-400 shrink-0" />
                                            <span className="font-bold">{l.user_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-50 dark:border-gray-800 mt-1">
                {/* Like Button */}
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleLike}
                    disabled={likeLoading}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all flex-1 justify-center ${hasLiked
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                        }`}
                >
                    <Heart size={16} className={hasLiked ? 'fill-red-500' : ''} />
                    <span>{likes.length > 0 ? likes.length : ''} Like</span>
                </motion.button>

                {/* Comment Button */}
                <button
                    onClick={() => {
                        setShowComments(!showComments);
                        setTimeout(() => commentInputRef.current?.focus(), 100);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-gray-400 hover:text-primary hover:bg-primary/10 transition-all flex-1 justify-center"
                >
                    <MessageCircle size={16} />
                    <span>{comments.length > 0 ? comments.length : ''} Comment</span>
                </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-50 dark:border-gray-800"
                    >
                        {/* Existing Comments */}
                        {comments.length > 0 && (
                            <div className="px-4 pt-3 space-y-3 max-h-56 overflow-y-auto">
                                {comments.map(c => (
                                    <div key={c.id} className="flex items-start gap-2.5 group">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-black text-[10px] shrink-0 mt-0.5">
                                            {(c.author_name || 'A')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <p className="text-[11px] font-black text-primary leading-none">
                                                    {c.author_name || 'Anonymous'}
                                                </p>
                                                <span className="text-[10px] text-gray-400 font-bold shrink-0">{formatTime(c.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 break-words">{c.content}</p>
                                        </div>
                                        {c.user_id === user?.id && (
                                            <button
                                                onClick={() => handleDeleteComment(c.id)}
                                                className="p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comment Input */}
                        <form onSubmit={handleComment} className="flex items-center gap-2 px-4 py-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                                {(user?.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 font-medium"
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!newComment.trim() || commentLoading}
                                    whileTap={{ scale: 0.9 }}
                                    className="text-primary disabled:text-gray-300 transition-colors"
                                >
                                    <Send size={16} />
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityNoteCard;
