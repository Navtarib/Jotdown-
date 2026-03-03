import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import {
    Zap,
    Shield,
    Smartphone,
    Cloud,
    Clock,
    CheckCircle2,
    ArrowRight,
    MousePointer2,
    Sun,
    Moon
} from 'lucide-react';

const Landing = () => {
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const isDark = localStorage.getItem('isDarkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('isDarkMode', newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        });
        if (error) console.error('Error:', error.message);
    };



    const features = [
        {
            icon: <Zap className="text-yellow-400" size={32} />,
            title: "Real-time Sync",
            description: "Changes reflect instantly across all your devices. No more refreshing."
        },
        {
            icon: <Shield className="text-blue-500" size={32} />,
            title: "Enterprise Security",
            description: "Your notes are protected with Row Level Security and OAuth 2.0."
        },
        {
            icon: <Smartphone className="text-purple-500" size={32} />,
            title: "Responsive First",
            description: "A seamless experience from your desktop to your smartphone."
        },
        {
            icon: <Clock className="text-green-500" size={32} />,
            title: "Effortless History",
            description: "Auto-saving keeps your thoughts safe the moment you type them."
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-primary/20">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-white font-black text-2xl italic">J</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Jotdown!</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-3 bg-gray-100 dark:bg-gray-800 text-yellow-500 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-90"
                            title="Toggle Theme"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-6 py-2.5 bg-gray-900 dark:bg-primary dark:text-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 overflow-hidden">
                {/* Animated Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse transition-all duration-700" />
                    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] transition-all duration-700" />
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold tracking-wide uppercase mb-6 border border-primary/20">
                            The Future of Note Taking
                        </span>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] mb-8">
                            Capture your <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">brilliance</span> <br />
                            in real-time.
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
                            Stop losing ideas in the noise. Jotdown! is the lightning-fast, secure, and intuitive space for your growing empire of thoughts.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="group w-full sm:w-auto px-10 py-5 bg-gray-900 dark:bg-primary dark:text-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-primary/90 transition-all shadow-2xl shadow-gray-400 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                Sign up free
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                            >
                                See features
                            </button>
                        </div>
                    </motion.div>

                    {/* Floating UI elements mockup */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 1 }}
                        className="mt-20 relative max-w-5xl mx-auto"
                    >
                        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 h-12 border-b border-gray-100 dark:border-gray-700 flex items-center px-6 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50 dark:bg-gray-900/50">
                                {[
                                    { t: "Weekly Grocery List", c: "Milk, Eggs, Bread, Avocados..." },
                                    { t: "Project Ideas", c: "Build a real-time note app with Supabase and React." },
                                    { t: "Meeting Notes", c: "Discuss new features for the Q3 roadmap." }
                                ].map((note, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="h-2 w-12 bg-primary rounded-full mb-3" />
                                        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{note.t}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{note.c}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features-section" className="py-32 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">Focus on what matters.</h2>
                        <p className="text-gray-500 text-xl font-medium">We handled everything else.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                            >
                                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 w-fit rounded-2xl">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{f.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Proof / Hook Section */}
            <section className="py-32 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <h2 className="text-5xl font-black leading-tight mb-8">
                            Ready to reclaim your <br />
                            <span className="text-primary italic">mental clarity?</span>
                        </h2>
                        <div className="space-y-6">
                            {[
                                "Instant cloud synchronization",
                                "Passwordless OAuth security",
                                "Advanced masonry organization",
                                "Zero-latency editing experience"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-6 h-6 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="text-green-600" size={14} />
                                    </div>
                                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-primary to-orange-400 rounded-[40px] blur-2xl opacity-20 animate-pulse" />
                        <div className="relative bg-gray-900 dark:bg-gray-800 rounded-[40px] p-10 text-white shadow-2xl">
                            <span className="text-primary font-bold mb-4 block">"The best tool I've used"</span>
                            <p className="text-2xl font-light leading-relaxed mb-8">
                                "Jotdown! has completely transformed the way I organize my digital life. It's so fast it feels like magic."
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800" />
                                <div>
                                    <div className="font-bold">Alex Rivera</div>
                                    <div className="text-sm text-gray-400 italic">Product Architect @ Flow</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Auth Section */}
            <section id="auth-section" className="py-40 bg-gray-900 border-t border-gray-800">
                <div className="max-w-xl mx-auto px-6 text-center">
                    <h2 className="text-5xl font-black text-white mb-6">Join the revolution.</h2>
                    <p className="text-gray-400 text-xl font-medium mb-12">
                        No credit card. No password. Just your existing account and your big ideas.
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-4 px-8 py-5 bg-white dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98] shadow-xl"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                            Continue with Google
                        </button>

                    </div>

                    <p className="mt-8 text-gray-500 text-sm">
                        By signing up, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-gray-100 dark:border-gray-800 text-center">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-black text-lg italic">j</span>
                    </div>
                    <span className="text-lg font-bold">Jotdown!</span>
                </div>
                <p className="text-gray-400 font-medium tracking-tight">
                    &copy; 2026 Jotdown!. Crafted with intensity by {"Navtech"}. All rights reserved. <br />
                    <a
                        href="https://yourwebsite.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        Naveed Ahmed
                    </a>.
                </p>
            </footer>
        </div>
    );
};

export default Landing;
