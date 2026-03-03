import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import FeedNoteCard from './FeedNoteCard';
import { ArrowLeft, Plus, Users, Send, UserPlus, Trash2, Loader2, Image, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedDetail = ({ feed, user, onBack }) => {
    const [notes, setNotes] = useState([]);
    const [members, setMembers] = useState([]);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteImageFile, setNoteImageFile] = useState(null);
    const [noteImagePreview, setNoteImagePreview] = useState(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const feedFileInputRef = useRef(null);

    const isOwner = feed.owner_id === user?.id;

    const fetchNotes = useCallback(async () => {
        const { data } = await supabase
            .from('feed_notes')
            .select('*')
            .eq('feed_id', feed.id)
            .order('created_at', { ascending: false });
        if (data) {
            console.log(`Fetched ${data.length} notes for feed ${feed.id}`);
            setNotes(data);
        }
    }, [feed.id]);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from('feed_members')
            .select('*')
            .eq('feed_id', feed.id);
        if (data) setMembers(data);
    }, [feed.id]);

    useEffect(() => {
        fetchNotes();
        fetchMembers();
    }, [fetchNotes, fetchMembers]);

    useEffect(() => {
        // Real-time: notes (INSERT, UPDATE, DELETE)
        const notesChannel = supabase
            .channel(`rt-notes-${feed.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'feed_notes',
                filter: `feed_id=eq.${feed.id}`
            }, (payload) => {
                console.log('Realtime feed note INSERT received:', payload);
                setNotes(prev => {
                    if (prev.find(n => n.id === payload.new.id)) return prev;
                    return [payload.new, ...prev];
                });
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'feed_notes',
                filter: `feed_id=eq.${feed.id}`
            }, (payload) => {
                setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
            })
            .on('postgres_changes', {
                event: 'DELETE', schema: 'public', table: 'feed_notes',
                filter: `feed_id=eq.${feed.id}`
            }, (payload) => {
                setNotes(prev => prev.filter(n => n.id !== payload.old.id));
            })
            .subscribe((status) => {
                console.log(`[User: ${user.email}] Realtime notes subscription status for feed ${feed.id}:`, status);
            });

        // Real-time: members (INSERT, UPDATE, DELETE)
        const membersChannel = supabase
            .channel(`rt-members-${feed.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'feed_members',
                filter: `feed_id=eq.${feed.id}`
            }, () => {
                console.log('Realtime membership change received');
                fetchMembers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(membersChannel);
        };
    }, [feed.id, fetchMembers]);

    const postNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim() || posting) return;
        setPosting(true);

        let image_url = null;
        if (noteImageFile) {
            try {
                const ext = noteImageFile.name.split('.').pop();
                const path = `feeds/${feed.id}/${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('note-images')
                    .upload(path, noteImageFile, { cacheControl: '3600', upsert: false });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(path);
                image_url = urlData.publicUrl;
            } catch (err) {
                console.error('Image upload failed:', err.message);
                alert(`Image upload failed: ${err.message}`);
                setPosting(false);
                return;
            }
        }

        await supabase.from('feed_notes').insert([{
            feed_id: feed.id,
            owner_id: user.id,
            author_email: user.email,
            title: noteTitle.trim() || null,
            content: noteContent.trim(),
            image_url,
        }]);
        fetchNotes();
        setNoteTitle('');
        setNoteContent('');
        setNoteImageFile(null);
        setNoteImagePreview(null);
        if (feedFileInputRef.current) feedFileInputRef.current.value = '';
        setPosting(false);
    };

    const inviteMember = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setLoading(true);
        const { error } = await supabase.from('feed_members').insert([{
            feed_id: feed.id,
            invited_email: inviteEmail.trim().toLowerCase(),
        }]);
        if (error) {
            if (error.code === '23505') alert('This email is already invited.');
            else alert('Error: ' + error.message);
        } else {
            console.log('Invite successful, manual fetch triggered');
            fetchMembers();
            setInviteEmail('');
        }
        setLoading(false);
    };

    const removeMember = async (memberId) => {
        await supabase.from('feed_members').delete().eq('id', memberId);
    };

    const deleteFeed = async () => {
        if (!window.confirm('Do you want to delete the feed?')) return;

        setLoading(true);
        const { error } = await supabase
            .from('feeds')
            .delete()
            .eq('id', feed.id);

        if (error) {
            alert('Error deleting feed: ' + error.message);
            setLoading(false);
        } else {
            onBack();
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 md:px-0 pb-32">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pt-2">
                <button onClick={onBack} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="font-black text-gray-900 dark:text-white text-xl truncate leading-none">{feed.name}</h2>
                    {feed.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{feed.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setShowMembers(!showMembers); setShowInvite(false); }}
                        className={`p-2 rounded-xl transition-all ${showMembers ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <Users size={18} />
                        {members.length > 0 && (
                            <span className="sr-only">{members.length} members</span>
                        )}
                    </button>
                    {isOwner && (
                        <button onClick={() => { setShowInvite(!showInvite); setShowMembers(false); }}
                            className={`p-2 rounded-xl transition-all ${showInvite ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            <UserPlus size={18} />
                        </button>
                    )}
                    {isOwner && (
                        <button onClick={deleteFeed} disabled={loading}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Member count badge */}
            {members.length > 0 && !showMembers && (
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex -space-x-1.5">
                        {members.slice(0, 5).map(m => (
                            <div key={m.id} title={m.invited_email}
                                className="w-6 h-6 rounded-full bg-primary/10 border-2 border-white dark:border-gray-950 flex items-center justify-center text-[9px] font-black text-primary">
                                {m.invited_email?.[0]?.toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <span className="text-xs text-gray-400 font-bold">{members.length} member{members.length > 1 ? 's' : ''}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
            )}

            {/* Member list panel */}
            <AnimatePresence>
                {showMembers && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mb-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                            Members ({members.length}) <span className="w-1.5 h-1.5 inline-block rounded-full bg-green-400 animate-pulse ml-1" />
                        </p>
                        {members.length === 0 ? (
                            <p className="text-sm text-gray-400">No members yet. Invite someone!</p>
                        ) : (
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                {m.invited_email?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{m.invited_email.split('@')[0]}</p>
                                                <p className="text-xs text-gray-400">{m.invited_email}</p>
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <button onClick={() => removeMember(m.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invite form */}
            <AnimatePresence>
                {showInvite && isOwner && (
                    <motion.form onSubmit={inviteMember} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mb-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex gap-3">
                        <input type="email" placeholder="Invite by email..." value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                        <button type="submit" disabled={loading || !inviteEmail.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Post Note (owner only) */}
            {isOwner && (
                <form onSubmit={postNote} className="mb-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Post a Note</p>
                    <input type="text" placeholder="Title (optional)" value={noteTitle}
                        onChange={e => setNoteTitle(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20" />
                    <textarea placeholder="Write your note..." value={noteContent}
                        onChange={e => setNoteContent(e.target.value)} rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 resize-none" />

                    {/* Image Preview for Feed Post */}
                    {noteImagePreview && (
                        <div className="relative rounded-xl overflow-hidden">
                            <img src={noteImagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
                            <button
                                type="button"
                                onClick={() => { setNoteImageFile(null); setNoteImagePreview(null); if (feedFileInputRef.current) feedFileInputRef.current.value = ''; }}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => feedFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30 transition-all text-xs font-bold"
                        >
                            <Image size={14} /> Photo
                        </button>
                        <input
                            ref={feedFileInputRef}
                            type="file" accept="image/*" className="hidden"
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) { setNoteImageFile(f); setNoteImagePreview(URL.createObjectURL(f)); }
                            }}
                        />
                        <button type="submit" disabled={!noteContent.trim() || posting}
                            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
                        </button>
                    </div>
                </form>
            )}

            {/* Notes list */}
            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <Plus className="text-gray-200 dark:text-gray-700" size={40} />
                    <p className="text-sm text-gray-400 font-bold">No notes in this feed yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {notes.map(note => <FeedNoteCard key={note.id} note={note} user={user} isFeedOwner={isOwner} />)}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default FeedDetail;
