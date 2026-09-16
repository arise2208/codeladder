import React, { useState, useMemo, useEffect } from 'react';
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getDay,
  startOfDay,
  isAfter,
  subMonths,
  subWeeks,
  subYears,
  startOfWeek,
  addDays
} from 'date-fns';
import { ExternalLink, X, Calendar, Activity, Award } from 'lucide-react';

export function getRatingTierColor(rating) {
  const r = Number(rating) || 0;
  if (r <= 0) return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: 'Activity' };
  if (r < 1200) return { bg: '#93C5FD', text: '#1E40AF', border: '#60A5FA', label: '<1200' };
  if (r < 1400) return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: '1200-1399' };
  if (r < 1600) return { bg: '#6EE7B7', text: '#047857', border: '#34D399', label: '1400-1599' };
  if (r < 1900) return { bg: '#AAAAFF', text: '#3730A3', border: '#818CF8', label: '1600-1899' };
  if (r < 2100) return { bg: '#FF88FF', text: '#86198F', border: '#F472B6', label: '1900-2099' };
  if (r < 2400) return { bg: '#FFBB55', text: '#9A3412', border: '#FB923C', label: '2100-2399' };
  return { bg: '#FF7777', text: '#991B1B', border: '#F87171', label: '2400+' };
}

export function getDifficultyTierColor(diff) {
  const d = String(diff || '').toUpperCase();
  if (d === 'EASY') return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: 'Easy' };
  if (d === 'MEDIUM') return { bg: '#FFBB55', text: '#9A3412', border: '#FB923C', label: 'Medium' };
  if (d === 'HARD') return { bg: '#FF7777', text: '#991B1B', border: '#F87171', label: 'Hard' };
  if (d === 'ATTEMPT' || d === 'WA' || d === 'WRONG_ANSWER') return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Attempt' };
  const num = Number(diff);
  if (!isNaN(num) && num > 0) return getRatingTierColor(num);
  return { bg: '#86EFAC', text: '#166534', border: '#4ADE80', label: 'Activity' };
}

export function getActivityColor(count) {
  if (count >= 10) return '#059669'; // dark green (rich emerald)
  if (count >= 5) return '#10B981'; // vibrant green
  if (count >= 2) return '#34D399'; // medium green
  return '#86EFAC'; // light green
}

export function getCodeforcesColor(count) {
  if (count <= 0) return '#EBEDF0';
  if (count >= 6) return '#216E39'; // darkest green
  if (count >= 4) return '#30A14E'; // dark green
  if (count >= 2) return '#40C463'; // medium green
  return '#9BE9A8'; // light green
}

// Codeforces upsolver rating color styling
export function getCfRatingStyle(rating) {
  const r = Number(rating) || 0;
  if (r <= 0) return { text: '#8b949e', label: 'Unrated' };
  if (r < 1200) return { text: '#808080', label: 'Newbie' };
  if (r < 1400) return { text: '#3fb950', label: 'Pupil' };
  if (r < 1600) return { text: '#39d2c0', label: 'Specialist' };
  if (r < 1900) return { text: '#58a6ff', label: 'Expert' };
  if (r < 2100) return { text: '#d2a8ff', label: 'Candidate Master' };
  if (r < 2400) return { text: '#f0883e', label: 'Master' };
  if (r < 2600) return { text: '#f85149', label: 'Grandmaster' };
  return { text: '#ff7b72', label: 'Legendary Grandmaster' };
}

// LeetCode upsolver difficulty & rating mapping
export function getLeetCodeDifficulty(prob) {
  const d = String(prob?.difficulty || prob?.metadata?.difficulty || '').toUpperCase();
  if (d.includes('HARD')) return 'HARD';
  if (d.includes('MED')) return 'MEDIUM';
  if (d.includes('EASY')) return 'EASY';

  const r = Number(prob?.metadata?.rating ?? prob?.rating ?? (!isNaN(Number(prob?.difficulty)) ? Number(prob?.difficulty) : 0)) || 0;
  if (r >= 2000) return 'HARD';
  if (r >= 1550) return 'MEDIUM';
  if (r > 0) return 'EASY';

  const points = Number(prob?.points || prob?.metadata?.points);
  if (points && points > 0) {
    if (points <= 3) return 'EASY';
    if (points <= 5) return 'MEDIUM';
    return 'HARD';
  }

  const col = String(prob?.index || prob?.metadata?.index || '').toUpperCase();
  if (col.includes('1') || col === 'Q1') return 'EASY';
  if (col.includes('4') || col === 'Q4') return 'HARD';
  if (col.includes('2') || col.includes('3') || col === 'Q2' || col === 'Q3') return 'MEDIUM';

  return null;
}

export function getLeetCodeDifficultyStyle(diff) {
  const d = String(diff || '').toUpperCase();
  if (d === 'HARD') return { color: '#EF4743', label: 'Hard' };
  if (d === 'MEDIUM') return { color: '#FFC01E', label: 'Medium' };
  return { color: '#00B8A3', label: 'Easy' };
}

