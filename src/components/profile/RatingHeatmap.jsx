import React, { useState, useMemo } from 'react';
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getDay,
  startOfDay,
  isAfter,
  subMonths
} from 'date-fns';
import { ExternalLink, X, Calendar } from 'lucide-react';

export function getRatingTierColor(rating) {
  if (!rating || rating <= 0) return { bg: '#CCCCCC', text: '#374151', border: '#9CA3AF', label: '<1200' };
  if (rating < 1200) return { bg: '#CCCCCC', text: '#374151', border: '#9CA3AF', label: '<1200' };
  if (rating < 1400) return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: '1200-1399' };
  if (rating < 1600) return { bg: '#6EE7B7', text: '#047857', border: '#34D399', label: '1400-1599' };
  if (rating < 1900) return { bg: '#AAAAFF', text: '#3730A3', border: '#818CF8', label: '1600-1899' };
  if (rating < 2100) return { bg: '#FF88FF', text: '#86198F', border: '#F472B6', label: '1900-2099' };
  if (rating < 2400) return { bg: '#FFBB55', text: '#9A3412', border: '#FB923C', label: '2100-2399' };
  return { bg: '#FF7777', text: '#991B1B', border: '#F87171', label: '2400+' };
}

export function getDifficultyTierColor(diff) {
  const d = String(diff || '').toUpperCase();
  if (d === 'EASY') return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: 'Easy' };
  if (d === 'MEDIUM') return { bg: '#FFBB55', text: '#9A3412', border: '#FB923C', label: 'Medium' };
  if (d === 'HARD') return { bg: '#FF7777', text: '#991B1B', border: '#F87171', label: 'Hard' };
  return { bg: '#CCCCCC', text: '#374151', border: '#9CA3AF', label: 'Normal' };
}

