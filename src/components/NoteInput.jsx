import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Check, Bell, Image, X } from 'lucide-react';

const NoteInput = ({ user, profile, onNoteCreated }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    
    // Multiple images state
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    
    const [uploading, setUploading] = useState(false);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setImageFiles((prev) => [...prev, ...files]);
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews((prev) => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Upload all images in parallel
    const uploadImages = useCallback(async (files) => {
        const uploadPromises = files.map(async (file) => {
            const ext = file.name.split('.').pop();
            const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
            const { error } = await supabase.storage
                .from('note-images')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (error) throw error;
            const { data } = supabase.storage.from('note-images').getPublicUrl(path);
            return data.publicUrl;
        });
        return await Promise.all(uploadPromises);
    }, [user.id]);

    const saveNote = useCallback(async () => {
        if (!title.trim() && !content.trim() && imageFiles.length === 0) return;
        setUploading(true);

        let imageUrls = [];
        if (imageFiles.length > 0) {
            try {
                imageUrls = await uploadImages(imageFiles);
            } catch (err) {
                console.error('Image upload failed:', err.message);
                alert(`Image upload failed: ${err.message}`);
                setUploading(false);
                return;
            }
        }

        const isoReminder = reminderAt ? new Date(reminderAt).toISOString() : null;

        const { data, error } = await supabase.from('notes').insert([
            {
                user_id: user.id,
                title,
                content,
                reminder_at: isoReminder,
                is_public: isPublic,
                author_name: profile?.display_name || user.email.split('@')[0],
                author_avatar: profile?.avatar_url || null,
                image_urls: imageUrls,
                image_url: imageUrls[0] || null,
            },
        ]).select();

        if (error) {
            console.error('Error saving note:', error.message);
            alert(`Failed to save note: ${error.message}`);
        } else {
            setTitle('');
            setContent('');
            setReminderAt('');
            setIsPublic(false);
            setImageFiles([]);
            setImagePreviews([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onNoteCreated && data?.[0]) {
                onNoteCreated(data[0]);
            }
        }
        setUploading(false);
    }, [title, content, reminderAt, isPublic, imageFiles, user, profile, onNoteCreated, uploadImages]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                if (title || content || imageFiles.length > 0) {
                    saveNote();
                }
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [title, content, imageFiles, saveNote]);

    const handleClose = async () => {
        await saveNote();
        setIsExpanded(false);
    };

    return (
        <div ref={containerRef} className="max-w-2xl mx-auto">
            <motion.div
                layout
                className={`bg-white dark:bg-gray-800 rounded-[20px] md:rounded-[24px] transition-all duration-300 border-2 ${isExpanded
                    ? 'shadow-2xl shadow-primary/20 border-primary/20'
                    : 'shadow-md shadow-gray-100 dark:shadow-black/20 border-transparent'
                    } overflow-hidden`}
            >
                <AnimatePresence>
                    {isExpanded && (
                        <motion.input
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            type="text"
                            placeholder="Give it a title..."
                            className="w-full px-5 md:px-7 pt-4 md:pt-6 pb-2 text-lg md:text-xl font-black outline-none placeholder-gray-300 dark:placeholder-gray-600 text-gray-900 dark:text-white tracking-tight bg-transparent"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    )}
                </AnimatePresence>

                {/* Multiple Images Previews Grid */}
                <AnimatePresence>
                    {imagePreviews.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2 mx-5 md:mx-7 mt-3"
                        >
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
                                    <img src={preview} alt={`preview-${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-start px-5 md:px-7 py-3 md:py-4 gap-3 md:gap-4">
                    {!isExpanded && <Plus className="text-primary mt-1 shrink-0" size={20} />}
                    <textarea
                        placeholder={isExpanded ? "Write your genius ideas here..." : "Take a quick note..."}
                        className="w-full outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600 font-bold text-base md:text-lg bg-transparent overflow-hidden leading-relaxed text-gray-700 dark:text-gray-300"
                        rows={isExpanded ? 4 : 1}
                        value={content}
                        onFocus={() => setIsExpanded(true)}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex flex-col sm:flex-row items-center justify-between px-5 md:px-7 py-4 bg-gray-50/50 dark:bg-gray-900/50 gap-4"
                        >
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full sm:w-auto">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Auto-saving</span>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex-1 sm:flex-none">
                                    <Bell size={14} className="text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="datetime-local"
                                        className="text-[10px] font-bold text-gray-600 dark:text-gray-400 outline-none bg-transparent w-full"
                                        value={reminderAt}
                                        onChange={(e) => setReminderAt(e.target.value)}
                                    />
                                </div>

                                {/* Multiple Photos Button with 'multiple' attribute */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    <Image size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        Photos {imageFiles.length > 0 && `(${imageFiles.length})`}
                                    </span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />

                                <button
                                    onClick={() => setIsPublic(!isPublic)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isPublic
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                                        }`}
                                >
                                    <Sparkles size={14} className={isPublic ? 'animate-pulse' : ''} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {isPublic ? 'Public Feed' : 'Keep Private'}
                                    </span>
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                disabled={uploading}
                                className="w-full sm:w-auto group px-8 py-2.5 bg-gray-900 dark:bg-primary dark:text-gray-900 text-white font-bold rounded-2xl transition-all hover:bg-gray-800 dark:hover:bg-primary/90 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none disabled:opacity-70"
                            >
                                <span>{uploading ? 'Saving...' : 'Done'}</span>
                                <Check size={18} className="text-primary dark:text-gray-900" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default NoteInput;