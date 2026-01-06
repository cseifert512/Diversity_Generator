'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Share2, Download, Heart } from 'lucide-react';
import type { UploadedPlan, ScatterPoint } from '@/lib/types';
import { getClusterColor } from '@/lib/colors';

interface DraftGridProps {
  plans: UploadedPlan[];
  scatterPoints?: ScatterPoint[];
  onRemove?: (planId: string) => void;
}

export function DraftGrid({ plans, scatterPoints, onRemove }: DraftGridProps) {
  const getClusterForPlan = (planId: string): number | undefined => {
    if (!scatterPoints) return undefined;
    const point = scatterPoints.find(p => p.id === planId);
    return point?.cluster;
  };

  if (plans.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence mode="popLayout">
        {plans.map((plan, index) => {
          const cluster = getClusterForPlan(plan.id);
          const clusterColor = cluster !== undefined ? getClusterColor(cluster) : undefined;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="draft-card group"
            >
              {/* Draft Header */}
              <div className="px-4 py-3 border-b border-drafted-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkle />
                  <h3 className="font-semibold text-drafted-black">
                    Draft {String(index + 1).padStart(2, '0')}
                  </h3>
                </div>
                
                {clusterColor && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${clusterColor}20`,
                      color: clusterColor 
                    }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: clusterColor }}
                    />
                    Cluster {cluster! + 1}
                  </div>
                )}
              </div>

              {/* Floor Plan Image */}
              <div className="aspect-square bg-drafted-bg relative overflow-hidden">
                {plan.thumbnail ? (
                  <img
                    src={plan.thumbnail}
                    alt={plan.filename}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-drafted-muted animate-spin" />
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2 p-4">
                    <button className="w-9 h-9 bg-white rounded-full shadow-drafted flex items-center justify-center hover:shadow-drafted-hover transition-shadow">
                      <Heart className="w-4 h-4 text-drafted-gray" />
                    </button>
                    <button className="w-9 h-9 bg-white rounded-full shadow-drafted flex items-center justify-center hover:shadow-drafted-hover transition-shadow">
                      <Share2 className="w-4 h-4 text-drafted-gray" />
                    </button>
                    <button className="w-9 h-9 bg-white rounded-full shadow-drafted flex items-center justify-center hover:shadow-drafted-hover transition-shadow">
                      <Download className="w-4 h-4 text-drafted-gray" />
                    </button>
                  </div>
                </div>

                {/* Remove button (for uploads) */}
                {onRemove && (
                  <button
                    onClick={() => onRemove(plan.id)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-4 h-4 text-drafted-gray hover:text-coral-500" />
                  </button>
                )}
              </div>

              {/* Plan Info */}
              <div className="p-4 space-y-3">
                {/* Variation Type */}
                <p className="text-sm text-drafted-gray">
                  {plan.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 btn-drafted-primary text-xs py-2">
                    View Details
                  </button>
                  <button className="flex-1 btn-drafted-outline text-xs py-2">
                    Export
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Sparkle icon matching drafted.ai
function Sparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-coral-500">
      <path 
        d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" 
        fill="currentColor"
      />
    </svg>
  );
}