// CodeChef upsolver rating star tiers
export function getCodeChefRatingStyle(rating) {
  const r = Number(rating) || 0;
  if (r <= 0 || r === 9999) return { text: '#8b949e', label: 'Unrated' };
  if (r <= 1399) return { text: '#8b949e', label: '1★' };
  if (r <= 1599) return { text: '#3fb950', label: '2★' };
  if (r <= 1799) return { text: '#58a6ff', label: '3★' };
  if (r <= 1999) return { text: '#bc8cff', label: '4★' };
  if (r <= 2199) return { text: '#e5a910', label: '5★' };
  if (r <= 2499) return { text: '#f0883e', label: '6★' };
  return { text: '#f85149', label: '7★' };
}

export function extractDateStr(rawDate) {
  if (!rawDate) return null;
  // If it's already an exact YYYY-MM-DD date string (no time component)
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    return typeof rawDate === 'string' && rawDate.length >= 10 ? rawDate.slice(0, 10) : null;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RatingHeatmap({
  solvedQuestions = [],
  availableYears = [],
  handleOrUser = '',
  platform = 'ALL'
}) {
  const currentYear = new Date().getFullYear();
  const isCodeforcesStyle = platform === 'CODEFORCES';
  const [selectedYear, setSelectedYear] = useState('CURRENT');
  const [colorMode, setColorMode] = useState('HYBRID'); // 'HYBRID' | 'ACTIVITY' | 'RATING'
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Group questions by 'yyyy-MM-dd' and extract max rating & Codeforces activity
  const { dayData } = useMemo(() => {
    const data = {};

    (solvedQuestions || []).forEach((q) => {
      const rawDate = q?.state?.solvedAt || q?.state?.firstSolvedAt || q?.solvedAt || q?.createdAt;
      const dateStr = extractDateStr(rawDate);
      if (!dateStr) return;

      if (!data[dateStr]) {
        data[dateStr] = {
          questions: [],
          maxRating: 0,
          highestColor: null,
          activityColor: null,
          codeforcesColor: null,
          cfColor: null,
          cfInfo: null,
          lcColor: null,
          lcInfo: null,
          ccColor: null,
          ccInfo: null
        };
      }

      data[dateStr].questions.push(q);

      // Only real named or contest problems set maxRating!
      if (!q.isGenericSubmission) {
        const rawRating = q.metadata?.rating ?? q.rating ?? (!isNaN(Number(q.difficulty)) ? Number(q.difficulty) : 0);
        const rating = Number(rawRating) || 0;
        if (rating > data[dateStr].maxRating) {
          data[dateStr].maxRating = rating;
          data[dateStr].highestColor = getRatingTierColor(rating).bg;
        }
      }
    });

    // Populate activity color and platform-specific upsolver colors for all days
    Object.values(data).forEach((entry) => {
      entry.activityColor = getActivityColor(entry.questions.length);
      const solvedProblems = entry.questions.filter((q) => q.state?.solved === true || q.verdict === 'OK' || q.isUniqueProblemSolve || (!q.isGenericSubmission && !q.verdict));
      const targetProblems = solvedProblems.length > 0 ? solvedProblems : entry.questions;
      const countForCf = solvedProblems.length > 0 ? solvedProblems.length : entry.questions.length;
      entry.codeforcesColor = getCodeforcesColor(countForCf);
      if (!entry.highestColor) {
        entry.highestColor = entry.activityColor;
      }

      // 1. Codeforces upsolver max rating color
      let maxCfRating = 0;
      let hasNamedCf = false;

      // 2. LeetCode upsolver max difficulty color
      let maxLcRank = 0; // 1: EASY, 2: MEDIUM, 3: HARD
      let maxLcDiff = null;

      // 3. CodeChef upsolver max rating color
      let maxCcRating = 0;
      let hasNamedCc = false;

      targetProblems.forEach((q) => {
        const rawRating = Number(q.metadata?.rating ?? q.rating ?? (!isNaN(Number(q.difficulty)) ? Number(q.difficulty) : 0)) || 0;

        // Codeforces
        if (rawRating > maxCfRating) maxCfRating = rawRating;
        if (!q.isGenericSubmission && (q.isNamedProblem || q.metadata?.name || q.problemKey)) hasNamedCf = true;

        // LeetCode
        const lcDiff = getLeetCodeDifficulty(q);
        if (lcDiff === 'HARD' && maxLcRank < 3) {
          maxLcRank = 3;
          maxLcDiff = 'HARD';
        } else if (lcDiff === 'MEDIUM' && maxLcRank < 2) {
          maxLcRank = 2;
          maxLcDiff = 'MEDIUM';
        } else if (lcDiff === 'EASY' && maxLcRank < 1) {
          maxLcRank = 1;
          maxLcDiff = 'EASY';
        }

        // CodeChef
        if (rawRating > maxCcRating && rawRating !== 9999) maxCcRating = rawRating;
        if (!q.isGenericSubmission && (q.isNamedProblem || q.metadata?.contest)) hasNamedCc = true;
      });

      // Codeforces color determined by max rating solved that day
      if (maxCfRating > 0) {
        entry.cfColor = getCfRatingStyle(maxCfRating).text;
        entry.cfInfo = `★${maxCfRating} (${getCfRatingStyle(maxCfRating).label})`;
      } else if (hasNamedCf) {
        entry.cfColor = '#808080';
        entry.cfInfo = 'Unrated';
      } else {
        entry.cfColor = '#3fb950'; // Pupil green for activity days
        entry.cfInfo = 'Practice Activity';
      }

      // LeetCode color determined by max difficulty/rating solved that day
      if (maxLcDiff) {
        const lcStyle = getLeetCodeDifficultyStyle(maxLcDiff);
        entry.lcColor = lcStyle.color;
        entry.lcInfo = lcStyle.label;
      } else {
        entry.lcColor = '#00B8A3'; // LeetCode Easy teal for activity days
        entry.lcInfo = 'Practice Activity';
      }

      // CodeChef color determined by max rating solved that day
      if (maxCcRating > 0) {
        entry.ccColor = getCodeChefRatingStyle(maxCcRating).text;
        entry.ccInfo = `★${maxCcRating} (${getCodeChefRatingStyle(maxCcRating).label})`;
      } else if (hasNamedCc) {
        entry.ccColor = '#8b949e';
        entry.ccInfo = 'Unrated';
      } else {
        entry.ccColor = '#3fb950'; // 2★ green for activity days
        entry.ccInfo = 'Practice Activity';
      }
    });

    return { dayData: data };
  }, [solvedQuestions]);

  // Compute the 6 metrics matching Codeforces & CodeChef
  const stats = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = subMonths(now, 1);
    const oneYearAgo = subYears(now, 1);

    const allProblemsSet = new Set();
    const yearProblemsSet = new Set();
    const monthProblemsSet = new Set();

    const allActiveDates = new Set();
    const yearActiveDates = new Set();
    const monthActiveDates = new Set();

    // Canonical clustering for Codeforces problems (merges Div 1 / Div 2 mirror problems)
    const cfClusters = [];
    const getCanonicalProblemKey = (sq) => {
      const isCf = sq.platform?.toUpperCase() === 'CODEFORCES' || (sq.url && sq.url.includes('codeforces.com'));
      if (!isCf) {
        return sq.problemKey || sq.url || sq.title || `prob-${sq._id}`;
      }

      const rawContestId = sq.metadata?.contestId || (sq.problemKey && /^(?:cf-)?(\d+)/.test(sq.problemKey) ? parseInt(sq.problemKey.replace(/^cf-/, '')) : null);
      const rawIndex = sq.metadata?.index || (sq.problemKey && /-(\w+)$/.test(sq.problemKey) ? sq.problemKey.split('-')[1] : null);

      let name = sq.metadata?.name;
      if (!name && sq.title) {
        name = sq.title.replace(/\s*\([^)]*\)\s*(\[.*\])?$/, '').trim();
      }
      name = (name || '').toLowerCase().trim();

      if (!rawContestId) {
        return sq.problemKey || sq.url || sq.title || `prob-${sq._id}`;
      }

      const match = cfClusters.find((cp) => {
        if (cp.contestId === rawContestId && cp.index === rawIndex) return true;
        if (cp.contestId !== rawContestId && name && cp.name === name && Math.abs(cp.contestId - rawContestId) <= 2) return true;
        return false;
      });

      if (match) {
        return match.canonicalKey;
      }

      const canonicalKey = sq.problemKey || `cf-${rawContestId}-${rawIndex || '0'}`;
      cfClusters.push({ canonicalKey, contestId: rawContestId, index: rawIndex, name });
      return canonicalKey;
    };

    (solvedQuestions || []).forEach((sq) => {
      const rawDate = sq?.state?.solvedAt || sq?.state?.firstSolvedAt || sq?.solvedAt || sq?.createdAt;
      const dateStr = extractDateStr(rawDate);
      if (!dateStr) return;

      const isSolved = sq.state?.solved === true || sq.verdict === 'OK' || sq.isUniqueProblemSolve || (!sq.isGenericSubmission && !sq.verdict);
      const problemKey = getCanonicalProblemKey(sq);

      if (isSolved) {
        allProblemsSet.add(problemKey);
        allActiveDates.add(dateStr);
      }

      const d = new Date(dateStr + 'T00:00:00');
      if (selectedYear === 'CURRENT') {
        if (d >= oneYearAgo && d <= now) {
          if (isSolved) {
            yearProblemsSet.add(problemKey);
            yearActiveDates.add(dateStr);
          }
        }
      } else if (d.getFullYear() === Number(selectedYear)) {
        if (isSolved) {
          yearProblemsSet.add(problemKey);
          yearActiveDates.add(dateStr);
        }
      }

      if (d >= oneMonthAgo && d <= now) {
        if (isSolved) {
          monthProblemsSet.add(problemKey);
          monthActiveDates.add(dateStr);
        }
      }
    });

    let allTimeProblems = allProblemsSet.size;
    let yearProblems = yearProblemsSet.size;
    let monthProblems = monthProblemsSet.size;

    // Fallback if no problems were marked isSolved but questions exist (e.g. daily activity items)
    if (allTimeProblems === 0 && (solvedQuestions || []).length > 0) {
      (solvedQuestions || []).forEach((sq) => {
        const rawDate = sq?.state?.solvedAt || sq?.state?.firstSolvedAt || sq?.solvedAt || sq?.createdAt;
        const dateStr = extractDateStr(rawDate);
        if (!dateStr) return;
        allActiveDates.add(dateStr);
        allTimeProblems++;

        const d = new Date(dateStr + 'T00:00:00');
        if (selectedYear === 'CURRENT') {
          if (d >= oneYearAgo && d <= now) {
            yearProblems++;
            yearActiveDates.add(dateStr);
          }
        } else if (d.getFullYear() === Number(selectedYear)) {
          yearProblems++;
          yearActiveDates.add(dateStr);
        }

        if (d >= oneMonthAgo && d <= now) {
          monthProblems++;
          monthActiveDates.add(dateStr);
        }
      });
    }

    const computeMaxStreak = (datesSet) => {
      const dates = Array.from(datesSet).sort();
      if (dates.length === 0) return 0;
      let maxS = 1;
      let curS = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
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

    const allTimeStreak = computeMaxStreak(allActiveDates);
    const yearStreak = computeMaxStreak(yearActiveDates);
    const monthStreak = computeMaxStreak(monthActiveDates);

    return {
      allTimeProblems,
      yearProblems,
      monthProblems,
      allTimeStreak,
      yearStreak,
      monthStreak,
      allTimeCount: (solvedQuestions || []).length,
      allTimeUniqueSolved: allTimeProblems,
      selectedYearCount: yearProblems,
      lastMonthCount: monthProblems,
      allTimeMaxStreak: allTimeStreak,
      yearMaxStreak: yearStreak,
      monthMaxStreak: monthStreak,
      yearActiveDays: yearActiveDates.size,
      allTimeActiveDays: allActiveDates.size
    };
  }, [solvedQuestions, selectedYear]);

  const selectedDateQuestions = selectedDate ? (dayData[selectedDate]?.questions || []) : [];

  // Compute weeks for selected year or 52-week rolling current window
  const { weeks, monthLabels } = useMemo(() => {
    let startDate, endDate;
    if (selectedYear === 'CURRENT') {
      const now = startOfDay(new Date());
      const dayOfWeek = getDay(now);
      endDate = addDays(now, 6 - dayOfWeek);
      startDate = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 52);
    } else {
      const y = Number(selectedYear);
      startDate = startOfYear(new Date(y, 0, 1));
      endDate = endOfYear(new Date(y, 11, 31));
    }

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
    let lastMonth = -1;
    computedWeeks.forEach((week, wIndex) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const m = firstValidDay.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          months.push({
            name: format(firstValidDay, 'MMM'),
            weekIndex: wIndex
          });
        }
      }
    });

    return { weeks: computedWeeks, monthLabels: months };
  }, [selectedYear]);

  const yearsList = useMemo(() => {
    const years = new Set(availableYears && availableYears.length > 0 ? availableYears : [currentYear, currentYear - 1]);
    (solvedQuestions || []).forEach((q) => {
      const rawDate = q?.state?.solvedAt || q?.state?.firstSolvedAt || q?.solvedAt || q?.createdAt;
      const dateStr = extractDateStr(rawDate);
      if (dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const yr = d.getFullYear();
          if (yr >= 2000 && yr <= currentYear + 1) {
            years.add(yr);
          }
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [availableYears, currentYear, solvedQuestions]);

    const today = startOfDay(new Date());

  return (
    <div className="bg-[#282828] rounded-xl border border-[#383838] p-6 shadow-xs relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-[#eff2f6]">
            {platform === 'CODEFORCES'
              ? 'Codeforces Activity & Rating Heatmap'
              : platform === 'LEETCODE'
              ? 'LeetCode Activity & Difficulty Heatmap'
              : platform === 'CODECHEF'
              ? 'CodeChef Activity & Rating Heatmap'
              : 'Submission & Activity Heatmap'}
          </h3>
          {handleOrUser && (
            <p className="text-xs text-[#8b949e] mt-0.5">
              problem-solving heatmap for <span className="font-semibold text-gray-300">{handleOrUser}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Color Mode Toggle ONLY for merged view */}
          {platform === 'ALL' && (
            <div className="inline-flex bg-[#1a1a1a] p-0.5 rounded-lg border border-[#383838]">
              <button
                type="button"
                onClick={() => setColorMode('HYBRID')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  colorMode === 'HYBRID' ? 'bg-[#282828] text-[#eff2f6] shadow-xs' : 'text-[#8b949e] hover:text-[#eff2f6]'
                }`}
                title="Show rating colors for contest solves, activity green for practice days"
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setColorMode('ACTIVITY')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  colorMode === 'ACTIVITY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#8b949e] hover:text-[#eff2f6]'
                }`}
                title="LeetCode / GitHub green activity scale"
              >
                Activity (Green)
              </button>
              <button
                type="button"
                onClick={() => setColorMode('RATING')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  colorMode === 'RATING' ? 'bg-[#6C5CE7] text-white shadow-xs' : 'text-[#8b949e] hover:text-[#eff2f6]'
                }`}
                title="Elo rating tiers"
              >
                Rating Tiers
              </button>
            </div>
          )}

          {/* Year Selector */}
          <label htmlFor="rating-heatmap-year" className="sr-only">Choose year</label>
          <select
            id="rating-heatmap-year"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value === 'CURRENT' ? 'CURRENT' : Number(e.target.value));
              setSelectedDate(null);
            }}
            className="text-xs font-semibold border border-[#383838] rounded-lg px-2.5 py-1.5 text-[#eff2f6] bg-[#1a1a1a] hover:border-[#4f4f4f] focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] cursor-pointer"
          >
            <option value="CURRENT">Past 1 Year (Current)</option>
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Grid */}
      <div className="overflow-x-auto pb-2">
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
                x={34 + m.weekIndex * 15}
                y={11}
                className="fill-[#8b949e] font-normal text-[11px]"
              >
                {m.name}
              </text>
            ))}

            {/* Weekday Labels matching screenshot: Mon, Wed, Fri */}
            <text x={6} y={39} className="fill-[#8b949e] text-[10px] font-normal">Mon</text>
            <text x={6} y={69} className="fill-[#8b949e] text-[10px] font-normal">Wed</text>
            <text x={6} y={99} className="fill-[#8b949e] text-[10px] font-normal">Fri</text>

            {/* Weeks */}
            {weeks.map((week, wIndex) => (
              <g key={wIndex} transform={`translate(${34 + wIndex * 15}, 16)`}>
                {week.map((day, dIndex) => {
                  if (!day) return null;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const entry = dayData[dateStr];
                  const isFuture = isAfter(day, today);

                  let cellColor = '#333333';
                  if (isFuture) {
                    cellColor = '#222222';
                  } else if (entry) {
                    if (platform === 'CODEFORCES') {
                      cellColor = entry.cfColor || '#333333';
                    } else if (platform === 'LEETCODE') {
                      cellColor = entry.lcColor || '#333333';
                    } else if (platform === 'CODECHEF') {
                      cellColor = entry.ccColor || '#333333';
                    } else if (colorMode === 'ACTIVITY') {
                      cellColor = entry.activityColor;
                    } else if (colorMode === 'RATING') {
                      cellColor = entry.highestColor;
                    } else {
                      // HYBRID
                      cellColor = entry.highestColor || entry.activityColor;
                    }
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
                          : 'hover:stroke-gray-400 hover:stroke-1'
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

      {/* Codeforces Rating Tiers Legend */}
      {platform === 'CODEFORCES' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#383838] text-xs text-[#8b949e]">
          <div className="flex flex-wrap items-center gap-2.5 select-none">
            <span className="text-[11px] font-medium text-[#8b949e]">Rating Tiers:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#808080' }} />
              <span className="text-[11px] text-gray-300">&lt;1200 (Newbie)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#3fb950' }} />
              <span className="text-[11px] text-gray-300">1200-1399 (Pupil)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#39d2c0' }} />
              <span className="text-[11px] text-gray-300">1400-1599 (Specialist)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#58a6ff' }} />
              <span className="text-[11px] text-gray-300">1600-1899 (Expert)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#d2a8ff' }} />
              <span className="text-[11px] text-gray-300">1900-2099 (CM)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#f0883e' }} />
              <span className="text-[11px] text-gray-300">2100-2399 (Master)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#f85149' }} />
              <span className="text-[11px] text-gray-300">2400+ (GM)</span>
            </div>
          </div>
        </div>
      )}

      {/* LeetCode Difficulty Tiers Legend */}
      {platform === 'LEETCODE' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#383838] text-xs text-[#8b949e]">
          <div className="flex flex-wrap items-center gap-3 select-none">
            <span className="text-[11px] font-medium text-[#8b949e]">Difficulty Tiers:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#00B8A3' }} />
              <span className="text-[11px] text-gray-300">Easy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#FFC01E' }} />
              <span className="text-[11px] text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#EF4743' }} />
              <span className="text-[11px] text-gray-300">Hard</span>
            </div>
          </div>
        </div>
      )}

      {/* CodeChef Star Tiers Legend */}
      {platform === 'CODECHEF' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#383838] text-xs text-[#8b949e]">
          <div className="flex flex-wrap items-center gap-2.5 select-none">
            <span className="text-[11px] font-medium text-[#8b949e]">Star Tiers:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#8b949e' }} />
              <span className="text-[11px] text-gray-300">1★ (&le;1399)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#3fb950' }} />
              <span className="text-[11px] text-gray-300">2★ (1400-1599)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#58a6ff' }} />
              <span className="text-[11px] text-gray-300">3★ (1600-1799)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#bc8cff' }} />
              <span className="text-[11px] text-gray-300">4★ (1800-1999)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#e5a910' }} />
              <span className="text-[11px] text-gray-300">5★ (2000-2199)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#f0883e' }} />
              <span className="text-[11px] text-gray-300">6★ (2200-2499)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#f85149' }} />
              <span className="text-[11px] text-gray-300">7★ (2500+)</span>
            </div>
          </div>
        </div>
      )}

      {/* Merged View Rating Tier & Activity Legend — only shown for ALL */}
      {platform === 'ALL' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#383838] text-xs text-[#8b949e]">
          {/* Activity Green Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#8b949e]">Activity:</span>
            <div className="flex items-center gap-1.5 select-none">
              <span className="text-[10px] text-gray-500">Less</span>
              <span className="w-3 h-3 rounded-xs border border-[#444444]" style={{ backgroundColor: '#333333' }} title="0 submissions" />
              <span className="w-3 h-3 rounded-xs border border-green-300" style={{ backgroundColor: '#86EFAC' }} title="1 submission" />
              <span className="w-3 h-3 rounded-xs border border-green-400" style={{ backgroundColor: '#34D399' }} title="2-4 submissions" />
              <span className="w-3 h-3 rounded-xs border border-green-500" style={{ backgroundColor: '#10B981' }} title="5-9 submissions" />
              <span className="w-3 h-3 rounded-xs border border-green-700" style={{ backgroundColor: '#059669' }} title="10+ submissions" />
              <span className="text-[10px] text-gray-500">More</span>
            </div>
          </div>

          {/* Difficulty / Rating Tiers Legend */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            <span className="text-[11px] font-medium text-[#8b949e]">Tiers:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-blue-400" style={{ backgroundColor: '#93C5FD' }} />
              <span className="text-[11px] text-gray-300">&lt;1200</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-teal-500" style={{ backgroundColor: '#6EE7B7' }} />
              <span className="text-[11px] text-gray-300">1400-1599</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-indigo-500" style={{ backgroundColor: '#AAAAFF' }} />
              <span className="text-[11px] text-gray-300">1600-1899</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-pink-500" style={{ backgroundColor: '#FF88FF' }} />
              <span className="text-[11px] text-gray-300">1900-2099</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-amber-500" style={{ backgroundColor: '#FFBB55' }} />
              <span className="text-[11px] text-gray-300">2100-2399</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-red-500" style={{ backgroundColor: '#FF7777' }} />
              <span className="text-[11px] text-gray-300">2400+</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Inspection Modal */}
      {selectedDate && (
        <div className="mt-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#383838] transition-all animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-[#383838] pb-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#6C5CE7]" />
              <span className="text-xs font-bold text-[#eff2f6]">
                {selectedDate}
              </span>
              <span className="text-[11px] font-mono text-[#8b949e] bg-[#282828] px-2 py-0.5 rounded-full font-medium border border-[#383838]">
                {selectedDateQuestions.length} {selectedDateQuestions.length === 1 ? 'problem' : 'problems'} logged
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-[#8b949e] hover:text-[#eff2f6] p-1 rounded-md hover:bg-[#282828] transition-colors cursor-pointer"
              title="Close inspection panel"
            >
              <X size={14} />
            </button>
          </div>

          {selectedDateQuestions.length === 0 ? (
            <p className="text-xs text-[#8b949e] italic py-1">No problems recorded on this date.</p>
          ) : (
            <div className="space-y-2">
              {/* Display named problems first */}
              {(() => {
                const isGeneric = (q) =>
                  q.isGenericSubmission ||
                  (!q.isNamedProblem &&
                    !q.metadata?.contest &&
                    (q.title?.toLowerCase().includes('submission') || q.title?.toLowerCase().includes('activity')));

                const namedProblems = selectedDateQuestions.filter((q) => !isGeneric(q));
                const genericSubmissions = selectedDateQuestions.filter((q) => isGeneric(q));

                return (
                  <>
                    {namedProblems.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {namedProblems.map((q, idx) => {
                          const rating = Number(q.metadata?.rating ?? q.rating ?? (!isNaN(Number(q.difficulty)) ? Number(q.difficulty) : 0)) || 0;
                          let badgeBg = null;
                          let badgeColor = null;
                          let badgeBorder = null;
                          let badgeLabel = null;

                          if (platform === 'CODEFORCES') {
                            const s = getCfRatingStyle(rating);
                            badgeColor = s.text;
                            badgeBg = 'rgba(255,255,255,0.08)';
                            badgeBorder = s.text;
                            badgeLabel = rating > 0 ? `★ ${rating}` : (q.difficulty || 'Practice');
                          } else if (platform === 'LEETCODE') {
                            const diff = getLeetCodeDifficulty(q);
                            const s = getLeetCodeDifficultyStyle(diff);
                            badgeColor = s.color;
                            badgeBg = 'rgba(255,255,255,0.08)';
                            badgeBorder = s.color;
                            badgeLabel = s.label;
                          } else if (platform === 'CODECHEF') {
                            const s = getCodeChefRatingStyle(rating);
                            badgeColor = s.text;
                            badgeBg = 'rgba(255,255,255,0.08)';
                            badgeBorder = s.text;
                            badgeLabel = rating > 0 ? `★ ${rating} (${s.label})` : (q.difficulty || 'Practice');
                          } else {
                            const tierStyle = rating > 0 ? getRatingTierColor(rating) : null;
                            const diffStyle = !tierStyle && q.difficulty ? getDifficultyTierColor(q.difficulty) : null;
                            const activeStyle = tierStyle || diffStyle;
                            badgeBg = activeStyle?.bg;
                            badgeColor = activeStyle?.text;
                            badgeBorder = activeStyle?.border;
                            badgeLabel = rating > 0 ? `★ ${rating}` : q.difficulty;
                          }

                          return (
                            <a
                              key={q._id || idx}
                              href={q.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2.5 rounded-lg border border-[#383838] bg-[#282828] hover:border-[#6C5CE7] hover:shadow-xs transition-all group"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-300 uppercase shrink-0 font-mono border border-[#383838]">
                                  {q.platform || 'CP'}
                                </span>
                                <span className="text-xs font-medium text-[#eff2f6] group-hover:text-[#A29BFE] group-hover:underline truncate">
                                  {q.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {badgeLabel && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                    style={{
                                      backgroundColor: badgeBg,
                                      color: badgeColor,
                                      borderColor: badgeBorder
                                    }}
                                  >
                                    {badgeLabel}
                                  </span>
                                )}
                                <ExternalLink size={12} className="text-gray-400 group-hover:text-[#A29BFE]" />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {genericSubmissions.length > 0 && (
                      <div className="text-xs text-[#8b949e] bg-[#282828] p-2.5 rounded-lg border border-[#383838] flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Activity size={14} className="text-[#ffa116]" />
                          <span>
                            {namedProblems.length > 0
                              ? `+ ${genericSubmissions.length} other practice submission attempt${genericSubmissions.length > 1 ? 's' : ''} on this date`
                              : `${genericSubmissions.length} practice submission attempt${genericSubmissions.length > 1 ? 's' : ''} logged on this date`}
                          </span>
                        </span>
                        {genericSubmissions[0]?.url && (
                          <a
                            href={genericSubmissions[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-[#58a6ff] hover:underline flex items-center gap-1"
                          >
                            View Submissions <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 6-Metric Grid matching Codeforces Image */}
      {isCodeforcesStyle ? (
        <div className="pt-8 mt-4 border-t border-[#383838] grid grid-cols-1 sm:grid-cols-3 gap-y-7 gap-x-12 select-none">
          {/* Row 1: Problem counts */}
          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.allTimeProblems}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.allTimeProblems === 1 ? 'problem' : 'problems'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              solved for all time
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.yearProblems}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.yearProblems === 1 ? 'problem' : 'problems'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              {selectedYear === 'CURRENT' ? 'solved for the last year' : `solved in ${selectedYear}`}
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.monthProblems}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.monthProblems === 1 ? 'problem' : 'problems'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              solved for the last month
            </div>
          </div>

          {/* Row 2: Streaks ("in a row") */}
          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.allTimeStreak}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.allTimeStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              in a row max.
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.yearStreak}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.yearStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              {selectedYear === 'CURRENT' ? 'in a row for the last year' : `in a row in ${selectedYear}`}
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-normal text-[#eff2f6] tracking-tight flex items-baseline gap-1.5">
              <span className="font-semibold text-white">{stats.monthStreak}</span>
              <span className="font-normal text-2xl sm:text-3xl text-gray-300">
                {stats.monthStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-sm text-[#8b949e] font-normal mt-1">
              in a row for the last month
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-6 mt-2 border-t border-[#383838] grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
          {/* Row 1: Problem counts */}
          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.allTimeCount}{' '}
              <span className="text-base font-medium text-gray-300">submissions</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">
              logged for all time
              {stats.allTimeUniqueSolved > 0 && stats.allTimeUniqueSolved !== stats.allTimeCount && (
                <span className="text-gray-400 ml-1">({stats.allTimeUniqueSolved} unique solved)</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.selectedYearCount}{' '}
              <span className="text-base font-medium text-gray-300">submissions</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">
              {selectedYear === 'CURRENT' ? 'in the past one year' : `in ${selectedYear}`}
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.lastMonthCount}{' '}
              <span className="text-base font-medium text-gray-300">submission{stats.lastMonthCount === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">in the last month</div>
          </div>

          {/* Row 2: Active days & Streaks */}
          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.allTimeActiveDays}{' '}
              <span className="text-base font-medium text-gray-300">active day{stats.allTimeActiveDays === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">logged for all time</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.yearActiveDays}{' '}
              <span className="text-base font-medium text-gray-300">active day{stats.yearActiveDays === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">
              {selectedYear === 'CURRENT' ? 'in the past one year' : `in ${selectedYear}`}
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold text-[#eff2f6]">
              {stats.yearMaxStreak}{' '}
              <span className="text-base font-medium text-gray-300">day{stats.yearMaxStreak === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">
              {selectedYear === 'CURRENT' ? 'max streak in past year' : `max streak in ${selectedYear}`}
            </div>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip matching Image 3 */}
      {hoveredDay && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredDay.x, top: hoveredDay.y - 8 }}
        >
          <div className="bg-[#212529] text-white p-3 rounded-lg shadow-2xl text-xs max-w-xs border border-gray-700">
            <div className="font-bold text-gray-100 mb-1.5 border-b border-gray-700 pb-1 flex items-center justify-between gap-3">
              <span>{hoveredDay.dateStr}</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                {hoveredDay.entry?.questions?.length || 0} {isCodeforcesStyle ? (hoveredDay.entry?.questions?.length === 1 ? 'problem solved' : 'problems solved') : (hoveredDay.entry?.questions?.length === 1 ? 'submission' : 'submissions')}
              </span>
            </div>

            {/* Platform-specific Max Solved Info */}
            {hoveredDay.entry && (
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono pb-1 border-b border-gray-700/60">
                <span className="text-gray-400">Max Solved:</span>
                {platform === 'CODEFORCES' && (
                  <span className="font-semibold" style={{ color: hoveredDay.entry.cfColor }}>
                    {hoveredDay.entry.cfInfo}
                  </span>
                )}
                {platform === 'LEETCODE' && (
                  <span className="font-semibold" style={{ color: hoveredDay.entry.lcColor }}>
                    {hoveredDay.entry.lcInfo}
                  </span>
                )}
                {platform === 'CODECHEF' && (
                  <span className="font-semibold" style={{ color: hoveredDay.entry.ccColor }}>
                    {hoveredDay.entry.ccInfo}
                  </span>
                )}
                {platform === 'ALL' && (
                  <span className="font-semibold text-emerald-400">
                    {hoveredDay.entry.maxRating > 0 ? `★${hoveredDay.entry.maxRating}` : 'Activity'}
                  </span>
                )}
              </div>
            )}

            {hoveredDay.entry?.questions?.length > 0 ? (
              <div className="space-y-1.5">
                {(() => {
                  const named = hoveredDay.entry.questions.filter(
                    (q) =>
                      q.isNamedProblem ||
                      (!q.isGenericSubmission &&
                        (q.metadata?.contest ||
                          (q.title &&
                            !q.title.toLowerCase().includes('submission') &&
                            !q.title.toLowerCase().includes('activity'))))
                  );
                  const totalCount = hoveredDay.entry.questions.length;

                  if (named.length > 0) {
                    const displayList = named.slice(0, 4);
                    const remaining = totalCount - displayList.length;
                    return (
                      <>
                        {displayList.map((q, idx) => {
                          const rating = Number(q.metadata?.rating ?? q.rating ?? (!isNaN(Number(q.difficulty)) ? Number(q.difficulty) : 0)) || 0;
                          let probColor = '#60A5FA';
                          let badgeText = rating > 0 ? `(★${rating})` : '';

                          if (platform === 'CODEFORCES') {
                            const s = getCfRatingStyle(rating);
                            probColor = s.text;
                            badgeText = rating > 0 ? `(★${rating})` : '';
                          } else if (platform === 'LEETCODE') {
                            const diff = getLeetCodeDifficulty(q);
                            const s = getLeetCodeDifficultyStyle(diff);
                            probColor = s.color;
                            badgeText = `(${s.label})`;
                          } else if (platform === 'CODECHEF') {
                            const s = getCodeChefRatingStyle(rating);
                            probColor = s.text;
                            badgeText = rating > 0 ? `(★${rating})` : '';
                          }

                          return (
                            <div
                              key={idx}
                              className="font-medium truncate flex items-center justify-between gap-2"
                              style={{ color: probColor }}
                            >
                              <span className="truncate">{q.title}</span>
                              {badgeText && (
                                <span className="shrink-0 text-white font-mono text-[10px]">
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {remaining > 0 && (
                          <div className="text-gray-400 text-[10px] italic pt-0.5 border-t border-gray-700/60 mt-1">
                            +{remaining} more practice submission{remaining === 1 ? '' : 's'} on this date
                          </div>
                        )}
                      </>
                    );
                  }

                  // When only generic calendar submissions exist for this date
                  return (
                    <div className="space-y-1">
                      <div className="text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>{totalCount} practice submission{totalCount === 1 ? '' : 's'} logged</span>
                      </div>
                      <p className="text-gray-400 text-[10px] leading-tight">
                        LeetCode public calendar records daily solve frequency for historical practice.
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-gray-400 italic">No submissions on this date.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
