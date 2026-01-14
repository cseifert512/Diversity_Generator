'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type TutorialMode = 'quick' | 'deep';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  tip?: string;
  position: TooltipPosition;
  mode: 'quick' | 'deep' | 'both';
  requiresAction?: boolean;
  actionLabel?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface TutorialState {
  isActive: boolean;
  mode: TutorialMode;
  currentStepIndex: number;
  completedSteps: Set<string>;
  hasSeenQuickStart: boolean;
  hasSeenDeepDive: boolean;
}

export interface TutorialContextValue extends TutorialState {
  // Actions
  startTutorial: (mode: TutorialMode) => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTutorial: () => void;
  markStepComplete: (stepId: string) => void;
  resetTutorial: () => void;
  
  // Computed
  currentStep: TutorialStep | null;
  totalSteps: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  
  // Step definitions
  steps: TutorialStep[];
}

// ============================================================================
// Step Definitions
// ============================================================================

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ========== QUICK START STEPS ==========
  {
    id: 'welcome',
    targetSelector: '[data-tutorial="dev-toggle"]',
    title: 'Welcome to Dev Mode',
    description: 'Dev Mode gives you deep insights into how the floor plan generation model behaves. Toggle it on to unlock powerful debugging and analysis tools.',
    tip: 'When Dev Mode is active, the app switches to dark mode for a focused analysis experience.',
    position: 'bottom',
    mode: 'both',
  },
  {
    id: 'panel-overview',
    targetSelector: '[data-tutorial="dev-panel"]',
    title: 'The Dev Mode Panel',
    description: 'This is your command center for analyzing floor plan generations. Access visual comparisons, room analysis, batch testing, and statistical insights.',
    position: 'left',
    mode: 'both',
  },
  {
    id: 'visual-compare',
    targetSelector: '[data-tutorial="tab-visual"]',
    title: 'Visual Comparison',
    description: 'Compare original and edited floor plans side-by-side, as overlays, or with a slider. Hover over rooms to highlight matching rooms across both views.',
    tip: 'Use the linked hover feature to track how specific rooms change between versions.',
    position: 'bottom',
    mode: 'both',
  },
  {
    id: 'room-deltas',
    targetSelector: '[data-tutorial="tab-rooms"]',
    title: 'Room Changes',
    description: 'See exactly what changed: which rooms were added, removed, or resized. Get precise area measurements and delta calculations.',
    position: 'bottom',
    mode: 'both',
  },
  {
    id: 'batch-intro',
    targetSelector: '[data-tutorial="tab-batch"]',
    title: 'Batch Generation',
    description: 'Run multiple generations with the same configuration to test model consistency. Choose "Same Seed" to test determinism or "Random Seeds" for diversity.',
    tip: 'Start with 5-10 generations for quick insights, or run 20+ for statistical significance.',
    position: 'bottom',
    mode: 'both',
  },
  {
    id: 'analytics-overview',
    targetSelector: '[data-tutorial="tab-stats"]',
    title: 'Statistical Analytics',
    description: 'After running a batch, explore consistency scores, size distributions, position variance, and room adjacency patterns.',
    position: 'bottom',
    mode: 'both',
  },
  
  // ========== DEEP DIVE STEPS ==========
  {
    id: 'linked-hover',
    targetSelector: '[data-tutorial="compare-view"]',
    title: 'Linked Room Highlighting',
    description: 'Hover over any room in the SVG view to highlight all rooms of the same type across both plans. This helps you track how specific spaces move or resize.',
    tip: 'Works best with SVG format selected. JPEG mode shows the raw model output.',
    position: 'top',
    mode: 'deep',
  },
  {
    id: 'format-toggle',
    targetSelector: '[data-tutorial="format-toggle"]',
    title: 'JPEG vs SVG',
    description: 'Toggle between JPEG (raw model output) and SVG (parsed vector format) views. JPEG shows exactly what the model generated; SVG enables interactive features.',
    position: 'bottom',
    mode: 'deep',
  },
  {
    id: 'diff-heatmap',
    targetSelector: '[data-tutorial="diff-heatmap"]',
    title: 'Difference Heatmap',
    description: 'Visualize pixel-level differences between plans. Red/orange areas show significant changes; blue shows minor variations. Adjust the threshold to filter noise.',
    tip: 'Lower threshold values reveal more subtle differences.',
    position: 'top',
    mode: 'deep',
  },
  {
    id: 'batch-runner',
    targetSelector: '[data-tutorial="batch-runner"]',
    title: 'Running Batch Tests',
    description: 'Configure how many generations to run (1-50). "Same Seed" mode tests if the model is deterministic. "Random Seeds" explores output diversity.',
    tip: 'You can cancel a batch mid-run if needed. Results are preserved.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'room-overlay',
    targetSelector: '[data-tutorial="room-overlay"]',
    title: 'Room Boundary Overlay',
    description: 'See room boundaries from multiple generations stacked on top of each other. Consistent layouts show overlapping outlines; variance appears as spread.',
    position: 'top',
    mode: 'deep',
  },
  {
    id: 'consistency-metrics',
    targetSelector: '[data-tutorial="stats-consistency"]',
    title: 'Consistency Scoring',
    description: 'Get an overall consistency score (0-100) based on area variance, room count stability, type consistency, and pairwise similarity across generations.',
    tip: 'Scores above 80 indicate highly consistent model behavior.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'size-distribution',
    targetSelector: '[data-tutorial="stats-distribution"]',
    title: 'Size Distribution',
    description: 'View box plots and histograms of room sizes across generations. See mean, median, standard deviation, and outliers for total area or specific room types.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'position-scatter',
    targetSelector: '[data-tutorial="stats-position"]',
    title: 'Position Variance',
    description: 'A scatter plot showing where each room type tends to be placed. Confidence ellipses show the spread. Tighter clusters mean more predictable placement.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'adjacency-graph',
    targetSelector: '[data-tutorial="stats-adjacency"]',
    title: 'Room Topology',
    description: 'Visualize which rooms are adjacent to each other. Compare graphs between generations to see if the model maintains consistent room relationships.',
    tip: 'Use the compare mode to highlight added/removed connections.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'sensitivity-matrix',
    targetSelector: '[data-tutorial="stats-sensitivity"]',
    title: 'Sensitivity Analysis',
    description: 'See how editing one room affects others. The matrix shows impact relationships—green means the affected room grew, red means it shrank.',
    tip: 'This requires edit history. Make several edits to populate the matrix.',
    position: 'right',
    mode: 'deep',
  },
  {
    id: 'tutorial-complete',
    targetSelector: '[data-tutorial="dev-panel-header"]',
    title: 'You\'re Ready!',
    description: 'You now know how to use Dev Mode to understand and debug the floor plan generation model. Explore, experiment, and discover patterns in the model\'s behavior.',
    tip: 'Access this tutorial anytime from the Help button in the panel header.',
    position: 'center',
    mode: 'both',
  },
];

