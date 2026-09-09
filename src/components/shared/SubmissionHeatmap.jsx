import React, { useState, useMemo } from 'react';
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getDay,
  startOfDay,
  isAfter
} from 'date-fns';
import { Calendar, ChevronRight, ExternalLink } from 'lucide-react';
import { getCfRatingStyle } from '../../lib/ratingStyles';

export default function SubmissionHeatmap({
  solvedQuestions = [],
  signupDate = null
}) {
  const currentYear = new Date().getFullYear();
  const signupYear = signupDate ? new Date(signupDate).getFullYear() : currentYear;
  
  // Build year list from currentYear down to signupYear (minimum 2 years for rich interaction)
  const availableYears = useMemo(() => {
    const minYear = Math.min(signupYear, currentYear - 1);
    const years = [];
    for (let y = currentYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [signupYear, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // Group solved questions by 'yyyy-MM-dd' and count them
  const { countMap, questionsByDate, yearTotal } = useMemo(() => {
    const counts = {};
    const grouped = {};
    let total = 0;

    (solvedQuestions || []).forEach((sq) => {
      const rawDate = sq?.state?.solvedAt || sq?.state?.firstSolvedAt || sq?.solvedAt || sq?.updatedAt || sq?.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const dateStr = format(startOfDay(d), 'yyyy-MM-dd');
      counts[dateStr] = (counts[dateStr] || 0) + 1;
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(sq);

      if (d.getFullYear() === selectedYear) {
        total++;
      }
    });

    return { countMap: counts, questionsByDate: grouped, yearTotal: total };
  }, [solvedQuestions, selectedYear]);

  // Compute 52-53 weeks for the selected year
  const { weeks, monthLabels } = useMemo(() => {
    const startDate = startOfYear(new Date(selectedYear, 0, 1));
    const endDate = endOfYear(new Date(selectedYear, 11, 31));
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const computedWeeks = [];
    let currentWeek = [];

    // GitHub starts week on Sunday (0) or Monday (1). Let's use Sunday (0).
    const startDayOfWeek = getDay(startDate);
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    allDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        computedWeeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      computedWeeks.push(currentWeek);
    }

    // Determine month label positions (first week containing the 1st of each month)
    const months = [];
    const seenMonths = new Set();
    computedWeeks.forEach((week, wIndex) => {
      week.forEach((day) => {
        if (day && day.getDate() <= 7) {
          const m = day.getMonth();
          if (!seenMonths.has(m)) {
            seenMonths.add(m);
            months.push({
              name: format(day, 'MMM'),
              weekIndex: wIndex
            });
          }
        }
      });
    });

    return { weeks: computedWeeks, monthLabels: months };
  }, [selectedYear]);

  const today = startOfDay(new Date());

  const getColor = (count, isFuture) => {
    if (isFuture) return '#F3F4F6'; // Future unreached day
    if (!count || count === 0) return '#EBEDF0';
    if (count <= 2) return '#9BE9A8';
    if (count <= 4) return '#40C463';
    if (count <= 7) return '#30A14E';
    return '#216E39';
  };

  const selectedDayQuestions = selectedDay ? questionsByDate[selectedDay] || [] : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Main Heatmap Container */}
      <div className="flex-1 w-full bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs overflow-hidden">
        {/* Header summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1E1F25]">
              <strong>{yearTotal}</strong> problem{yearTotal === 1 ? '' : 's'} solved in {selectedYear}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="hidden sm:inline">Activity Overview</span>
          </div>
        </div>

        {/* SVG Grid */}
        <div className="overflow-x-auto pb-2 relative">
          <div className="min-w-max">
            <svg
              width={weeks.length * 15 + 40}
              height={7 * 15 + 28}
              className="text-[10px] select-none"
            >
              {/* Month Labels */}
              {monthLabels.map((m) => (
                <text
                  key={m.name + m.weekIndex}
                  x={32 + m.weekIndex * 15}
                  y={12}
                  className="fill-gray-400 font-medium text-[10px]"
                >
                  {m.name}
                </text>
              ))}

              {/* Day of Week Labels */}
              <text x={4} y={35} className="fill-gray-400 text-[9px] font-medium">Mon</text>
              <text x={4} y={65} className="fill-gray-400 text-[9px] font-medium">Wed</text>
              <text x={4} y={95} className="fill-gray-400 text-[9px] font-medium">Fri</text>

              {/* Weeks & Days */}
              {weeks.map((week, wIndex) => (
                <g key={wIndex} transform={`translate(${30 + wIndex * 15}, 18)`}>
                  {week.map((day, dIndex) => {
                    if (!day) return null;
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const count = countMap[dateStr] || 0;
                    const isFuture = isAfter(day, today);
                    const isSelected = selectedDay === dateStr;

                    return (
                      <rect
                        key={dIndex}
                        x={0}
                        y={dIndex * 15}
                        width={11}
                        height={11}
                        rx={2.5}
                        fill={getColor(count, isFuture)}
                        className={`transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'stroke-[#6C5CE7] stroke-2'
                            : 'hover:stroke-gray-600 hover:stroke-1'
                        }`}
                        onMouseEnter={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setHoveredDay({
                            dateStr,
                            formatted: format(day, 'EEEE, MMMM d, yyyy'),
                            count,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6] text-xs text-[#6B7280]">
          <span className="text-[11px]">
            {selectedDay ? (
              <span>
                Selected: <strong>{format(new Date(selectedDay), 'MMM d, yyyy')}</strong> ({selectedDayQuestions.length} solve{selectedDayQuestions.length === 1 ? '' : 's'})
              </span>
            ) : (
              'Click any cell to inspect activity'
            )}
          </span>

          <div className="flex items-center gap-1.5 select-none">
            <span className="text-[11px]">Less</span>
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: '#EBEDF0' }} />
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: '#9BE9A8' }} />
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: '#40C463' }} />
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: '#30A14E' }} />
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: '#216E39' }} />
            <span className="text-[11px]">More</span>
          </div>
        </div>

        {/* Selected Day Solved List Panel */}
        {selectedDay && (
          <div className="mt-4 pt-3 border-t border-[#E5E7EB] bg-[#F8F9FB] rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1E1F25]">
              <span>Solved on {format(new Date(selectedDay), 'MMMM d, yyyy')}</span>
              <span className="text-gray-500 font-normal">{selectedDayQuestions.length} problem{selectedDayQuestions.length === 1 ? '' : 's'}</span>
            </div>

            {selectedDayQuestions.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-1">No problems solved on this date.</p>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedDayQuestions.map((q) => {
                  const rating = q.metadata?.rating;
                  const cfStyle = q.platform === 'CODEFORCES' && rating ? getCfRatingStyle(rating) : null;

                  return (
                    <li
                      key={q._id}
                      className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-gray-200 text-xs hover:border-[#6C5CE7] transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-700">{q.platform}</span>
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#1E1F25] hover:text-[#6C5CE7] hover:underline truncate inline-flex items-center gap-1"
                        >
                          <span className="truncate">{q.title}</span>
                          <ExternalLink size={11} className="text-gray-400 shrink-0" />
                        </a>
                      </div>

                      <div className="shrink-0 ml-2">
                        {cfStyle ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{ backgroundColor: cfStyle.bg, color: cfStyle.text, borderColor: cfStyle.border }}
                          >
                            {rating}
                          </span>
                        ) : q.difficulty ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {q.difficulty}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* GitHub-Style Year Selector Sidebar */}
      <div className="flex flex-row lg:flex-col gap-1.5 shrink-0 w-full lg:w-32 bg-white rounded-xl border border-[#E5E7EB] p-2 shadow-xs">
        {availableYears.map((yr) => {
          const isSelected = yr === selectedYear;
          return (
            <button
              key={yr}
              type="button"
              onClick={() => {
                setSelectedYear(yr);
                setSelectedDay(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-[#6C5CE7] text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{yr}</span>
              {isSelected && <ChevronRight size={14} className="hidden lg:block text-white" />}
            </button>
          );
        })}
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredDay.x, top: hoveredDay.y - 8 }}
        >
          <div className="bg-[#1E1F25] text-white px-2.5 py-1.5 rounded-md shadow-xl text-xs whitespace-nowrap border border-gray-700">
            <span className="font-semibold text-emerald-400">
              {hoveredDay.count} solve{hoveredDay.count === 1 ? '' : 's'}
            </span>{' '}
            on {hoveredDay.formatted}
          </div>
        </div>
      )}
    </div>
  );
}
