import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, Edit3, X, Check, Clock, Sparkles, Bell, Archive, ArchiveRestore, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoteCard = ({ note, onOptimisticDelete, onNoteUpdated, isOwner = true }) => {
    const toLocalDatetime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(note.title);
    const [editContent, setEditContent] = useState(note.content);
    const [editReminderAt, setEditReminderAt] = useState(toLocalDatetime(note.reminder_at));

    const handleDelete = async (e) => {
        console.log('Delete button clicked for note:', note.id);
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

    const handleUpdate = async () => {
        if (editTitle === note.title && editContent === note.content && editReminderAt === (note.reminder_at || '')) {
            setIsEditing(false);
            return;
        }

        const isoReminder = editReminderAt ? new Date(editReminderAt).toISOString() : null;

        const { error } = await supabase
            .from('notes')
            .update({
                title: editTitle,
                content: editContent,
                reminder_at: isoReminder
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
                    reminder_at: isoReminder
                });
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <>
            <motion.div
                onClick={() => setIsEditing(true)}
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

                    {note.image_url && (
                        <div className="mb-3 rounded-2xl overflow-hidden">
                            <img
                                src={note.image_url}
                                alt="note"
                                className="w-full max-h-56 object-cover"
                                onClick={e => { e.stopPropagation(); window.open(note.image_url, '_blank'); }}
                            />
                        </div>
                    )}

                    <p className="text-gray-600 dark:text-gray-300 font-bold whitespace-pre-wrap break-words text-sm leading-relaxed mb-4">
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
                                        className="p-2.5 md:p-3 text-gray-500 hover:text-red-50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl md:rounded-2xl transition-all shadow-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100"
                                        title="Move to Trash"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ))}
                    </div>
                </div>
            </motion.div >

            {/* Edit Modal / Overlay */}
            < AnimatePresence >
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                            onClick={handleUpdate}
                        />
                        <motion.div
                            layoutId={note.id}
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[28px] md:rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] p-6 md:p-10 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-orange-500" />

                            <div className="flex items-center gap-2 text-primary mb-4 md:mb-6">
                                <Sparkles size={14} md={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Editing Mode</span>
                            </div>

                            <input
                                type="text"
                                placeholder="Title"
                                className="w-full text-2xl md:text-3xl font-black mb-4 md:mb-6 outline-none text-gray-900 dark:text-white tracking-tighter placeholder-gray-200 dark:placeholder-gray-700 bg-transparent"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="Let your thoughts flow..."
                                className="w-full min-h-[200px] md:min-h-[300px] outline-none text-gray-700 dark:text-gray-300 resize-none text-lg md:text-xl leading-relaxed font-bold placeholder-gray-200 dark:placeholder-gray-700 bg-transparent"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                            />

                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
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
                            </div>

                            <div className="flex justify-end gap-3 mt-6 md:mt-8">
                                <button
                                    onClick={handleUpdate}
                                    className="w-full sm:w-auto group px-8 md:px-10 py-3 md:py-4 bg-gray-900 dark:bg-primary dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-primary/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200 dark:shadow-none active:scale-95"
                                >
                                    <span>Save Changes</span>
                                    <Check size={20} className="text-primary dark:text-gray-900" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </>
    );
};

export default NoteCard;
