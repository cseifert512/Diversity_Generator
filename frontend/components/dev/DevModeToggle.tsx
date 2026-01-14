'use client';

import { motion } from 'framer-motion';
import { Code2, Bug, Moon, Sun } from 'lucide-react';
import { useDevModeOptional } from '@/contexts/DevModeContext';
import { useThemeOptional } from '@/contexts/ThemeContext';

interface DevModeToggleProps {
  className?: string;
}

export function DevModeToggle({ className = '' }: DevModeToggleProps) {
  const devMode = useDevModeOptional();
  const theme = useThemeOptional();
  
  // Don't render if context is not available
  if (!devMode) {
    return null;
  }
  
  const { isEnabled, toggleDevMode, history, showDevPanel } = devMode;
  const isDark = theme?.isDark ?? false;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Toggle Button */}
      <button
        data-tutorial="dev-toggle"
        onClick={toggleDevMode}
        className={`
          relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold
          transition-all duration-200 border
          ${isEnabled
            ? 'bg-gradient-to-r from-coral-500 to-orange-500 text-white border-coral-600 shadow-md'
            : 'bg-drafted-bg text-drafted-gray border-drafted-border hover:border-drafted-muted hover:text-drafted-black'
          }
        `}
        title={isEnabled ? 'Disable Dev Mode (exits dark mode)' : 'Enable Dev Mode (activates dark mode)'}
      >
        {/* Icon - shows moon when enabled (dark mode), code otherwise */}
        {isEnabled ? (
          <Moon className="w-3.5 h-3.5" />
        ) : (
          <Code2 className="w-3.5 h-3.5" />
        )}
        <span>DEV</span>
        
        {/* Active indicator pulse */}
        {isEnabled && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </button>
      
      {/* Show Panel Button (when enabled and has history) */}
      {isEnabled && history.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={showDevPanel}
          className={`
            flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium
            transition-colors border
            ${isDark 
              ? 'bg-amber-900/30 text-amber-400 border-amber-700 hover:bg-amber-900/50' 
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }
          `}
          title="View Debug Panel"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>{history.length}</span>
        </motion.button>
      )}
      
      {/* Dark mode indicator when enabled */}
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1 text-xs text-drafted-muted"
        >
          <Moon className="w-3 h-3" />
          <span className="hidden sm:inline">Dark Mode</span>
        </motion.div>
      )}
    </div>
  );
}
