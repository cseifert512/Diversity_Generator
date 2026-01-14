'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  History,
  AlertTriangle,
} from 'lucide-react';
import type { DraftedGenerationRequest, DraftedGenerationResult, GeneratedRoom, RoomSize } from '@/lib/drafted-types';
import { generateDraftedPlan } from '@/lib/drafted-api';

export interface BatchGenerationResult {
  id: string;
  index: number;
  seed: number;
  prompt: string;
  success: boolean;
  error?: string;
  elapsedSeconds?: number;
  totalAreaSqft?: number;
  rooms: GeneratedRoom[];
  imageBase64?: string;
  svg?: string;
}

export interface BatchAnalysisData {
  id: string;
  createdAt: number;
  config: {
    baseSeed: number | 'random';
    prompt: string;
    rooms: { room_type: string; size: RoomSize }[];
    targetSqft?: number;
    count: number;
    mode: 'same-seed' | 'random-seeds';
  };
  results: BatchGenerationResult[];
  statistics?: BatchStatistics;
}

export interface BatchStatistics {
  successRate: number;
  averageTime: number;
  areaVariance: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
  roomCountVariance: {
    mean: number;
    stdDev: number;
  };
}

interface BatchRunnerProps {
  /** Base generation request (rooms, target sqft) */
  baseRequest?: DraftedGenerationRequest;
  /** Seed to use (or undefined for random) */
  seed?: number;
  /** Prompt to use */
  prompt?: string;
  /** Callback when batch completes */
  onBatchComplete?: (data: BatchAnalysisData) => void;
  /** Callback when individual generation completes */
  onGenerationComplete?: (result: BatchGenerationResult) => void;
  /** Class name */
  className?: string;
}