export default function RatingHeatmap({
  solvedQuestions = [],
  availableYears = [],
  handleOrUser = ''
}) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Group questions by 'yyyy-MM-dd' and extract max rating
  const { dayData } = useMemo(() => {
    const data = {};

    (solvedQuestions || []).forEach((q) => {
      const rawDate = q?.state?.solvedAt || q?.state?.firstSolvedAt || q?.solvedAt || q?.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const dateStr = format(startOfDay(d), 'yyyy-MM-dd');

      if (!data[dateStr]) {
        data[dateStr] = {
          questions: [],
          maxRating: 0,
          highestColor: null
        };
      }

      data[dateStr].questions.push(q);

      const rating = q.metadata?.rating || (typeof q.rating === 'number' ? q.rating : 0);
      if (rating > data[dateStr].maxRating) {
        data[dateStr].maxRating = rating;
        data[dateStr].highestColor = getRatingTierColor(rating).bg;
      } else if (!data[dateStr].highestColor) {
        if (q.difficulty) {
          data[dateStr].highestColor = getDifficultyTierColor(q.difficulty).bg;
        } else {
          data[dateStr].highestColor = '#CCCCCC';
        }
      }
    });

    return { dayData: data };
  }, [solvedQuestions]);

  // Compute the 6 metrics matching Image 2
  const stats = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = subMonths(now, 1);

    let allTimeCount = (solvedQuestions || []).length;
    let selectedYearCount = 0;
    let lastMonthCount = 0;

    const allDates = Object.keys(dayData).sort();

    (solvedQuestions || []).forEach((sq) => {
      const rawDate = sq?.state?.solvedAt || sq?.state?.firstSolvedAt || sq?.solvedAt || sq?.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;

      if (d.getFullYear() === selectedYear) {
        selectedYearCount++;
      }
      if (d >= oneMonthAgo && d <= now) {
        lastMonthCount++;
      }
    });

    const computeMaxStreak = (dates) => {
      if (!dates || dates.length === 0) return 0;
      let maxS = 1;
      let curS = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          curS++;
          if (curS > maxS) maxS = curS;
        } else if (diff > 1) {
          curS = 1;
        }
      }
      return maxS;
    };

    const allTimeMaxStreak = computeMaxStreak(allDates);
    const yearDates = allDates.filter((d) => new Date(d).getFullYear() === selectedYear);
    const yearMaxStreak = computeMaxStreak(yearDates);
    const monthDates = allDates.filter((d) => new Date(d) >= oneMonthAgo && new Date(d) <= now);
    const monthMaxStreak = computeMaxStreak(monthDates);

    return {
      allTimeCount,
      selectedYearCount,
      lastMonthCount,
      allTimeMaxStreak,
      yearMaxStreak,
      monthMaxStreak
    };
  }, [solvedQuestions, dayData, selectedYear]);

  const selectedDateQuestions = selectedDate ? (dayData[selectedDate]?.questions || []) : [];

  // Compute weeks for selected year
  const { weeks, monthLabels } = useMemo(() => {
    const startDate = startOfYear(new Date(selectedYear, 0, 1));
    const endDate = endOfYear(new Date(selectedYear, 11, 31));
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const computedWeeks = [];
    let currentWeek = [];

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

  const yearsList = availableYears.length > 0 ? availableYears : [currentYear, currentYear - 1];

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-[#1E1F25]">
            Rating-Based Heatmap
          </h3>
          {handleOrUser && (
            <p className="text-xs text-gray-500 mt-0.5">
              problem-solving heatmap for <span className="font-semibold text-gray-700">{handleOrUser}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="rating-heatmap-year" className="sr-only">Choose year</label>
          <select
            id="rating-heatmap-year"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedDate(null);
            }}
            className="text-xs font-medium border border-gray-300 rounded-md px-2.5 py-1 text-gray-700 bg-white hover:border-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] cursor-pointer"
          >
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max">
          <svg
            width={weeks.length * 15 + 40}
            height={7 * 15 + 26}
            className="text-[10px] select-none"
          >
            {/* Month Labels */}
            {monthLabels.map((m) => (
              <text
                key={m.name + m.weekIndex}
                x={32 + m.weekIndex * 15}
                y={11}
                className="fill-gray-400 font-medium text-[10px]"
              >
                {m.name}
              </text>
            ))}

            {/* Weekday Labels */}
            <text x={4} y={35} className="fill-gray-400 text-[9px] font-medium">Mon</text>
            <text x={4} y={65} className="fill-gray-400 text-[9px] font-medium">Wed</text>
            <text x={4} y={95} className="fill-gray-400 text-[9px] font-medium">Fri</text>

            {/* Weeks */}
            {weeks.map((week, wIndex) => (
              <g key={wIndex} transform={`translate(${30 + wIndex * 15}, 16)`}>
                {week.map((day, dIndex) => {
                  if (!day) return null;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const entry = dayData[dateStr];
                  const isFuture = isAfter(day, today);

                  let cellColor = '#EBEDF0';
                  if (isFuture) {
                    cellColor = '#F3F4F6';
                  } else if (entry?.highestColor) {
                    cellColor = entry.highestColor;
                  }

                  const isSelected = selectedDate === dateStr;

                  return (
                    <rect
                      key={dIndex}
                      x={0}
                      y={dIndex * 15}
                      width={11}
                      height={11}
                      rx={2}
                      fill={cellColor}
                      className={`transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'stroke-[#6C5CE7] stroke-2'
                          : 'hover:stroke-gray-800 hover:stroke-1'
                      }`}
                      onClick={() => {
                        setSelectedDate(selectedDate === dateStr ? null : dateStr);
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setHoveredDay({
                          dateStr,
                          entry,
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Rating Tier Legend matching image 3 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#F3F4F6] text-xs text-gray-600">
        <span className="text-[11px] font-medium">Difficulty / Rating Tiers:</span>
        <div className="flex flex-wrap items-center gap-3 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-gray-400" style={{ backgroundColor: '#CCCCCC' }} />
            <span className="text-[11px]">&lt;1200</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-green-500" style={{ backgroundColor: '#86EFAC' }} />
            <span className="text-[11px]">1200-1399</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-teal-500" style={{ backgroundColor: '#6EE7B7' }} />
            <span className="text-[11px]">1400-1599</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-indigo-500" style={{ backgroundColor: '#AAAAFF' }} />
            <span className="text-[11px]">1600-1899</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-pink-500" style={{ backgroundColor: '#FF88FF' }} />
            <span className="text-[11px]">1900-2099</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-amber-500" style={{ backgroundColor: '#FFBB55' }} />
            <span className="text-[11px]">2100-2399</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-red-500" style={{ backgroundColor: '#FF7777' }} />
            <span className="text-[11px]">2400+</span>
          </div>
        </div>
      </div>

      {/* Selected Day Submissions Inspector Panel */}
      {selectedDate && (
        <div className="mt-4 pt-3.5 pb-2 border-t border-[#E5E7EB] bg-[#F8F9FB] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-[#6C5CE7]" />
              <span className="text-xs font-bold text-[#1E1F25]">
                Submissions on {format(new Date(selectedDate), 'MMMM d, yyyy')}
              </span>
              <span className="text-[11px] font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                {selectedDateQuestions.length} problem{selectedDateQuestions.length === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
              title="Close inspection panel"
            >
              <X size={14} />
            </button>
          </div>

          {selectedDateQuestions.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-1">No submissions recorded on this date.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {selectedDateQuestions.map((q, idx) => {
                const rating = q.metadata?.rating || q.rating;
                const tierStyle = rating ? getRatingTierColor(rating) : null;
                const diffStyle = !tierStyle && q.difficulty ? getDifficultyTierColor(q.difficulty) : null;
                const activeStyle = tierStyle || diffStyle;

                return (
                  <a
                    key={q._id || idx}
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#6C5CE7] hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 uppercase shrink-0 font-mono">
                        {q.platform || 'CP'}
                      </span>
                      <span className="text-xs font-medium text-[#1E1F25] group-hover:text-[#6C5CE7] group-hover:underline truncate">
                        {q.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeStyle && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          style={{
                            backgroundColor: activeStyle.bg,
                            color: activeStyle.text,
                            borderColor: activeStyle.border
                          }}
                        >
                          {rating ? rating : q.difficulty}
                        </span>
                      )}
                      <ExternalLink size={12} className="text-gray-400 group-hover:text-[#6C5CE7]" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6-Metric Streak & Solve Grid matching Image 2 */}
      <div className="pt-6 mt-2 border-t border-[#F3F4F6] grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
        {/* Row 1: Problem counts */}
        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.allTimeCount}{' '}
            <span className="text-base font-medium text-gray-700">problems</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">solved for all time</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.selectedYearCount}{' '}
            <span className="text-base font-medium text-gray-700">problems</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">solved for the last year</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.lastMonthCount}{' '}
            <span className="text-base font-medium text-gray-700">problem{stats.lastMonthCount === 1 ? '' : 's'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">solved for the last month</div>
        </div>

        {/* Row 2: Streaks */}
        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.allTimeMaxStreak}{' '}
            <span className="text-base font-medium text-gray-700">day{stats.allTimeMaxStreak === 1 ? '' : 's'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">in a row max.</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.yearMaxStreak}{' '}
            <span className="text-base font-medium text-gray-700">day{stats.yearMaxStreak === 1 ? '' : 's'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">in a row for the last year</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-[#1E1F25]">
            {stats.monthMaxStreak}{' '}
            <span className="text-base font-medium text-gray-700">day{stats.monthMaxStreak === 1 ? '' : 's'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">in a row for the last month</div>
        </div>
      </div>

      {/* Floating Hover Tooltip matching Image 3 */}
      {hoveredDay && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredDay.x, top: hoveredDay.y - 8 }}
        >
          <div className="bg-[#212529] text-white p-3 rounded-lg shadow-2xl text-xs max-w-xs border border-gray-700">
            <div className="font-bold text-gray-100 mb-1.5 border-b border-gray-700 pb-1">
              {hoveredDay.dateStr}
            </div>

            {hoveredDay.entry?.questions?.length > 0 ? (
              <div className="space-y-1">
                {hoveredDay.entry.questions.map((q, idx) => {
                  const rating = q.metadata?.rating || q.rating;
                  const diff = q.difficulty;
                  const label = rating ? `(${rating})` : diff ? `(${diff})` : '';

                  return (
                    <div
                      key={idx}
                      className="text-[#60A5FA] hover:text-[#93C5FD] underline font-medium truncate flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{q.title}</span>
                      {label && (
                        <span className="shrink-0 text-white font-mono text-[10px]">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 italic">No problems solved on this date.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
