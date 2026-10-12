/**
 * ARCHIVED FEATURE: ThemeToggle UI Components
 * Archived Date: October 2026
 * Description: Sun/Moon button toggles for desktop navigation, mobile drawer,
 * floating bottom-left widget, and admin dashboard header.
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md'
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700/80 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs'
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className={`${iconSizes[size]} text-amber-400 transition-transform duration-300 rotate-0`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-slate-700 transition-transform duration-300 rotate-0`} />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-bold tracking-tight">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export const FloatingThemeToggle: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to Light Mode (Default)' : 'Switch to Dark Mode'}
      className="fixed bottom-20 left-4 z-40 bg-white/90 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-amber-300 p-2.5 sm:px-3 sm:py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 cursor-pointer group active:scale-95"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 group-hover:-rotate-12 transition-transform" />
      )}
      <span className="hidden sm:inline text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-200">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};
