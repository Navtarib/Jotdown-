import { motion } from 'framer-motion';
import { ShieldAlert, Scale, ShieldCheck, AlertTriangle } from 'lucide-react';

const TermsPolicy = () => {
    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center gap-3 mb-2">
                <Scale size={20} className="text-blue-500" />
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Legal & Policy</h3>
            </div>

            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed">
                Last Updated: March 4, 2026. Please read these terms carefully to understand your rights and responsibilities.
            </p>

            <div className="space-y-6">
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert size={16} className="text-red-500" />
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">Developer Protection</h4>
                    </div>
                    <div className="p-5 bg-red-50/50 dark:bg-red-500/5 rounded-3xl border border-red-100 dark:border-red-900/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            Jotdown is provided <span className="font-black text-gray-900 dark:text-white">"AS IS"</span>. The developer shall <span className="font-black text-gray-900 dark:text-white">NOT be liable</span> for any loss of data, system downtime, or any direct/indirect damages. Use of this app is entirely at your own risk.
                        </p>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Scale size={16} className="text-blue-500" />
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">PECA 2016 & IT Act</h4>
                    </div>
                    <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            Users must comply with the <span className="font-black text-gray-900 dark:text-white">Prevention of Electronic Crimes Act (PECA), 2016</span> and Pakistan IT laws. Any illegal activity, including data forgery or cyber-stalking, will result in immediate termination.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck size={16} className="text-green-500" />
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">User Responsibilities</h4>
                    </div>
                    <ul className="grid gap-3">
                        {[
                            "You are solely responsible for all content you post.",
                            "The developer does not monitor private channel content.",
                            "Public notes are visible to the entire community.",
                            "Maintain your own account credentials securely."
                        ].map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mt-1.5 shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="p-6 bg-gray-900 rounded-[32px] text-white relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={14} className="text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jurisdiction</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-gray-300">
                        These terms are governed by the laws of the <span className="text-white font-bold">Islamic Republic of Pakistan</span>. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pakistan.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsPolicy;
