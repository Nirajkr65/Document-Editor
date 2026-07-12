import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">CollabSpace</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Beta</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
          <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
          <a href="#workspace" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Workspace Demo</a>
          <a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer mr-1"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-550 dark:text-indigo-400" />}
          </button>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Workspace
              </Link>
              <Link to="/profile" className="flex items-center gap-2 group">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-indigo-550 dark:group-hover:border-indigo-400 transition-colors" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-550 dark:text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-550/20 dark:border-indigo-500/35 group-hover:border-indigo-550 dark:group-hover:border-indigo-400 transition-colors">
                    {getInitials(user?.name)}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-650 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-650/25 active:scale-[0.98]">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
