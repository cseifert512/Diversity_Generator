'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTutorialOptional, TutorialMode } from '@/contexts/TutorialContext';
import { TutorialSpotlightSVG } from './TutorialSpotlight';
import { TutorialTooltip, TutorialProgress } from './TutorialTooltip';
import { Zap, BookOpen, X } from 'lucide-react';

/**
 * Main tutorial overlay component that orchestrates the spotlight and tooltip
 */
export function TutorialOverlay() {
  const tutorial = useTutorialOptional();
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const handleSpotlightReady = useCallback((rect: typeof targetRect) => {
    setTargetRect(rect);
  }, []);

  // Don't render if tutorial context isn't available or not active
  if (!tutorial || !tutorial.isActive || !tutorial.currentStep) {
    return null;
  }

  const { 
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    nextStep, 
    prevStep, 
    skipTutorial,
    goToStep,
    isFirstStep,
    isLastStep,
  } = tutorial;

  return (
    <div className="tutorial-overlay">
      {/* Spotlight on target element */}
      <TutorialSpotlightSVG
        targetSelector={currentStep.targetSelector}
        onReady={handleSpotlightReady}
        isActive={true}
        padding={12}
        borderRadius={12}
      />

      {/* Tooltip with step content */}
      <TutorialTooltip
        step={currentStep}
        targetRect={targetRect}
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
      />

      {/* Progress dots at bottom */}
      <TutorialProgress
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
        onGoToStep={goToStep}
      />

      {/* Click blocker (allows clicks on spotlight target) */}
      <div 
        className="fixed inset-0 z-[9997]"
        onClick={(e) => {
          // If clicking on the target element, allow it
          const target = document.querySelector(currentStep.targetSelector);
          if (target && target.contains(e.target as Node)) {
            return;
          }
          // Otherwise, clicking outside advances to next step
          nextStep();
        }}
      />
    </div>
  );
}

/**
 * Modal to prompt user to start tutorial
 */
interface TutorialStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuick: () => void;
  onStartDeep: () => void;
  hasSeenQuickStart: boolean;
}

export function TutorialStartModal({
  isOpen,
  onClose,
  onStartQuick,
  onStartDeep,
  hasSeenQuickStart,
}: TutorialStartModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-coral-500 via-orange-500 to-amber-500">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {hasSeenQuickStart ? 'Welcome Back!' : 'Welcome to Dev Mode'}
                  </h2>
                  <p className="text-sm text-white/80">
                    {hasSeenQuickStart 
                      ? 'Ready to explore more features?' 
                      : 'Unlock powerful debugging tools'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-drafted-gray text-sm mb-6">
                Dev Mode provides deep insights into how the floor plan generation model behaves.
                Choose a tutorial path to get started:
              </p>

              {/* Tutorial Options */}
              <div className="space-y-3">
                {/* Quick Start */}
                <button
                  onClick={onStartQuick}
                  className="w-full p-4 text-left bg-drafted-bg hover:bg-drafted-bg/80 rounded-xl border-2 border-transparent hover:border-coral-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-coral-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-coral-200 transition-colors">
                      <Zap className="w-5 h-5 text-coral-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-drafted-black">
                        Quick Start
                        {hasSeenQuickStart && (
                          <span className="ml-2 text-xs font-normal text-green-600">✓ Completed</span>
                        )}
                      </h3>
                      <p className="text-sm text-drafted-gray mt-0.5">
                        6 essential steps · ~2 minutes
                      </p>
                      <p className="text-xs text-drafted-muted mt-1">
                        Perfect for getting started quickly
                      </p>
                    </div>
                  </div>
                </button>

                {/* Deep Dive */}
                <button
                  onClick={onStartDeep}
                  className="w-full p-4 text-left bg-drafted-bg hover:bg-drafted-bg/80 rounded-xl border-2 border-transparent hover:border-coral-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-drafted-black">Deep Dive</h3>
                      <p className="text-sm text-drafted-gray mt-0.5">
                        17 comprehensive steps · ~5 minutes
                      </p>
                      <p className="text-xs text-drafted-muted mt-1">
                        Cover every feature in detail
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Skip option */}
              <button
                onClick={onClose}
                className="w-full mt-4 py-2 text-sm text-drafted-gray hover:text-drafted-black transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage tutorial start modal
 */
export function useTutorialStarter() {
  const tutorial = useTutorialOptional();
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const startQuick = useCallback(() => {
    if (tutorial) {
      tutorial.startTutorial('quick');
      setShowModal(false);
    }
  }, [tutorial]);

  const startDeep = useCallback(() => {
    if (tutorial) {
      tutorial.startTutorial('deep');
      setShowModal(false);
    }
  }, [tutorial]);

  return {
    showModal,
    openModal,
    closeModal,
    startQuick,
    startDeep,
    hasSeenQuickStart: tutorial?.hasSeenQuickStart ?? false,
    hasSeenDeepDive: tutorial?.hasSeenDeepDive ?? false,
  };
}

/**
 * Small floating help button to restart tutorial
 */
export function TutorialHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[100] w-12 h-12 bg-gradient-to-br from-coral-500 to-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
      title="Start Dev Mode Tutorial"
    >
      <BookOpen className="w-5 h-5" />
    </motion.button>
  );
}

