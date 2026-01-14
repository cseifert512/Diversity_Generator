'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  /** CSS selector for the target element */
  targetSelector: string;
  /** Padding around the target element */
  padding?: number;
  /** Border radius of the spotlight */
  borderRadius?: number;
  /** Whether to scroll the target into view */
  scrollIntoView?: boolean;
  /** Callback when spotlight is ready */
  onReady?: (rect: SpotlightRect) => void;
  /** Whether the spotlight is active */
  isActive?: boolean;
}

export function TutorialSpotlight({
  targetSelector,
  padding = 8,
  borderRadius = 8,
  scrollIntoView = true,
  onReady,
  isActive = true,
}: TutorialSpotlightProps) {
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Find and track the target element
  const updateTargetRect = useCallback(() => {
    if (!targetSelector || !isActive) {
      setTargetRect(null);
      setIsVisible(false);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      // Element not found - might be hidden or not rendered yet
      setTargetRect(null);
      setIsVisible(false);
      return;
    }

    // Scroll into view if needed
    if (scrollIntoView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    // Get element position
    const rect = element.getBoundingClientRect();
    
    const newRect: SpotlightRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };

    setTargetRect(newRect);
    setIsVisible(true);
    onReady?.(newRect);
  }, [targetSelector, padding, scrollIntoView, isActive, onReady]);

  // Initial setup and updates
  useEffect(() => {
    // Small delay to allow elements to render
    const timeout = setTimeout(updateTargetRect, 100);

    // Set up resize observer
    const element = document.querySelector(targetSelector);
    if (element) {
      observerRef.current = new ResizeObserver(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(updateTargetRect);
      });
      observerRef.current.observe(element);
    }

    // Listen for scroll and resize
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      clearTimeout(timeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [targetSelector, updateTargetRect]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isVisible && targetRect && (
        <>
          {/* Dark overlay with spotlight cutout using CSS mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              maskImage: `
                linear-gradient(#000 0 0),
                linear-gradient(#000 0 0)
              `,
              maskComposite: 'exclude',
              WebkitMaskImage: `
                linear-gradient(#000 0 0),
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='${targetRect.left}' y='${targetRect.top}' width='${targetRect.width}' height='${targetRect.height}' rx='${borderRadius}' fill='%23000'/%3E%3C/svg%3E")
              `,
              WebkitMaskComposite: 'xor',
              WebkitMaskSize: '100% 100%, 100% 100%',
            }}
          />

          {/* Spotlight border glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              borderRadius: borderRadius,
              boxShadow: `
                0 0 0 2px rgba(249, 115, 22, 0.8),
                0 0 20px rgba(249, 115, 22, 0.4),
                0 0 40px rgba(249, 115, 22, 0.2)
              `,
            }}
          />

          {/* Pulsing ring animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.6, 0.2, 0.6],
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="fixed z-[9998] pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              borderRadius: borderRadius + 4,
              border: '2px solid rgba(249, 115, 22, 0.5)',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Alternative spotlight using SVG mask (better browser support)
 */
export function TutorialSpotlightSVG({
  targetSelector,
  padding = 8,
  borderRadius = 8,
  scrollIntoView = true,
  onReady,
  isActive = true,
}: TutorialSpotlightProps) {
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!targetSelector || !isActive) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(targetSelector);
      if (!element) {
        setTargetRect(null);
        return;
      }

      if (scrollIntoView) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }

      const rect = element.getBoundingClientRect();
      const newRect: SpotlightRect = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };

      setTargetRect(newRect);
      onReady?.(newRect);
    };

    // Delay to allow rendering
    const timeout = setTimeout(updateRect, 100);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [targetSelector, padding, scrollIntoView, isActive, onReady]);

  if (!isActive || !targetRect || windowSize.width === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-none"
      >
        <svg
          width={windowSize.width}
          height={windowSize.height}
          className="absolute inset-0"
        >
          <defs>
            <mask id="spotlight-mask">
              {/* White background = visible overlay */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black rectangle = cutout (transparent) */}
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={borderRadius}
                ry={borderRadius}
                fill="black"
              />
            </mask>
          </defs>
          
          {/* Dark overlay with mask */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
          
          {/* Spotlight border */}
          <rect
            x={targetRect.left}
            y={targetRect.top}
            width={targetRect.width}
            height={targetRect.height}
            rx={borderRadius}
            ry={borderRadius}
            fill="none"
            stroke="rgba(249, 115, 22, 0.8)"
            strokeWidth="2"
          />
        </svg>
        
        {/* Glow effect */}
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(249, 115, 22, 0.4)',
              '0 0 40px rgba(249, 115, 22, 0.6)',
              '0 0 20px rgba(249, 115, 22, 0.4)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: borderRadius,
            pointerEvents: 'none',
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