export function BatchRunner({
  baseRequest,
  seed,
  prompt,
  onBatchComplete,
  onGenerationComplete,
  className = '',
}: BatchRunnerProps) {
  // Configuration state
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<'same-seed' | 'random-seeds'>('same-seed');
  const [customSeed, setCustomSeed] = useState(seed?.toString() || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BatchGenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cancellation
  const cancelRef = useRef(false);
  
  // Calculate statistics from results
  const calculateStatistics = useCallback((results: BatchGenerationResult[]): BatchStatistics | undefined => {
    const successful = results.filter(r => r.success);
    if (successful.length === 0) return undefined;
    
    const areas = successful.map(r => r.totalAreaSqft || 0);
    const times = successful.map(r => r.elapsedSeconds || 0);
    const roomCounts = successful.map(r => r.rooms.length);
    
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = (arr: number[], m: number) => 
      Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
    
    const areaMean = mean(areas);
    const roomMean = mean(roomCounts);
    
    return {
      successRate: (successful.length / results.length) * 100,
      averageTime: mean(times),
      areaVariance: {
        mean: areaMean,
        stdDev: stdDev(areas, areaMean),
        min: Math.min(...areas),
        max: Math.max(...areas),
      },
      roomCountVariance: {
        mean: roomMean,
        stdDev: stdDev(roomCounts, roomMean),
      },
    };
  }, []);
  
  // Run batch generation
  const runBatch = useCallback(async () => {
    if (!baseRequest || baseRequest.rooms.length === 0) {
      setError('No room configuration available. Generate a plan first.');
      return;
    }
    
    setIsRunning(true);
    setIsCancelled(false);
    setError(null);
    setResults([]);
    cancelRef.current = false;
    
    const batchId = `batch_${Date.now()}`;
    const batchResults: BatchGenerationResult[] = [];
    const baseSeed = mode === 'same-seed' ? (customSeed ? parseInt(customSeed) : Math.floor(Math.random() * 1000000)) : 'random';
    
    for (let i = 0; i < count; i++) {
      if (cancelRef.current) {
        setIsCancelled(true);
        break;
      }
      
      setProgress({ current: i + 1, total: count });
      
      try {
        const requestSeed = mode === 'same-seed' 
          ? (typeof baseSeed === 'number' ? baseSeed : undefined)
          : undefined;
        
        const result = await generateDraftedPlan({
          ...baseRequest,
          seed: requestSeed,
        });
        
        const batchResult: BatchGenerationResult = {
          id: `${batchId}_${i}`,
          index: i,
          seed: result.seed_used,
          prompt: result.prompt_used,
          success: result.success,
          error: result.error,
          elapsedSeconds: result.elapsed_seconds,
          totalAreaSqft: result.total_area_sqft,
          rooms: result.rooms,
          imageBase64: result.image_base64,
          svg: result.svg,
        };
        
        batchResults.push(batchResult);
        setResults(prev => [...prev, batchResult]);
        onGenerationComplete?.(batchResult);
        
      } catch (e) {
        const errorResult: BatchGenerationResult = {
          id: `${batchId}_${i}`,
          index: i,
          seed: 0,
          prompt: '',
          success: false,
          error: e instanceof Error ? e.message : 'Generation failed',
          rooms: [],
        };
        
        batchResults.push(errorResult);
        setResults(prev => [...prev, errorResult]);
      }
      
      // Small delay between generations to avoid rate limiting
      if (i < count - 1 && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsRunning(false);
    
    // Create batch analysis data
    const statistics = calculateStatistics(batchResults);
    const batchData: BatchAnalysisData = {
      id: batchId,
      createdAt: Date.now(),
      config: {
        baseSeed,
        prompt: prompt || baseRequest.rooms.map(r => `${r.room_type}=${r.size}`).join(', '),
        rooms: baseRequest.rooms,
        targetSqft: baseRequest.target_sqft,
        count,
        mode,
      },
      results: batchResults,
      statistics,
    };
    
    onBatchComplete?.(batchData);
    
  }, [baseRequest, count, mode, customSeed, prompt, calculateStatistics, onBatchComplete, onGenerationComplete]);
  
  // Cancel batch
  const cancelBatch = useCallback(() => {
    cancelRef.current = true;
  }, []);
  
  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setError(null);
    setIsCancelled(false);
  }, []);
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-coral-500" />
          <h3 className="font-semibold text-drafted-black">Batch Generation</h3>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-drafted-gray hover:text-drafted-black transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Options</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      {/* Description */}
      <p className="text-sm text-drafted-gray">
        Run multiple generations with the same configuration to analyze model consistency and variance.
      </p>
      
      {/* Configuration */}
      <div className="space-y-3">
        {/* Count Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-drafted-gray w-24">Generations:</label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="flex-1 accent-coral-500"
              disabled={isRunning}
            />
            <span className="text-sm font-mono text-drafted-black w-8 text-right">{count}</span>
          </div>
        </div>
        
        {/* Mode Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-drafted-gray w-24">Mode:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('same-seed')}
              disabled={isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'same-seed'
                  ? 'bg-coral-500 text-white'
                  : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'
              }`}
            >
              Same Seed
            </button>
            <button
              onClick={() => setMode('random-seeds')}
              disabled={isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'random-seeds'
                  ? 'bg-coral-500 text-white'
                  : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'
              }`}
            >
              Random Seeds
            </button>
          </div>
        </div>
        
        {/* Advanced Options */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-3 border-t border-drafted-border">
                {mode === 'same-seed' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-drafted-gray w-24">Seed:</label>
                    <input
                      type="text"
                      value={customSeed}
                      onChange={(e) => setCustomSeed(e.target.value.replace(/\D/g, ''))}
                      placeholder="Random if empty"
                      className="flex-1 px-3 py-1.5 text-sm bg-drafted-bg border border-drafted-border rounded-lg font-mono"
                      disabled={isRunning}
                    />
                  </div>
                )}
                
                <div className="text-xs text-drafted-muted">
                  {mode === 'same-seed' ? (
                    <p>Using the same seed tests if the model produces consistent outputs for identical inputs.</p>
                  ) : (
                    <p>Random seeds show the diversity of outputs for the same room configuration.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={runBatch}
            disabled={!baseRequest || baseRequest.rooms.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-coral-500 text-white rounded-lg font-medium hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Run {count} Generations
          </button>
        ) : (
          <button
            onClick={cancelBatch}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            <Square className="w-4 h-4" />
            Cancel
          </button>
        )}
        
        {results.length > 0 && !isRunning && (
          <button
            onClick={clearResults}
            className="px-4 py-2.5 bg-drafted-bg text-drafted-gray rounded-lg font-medium hover:bg-drafted-border transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Progress */}
      {(isRunning || results.length > 0) && (
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="h-2 bg-drafted-bg rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-coral-400 to-coral-500"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Progress Text */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-coral-500" />}
              <span className="text-drafted-gray">
                {isRunning ? `Generating ${progress.current} of ${progress.total}...` : 
                  isCancelled ? 'Cancelled' : 'Complete'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                {successCount}
              </span>
              {failureCount > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="w-3.5 h-3.5" />
                  {failureCount}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Results Preview */}
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-drafted-border rounded-lg divide-y divide-drafted-border">
          {results.map((result, i) => (
            <div
              key={result.id}
              className={`flex items-center justify-between p-2 text-xs ${
                result.success ? 'bg-white' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-drafted-muted">#{i + 1}</span>
                {result.success ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className="text-drafted-gray">
                  Seed: <span className="font-mono">{result.seed}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-drafted-muted">
                {result.totalAreaSqft && (
                  <span>{Math.round(result.totalAreaSqft).toLocaleString()} sqft</span>
                )}
                {result.elapsedSeconds && (
                  <span>{result.elapsedSeconds.toFixed(1)}s</span>
                )}
                {result.rooms.length > 0 && (
                  <span>{result.rooms.length} rooms</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Quick Stats */}
      {results.length > 0 && !isRunning && successCount > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-drafted-bg rounded-lg">
            <div className="text-drafted-muted">Success Rate</div>
            <div className="font-semibold text-drafted-black">
              {Math.round((successCount / results.length) * 100)}%
            </div>
          </div>
          <div className="p-2 bg-drafted-bg rounded-lg">
            <div className="text-drafted-muted">Avg Area</div>
            <div className="font-semibold text-drafted-black">
              {Math.round(
                results.filter(r => r.success).reduce((s, r) => s + (r.totalAreaSqft || 0), 0) / successCount
              ).toLocaleString()} sqft
            </div>
          </div>
          <div className="p-2 bg-drafted-bg rounded-lg">
            <div className="text-drafted-muted">Avg Time</div>
            <div className="font-semibold text-drafted-black">
              {(
                results.filter(r => r.success).reduce((s, r) => s + (r.elapsedSeconds || 0), 0) / successCount
              ).toFixed(1)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

