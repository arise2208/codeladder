import React, { useMemo, useState } from 'react';
import { getRatingTierColor } from './RatingHeatmap';

export default function ProblemRatingsChart({
  solvedQuestions = [],
  platform = 'ALL'
}) {
  const [hoveredBar, setHoveredBar] = useState(null);

  // Group problems by rating
  const { chartData, maxCount } = useMemo(() => {
    const counts = {};
    let foundNumericRating = false;

    // Standard CF rating buckets from 800 to 2400 step 100
    const standardBuckets = [];
    for (let r = 800; r <= 2400; r += 100) {
      standardBuckets.push(r);
      counts[r] = 0;
    }

    // Also track difficulty counts if ratings are absent (e.g. LeetCode)
    const diffCounts = {
      Easy: 0,
      Medium: 0,
      Hard: 0
    };

    (solvedQuestions || []).forEach((q) => {
      const rating = q.metadata?.rating || (typeof q.rating === 'number' ? q.rating : null);
      if (rating && rating >= 500) {
        foundNumericRating = true;
        // Round to nearest 100 bucket
        const bucket = Math.min(2400, Math.max(800, Math.round(rating / 100) * 100));
        counts[bucket] = (counts[bucket] || 0) + 1;
      } else {
        const diff = String(q.difficulty || '').toUpperCase();
        if (diff === 'EASY') diffCounts.Easy++;
        else if (diff === 'MEDIUM') diffCounts.Medium++;
        else if (diff === 'HARD') diffCounts.Hard++;
      }
    });

    if (foundNumericRating || platform === 'CODEFORCES' || platform === 'ALL') {
      // Filter buckets to show from min active rating to max active rating (at least 800 to 2000)
      const activeRatings = Object.keys(counts)
        .map(Number)
        .filter((r) => counts[r] > 0);

      const minR = activeRatings.length > 0 ? Math.min(800, Math.min(...activeRatings)) : 800;
      const maxR = activeRatings.length > 0 ? Math.max(2000, Math.max(...activeRatings)) : 2000;

      const data = [];
      let maxVal = 0;
      for (let r = minR; r <= maxR; r += 100) {
        const count = counts[r] || 0;
        if (count > maxVal) maxVal = count;
        const style = getRatingTierColor(r);
        data.push({
          label: String(r),
          count,
          fill: style.bg,
          stroke: style.border,
          tier: style.label
        });
      }

      return {
        chartData: data,
        maxCount: Math.max(10, Math.ceil((maxVal * 1.25) / 10) * 10),
        hasRatings: true
      };
    } else {
      // Render difficulty buckets (e.g. for pure LeetCode)
      const data = [
        { label: 'Easy', count: diffCounts.Easy, fill: '#86EFAC', stroke: '#166534', tier: 'Easy' },
        { label: 'Medium', count: diffCounts.Medium, fill: '#FFBB55', stroke: '#9A3412', tier: 'Medium' },
        { label: 'Hard', count: diffCounts.Hard, fill: '#FF7777', stroke: '#991B1B', tier: 'Hard' }
      ];
      const maxVal = Math.max(...data.map((d) => d.count));
      return {
        chartData: data,
        maxCount: Math.max(10, Math.ceil((maxVal * 1.25) / 10) * 10),
        hasRatings: false
      };
    }
  }, [solvedQuestions, platform]);

  const svgHeight = 240;
  const chartHeight = 180;
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => Math.round(maxCount * pct));

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-[#1E1F25]">
          Problem Ratings
        </h3>

        {/* Legend */}
        <div className="flex items-center gap-2 select-none text-xs text-gray-600">
          <div className="w-6 h-3 bg-gray-300 border border-gray-600 rounded-xs" />
          <span>Problems Solved</span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="overflow-x-auto pt-4">
        <div className="min-w-[620px] relative">
          <svg width="100%" height={svgHeight} viewBox={`0 0 ${Math.max(620, chartData.length * 48 + 60)} ${svgHeight}`} className="select-none">
            {/* Horizontal Grid lines & Y-ticks */}
            {yTicks.map((val, idx) => {
              const y = chartHeight - (val / maxCount) * chartHeight + 20;
              return (
                <g key={idx}>
                  <line
                    x1={45}
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="#E5E7EB"
                    strokeDasharray={val === 0 ? '0' : '3 3'}
                  />
                  <text
                    x={38}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-gray-400 text-[11px] font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {chartData.map((d, idx) => {
              const barWidth = 32;
              const spacing = 46;
              const x = 55 + idx * spacing;
              const barH = (d.count / maxCount) * chartHeight;
              const y = chartHeight - barH + 20;
              const isHovered = hoveredBar?.label === d.label;

              return (
                <g key={d.label} className="cursor-pointer">
                  {/* Hover background highlight */}
                  <rect
                    x={x - 6}
                    y={20}
                    width={barWidth + 12}
                    height={chartHeight}
                    fill={isHovered ? '#F8F9FA' : 'transparent'}
                    rx={4}
                    onMouseEnter={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      setHoveredBar({
                        label: d.label,
                        count: d.count,
                        tier: d.tier,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      });
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                  />

                  {/* Actual Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(1, barH)}
                    fill={d.fill}
                    stroke={d.stroke}
                    strokeWidth={1}
                    className="transition-all duration-200"
                    style={{
                      opacity: isHovered ? 1 : 0.9,
                      transform: isHovered ? 'scaleY(1.02)' : 'none',
                      transformOrigin: `center ${chartHeight + 20}px`
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      setHoveredBar({
                        label: d.label,
                        count: d.count,
                        tier: d.tier,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      });
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                  />

                  {/* Top value counter when count > 0 */}
                  {d.count > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(16, y - 5)}
                      textAnchor="middle"
                      className="fill-gray-600 text-[10px] font-semibold font-mono"
                    >
                      {d.count}
                    </text>
                  )}

                  {/* X-axis Label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 36}
                    textAnchor="middle"
                    className="fill-gray-500 text-[11px] font-mono"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}

            {/* Bottom baseline */}
            <line
              x1={45}
              y1={chartHeight + 20}
              x2="100%"
              y2={chartHeight + 20}
              stroke="#9CA3AF"
            />
          </svg>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredBar.x, top: hoveredBar.y - 8 }}
        >
          <div className="bg-[#1E1F25] text-white px-3 py-1.5 rounded-md shadow-xl text-xs whitespace-nowrap border border-gray-700">
            <span className="font-semibold text-gray-200">{hoveredBar.tier}</span>{' '}
            ({hoveredBar.label}):{' '}
            <span className="font-bold text-emerald-400">
              {hoveredBar.count} solved
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
