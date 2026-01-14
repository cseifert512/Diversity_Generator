'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Lightbulb,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { TutorialStep, TooltipPosition } from '@/contexts/TutorialContext';

interface TutorialTooltipProps {
  step: TutorialStep;
  targetRect: { top: number; left: number; width: number; height: number } | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface TooltipPosition2D {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none';
  arrowOffset: number;
}

const TOOLTIP_WIDTH = 360;
const TOOLTIP_MARGIN = 16;
const ARROW_SIZE = 12;

function calculateTooltipPosition(
  targetRect: { top: number; left: number; width: number; height: number } | null,
  preferredPosition: TooltipPosition,
  tooltipHeight: number
): TooltipPosition2D {
  // Center position for welcome/completion screens
  if (!targetRect || preferredPosition === 'center') {
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
      arrowPosition: 'none',
      arrowOffset: 0,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate center points
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  let position: TooltipPosition2D = {
    top: 0,
    left: 0,
    arrowPosition: 'top',
    arrowOffset: TOOLTIP_WIDTH / 2,
  };

  // Try preferred position first, then fallback
  const positions: TooltipPosition[] = [preferredPosition, 'bottom', 'top', 'right', 'left'];
  
  for (const pos of positions) {
    let testTop = 0;
    let testLeft = 0;
    let arrowPos: TooltipPosition2D['arrowPosition'] = 'none';

    switch (pos) {
      case 'bottom':
        testTop = targetRect.top + targetRect.height + TOOLTIP_MARGIN;
        testLeft = targetCenterX - TOOLTIP_WIDTH / 2;
        arrowPos = 'top';
        break;
      case 'top':
        testTop = targetRect.top - tooltipHeight - TOOLTIP_MARGIN;
        testLeft = targetCenterX - TOOLTIP_WIDTH / 2;
        arrowPos = 'bottom';
        break;
      case 'right':
        testTop = targetCenterY - tooltipHeight / 2;
        testLeft = targetRect.left + targetRect.width + TOOLTIP_MARGIN;
        arrowPos = 'left';
        break;
      case 'left':
        testTop = targetCenterY - tooltipHeight / 2;
        testLeft = targetRect.left - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
        arrowPos = 'right';
        break;
    }

    // Clamp to viewport
    testLeft = Math.max(TOOLTIP_MARGIN, Math.min(viewportWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN, testLeft));
    testTop = Math.max(TOOLTIP_MARGIN, Math.min(viewportHeight - tooltipHeight - TOOLTIP_MARGIN, testTop));

    // Check if position is valid (doesn't overlap target too much)
    const overlapsTarget = 
      testTop < targetRect.top + targetRect.height &&
      testTop + tooltipHeight > targetRect.top &&
      testLeft < targetRect.left + targetRect.width &&
      testLeft + TOOLTIP_WIDTH > targetRect.left;

    if (!overlapsTarget || pos === positions[positions.length - 1]) {
      // Calculate arrow offset based on target center
      let arrowOffset = TOOLTIP_WIDTH / 2;
      if (arrowPos === 'top' || arrowPos === 'bottom') {
        arrowOffset = Math.max(24, Math.min(TOOLTIP_WIDTH - 24, targetCenterX - testLeft));
      } else if (arrowPos === 'left' || arrowPos === 'right') {
        arrowOffset = Math.max(24, Math.min(tooltipHeight - 24, targetCenterY - testTop));
      }

      position = {
        top: testTop,
        left: testLeft,
        arrowPosition: arrowPos,
        arrowOffset,
      };
      break;
    }
  }

  return position;
}

export function TutorialTooltip({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}: TutorialTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipHeight, setTooltipHeight] = useState(200);
  const [isReady, setIsReady] = useState(false);

  // Measure tooltip height
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
      setIsReady(true);
    }
  }, [step.id]);

  // Calculate position
  const position = useMemo(
    () => calculateTooltipPosition(targetRect, step.position, tooltipHeight),
    [targetRect, step.position, tooltipHeight]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          onNext();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) onPrev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onSkip, isFirstStep]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        ref={tooltipRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: isReady ? 1 : 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[10000] pointer-events-auto"
        style={{
          top: position.top,
          left: position.left,
          width: TOOLTIP_WIDTH,
        }}
      >
        {/* Tooltip Card */}
        <div className="bg-white rounded-xl shadow-2xl border border-drafted-border overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-coral-500 to-orange-500">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white/90" />
                <span className="text-sm font-medium text-white/80">
                  Step {currentIndex + 1} of {totalSteps}
                </span>
              </div>
              <button
                onClick={onSkip}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Skip tutorial (Esc)"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-white mt-2">{step.title}</h3>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-sm text-drafted-gray leading-relaxed">
              {step.description}
            </p>

            {/* Tip */}
            {step.tip && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{step.tip}</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-drafted-bg">
            <motion.div
              className="h-full bg-gradient-to-r from-coral-400 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-drafted-bg/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-drafted-gray hover:text-drafted-black hover:bg-drafted-bg rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-sm text-drafted-gray hover:text-drafted-black transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-coral-500 text-white text-sm font-medium rounded-lg hover:bg-coral-600 transition-colors"
              >
                {isLastStep ? (
                  <>
                    Finish
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow */}
        {position.arrowPosition !== 'none' && (
          <div
            className="absolute"
            style={{
              ...(position.arrowPosition === 'top' && {
                top: -ARROW_SIZE + 1,
                left: position.arrowOffset - ARROW_SIZE,
              }),
              ...(position.arrowPosition === 'bottom' && {
                bottom: -ARROW_SIZE + 1,
                left: position.arrowOffset - ARROW_SIZE,
              }),
              ...(position.arrowPosition === 'left' && {
                left: -ARROW_SIZE + 1,
                top: position.arrowOffset - ARROW_SIZE,
              }),
              ...(position.arrowPosition === 'right' && {
                right: -ARROW_SIZE + 1,
                top: position.arrowOffset - ARROW_SIZE,
              }),
            }}
          >
            <svg
              width={ARROW_SIZE * 2}
              height={ARROW_SIZE * 2}
              viewBox="0 0 24 24"
              style={{
                transform: {
                  top: 'rotate(0deg)',
                  bottom: 'rotate(180deg)',
                  left: 'rotate(-90deg)',
                  right: 'rotate(90deg)',
                  none: '',
                }[position.arrowPosition],
              }}
            >
              <path
                d="M12 4L4 16h16L12 4z"
                fill="white"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            </svg>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Progress dots indicator
 */
export function TutorialProgress({
  currentIndex,
  totalSteps,
  onGoToStep,
}: {
  currentIndex: number;
  totalSteps: number;
  onGoToStep: (index: number) => void;
}) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <button
          key={i}
          onClick={() => onGoToStep(i)}
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            i === currentIndex
              ? 'bg-coral-500 scale-125'
              : i < currentIndex
              ? 'bg-coral-300'
              : 'bg-white/50'
          }`}
          title={`Go to step ${i + 1}`}
        />
      ))}
    </div>
  );
}

