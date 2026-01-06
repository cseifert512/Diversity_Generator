'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScatterPoint, ClusterInfo, PlotBounds } from '@/lib/types';
import { getClusterColor } from '@/lib/colors';

interface ScatterPlotProps {
  points: ScatterPoint[];
  clusters: ClusterInfo[];
  bounds: PlotBounds;
  onPointHover?: (point: ScatterPoint | null) => void;
  onPointClick?: (point: ScatterPoint) => void;
  selectedPointId?: string;
  width?: number;
  height?: number;
  // New props for display names and thumbnails
  displayNames?: Record<string, string>;  // Map of point id to display name
  thumbnails?: Record<string, string>;    // Map of point id to thumbnail URL
}

export function ScatterPlot({
  points,
  clusters,
  bounds,
  onPointHover,
  onPointClick,
  selectedPointId,
  width = 500,
  height = 320,
  displayNames = {},
  thumbnails = {},
}: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [clickedPoint, setClickedPoint] = useState<ScatterPoint | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // Get display name for a point - prefer user-assigned name, fall back to label
  const getDisplayName = (point: ScatterPoint) => {
    return displayNames[point.id] || point.label || `Plan ${point.id.slice(-4)}`;
  };

  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 16, right: 16, bottom: 32, left: 32 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([bounds.x_min, bounds.x_max])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([bounds.y_min, bounds.y_max])
      .range([innerHeight, 0]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add subtle grid - drafted.ai style
    const xGrid = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat(() => '');

    const yGrid = d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid)
      .selectAll('line')
      .attr('stroke', '#f0f0f0')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#f0f0f0')
      .attr('stroke-dasharray', '2,2');

    // Remove domain lines from grid
    g.selectAll('.grid .domain').remove();

    // Draw cluster hulls with softer styling
    clusters.forEach(cluster => {
      const clusterPoints = points.filter(p => p.cluster === cluster.id);
      
      if (clusterPoints.length >= 3) {
        const hullPoints = d3.polygonHull(
          clusterPoints.map(p => [xScale(p.x), yScale(p.y)] as [number, number])
        );

        if (hullPoints) {
          g.append('path')
            .datum(hullPoints)
            .attr('d', d3.line().curve(d3.curveCardinalClosed.tension(0.6)))
            .attr('fill', getClusterColor(cluster.id))
            .attr('fill-opacity', 0.06)
            .attr('stroke', getClusterColor(cluster.id))
            .attr('stroke-opacity', 0.15)
            .attr('stroke-width', 1.5);
        }
      }
    });

    // Draw points with drafted.ai style
    const pointsGroup = g.selectAll('.point')
      .data(points)
      .enter()
      .append('g')
      .attr('class', 'point')
      .attr('transform', d => `translate(${xScale(d.x)},${yScale(d.y)})`)
      .style('cursor', 'pointer');

    // Point circles - cleaner style
    pointsGroup.append('circle')
      .attr('r', d => d.id === selectedPointId ? 9 : 6)
      .attr('fill', d => getClusterColor(d.cluster))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.08))')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('r', 9);
        
        setHoveredPoint(d);
        setTooltipPos({ 
          x: xScale(d.x) + margin.left, 
          y: yScale(d.y) + margin.top - 10 
        });
        onPointHover?.(d);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('r', d.id === selectedPointId ? 9 : 6);
        
        setHoveredPoint(null);
        onPointHover?.(null);
      })
      .on('click', (event, d) => {
        // Show thumbnail popup
        setClickedPoint(d);
        setPopupPos({ 
          x: xScale(d.x) + margin.left, 
          y: yScale(d.y) + margin.top 
        });
        onPointClick?.(d);
      });

    // Minimal axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(4)
      .tickSize(0)
      .tickPadding(8);

    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickSize(0)
      .tickPadding(8);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#9a9a9a')
      .attr('font-size', '10px');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#9a9a9a')
      .attr('font-size', '10px');

    // Style domain lines
    g.selectAll('.domain').attr('stroke', '#e8e8e8');

  }, [points, clusters, bounds, width, height, selectedPointId, onPointHover, onPointClick, displayNames]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white"
      />

      {/* Tooltip - drafted.ai style */}
      {hoveredPoint && !clickedPoint && (
        <div
          className="absolute pointer-events-none bg-drafted-black text-white text-xs px-3 py-2 rounded-drafted shadow-drafted-lg transform -translate-x-1/2 -translate-y-full z-10"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 8 }}
        >
          <div className="font-medium">{getDisplayName(hoveredPoint)}</div>
          <div className="text-drafted-muted mt-0.5 flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getClusterColor(hoveredPoint.cluster) }}
            />
            Cluster {hoveredPoint.cluster + 1}
          </div>
          <div 
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-drafted-black transform rotate-45"
          />
        </div>
      )}

      {/* Thumbnail popup on click */}
      <AnimatePresence>
        {clickedPoint && (
          <>
            {/* Backdrop to close */}
            <div 
              className="fixed inset-0 z-20"
              onClick={() => setClickedPoint(null)}
            />
            
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 bg-white rounded-drafted-lg shadow-drafted-lg overflow-hidden"
              style={{ 
                left: Math.min(popupPos.x, width - 180), 
                top: Math.max(popupPos.y - 200, 10),
                width: 160
              }}
            >
              {/* Thumbnail */}
              {thumbnails[clickedPoint.id] ? (
                <img
                  src={thumbnails[clickedPoint.id]}
                  alt={getDisplayName(clickedPoint)}
                  className="w-full h-32 object-contain bg-drafted-bg"
                />
              ) : (
                <div className="w-full h-32 bg-drafted-bg flex items-center justify-center">
                  <span className="text-drafted-muted text-xs">No preview</span>
                </div>
              )}
              
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-drafted-black truncate">
                  {getDisplayName(clickedPoint)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getClusterColor(clickedPoint.cluster) }}
                  />
                  <span className="text-xs text-drafted-gray">
                    Cluster {clickedPoint.cluster + 1}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
