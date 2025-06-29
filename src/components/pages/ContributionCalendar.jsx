"use client"

import { useEffect, useState } from "react"
import axios from "axios"

const ContributionCalendar = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedProblems, setSelectedProblems] = useState([])
  const [stats, setStats] = useState({
    totalContributions: 0,
    longestStreak: 0,
    currentStreak: 0,
    tagStats: {},
    monthlyStats: {},
    bestDay: { date: null, count: 0 },
  })

  const username = localStorage.getItem("username") || "admin"

  const getDateString = (date) => date.toISOString().split("T")[0]
  const getStartOfYear = (date) => new Date(date.getFullYear(), 0, 1)
  const addDays = (date, days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }
  const getDaysInYear = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365)

  const fetchData = async () => {
    try {
      const res = await axios.get(`https://backendcodeladder-2.onrender.com/usersubmissions/${username}`)
      const submissions = res.data?.submissions?.filter((s) => s.marked && s.date) || []

      // Group submissions by date with problem details
      const submissionsByDate = new Map()
      const tagCount = {}
      const monthlyCount = {}

      submissions.forEach((s) => {
        const day = s.date.split("T")[0]
        if (!submissionsByDate.has(day)) {
          submissionsByDate.set(day, [])
        }
        submissionsByDate.set(day, [...submissionsByDate.get(day), s])

        // Count tags
        if (s.tags && Array.isArray(s.tags)) {
          s.tags.forEach((tag) => {
            tagCount[tag] = (tagCount[tag] || 0) + 1
          })
        }

        // Count monthly stats
        const month = new Date(s.date).toLocaleString("default", { month: "long" })
        monthlyCount[month] = (monthlyCount[month] || 0) + 1
      })

      const today = new Date()
      const year = today.getFullYear()
      const start = getStartOfYear(today)
      const days = getDaysInYear(year)

      const contributions = []
      let bestDay = { date: null, count: 0 }

      for (let i = 0; i < days; i++) {
        const d = addDays(start, i)
        const dateStr = getDateString(d)
        const daySubmissions = submissionsByDate.get(dateStr) || []
        const count = daySubmissions.length

        if (count > bestDay.count) {
          bestDay = { date: dateStr, count }
        }

        contributions.push({
          date: dateStr,
          count,
          submissions: daySubmissions,
          dateObj: d,
          dayOfWeek: d.getDay(),
          month: d.getMonth(),
        })
      }

      // Calculate streaks
      const { longestStreak, currentStreak } = calculateStreaks(contributions)

      setData(contributions)
      setStats({
        totalContributions: submissions.length,
        longestStreak,
        currentStreak,
        tagStats: tagCount,
        monthlyStats: monthlyCount,
        bestDay,
      })
    } catch (err) {
      console.error("Failed to fetch submission data:", err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStreaks = (contributions) => {
    let longestStreak = 0
    let currentStreak = 0
    let tempStreak = 0

    // Calculate longest streak
    for (let i = 0; i < contributions.length; i++) {
      if (contributions[i].count > 0) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Calculate current streak (from today backwards)
    const today = new Date()
    const todayStr = getDateString(today)

    for (let i = contributions.length - 1; i >= 0; i--) {
      const contribution = contributions[i]
      if (contribution.date <= todayStr) {
        if (contribution.count > 0) {
          currentStreak++
        } else {
          break
        }
      }
    }

    return { longestStreak, currentStreak }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getColor = (count) => {
    if (count === 0) return "#ebedf0"
    if (count === 1) return "#9be9a8"
    if (count <= 3) return "#40c463"
    if (count <= 5) return "#30a14e"
    return "#216e39"
  }

  const formatDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return new Date(date).toLocaleDateString(undefined, options)
  }

  const handleDateClick = (day) => {
    if (day && day.submissions) {
      if (selectedDate === day.date) {
        // If clicking the same date, deselect it
        setSelectedDate(null)
        setSelectedProblems([])
      } else {
        setSelectedDate(day.date)
        setSelectedProblems(day.submissions)
      }
    }
  }

  const weeks = (() => {
    const grouped = []
    let current = new Array(7).fill(null)

    if (data.length) {
      for (let i = 0; i < data[0].dayOfWeek; i++) current[i] = null
    }

    data.forEach((entry, i) => {
      current[entry.dayOfWeek] = entry
      if (entry.dayOfWeek === 6 || i === data.length - 1) {
        grouped.push([...current])
        current = new Array(7).fill(null)
      }
    })
    return grouped
  })()

  const monthLabels = (() => {
    const labels = []
    let currentMonth = -1
    weeks.forEach((week, i) => {
      const first = week.find((d) => d !== null)
      if (first && first.month !== currentMonth) {
        currentMonth = first.month
        const monthName = new Date(first.dateObj).toLocaleDateString("default", { month: "short" })
        labels.push({ month: monthName, position: i })
      }
    })
    return labels
  })()

  // Get top tags
  const topTags = Object.entries(stats.tagStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30 section-padding">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Header Section */}
        <div className="text-center mb-8 lg:mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 mb-6">
            <i className="fas fa-chart-line"></i>
            <span className="font-medium">Progress Tracking</span>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-6">
              <i className="fas fa-calendar-alt text-white text-2xl lg:text-3xl"></i>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 lg:mb-6 tracking-tight">
            Contribution Calendar
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8 lg:mb-12">
            Track your daily coding progress and maintain your problem-solving streak
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
          <div className="card bg-white rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-3 lg:mb-4">
              <i className="fas fa-check-circle text-white text-sm lg:text-base"></i>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stats.totalContributions}</div>
            <div className="text-gray-600 font-medium text-sm lg:text-base">Total Problems</div>
            <div className="text-xs text-green-600 mt-1 lg:mt-2 font-medium">This year</div>
          </div>

          <div className="card bg-white rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-3 lg:mb-4">
              <i className="fas fa-fire text-white text-sm lg:text-base"></i>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1">{stats.currentStreak}</div>
            <div className="text-gray-600 font-medium text-sm lg:text-base">Current Streak</div>
            <div className="text-xs text-blue-600 mt-1 lg:mt-2 font-medium">
              {stats.currentStreak === 1 ? "day" : "days"}
            </div>
          </div>

          <div className="card bg-white rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-3 lg:mb-4">
              <i className="fas fa-trophy text-white text-sm lg:text-base"></i>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1">{stats.longestStreak}</div>
            <div className="text-gray-600 font-medium text-sm lg:text-base">Longest Streak</div>
            <div className="text-xs text-purple-600 mt-1 lg:mt-2 font-medium">Personal best</div>
          </div>

          <div className="card bg-white rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-3 lg:mb-4">
              <i className="fas fa-star text-white text-sm lg:text-base"></i>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-orange-600 mb-1">{stats.bestDay.count}</div>
            <div className="text-gray-600 font-medium text-sm lg:text-base">Best Day</div>
            <div className="text-xs text-orange-600 mt-1 lg:mt-2 font-medium">
              {stats.bestDay.date
                ? new Date(stats.bestDay.date).toLocaleDateString("default", { month: "short", day: "numeric" })
                : "N/A"}
            </div>
          </div>
        </div>

        {/* Main Calendar Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-8 lg:mb-12">
          {/* Calendar */}
          <div className="xl:col-span-2">
            <div className="card-elevated">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <i className="fas fa-calendar text-green-500"></i>
                  {new Date().getFullYear()} Activity
                </h2>
                <div className="text-sm text-gray-600">
                  {stats.totalContributions} contributions in {new Date().getFullYear()}
                </div>
              </div>

              {/* Calendar Container - Responsive */}
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Month labels */}
                  <div className="flex text-xs mb-3 ml-12 relative">
                    {monthLabels.map(({ month, position }) => (
                      <span
                        key={month}
                        className="absolute text-gray-600 font-medium"
                        style={{ left: `${position * 13}px` }}
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

                    {/* Calendar grid - GitHub style */}
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, 11px)` }}>
                      {weeks.map((week, wi) =>
                        week.map((day, di) => (
                          <div key={`${wi}-${di}`} className="relative group" onClick={() => handleDateClick(day)}>
                            <div
                              className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 border ${
                                day
                                  ? selectedDate === day.date
                                    ? "border-gray-600 ring-2 ring-blue-400 ring-offset-1"
                                    : "border-gray-300 hover:border-gray-500"
                                  : "border-transparent"
                              }`}
                              style={{
                                backgroundColor: day ? getColor(day.count) : "transparent",
                              }}
                              title={
                                day
                                  ? `${formatDate(day.date)}: ${day.count} contribution${day.count !== 1 ? "s" : ""}`
                                  : ""
                              }
                            />
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-gray-100 gap-4">
                <div className="text-sm text-gray-600 flex items-center">
                  Less
                  <div className="inline-flex items-center gap-1 mx-2">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="w-3 h-3 rounded-sm border border-gray-300"
                        style={{ backgroundColor: getColor(level === 4 ? 6 : level) }}
                      />
                    ))}
                  </div>
                  More
                </div>

                <div className="text-sm text-gray-500">Click on a square to see problems solved that day</div>
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
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium text-sm">{month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-12 sm:w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            style={{
                              width: `${Math.min(100, (count / Math.max(...Object.values(stats.monthlyStats))) * 100)}%`,
                            }}
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
                    <span className="text-gray-700 font-medium truncate text-sm">{tag}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 sm:w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  <span className="font-semibold text-gray-900">{(stats.totalContributions / 365).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active days</span>
                  <span className="font-semibold text-gray-900">{data.filter((d) => d.count > 0).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total skills</span>
                  <span className="font-semibold text-gray-900">{Object.keys(stats.tagStats).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most productive month</span>
                  <span className="font-semibold text-gray-900">
                    {Object.entries(stats.monthlyStats).length > 0
                      ? Object.entries(stats.monthlyStats).sort(([, a], [, b]) => b - a)[0][0]
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Problems solved on selected date */}
        {selectedProblems.length > 0 && selectedDate && (
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-calendar-day text-green-500"></i>
                Problems solved on {formatDate(selectedDate)}
              </h3>
              <button
                onClick={() => {
                  setSelectedDate(null)
                  setSelectedProblems([])
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <i className="fas fa-info-circle"></i>
                <span className="font-medium">
                  {selectedProblems.length} problem{selectedProblems.length !== 1 ? "s" : ""} solved on this day
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedProblems.map((problem, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors group border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex-1 pr-2">
                      {problem.link ? (
                        <a
                          href={problem.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-external-link-alt text-xs"></i>
                          {problem.title || "Problem"}
                        </a>
                      ) : (
                        <span className="flex items-center gap-2">
                          <i className="fas fa-code text-green-500 text-xs"></i>
                          {problem.title || "Problem"}
                        </span>
                      )}
                    </h4>
                  </div>

                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {problem.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                          +{problem.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <i className="fas fa-clock"></i>
                      Solved at{" "}
                      {new Date(problem.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {problem.link && (
                      <a
                        href={problem.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
                      >
                        View <i className="fas fa-arrow-right text-xs"></i>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no date is selected */}
        {!selectedDate && (
          <div className="card-elevated text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <i className="fas fa-mouse-pointer text-gray-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Date</h3>
            <p className="text-gray-600">
              Click on any square in the calendar above to see the problems you solved that day
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContributionCalendar
