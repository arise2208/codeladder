import React, { useMemo, useState } from 'react';

// Rainbow pastel palette matching Image 4
const PASTEL_PALETTE = [
  '#FF7A70', // coral red
  '#FF6584', // salmon pink
  '#EA6EA0', // rose
  '#D76FE5', // orchid
  '#AC72FA', // violet
  '#8B7CF8', // purple
  '#7893FA', // periwinkle
  '#68B7FA', // soft blue
  '#54D0F8', // sky blue
  '#4FE4DE', // cyan / aqua
  '#64E7B3', // mint
  '#8CED80', // lime
  '#C1F16A', // yellow-green
  '#F5E85F', // lemon
  '#FACA56', // gold
  '#FA9952', // orange
  '#FF8274', // peach
  '#E082D9', // mauve
  '#9B8DF9', // lavender
  '#69CEFA'  // azure
];

export default function TagsDonutChart({
  solvedQuestions = [],
  title = 'Tags Solved'
}) {
  const [hoveredTag, setHoveredTag] = useState(null);

  // Calculate tag counts
  const { tagList, totalOccurrences } = useMemo(() => {
    const counts = {};
    const seenProblems = new Set();
    (solvedQuestions || []).forEach((q) => {
      // Ignore non-OK or generic submission attempts
      if (q.verdict && q.verdict !== 'OK') return;
      if (q.isGenericSubmission) return;

      const key = q.problemKey || q.url || q.title;
      if (key) {
        if (seenProblems.has(key)) return;
        seenProblems.add(key);
      }

      const tags = q.tags || q.metadata?.tags || [];
      tags.forEach((t) => {
        let tagStr = '';
        if (typeof t === 'string') tagStr = t.trim();
        else if (t && typeof t.name === 'string') tagStr = t.name.trim();

        if (tagStr) {
          const lower = tagStr.toLowerCase();
          if (
            lower === 'codechef' ||
            lower === 'leetcode' ||
            lower === 'codeforces' ||
            lower === 'atcoder' ||
            lower === 'practice' ||
            lower === 'rated' ||
            lower === 'attempt' ||
            lower === 'knight' ||
            lower === 'guardian' ||
            lower.startsWith('rating-') ||
            lower.endsWith('★')
          ) {
            return;
          }
          counts[tagStr] = (counts[tagStr] || 0) + 1;
        }
      });
    });

    const list = Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        color: PASTEL_PALETTE[index % PASTEL_PALETTE.length]
      }))
      .sort((a, b) => b.count - a.count);

    const total = list.reduce((acc, item) => acc + item.count, 0);

    return { tagList: list, totalOccurrences: total };
  }, [solvedQuestions]);

  // Compute SVG arc slices for Donut Chart
  const slices = useMemo(() => {
    if (totalOccurrences === 0 || tagList.length === 0) return [];

    let accumulatedAngle = -Math.PI / 2; // Start from top 12 o'clock
    const radius = 110;
    const innerRadius = 60;
    const center = 130;

    return tagList.map((tag) => {
      const angleFraction = (tag.count / totalOccurrences) * 2 * Math.PI;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angleFraction;
      accumulatedAngle = endAngle;

      // Coordinates
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const ix1 = center + innerRadius * Math.cos(startAngle);
      const iy1 = center + innerRadius * Math.sin(startAngle);
      const ix2 = center + innerRadius * Math.cos(endAngle);
      const iy2 = center + innerRadius * Math.sin(endAngle);

      const largeArcFlag = angleFraction > Math.PI ? 1 : 0;

      // SVG path definition for donut arc
      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');

      const percentage = ((tag.count / totalOccurrences) * 100).toFixed(1);

      return {
        ...tag,
        pathData,
        percentage
      };
    });
  }, [tagList, totalOccurrences]);

  return (
    <div className="bg-[#282828] rounded-xl border border-[#383838] p-6 shadow-xs relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[#eff2f6]">
          {title}
        </h3>
        <span className="text-xs text-[#8b949e] font-medium">
          {tagList.length} distinct tags • {totalOccurrences} total
        </span>
      </div>

      {tagList.length === 0 ? (
        <div className="py-12 text-center text-[#8b949e] text-xs italic">
          No tags found for solved problems.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          {/* Donut Chart SVG */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg width={260} height={260} className="select-none">
              <g>
                {slices.map((slice) => {
                  const isHovered = hoveredTag?.name === slice.name;
                  return (
                    <path
                      key={slice.name}
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="#282828"
                      strokeWidth={1.5}
                      className="transition-all duration-150 cursor-pointer"
                      style={{
                        opacity: isHovered ? 1 : hoveredTag ? 0.65 : 0.92,
                        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                        transformOrigin: '130px 130px'
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setHoveredTag({
                          ...slice,
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => setHoveredTag(null)}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {hoveredTag ? (
                <>
                  <span className="text-xs font-bold text-[#eff2f6] line-clamp-1 max-w-[110px]">
                    {hoveredTag.name}
                  </span>
                  <span className="text-base font-extrabold text-[#A29BFE]">
                    {hoveredTag.count}
                  </span>
                  <span className="text-[10px] text-[#8b949e]">
                    {hoveredTag.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-[#eff2f6]">
                    {tagList.length}
                  </span>
                  <span className="text-[11px] text-[#8b949e] font-medium">
                    Tags
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Scrollable Legend List matching Image 4 */}
          <div className="w-full md:w-64 max-h-64 overflow-y-auto pr-2 border-t md:border-t-0 md:border-l border-[#383838] pt-4 md:pt-0 md:pl-4 space-y-1.5 custom-scrollbar">
            {tagList.map((tag) => {
              const isHovered = hoveredTag?.name === tag.name;
              return (
                <div
                  key={tag.name}
                  onMouseEnter={() => setHoveredTag(tag)}
                  onMouseLeave={() => setHoveredTag(null)}
                  className={`flex items-center gap-2.5 px-2 py-1 rounded cursor-pointer transition-all ${
                    isHovered ? 'bg-[#1a1a1a] text-[#eff2f6] font-semibold' : 'hover:bg-[#333333]/50 text-gray-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-xs shrink-0 border border-gray-600"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1 flex items-center justify-between text-xs text-gray-300 truncate">
                    <span className="truncate">{tag.name}</span>
                    <span className="font-mono text-[#8b949e] ml-2 shrink-0">
                      : {tag.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
