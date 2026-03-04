import { motion } from 'framer-motion';
import {
    FileText,
    Lock,
    Globe,
    User,
    Search,
    Zap
} from 'lucide-react';

const HowToUse = () => {
    const steps = [
        {
            title: "Quick Notes",
            desc: "Jot down your brilliant ideas instantly from the dashboard. Add titles, reminders, and even photos!",
            icon: <FileText className="text-yellow-500" size={24} />,
            color: "bg-yellow-50 dark:bg-yellow-500/10"
        },
        {
            title: "Private Channels",
            desc: "Create secure spaces for your team or family. Invite others via email and share notes privately.",
            icon: <Lock className="text-primary" size={24} />,
            color: "bg-primary/10"
        },
        {
            title: "Community Feed",
            desc: "Go global! Share your public notes with everyone and interact through likes and comments.",
            icon: <Globe className="text-blue-500" size={24} />,
            color: "bg-blue-50 dark:bg-blue-500/10"
        },
        {
            title: "Profile Premium",
            desc: "Customize your name and bio. Click any avatar to see a premium profile preview of others!",
            icon: <User className="text-pink-500" size={24} />,
            color: "bg-pink-50 dark:bg-pink-500/10"
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <Zap size={20} className="text-yellow-400" />
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">How to Jotdown</h3>
            </div>

            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">
                Master the art of productivity with Jotdown's powerful features.
            </p>

            <div className="grid grid-cols-1 gap-4 mt-8">
                {steps.map((step, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={step.title}
                        className="flex gap-4 p-5 rounded-[28px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${step.color} group-hover:scale-110 transition-transform`}>
                            {step.icon}
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 dark:text-white mb-1 tracking-tight">{step.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                {step.desc}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-[32px] mt-8 text-white relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pro Tip</span>
                </div>
                <p className="text-sm font-medium leading-relaxed relative z-10 text-gray-300">
                    Use the <Search size={14} className="inline mx-1 text-white" /> search bar in the dashboard to quickly find any note by its content or title.
                </p>
            </div>
        </div>
    );
};

export default HowToUse;
