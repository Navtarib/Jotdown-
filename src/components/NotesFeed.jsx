import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import FeedDetail from './FeedDetail';
import CommunityNoteCard from './CommunityNoteCard';
import { Rss, Plus, Lock, ChevronRight, Users, Loader2, X, Globe, Sparkles, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NotesFeed = ({ user, profile, onFeedsUpdate, onlineUsers, searchQuery }) => {
    const [myFeeds, setMyFeeds] = useState([]);
    const [invitedFeeds, setInvitedFeeds] = useState([]);
    const [selectedFeed, setSelectedFeed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [feedName, setFeedName] = useState('');
    const [feedDesc, setFeedDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [feedTab, setFeedTab] = useState('channels'); // 'channels' or 'community'
    const [publicNotes, setPublicNotes] = useState([]);

    // Community post states
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteImageFiles, setNoteImageFiles] = useState([]);
    const [noteImagePreviews, setNoteImagePreviews] = useState([]);
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setNoteImageFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setNoteImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        setNoteImageFiles(prev => prev.filter((_, i) => i !== index));
        setNoteImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Automatically link invited_email → user_id when user logs in
    const resolveInvites = useCallback(async () => {
        if (!user?.email) {
            console.warn('resolveInvites: No user email available');
            return;
        }
        console.log('Attempting to resolve invites for:', user.email);
        const { data, error } = await supabase
            .from('feed_members')
            .update({ user_id: user.id })
            .eq('invited_email', user.email.toLowerCase().trim())
            .is('user_id', null)
            .select('*');

        if (error) {
            console.error('resolveInvites error:', error.message, error.details);
        } else if (data && data.length > 0) {
            console.log(`Successfully linked ${data.length} invitation(s) for ${user.email}`, data);
        } else {
            console.log('No pending invitations found for this email.');
        }
    }, [user]);

    const fetchFeeds = useCallback(async () => {
        setLoading(true);
        setFetchError(null);

        // Step 1: Fetch feeds I OWN
        const { data: owned, error: ownedErr } = await supabase
            .from('feeds')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (ownedErr) {
            console.error('Owned feeds error:', ownedErr.message);
            setFetchError(ownedErr.message);
            setLoading(false);
            return;
        }
        setMyFeeds(owned || []);

        // Step 2: Fetch my memberships first
        const { data: memberships, error: membErr } = await supabase
            .from('feed_members')
            .select('feed_id')
            .eq('user_id', user.id);

        if (membErr) console.error('Memberships error:', membErr.message);

        const feedIds = memberships?.map(m => m.feed_id).filter(Boolean) || [];

        // Step 3: Only query invited feeds if there are memberships
        if (feedIds.length > 0) {
            const { data: invited, error: invErr } = await supabase
                .from('feeds')
                .select('*')
                .in('id', feedIds)
                .order('created_at', { ascending: false });

            if (invErr) console.error('Invited feeds error:', invErr.message);
            setInvitedFeeds(invited || []);
        }

        // Notify parent of the total count
        if (onFeedsUpdate) {
            onFeedsUpdate((owned?.length || 0) + (feedIds.length));
        }

        setLoading(false);
    }, [user, onFeedsUpdate]);

    const fetchPublicNotes = useCallback(async () => {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching public notes:', error.message);
        } else {
            setPublicNotes(data || []);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        resolveInvites().then(() => {
            fetchFeeds();
            fetchPublicNotes();
        });

        // Real-time: feeds list changes (new feed, renamed, deleted)
        const feedsChannel = supabase
            .channel(`rt-feeds-list-${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'feeds'
            }, fetchFeeds)
            .subscribe();

        // Real-time: new membership (when owner invites you)
        const membersChannel = supabase
            .channel(`rt-my-memberships-${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'feed_members'
            }, () => {
                console.log('Realtime membership change detected, resolving invites...');
                resolveInvites().then(fetchFeeds);
            })
            .subscribe();

        // Real-time: global public notes
        const publicNotesChannel = supabase
            .channel('rt-public-notes')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'notes', filter: 'is_public=eq.true'
            }, fetchPublicNotes)
            .subscribe();

        return () => {
            supabase.removeChannel(feedsChannel);
            supabase.removeChannel(membersChannel);
            supabase.removeChannel(publicNotesChannel);
        };
    }, [user, fetchFeeds, fetchPublicNotes, resolveInvites, onFeedsUpdate]);

    const createFeed = async (e) => {
        e.preventDefault();
        if (!feedName.trim() || creating) return;
        setCreating(true);
        const { error } = await supabase.from('feeds').insert([{
            owner_id: user.id,
            name: feedName.trim(),
            description: feedDesc.trim() || null,
        }]);
        if (!error) {
            setFeedName('');
            setFeedDesc('');
            setShowCreate(false);
            fetchFeeds();
        }
        setCreating(false);
    };

    const postPublicNote = async (e) => {
        e.preventDefault();
        if ((!noteContent.trim() && noteImageFiles.length === 0) || posting) return;
        setPosting(true);

        let imageUrls = [];
        if (noteImageFiles.length > 0) {
            try {
                const uploadPromises = noteImageFiles.map(async (file) => {
                    const ext = file.name.split('.').pop();
                    const path = `public/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
                    const { error: upErr } = await supabase.storage
                        .from('note-images')
                        .upload(path, file, { cacheControl: '3600', upsert: false });
                    if (upErr) throw upErr;
                    const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(path);
                    return urlData.publicUrl;
                });
                imageUrls = await Promise.all(uploadPromises);
            } catch (err) {
                console.error('Image upload failed:', err.message);
                alert(`Image upload failed: ${err.message}`);
                setPosting(false);
                return;
            }
        }

        await supabase.from('notes').insert([{
            user_id: user.id,
            author_name: profile?.display_name || user.email.split('@')[0],
            author_avatar: profile?.avatar_url || null,
            title: noteTitle.trim() || null,
            content: noteContent.trim(),
            image_urls: imageUrls,
            image_url: imageUrls[0] || null,
            is_public: true,
        }]);

        fetchPublicNotes();
        setNoteTitle('');
        setNoteContent('');
        setNoteImageFiles([]);
        setNoteImagePreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setPosting(false);
    };

    if (selectedFeed) {
        return <FeedDetail feed={selectedFeed} user={user} onBack={() => { setSelectedFeed(null); fetchFeeds(); }} onlineUsers={onlineUsers} searchQuery={searchQuery} />;
    }

    const filteredMyFeeds = myFeeds.filter(f =>
        f.name?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
        f.description?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
    );

    const filteredInvitedFeeds = invitedFeeds.filter(f =>
        f.name?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
        f.description?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
    );

    const filteredPublicNotes = publicNotes.filter(n =>
        n.title?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
        n.content?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
    );

    const FeedCard = ({ feed, isOwner }) => (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedFeed(feed)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {isOwner ? <Lock size={18} className="text-primary" /> : <Rss size={18} className="text-primary" />}
                </div>
                <div>
                    <p className="font-black text-gray-900 dark:text-white leading-none">{feed.name}</p>
                    {feed.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{feed.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">
                        {isOwner ? 'Owner' : 'Member'}
                    </p>
                </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
        </motion.button>
    );

    return (
        <div className="w-full max-w-2xl mx-auto px-4 md:px-0 pb-32">
            {/* Header */}
            <div className="flex flex-col mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={13} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Social Discovery</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Community Feed</h2>
                    </div>
                    {feedTab === 'channels' && (
                        <button onClick={() => setShowCreate(!showCreate)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${showCreate ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                                }`}>
                            {showCreate ? <X size={16} /> : <Plus size={16} />}
                            {showCreate ? 'Cancel' : 'New Feed'}
                        </button>
                    )}
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl gap-1">
                    <button
                        onClick={() => setFeedTab('channels')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${feedTab === 'channels'
                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <Lock size={14} />
                        Channels
                    </button>
                    <button
                        onClick={() => setFeedTab('community')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${feedTab === 'community'
                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <Globe size={14} />
                        Community
                    </button>
                </div>
            </div>

            {/* Create Feed Form */}
            <AnimatePresence>
                {showCreate && feedTab === 'channels' && (
                    <motion.form onSubmit={createFeed} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                        className="mb-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[24px] p-6 space-y-4 shadow-xl shadow-gray-100 dark:shadow-none">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Create a Private Feed</p>
                        <input type="text" placeholder="Feed name *" value={feedName} onChange={e => setFeedName(e.target.value)} required
                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 py-3 text-sm outline-none transition-all text-gray-900 dark:text-white font-bold" />
                        <input type="text" placeholder="Description (optional)" value={feedDesc} onChange={e => setFeedDesc(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 py-3 text-sm outline-none transition-all text-gray-900 dark:text-white font-bold" />
                        <button type="submit" disabled={!feedName.trim() || creating}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Feed
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <Loader2 className="animate-spin text-primary" size={28} />
                    <p className="text-sm text-gray-400 font-bold">Loading feed items...</p>
                </div>
            ) : fetchError ? (
                <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                    <p className="text-sm font-black text-red-600 dark:text-red-400 mb-1">⚠ Database Error</p>
                    <p className="text-xs text-red-500 font-mono break-all">{fetchError}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {feedTab === 'channels' ? (
                        <>
                            {/* My Feeds */}
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <Lock size={11} /> My Channels ({filteredMyFeeds.length})
                                </p>
                                {myFeeds.length === 0 ? (
                                    <div className="p-10 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[32px] text-center">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Lock size={24} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-bold">No private channels yet.</p>
                                        <button onClick={() => setShowCreate(true)} className="mt-4 text-xs font-black text-primary uppercase tracking-widest hover:underline">Create One Now</button>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {filteredMyFeeds.map(f => <FeedCard key={f.id} feed={f} isOwner={true} />)}
                                    </div>
                                )}
                            </div>

                            {/* Invited Feeds */}
                            {invitedFeeds.length > 0 && (
                                <div className="mt-8">
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                        <Users size={11} /> Invited Feeds ({filteredInvitedFeeds.length})
                                    </p>
                                    <div className="grid gap-3">
                                        {filteredInvitedFeeds.map(f => <FeedCard key={f.id} feed={f} isOwner={false} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Community Tab Section */
                        <div className="space-y-6">
                            <form onSubmit={postPublicNote} className="mb-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[24px] p-6 space-y-4 shadow-xl shadow-gray-100 dark:shadow-none">
                                <div className="flex items-center gap-2 mb-1">
                                    <Plus size={13} className="text-primary" />
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Post a Public Note</span>
                                </div>
                                <input type="text" placeholder="Title (optional)" value={noteTitle}
                                    onChange={e => setNoteTitle(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 py-3 text-sm outline-none transition-all text-gray-900 dark:text-white font-bold" />
                                <textarea placeholder="Write your note..." value={noteContent}
                                    onChange={e => setNoteContent(e.target.value)} rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 py-3 text-sm outline-none transition-all text-gray-900 dark:text-white font-bold resize-none" />

                                {noteImagePreviews.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {noteImagePreviews.map((preview, idx) => (
                                            <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                                                <img src={preview} alt={`preview ${idx + 1}`} className="w-full h-full object-cover rounded-2xl" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-primary hover:border-primary/30 transition-all text-xs font-black uppercase tracking-widest bg-gray-50/50 dark:bg-gray-800/50"
                                    >
                                        <Image size={16} /> Photos {noteImageFiles.length > 0 && `(${noteImageFiles.length})`}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                    <button type="submit" disabled={(!noteContent.trim() && noteImageFiles.length === 0) || posting}
                                        className="flex-1 max-w-[120px] flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                                        {posting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Post
                                    </button>
                                </div>
                            </form>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Globe size={11} /> Global Notes ({filteredPublicNotes.length})
                                </p>
                            </div>

                            {publicNotes.length === 0 ? (
                                <div className="p-10 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[32px] text-center">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Globe size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-bold">The community is quiet... for now.</p>
                                    <p className="text-xs text-gray-400 mt-2">Publish a note from your dashboard to see it here!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredPublicNotes.map(note => (
                                        <CommunityNoteCard key={note.id} note={note} user={user} currentUserProfile={profile} onlineUsers={onlineUsers} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
};

export default NotesFeed;
