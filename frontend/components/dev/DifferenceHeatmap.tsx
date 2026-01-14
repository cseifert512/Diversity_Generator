'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Eye, EyeOff, Maximize2 } from 'lucide-react';

interface DifferenceHeatmapProps {
  /** Base64 encoded image 1 (original) */
  image1Base64?: string;
  /** Base64 encoded image 2 (edited) */
  image2Base64?: string;
  /** SVG string 1 (original) - will be rendered to image */
  svg1?: string;
  /** SVG string 2 (edited) - will be rendered to image */
  svg2?: string;
  /** Labels for the images */
  labels?: [string, string];
  /** Height of the visualization */
  height?: number;
  /** Class name */
  className?: string;
}

interface DiffStats {
  totalPixels: number;
  changedPixels: number;
  changePercentage: number;
  maxDifference: number;
  averageDifference: number;
}

/**
 * Render SVG string to canvas and get image data
 */
async function svgToImageData(
  svg: string,
  width: number,
  height: number
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Load base64 image and get image data
 */
async function base64ToImageData(
  base64: string,
  width: number,
  height: number
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    
    img.onerror = () => resolve(null);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Calculate pixel difference between two images
 */
function calculateDifference(
  img1: ImageData,
  img2: ImageData,
  threshold: number = 10
): { diffImage: ImageData; stats: DiffStats } {
  const width = img1.width;
  const height = img1.height;
  const diffData = new Uint8ClampedArray(width * height * 4);
  
  let changedPixels = 0;
  let totalDifference = 0;
  let maxDifference = 0;
  
  for (let i = 0; i < img1.data.length; i += 4) {
    const r1 = img1.data[i];
    const g1 = img1.data[i + 1];
    const b1 = img1.data[i + 2];
    
    const r2 = img2.data[i];
    const g2 = img2.data[i + 1];
    const b2 = img2.data[i + 2];
    
    // Calculate color difference (Euclidean distance in RGB space)
    const diff = Math.sqrt(
      (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    );
    
    // Normalize to 0-255 (max possible diff is sqrt(3 * 255^2) ≈ 441)
    const normalizedDiff = Math.min(255, (diff / 441) * 255 * 3);
    
    totalDifference += normalizedDiff;
    maxDifference = Math.max(maxDifference, normalizedDiff);
    
    if (normalizedDiff > threshold) {
      changedPixels++;
      
      // Heat map coloring: blue (low diff) -> yellow -> red (high diff)
      if (normalizedDiff < 85) {
        // Blue to cyan
        diffData[i] = 0;
        diffData[i + 1] = Math.round(normalizedDiff * 3);
        diffData[i + 2] = 255;
      } else if (normalizedDiff < 170) {
        // Cyan to yellow
        const t = (normalizedDiff - 85) / 85;
        diffData[i] = Math.round(255 * t);
        diffData[i + 1] = 255;
        diffData[i + 2] = Math.round(255 * (1 - t));
      } else {
        // Yellow to red
        const t = (normalizedDiff - 170) / 85;
        diffData[i] = 255;
        diffData[i + 1] = Math.round(255 * (1 - t));
        diffData[i + 2] = 0;
      }
      diffData[i + 3] = Math.min(255, normalizedDiff + 50); // Alpha
    } else {
      // Transparent for unchanged areas
      diffData[i] = 0;
      diffData[i + 1] = 0;
      diffData[i + 2] = 0;
      diffData[i + 3] = 0;
    }
  }
  
  const totalPixels = (width * height);
  
  return {
    diffImage: new ImageData(diffData, width, height),
    stats: {
      totalPixels,
      changedPixels,
      changePercentage: (changedPixels / totalPixels) * 100,
      maxDifference,
      averageDifference: totalDifference / totalPixels,
    },
  };
}

export function DifferenceHeatmap({
  image1Base64,
  image2Base64,
  svg1,
  svg2,
  labels = ['Original', 'Edited'],
  height = 350,
  className = '',
}: DifferenceHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [baseImage, setBaseImage] = useState<'original' | 'edited'>('original');
  
  // Canvas dimensions
  const canvasWidth = 400;
  const canvasHeight = 300;
  
  // Generate difference heatmap
  useEffect(() => {
    let cancelled = false;
    
    async function generateHeatmap() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get image data from either base64 or SVG
        let imgData1: ImageData | null = null;
        let imgData2: ImageData | null = null;
        
        if (svg1) {
          imgData1 = await svgToImageData(svg1, canvasWidth, canvasHeight);
        } else if (image1Base64) {
          imgData1 = await base64ToImageData(image1Base64, canvasWidth, canvasHeight);
        }
        
        if (svg2) {
          imgData2 = await svgToImageData(svg2, canvasWidth, canvasHeight);
        } else if (image2Base64) {
          imgData2 = await base64ToImageData(image2Base64, canvasWidth, canvasHeight);
        }
        
        if (cancelled) return;
        
        if (!imgData1 || !imgData2) {
          setError('Could not load one or both images');
          setIsLoading(false);
          return;
        }
        
        // Calculate difference
        const { diffImage, stats: diffStats } = calculateDifference(imgData1, imgData2, threshold);
        
        if (cancelled) return;
        
        // Draw base image
        if (baseCanvasRef.current) {
          const baseCtx = baseCanvasRef.current.getContext('2d');
          if (baseCtx) {
            baseCtx.putImageData(baseImage === 'original' ? imgData1 : imgData2, 0, 0);
          }
        }
        
        // Draw difference heatmap
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.putImageData(diffImage, 0, 0);
          }
        }
        
        setStats(diffStats);
        setIsLoading(false);
        
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to generate heatmap');
          setIsLoading(false);
        }
      }
    }
    
    generateHeatmap();
    
    return () => {
      cancelled = true;
    };
  }, [image1Base64, image2Base64, svg1, svg2, threshold, baseImage]);
  
  // Check if we have valid inputs
  const hasInputs = (image1Base64 || svg1) && (image2Base64 || svg2);
  
  if (!hasInputs) {
    return (
      <div className={`flex items-center justify-center bg-drafted-bg rounded-lg border border-drafted-border p-8 ${className}`}>
        <div className="text-center text-drafted-muted">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Need both images to generate difference heatmap</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-drafted-black">Difference Heatmap</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showOverlay 
                ? 'bg-coral-500 text-white' 
                : 'bg-drafted-bg text-drafted-gray hover:text-drafted-black'
            }`}
          >
            {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Overlay
          </button>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-drafted-gray">Base:</span>
          <button
            onClick={() => setBaseImage('original')}
            className={`px-2 py-1 rounded ${
              baseImage === 'original' ? 'bg-drafted-black text-white' : 'bg-drafted-bg text-drafted-gray'
            }`}
          >
            {labels[0]}
          </button>
          <button
            onClick={() => setBaseImage('edited')}
            className={`px-2 py-1 rounded ${
              baseImage === 'edited' ? 'bg-coral-500 text-white' : 'bg-drafted-bg text-drafted-gray'
            }`}
          >
            {labels[1]}
          </button>
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="text-drafted-gray">Threshold:</span>
          <input
            type="range"
            min="0"
            max="50"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="w-24 accent-coral-500"
          />
          <span className="text-drafted-muted w-6">{threshold}</span>
        </div>
      </div>
      
      {/* Canvas Container */}
      <div 
        className="relative bg-drafted-bg rounded-lg border border-drafted-border overflow-hidden"
        style={{ height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-coral-500" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center text-red-500">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Base image canvas */}
          <canvas
            ref={baseCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="max-w-full max-h-full"
          />
          
          {/* Difference overlay canvas */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute max-w-full max-h-full"
            style={{ 
              opacity: showOverlay ? 0.7 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-white/90 backdrop-blur rounded px-2 py-1 text-xs">
          <span className="text-drafted-gray">Change:</span>
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-2 rounded-sm" style={{ background: 'rgb(0, 0, 255)' }} />
            <span className="text-drafted-muted">Low</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-2 rounded-sm" style={{ background: 'rgb(255, 255, 0)' }} />
            <span className="text-drafted-muted">Med</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-2 rounded-sm" style={{ background: 'rgb(255, 0, 0)' }} />
            <span className="text-drafted-muted">High</span>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-drafted-bg rounded-lg text-center">
            <div className="text-drafted-muted">Changed</div>
            <div className="font-semibold text-drafted-black">
              {stats.changePercentage.toFixed(1)}%
            </div>
          </div>
          <div className="p-2 bg-drafted-bg rounded-lg text-center">
            <div className="text-drafted-muted">Pixels</div>
            <div className="font-semibold text-drafted-black">
              {stats.changedPixels.toLocaleString()}
            </div>
          </div>
          <div className="p-2 bg-drafted-bg rounded-lg text-center">
            <div className="text-drafted-muted">Avg Diff</div>
            <div className="font-semibold text-drafted-black">
              {stats.averageDifference.toFixed(1)}
            </div>
          </div>
          <div className="p-2 bg-drafted-bg rounded-lg text-center">
            <div className="text-drafted-muted">Max Diff</div>
            <div className="font-semibold text-drafted-black">
              {stats.maxDifference.toFixed(0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

