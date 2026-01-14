'use client';

import { motion } from 'framer-motion';
import { FileImage, FileCode } from 'lucide-react';

export type ImageFormat = 'jpeg' | 'svg';

interface ImageFormatToggleProps {
  format: ImageFormat;
  onChange: (format: ImageFormat) => void;
  hasJpeg?: boolean;
  hasSvg?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function ImageFormatToggle({
  format,
  onChange,
  hasJpeg = true,
  hasSvg = true,
  className = '',
  size = 'md',
}: ImageFormatToggleProps) {
  const buttonSize = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className={`inline-flex rounded-lg border border-drafted-border overflow-hidden ${className}`}>
      <button
        onClick={() => onChange('jpeg')}
        disabled={!hasJpeg}
        className={`
          flex items-center gap-1.5 font-medium transition-colors relative
          ${buttonSize}
          ${!hasJpeg ? 'opacity-40 cursor-not-allowed' : ''}
          ${format === 'jpeg' ? 'text-drafted-black bg-drafted-bg' : 'text-drafted-gray hover:text-drafted-black'}
        `}
        title={hasJpeg ? 'Show JPEG image' : 'JPEG not available'}
      >
        <FileImage className={iconSize} />
        <span>JPEG</span>
        {format === 'jpeg' && (
          <motion.div
            layoutId="format-indicator"
            className="absolute inset-0 bg-drafted-bg -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
      </button>
      
      <div className="w-px bg-drafted-border" />
      
      <button
        onClick={() => onChange('svg')}
        disabled={!hasSvg}
        className={`
          flex items-center gap-1.5 font-medium transition-colors relative
          ${buttonSize}
          ${!hasSvg ? 'opacity-40 cursor-not-allowed' : ''}
          ${format === 'svg' ? 'text-drafted-black bg-drafted-bg' : 'text-drafted-gray hover:text-drafted-black'}
        `}
        title={hasSvg ? 'Show SVG vector' : 'SVG not available'}
      >
        <FileCode className={iconSize} />
        <span>SVG</span>
        {format === 'svg' && (
          <motion.div
            layoutId="format-indicator"
            className="absolute inset-0 bg-drafted-bg -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
      </button>
    </div>
  );
}

