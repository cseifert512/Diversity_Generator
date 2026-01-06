'use client';

import { motion } from 'framer-motion';
import { Layers, GitBranch, Timer, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import type { AnalysisResponse, UploadedPlan } from '@/lib/types';
import { ScatterPlot } from '../visualization/ScatterPlot';
import { getClusterColor } from '@/lib/colors';

interface AnalysisPanelProps {
  result: AnalysisResponse;
  plans?: UploadedPlan[];  // Plans with display_name
  thumbnails?: Record<string, string>;  // Stylized thumbnails
}

export function AnalysisPanel({ result, plans: plansList, thumbnails }: AnalysisPanelProps) {
  const { diversity, visualization, plan_count, processing_time_ms, plans } = result;
  const clusterCount = visualization.clusters.length;

  // Build display names map from plans
  const displayNames: Record<string, string> = {};
  if (plansList) {
    plansList.forEach(plan => {
      if (plan.display_name) {
        displayNames[plan.id] = plan.display_name;
      }
    });
  }

  // Determine score status
  const scoreStatus = diversity.score >= 0.7 ? 'excellent' : 
                      diversity.score >= 0.4 ? 'moderate' : 'low';

  return (
    <div className="card-drafted overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-drafted-border bg-drafted-bg/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-drafted-black">Diversity Analysis</h3>
          <div className="flex items-center gap-4 text-sm text-drafted-gray">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              {plan_count} plans
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" />
              {clusterCount} clusters
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              {(processing_time_ms / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center p-6 bg-drafted-bg rounded-drafted-lg"
            >
              <div className="mb-2">
                <span className={`text-5xl font-bold ${
                  scoreStatus === 'excellent' ? 'text-green-600' :
                  scoreStatus === 'moderate' ? 'text-amber-500' :
                  'text-coral-500'
                }`}>
                  {(diversity.score * 100).toFixed(0)}
                </span>
                <span className="text-2xl text-drafted-gray font-medium">%</span>
              </div>
              <p className="text-sm text-drafted-gray font-medium uppercase tracking-wider">
                Diversity Score
              </p>
              <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                scoreStatus === 'excellent' ? 'bg-green-100 text-green-700' :
                scoreStatus === 'moderate' ? 'bg-amber-100 text-amber-700' :
                'bg-coral-100 text-coral-700'
              }`}>
                {scoreStatus === 'excellent' && <CheckCircle className="w-3 h-3" />}
                {scoreStatus === 'moderate' && <TrendingUp className="w-3 h-3" />}
                {scoreStatus === 'low' && <AlertCircle className="w-3 h-3" />}
                {diversity.interpretation}
              </div>
            </motion.div>

            {/* Metric Bars */}
            <div className="space-y-4">
              {diversity.metrics.map((metric, i) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-drafted-gray capitalize">
                      {metric.name.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-drafted-black">
                      {(metric.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-drafted-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.score * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className={`h-full rounded-full ${
                        metric.score >= 0.7 ? 'bg-green-500' :
                        metric.score >= 0.4 ? 'bg-amber-500' :
                        'bg-coral-500'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Cluster Legend */}
            <div className="pt-4 border-t border-drafted-border">
              <h4 className="text-xs font-medium text-drafted-light uppercase tracking-wider mb-3">
                Cluster Distribution
              </h4>
              <div className="space-y-2">
                {visualization.clusters.map((cluster, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getClusterColor(i) }}
                      />
                      <span className="text-sm text-drafted-gray">
                        Cluster {i + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-drafted-black">
                      {cluster.size} plans
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scatter Plot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-drafted-bg rounded-drafted-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-serif font-bold text-drafted-black">Design Space Map</h4>
                  <p className="text-sm text-drafted-gray mt-0.5">
                    Each point represents a floor plan positioned by its features
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-drafted p-4">
                <ScatterPlot
                  points={visualization.points}
                  clusters={visualization.clusters}
                  bounds={visualization.bounds}
                  width={500}
                  height={320}
                  displayNames={displayNames}
                  thumbnails={thumbnails || {}}
                />
              </div>
            </div>

            {/* Insights */}
            <div className="mt-4 p-4 bg-drafted-bg rounded-drafted-lg">
              <h4 className="font-serif font-bold text-drafted-black mb-3">Key Insights</h4>
              <div className="grid grid-cols-2 gap-4">
                <InsightCard
                  title="Spread"
                  value={diversity.score >= 0.6 ? 'Well distributed' : 'Clustered'}
                  positive={diversity.score >= 0.6}
                />
                <InsightCard
                  title="Balance"
                  value={getClusterBalance(visualization.clusters)}
                  positive={isBalanced(visualization.clusters)}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  value: string;
  positive: boolean;
}

function InsightCard({ title, value, positive }: InsightCardProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-drafted">
      <span className="text-sm text-drafted-gray">{title}</span>
      <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-amber-600'}`}>
        {value}
      </span>
    </div>
  );
}

function getClusterBalance(clusters: { size: number }[]): string {
  if (clusters.length === 0) return 'N/A';
  const sizes = clusters.map(c => c.size);
  const max = Math.max(...sizes);
  const min = Math.min(...sizes);
  const ratio = min / max;
  if (ratio >= 0.7) return 'Balanced';
  if (ratio >= 0.4) return 'Moderate';
  return 'Unbalanced';
}

function isBalanced(clusters: { size: number }[]): boolean {
  if (clusters.length === 0) return false;
  const sizes = clusters.map(c => c.size);
  const max = Math.max(...sizes);
  const min = Math.min(...sizes);
  return (min / max) >= 0.5;
}
