import React, { useEffect, useState } from "react";
import axios from "axios";

const ContributionCalendar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredProblems, setHoveredProblems] = useState([]);
  const [stats, setStats] = useState({
    totalContributions: 0,
    longestStreak: 0,
    currentStreak: 0,
    tagStats: {},
    monthlyStats: {},
    bestDay: { date: null, count: 0 }
  });
  
  const username = localStorage.getItem("username") || "admin";
  
  const getDateString = (date) => date.toISOString().split("T")[0];
  const getStartOfYear = (date) => new Date(date.getFullYear(), 0, 1);
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };
  const getDaysInYear = (year) =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

  const fetchData = async () => {
    try {
      const res = await axios.get(`https://backendcodeladder-2.onrender.com/usersubmissions/${username}`);
      const submissions = res.data?.submissions?.filter((s) => s.marked && s.date) || [];

      // Group submissions by date with problem details
      const submissionsByDate = new Map();
      const tagCount = {};
      const monthlyCount = {};
      
      submissions.forEach((s) => {
        const day = s.date.split("T")[0];
        if (!submissionsByDate.has(day)) {
          submissionsByDate.set(day, []);
        }
        submissionsByDate.set(day, [...submissionsByDate.get(day), s]);
        
        // Count tags
        if (s.tags && Array.isArray(s.tags)) {
          s.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          });
        }
        
        // Count monthly stats
        const month = new Date(s.date).toLocaleString('default', { month: 'long' });
        monthlyCount[month] = (monthlyCount[month] || 0) + 1;
      });

      const today = new Date();
      const year = today.getFullYear();
      const start = getStartOfYear(today);
      const days = getDaysInYear(year);

      const contributions = [];
      let bestDay = { date: null, count: 0 };
      
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const dateStr = getDateString(d);
        const daySubmissions = submissionsByDate.get(dateStr) || [];
        const count = daySubmissions.length;
        
        if (count > bestDay.count) {
          bestDay = { date: dateStr, count };
        }
        
        contributions.push({
          date: dateStr,
          count,
          submissions: daySubmissions,
          dateObj: d,
          dayOfWeek: d.getDay(),
          month: d.getMonth(),
        });
      }

      // Calculate streaks
      const { longestStreak, currentStreak } = calculateStreaks(contributions);
      
      setData(contributions);
      setStats({
        totalContributions: submissions.length,
        longestStreak,
        currentStreak,
        tagStats: tagCount,
        monthlyStats: monthlyCount,
        bestDay
      });
    } catch (err) {
      console.error("Failed to fetch submission data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreaks = (contributions) => {
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    
    // Calculate longest streak
    for (let i = 0; i < contributions.length; i++) {
      if (contributions[i].count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Calculate current streak (from today backwards)
    const today = new Date();
    const todayStr = getDateString(today);
    
    for (let i = contributions.length - 1; i >= 0; i--) {
      const contribution = contributions[i];
      if (contribution.date <= todayStr) {
        if (contribution.count > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return { longestStreak, currentStreak };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getColor = (count) => {
    if (count === 0) return "#ebedf0";
    if (count === 1) return "#9be9a8";
    if (count <= 3) return "#40c463";
    if (count <= 5) return "#30a14e";
    return "#216e39";
  };

  const getIntensityLevel = (count) => {
    if (count === 0) return "No contributions";
    if (count === 1) return "1 contribution";
    if (count <= 3) return "Few contributions";
    if (count <= 5) return "Some contributions";
    return "Many contributions";
  };

  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const handleDateHover = (day) => {
    if (day && day.submissions) {
      setHoveredDate(day.date);
      setHoveredProblems(day.submissions);
    }
  };

  const handleDateLeave = () => {
    setHoveredDate(null);
    setHoveredProblems([]);
  };

  const weeks = (() => {
    const grouped = [];
    let current = new Array(7).fill(null);

    if (data.length) {
      for (let i = 0; i < data[0].dayOfWeek; i++) current[i] = null;
    }

    data.forEach((entry, i) => {
      current[entry.dayOfWeek] = entry;
      if (entry.dayOfWeek === 6 || i === data.length - 1) {
        grouped.push([...current]);
        current = new Array(7).fill(null);
      }
    });
    return grouped;
  })();

  const monthLabels = (() => {
    const labels = [];
    let currentMonth = -1;
    weeks.forEach((week, i) => {
      const first = week.find((d) => d !== null);
      if (first && first.month !== currentMonth) {
        currentMonth = first.month;
        const monthName = new Date(first.dateObj).toLocaleDateString('default', { month: 'short' });
        labels.push({ month: monthName, position: i });
      }
    });
    return labels;
  })();

  // Get top tags
  const topTags = Object.entries(stats.tagStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30 section-padding">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 animate-pulse">
              <i className="fas fa-calendar-alt text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loading Your Progress...</h2>
            <p className="text-gray-600 mb-8">Analyzing your coding journey</p>
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30 section-padding">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 mb-6">
            <i className="fas fa-chart-line"></i>
            <span className="font-medium">Progress Tracking</span>
          </div>
          
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-6">
              <i className="fas fa-calendar-alt text-white text-3xl"></i>
            </div>
          </div>
          
          <h1 className="section-header">Contribution Calendar</h1>
          <p className="section-subheader mb-12">
            Track your daily coding progress and maintain your problem-solving streak
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4">
              <i className="fas fa-check-circle text-white"></i>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalContributions}</div>
            <div className="text-gray-600 font-medium">Total Problems</div>
            <div className="text-xs text-green-600 mt-2 font-medium">
              This year
            </div>
          </div>
          
          <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
              <i className="fas fa-fire text-white"></i>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.currentStreak}</div>
            <div className="text-gray-600 font-medium">Current Streak</div>
            <div className="text-xs text-blue-600 mt-2 font-medium">
              {stats.currentStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
          
          <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-4">
              <i className="fas fa-trophy text-white"></i>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.longestStreak}</div>
            <div className="text-gray-600 font-medium">Longest Streak</div>
            <div className="text-xs text-purple-600 mt-2 font-medium">
              Personal best
            </div>
          </div>
          
          <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
              <i className="fas fa-star text-white"></i>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-1">{stats.bestDay.count}</div>
            <div className="text-gray-600 font-medium">Best Day</div>
            <div className="text-xs text-orange-600 mt-2 font-medium">
              {stats.bestDay.date ? new Date(stats.bestDay.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Main Calendar Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          {/* Calendar */}
          <div className="xl:col-span-2">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <i className="fas fa-calendar text-green-500"></i>
                  {new Date().getFullYear()} Activity
                </h2>
                <div className="text-sm text-gray-600">
                  {stats.totalContributions} contributions in {new Date().getFullYear()}
                </div>
              </div>

              {/* Month labels */}
              <div className="flex text-xs mb-3 ml-12 relative">
                {monthLabels.map(({ month, position }) => (
                  <span 
                    key={month} 
                    className="absolute text-gray-600 font-medium"
                    style={{ left: `${position * 15}px` }}
                  >
                    {month}
                  </span>
                ))}
              </div>

              <div className="flex">
                {/* Day labels */}
                <div className="flex flex-col mr-3 text-xs text-gray-500 font-medium">
                  {["", "Mon", "", "Wed", "", "Fri", ""].map((day, i) => (
                    <div key={i} className="h-3 mb-1 flex items-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, 13px)` }}>
                  {weeks.map((week, wi) =>
                    week.map((day, di) => (
                      <div
                        key={`${wi}-${di}`}
                        className="relative group"
                        onMouseEnter={() => handleDateHover(day)}
                        onMouseLeave={handleDateLeave}
                      >
                        <div
                          className="w-3 h-3 rounded-sm border border-gray-200/50 cursor-pointer transition-all duration-200 hover:border-gray-400"
                          style={{
                            backgroundColor: day ? getColor(day.count) : "transparent",
                            transform: hoveredDate === day?.date ? 'scale(1.2)' : 'scale(1)',
                          }}
                        />
                        
                        {/* Tooltip */}
                        {day && hoveredDate === day.date && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl min-w-max">
                              <div className="font-semibold">{formatDate(day.date)}</div>
                              <div className="text-gray-300">
                                {day.count === 0 ? 'No contributions' : `${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                              </div>
                              {day.submissions.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                  <div className="font-medium mb-1">Problems solved:</div>
                                  {day.submissions.slice(0, 3).map((submission, idx) => (
                                    <div key={idx} className="text-gray-300 truncate max-w-48">
                                      • {submission.title || 'Problem'}
                                    </div>
                                  ))}
                                  {day.submissions.length > 3 && (
                                    <div className="text-gray-400 text-xs">
                                      +{day.submissions.length - 3} more
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  Less
                  <div className="inline-flex items-center gap-1 mx-2">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="w-3 h-3 rounded-sm border border-gray-200/50"
                        style={{ backgroundColor: getColor(level === 4 ? 6 : level) }}
                      />
                    ))}
                  </div>
                  More
                </div>
                
                <div className="text-sm text-gray-500">
                  Learn how we <a href="#" className="text-blue-600 hover:underline">count contributions</a>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar with detailed stats */}
          <div className="space-y-6">
            {/* Monthly Breakdown */}
            <div className="card-elevated">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-chart-bar text-blue-500"></i>
                Monthly Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.monthlyStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.monthlyStats))) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 min-w-[2rem] text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Skills */}
            <div className="card-elevated">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-tags text-purple-500"></i>
                Top Skills
              </h3>
              <div className="space-y-3">
                {topTags.slice(0, 8).map(([tag, count]) => (
                  <div key={tag} className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium truncate">{tag}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, (count / topTags[0][1]) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 min-w-[1.5rem] text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card-elevated">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-info-circle text-green-500"></i>
                Quick Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average per day</span>
                  <span className="font-semibold text-gray-900">
                    {(stats.totalContributions / 365).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active days</span>
                  <span className="font-semibold text-gray-900">
                    {data.filter(d => d.count > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total skills</span>
                  <span className="font-semibold text-gray-900">
                    {Object.keys(stats.tagStats).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most productive month</span>
                  <span className="font-semibold text-gray-900">
                    {Object.entries(stats.monthlyStats).length > 0 
                      ? Object.entries(stats.monthlyStats).sort(([,a], [,b]) => b - a)[0][0]
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Problems solved today (if any) */}
        {hoveredProblems.length > 0 && hoveredDate && (
          <div className="card-elevated">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-calendar-day text-green-500"></i>
              Problems solved on {formatDate(hoveredDate)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hoveredProblems.map((problem, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <h4 className="font-semibold text-gray-900 mb-2">{problem.title || 'Problem'}</h4>
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {problem.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-primary text-xs">{tag}</span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{problem.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Solved at {new Date(problem.date).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionCalendar;