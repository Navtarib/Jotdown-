import { useState, memo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, X, Check, Clock, Sparkles, Bell, Archive, ArchiveRestore, RotateCcw, Image, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoteCard = memo(({ note, onOptimisticDelete, onNoteUpdated, isOwner = true }) => {
    const toLocalDatetime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    // Helper to safely parse images
    const parseImages = (n) => {
        if (Array.isArray(n?.image_urls) && n.image_urls.length > 0) return n.image_urls;
        if (typeof n?.image_urls === 'string' && n.image_urls.startsWith('[')) {
            try {
                const parsed = JSON.parse(n.image_urls);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error('Error parsing image_urls JSON:', e);
            }
        }
        if (n?.image_url) return [n.image_url];
        return [];
    };

    const initialImages = parseImages(note);

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(note.title || '');
    const [editContent, setEditContent] = useState(note.content || '');
    const [editReminderAt, setEditReminderAt] = useState(toLocalDatetime(note.reminder_at));
    const [editImages, setEditImages] = useState(initialImages);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const editFileInputRef = useRef(null);

    const handleOpenEdit = () => {
        setEditTitle(note.title || '');
        setEditContent(note.content || '');
        setEditReminderAt(toLocalDatetime(note.reminder_at));
        setEditImages(parseImages(note));
        setNewImageFiles([]);
        setNewImagePreviews([]);
        setIsEditing(true);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();

        if (note.is_trashed) {
            if (onOptimisticDelete) onOptimisticDelete(note.id);
            const { error } = await supabase.from('notes').delete().eq('id', note.id);
            if (error) {
                console.error('Error deleting note permanently:', error.message);
                alert(`Failed to delete note permanently: ${error.message}`);
            }
        } else {
            const { error } = await supabase
                .from('notes')
                .update({ is_trashed: true })
                .eq('id', note.id);
            if (error) {
                console.error('Error moving to trash:', error.message);
                alert(`Failed to move to trash: ${error.message}`);
            }
        }
    };

    const handleRestore = async (e) => {
        e.stopPropagation();
        const { error } = await supabase
            .from('notes')
            .update({ is_trashed: false })
            .eq('id', note.id);

        if (error) {
            console.error('Error restoring note:', error.message);
            alert(`Failed to restore note: ${error.message}`);
        }
    };

    const handleArchive = async (e) => {
        e.stopPropagation();
        const { error } = await supabase
            .from('notes')
            .update({ is_archived: !note.is_archived })
            .eq('id', note.id);

        if (error) {
            console.error('Error toggling archive:', error.message);
            alert(`Failed to update archive status: ${error.message}`);
        }
    };

    const handleSelectNewImages = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setNewImageFiles((prev) => [...prev, ...files]);
        const previews = files.map((f) => URL.createObjectURL(f));
        setNewImagePreviews((prev) => [...prev, ...previews]);
    };

    const removeExistingImage = (index) => {
        setEditImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index) => {
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
        setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
        if (editFileInputRef.current) editFileInputRef.current.value = '';
    };

    const handleUpdate = async () => {
        if (isSaving) return;

        // Check if anything actually changed
        const currentInitialImages = parseImages(note);
        const imagesUnchanged =
            newImageFiles.length === 0 &&
            editImages.length === currentInitialImages.length &&
            editImages.every((val, index) => val === currentInitialImages[index]);

        if (
            editTitle === (note.title || '') &&
            editContent === (note.content || '') &&
            editReminderAt === toLocalDatetime(note.reminder_at) &&
            imagesUnchanged
        ) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);

        try {
            // Upload any new images
            let uploadedUrls = [];
            if (newImageFiles.length > 0) {
                const uploadPromises = newImageFiles.map(async (file) => {
                    const ext = file.name.split('.').pop();
                    const path = `${note.user_id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
                    const { error: upErr } = await supabase.storage
                        .from('note-images')
                        .upload(path, file, { cacheControl: '3600', upsert: false });
                    if (upErr) throw upErr;
                    const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(path);
                    return urlData.publicUrl;
                });
                uploadedUrls = await Promise.all(uploadPromises);
            }

            const finalImageUrls = [...editImages, ...uploadedUrls];
            const isoReminder = editReminderAt ? new Date(editReminderAt).toISOString() : null;

            const { error } = await supabase
                .from('notes')
                .update({
                    title: editTitle,
                    content: editContent,
                    reminder_at: isoReminder,
                    image_urls: finalImageUrls,
                    image_url: finalImageUrls[0] || null,
                })
                .eq('id', note.id);

            if (error) {
                console.error('Error updating note:', error.message);
                alert(`Failed to update note: ${error.message}`);
            } else {
                setIsEditing(false);
                if (onNoteUpdated) {
                    onNoteUpdated({
                        ...note,
                        title: editTitle,
                        content: editContent,
                        reminder_at: isoReminder,
                        image_urls: finalImageUrls,
                        image_url: finalImageUrls[0] || null,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to update note images:', err.message);
            alert(`Failed to upload images: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const images = parseImages(note);

    return (
        <>
            <motion.div
                onClick={() => isOwner && handleOpenEdit()}
                className="group relative bg-white dark:bg-gray-800 p-6 rounded-[24px] border border-gray-100 dark:border-gray-700 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
            >
                {/* Subtle accent bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex-1">
                    {note.title && (
                        <h3 className="font-black text-gray-900 dark:text-white mb-3 text-lg leading-tight tracking-tight break-words">
                            {note.title}
                        </h3>
                    )}

                    {/* IMAGES DISPLAY SECTION */}
                    {images.length > 0 && (
                        <div className="mb-3 rounded-2xl overflow-hidden">
                            {images.length === 1 ? (
                                <img
                                    src={images[0]}
                                    alt="Note attachment"
                                    className="w-full max-h-56 object-cover rounded-2xl cursor-pointer"
                                    loading="lazy"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(images[0], '_blank');
                                    }}
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {images.slice(0, 4).map((url, index) => (
                                        <div key={index} className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                                            <img
                                                src={url}
                                                alt={`Note attachment ${index + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                                loading="lazy"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(url, '_blank');
                                                }}
                                            />
                                            {index === 3 && images.length > 4 && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(images[3], '_blank');
                                                    }}
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
                    )}

                    <p className="text-gray-600 dark:text-gray-300 font-bold whitespace-pre-wrap break-words text-sm leading-relaxed mb-4 max-h-65 overflow-y-auto">
                        {note.content}
                    </p>

                    {note.reminder_at && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mb-4">
                            <Bell size={12} className="text-primary" />
                            <span className="text-[10px] font-black text-primary/80">
                                {new Date(note.reminder_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700 mt-auto">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-500">
                        <Clock size={12} />
                        {formatDate(note.created_at)}
                    </div>

                    <div className="flex gap-2">
                        {isOwner && (
                            note.is_trashed ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleRestore}
                                        className="p-2.5 md:p-3 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-xl md:rounded-2xl transition-all shadow-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 active:scale-95"
                                        title="Restore"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="p-2.5 md:p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl md:rounded-2xl transition-all shadow-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 active:scale-95"
                                        title="Delete Forever"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleArchive}
                                        className="p-2.5 md:p-3 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl md:rounded-2xl transition-all shadow-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100"
                                        title={note.is_archived ? "Unarchive" : "Archive"}
                                    >
                                        {note.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="p-2.5 md:p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl md:rounded-2xl transition-all shadow-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100"
                                        title="Move to Trash"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ))}
                    </div>
                </div>
            </motion.div>

            {/* Edit Modal / Overlay */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                            onClick={() => !isSaving && setIsEditing(false)}
                        />
                        <motion.div
                            layoutId={note.id}
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[28px] md:rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] p-6 md:p-10 overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-orange-500" />

                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Editing Mode</span>
                                </div>
                                <button
                                    onClick={() => !isSaving && setIsEditing(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Existing & New Photos in Modal */}
                            {(editImages.length > 0 || newImagePreviews.length > 0) && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                    {editImages.map((url, index) => (
                                        <div key={`existing-${index}`} className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
                                            <img
                                                src={url}
                                                alt="attachment"
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => window.open(url, '_blank')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(index)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                                title="Remove photo"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}

                                    {newImagePreviews.map((preview, index) => (
                                        <div key={`new-${index}`} className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700 border-2 border-primary/50">
                                            <img
                                                src={preview}
                                                alt="new attachment"
                                                className="w-full h-full object-cover"
                                            />
                                            <span className="absolute bottom-1 left-2 bg-primary text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                                                New
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(index)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                                title="Cancel photo"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <input
                                type="text"
                                placeholder="Title"
                                className="w-full text-2xl md:text-3xl font-black mb-4 md:mb-6 outline-none text-gray-900 dark:text-white tracking-tighter placeholder-gray-200 dark:placeholder-gray-700 bg-transparent"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="Let your thoughts flow..."
                                className="w-full min-h-[150px] md:min-h-[200px] outline-none text-gray-700 dark:text-gray-300 resize-none text-lg md:text-xl leading-relaxed font-bold placeholder-gray-200 dark:placeholder-gray-700 bg-transparent"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                            />

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm shrink-0">
                                        <Bell size={18} className="text-primary" />
                                    </div>
                                    <div className="flex flex-col flex-1 sm:flex-none">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Reminder</span>
                                        <input
                                            type="datetime-local"
                                            className="text-sm font-bold text-gray-700 dark:text-gray-300 outline-none bg-transparent w-full"
                                            value={editReminderAt}
                                            onChange={(e) => setEditReminderAt(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Add more photos in edit mode */}
                                <div className="w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => editFileInputRef.current?.click()}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/40 transition-all text-xs font-bold"
                                    >
                                        <Image size={15} /> Add Photos
                                    </button>
                                    <input
                                        ref={editFileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleSelectNewImages}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 md:mt-8">
                                <button
                                    onClick={handleUpdate}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto group px-8 md:px-10 py-3 md:py-4 bg-gray-900 dark:bg-primary dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-primary/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200 dark:shadow-none active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin text-primary dark:text-gray-900" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Save Changes</span>
                                            <Check size={20} className="text-primary dark:text-gray-900" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
});

export default NoteCard;