// ============================================================================
// Context
// ============================================================================

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_STORAGE_KEY = 'drafted_tutorial_state';

// ============================================================================
// Provider
// ============================================================================

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TutorialMode>('quick');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [hasSeenQuickStart, setHasSeenQuickStart] = useState(false);
  const [hasSeenDeepDive, setHasSeenDeepDive] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHasSeenQuickStart(parsed.hasSeenQuickStart || false);
        setHasSeenDeepDive(parsed.hasSeenDeepDive || false);
        if (parsed.completedSteps) {
          setCompletedSteps(new Set(parsed.completedSteps));
        }
      }
    } catch (e) {
      console.error('[Tutorial] Failed to load state:', e);
    }
  }, []);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
        hasSeenQuickStart,
        hasSeenDeepDive,
        completedSteps: Array.from(completedSteps),
      }));
    } catch (e) {
      console.error('[Tutorial] Failed to save state:', e);
    }
  }, [hasSeenQuickStart, hasSeenDeepDive, completedSteps]);

  // Get steps for current mode
  const steps = TUTORIAL_STEPS.filter(
    step => step.mode === 'both' || step.mode === mode
  );

  const currentStep = isActive && steps[currentStepIndex] ? steps[currentStepIndex] : null;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Call onEnter when step changes
  useEffect(() => {
    if (currentStep?.onEnter) {
      currentStep.onEnter();
    }
  }, [currentStep?.id]);

  const startTutorial = useCallback((tutorialMode: TutorialMode) => {
    setMode(tutorialMode);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    if (currentStep?.onExit) {
      currentStep.onExit();
    }
    setIsActive(false);
    
    // Mark as seen
    if (mode === 'quick') {
      setHasSeenQuickStart(true);
    } else {
      setHasSeenDeepDive(true);
    }
  }, [currentStep, mode]);

  const nextStep = useCallback(() => {
    if (currentStep) {
      setCompletedSteps(prev => new Set(prev).add(currentStep.id));
      if (currentStep.onExit) {
        currentStep.onExit();
      }
    }
    
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, currentStepIndex, totalSteps, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep?.onExit) {
      currentStep.onExit();
    }
    
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStep, currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) {
      if (currentStep?.onExit) {
        currentStep.onExit();
      }
      setCurrentStepIndex(index);
    }
  }, [totalSteps, currentStep]);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  const markStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
  }, []);

  const resetTutorial = useCallback(() => {
    setCompletedSteps(new Set());
    setHasSeenQuickStart(false);
    setHasSeenDeepDive(false);
    try {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    } catch (e) {
      console.error('[Tutorial] Failed to reset:', e);
    }
  }, []);

  const value: TutorialContextValue = {
    // State
    isActive,
    mode,
    currentStepIndex,
    completedSteps,
    hasSeenQuickStart,
    hasSeenDeepDive,
    
    // Actions
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    goToStep,
    skipTutorial,
    markStepComplete,
    resetTutorial,
    
    // Computed
    currentStep,
    totalSteps,
    progress,
    isFirstStep,
    isLastStep,
    
    // Steps
    steps,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

export function useTutorialOptional(): TutorialContextValue | null {
  return useContext(TutorialContext);
}

