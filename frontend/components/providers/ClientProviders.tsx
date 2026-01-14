'use client';

import { ReactNode, useEffect, useState } from 'react';
import { DevModeProvider, useDevModeOptional } from '@/contexts/DevModeContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TutorialProvider, useTutorialOptional } from '@/contexts/TutorialContext';
import { DevModePanel } from '@/components/dev/DevModePanel';
import { TutorialOverlay, TutorialStartModal } from '@/components/tutorial/TutorialOverlay';

interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * Inner component that connects DevMode to Theme and manages Tutorial
 * This allows us to force dark mode when dev mode is enabled
 */
function ThemeConnector({ children }: { children: ReactNode }) {
  const devMode = useDevModeOptional();
  const tutorial = useTutorialOptional();
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);
  
  // Force dark theme when dev mode is enabled
  const forcedTheme = devMode?.isEnabled ? 'dark' : null;
  
  // Show tutorial prompt when dev mode is first enabled and user hasn't seen quick start
  useEffect(() => {
    if (devMode?.isEnabled && !hasCheckedFirstTime) {
      setHasCheckedFirstTime(true);
      // Small delay to let the UI settle
      const timeout = setTimeout(() => {
        if (!tutorial?.hasSeenQuickStart) {
          setShowTutorialPrompt(true);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [devMode?.isEnabled, hasCheckedFirstTime, tutorial?.hasSeenQuickStart]);
  
  // Reset check when dev mode is disabled
  useEffect(() => {
    if (!devMode?.isEnabled) {
      setHasCheckedFirstTime(false);
    }
  }, [devMode?.isEnabled]);
  
  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      {children}
      {/* Global Dev Mode Panel - renders when enabled and showPanel is true */}
      <DevModePanel />
      {/* Tutorial Overlay - renders when tutorial is active */}
      <TutorialOverlay />
      {/* Tutorial Start Modal - prompts new users */}
      <TutorialStartModal
        isOpen={showTutorialPrompt}
        onClose={() => setShowTutorialPrompt(false)}
        onStartQuick={() => {
          setShowTutorialPrompt(false);
          tutorial?.startTutorial('quick');
        }}
        onStartDeep={() => {
          setShowTutorialPrompt(false);
          tutorial?.startTutorial('deep');
        }}
        hasSeenQuickStart={tutorial?.hasSeenQuickStart ?? false}
      />
    </ThemeProvider>
  );
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <DevModeProvider>
      <TutorialProvider>
        <ThemeConnector>
          {children}
        </ThemeConnector>
      </TutorialProvider>
    </DevModeProvider>
  );
}
