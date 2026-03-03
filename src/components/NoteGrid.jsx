import { motion, AnimatePresence } from 'framer-motion';
import NoteCard from './NoteCard';

const NoteGrid = ({ notes, onOptimisticDelete, onNoteUpdated }) => {
    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <p className="text-lg">Notes you add appear here</p>
            </div>
        );
    }

    return (
        <div className="columns-1 xs:columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <AnimatePresence mode="popLayout">
                {notes.map((note) => (
                    <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="break-inside-avoid"
                    >
                        <NoteCard
                            note={note}
                            onOptimisticDelete={onOptimisticDelete}
                            onNoteUpdated={onNoteUpdated}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NoteGrid;
