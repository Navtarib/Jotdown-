import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync Theme Settings from LocalStorage
    const isDark = localStorage.getItem('isDarkMode') === 'true';
    const accentColor = localStorage.getItem('accentColor') || '#facc15';

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--accent-color', accentColor);

    // Explicitly set page title
    document.title = "Jotdown";

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {!session ? (
        <Landing />
      ) : (
        <Dashboard user={session.user} />
      )}
    </div>
  );
}

export default App;
