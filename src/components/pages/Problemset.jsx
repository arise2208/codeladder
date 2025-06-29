"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import toast, { Toaster } from "react-hot-toast"

function Problemset() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [hideSolved, setHideSolved] = useState(false)
  const [expandedTags, setExpandedTags] = useState({})
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [showTagAnalytics, setShowTagAnalytics] = useState(false)
  const username = localStorage.getItem("username")
  const token = localStorage.getItem("token")
  const navigate = useNavigate()

  useEffect(() => {
    if (!username || !token) {
      navigate("/login")
      return
    }
    fetchQuestions()
  }, [username, token, navigate])

  useEffect(() => {
    // Extract all unique tags from questions
    const tags = new Set()
    questions.forEach((q) => {
      if (q.tags && q.tags.length > 0) {
        q.tags.forEach((tag) => tags.add(tag))
      }
    })
    setAllTags(Array.from(tags).sort())
  }, [questions])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await axios.get("https://backendcodeladder-2.onrender.com/problemset", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-username": username,
        },
      })
      setQuestions(response.data)
      setError("")
    } catch (error) {
      console.error("Error fetching questions:", error)
      setError("Failed to fetch questions. Please try again later.")
      toast.error("Failed to fetch questions. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSolved = async (questionId, questionTitle) => {
    if (!username) {
      setError("Please login to mark problems as solved")
      toast.error("Please login to mark problems as solved")
      return
    }

    const loadingToast = toast.loading("Marking as solved...")

    try {
      await axios.patch(
        "https://backendcodeladder-2.onrender.com/markquestion",
        {
          questionid: questionId,
          user: username,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
          },
        },
      )

      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.question_id === questionId ? { ...q, solved_by: [...(q.solved_by || []), username] } : q,
        ),
      )

      setError("")
      toast.dismiss(loadingToast)
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-trophy text-green-600 text-sm"></i>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">🎉 Problem Solved!</div>
              <div className="text-sm text-gray-600 mt-1">
                Great job on "{questionTitle.length > 30 ? questionTitle.substring(0, 30) + "..." : questionTitle}"
              </div>
            </div>
          </div>
        ),
        {
          duration: 4000,
          style: {
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "16px",
            borderRadius: "12px",
            maxWidth: "400px",
          },
        },
      )
    } catch (error) {
      console.error("Error marking as solved:", error)
      setError("Failed to mark as solved. Please try again.")
      toast.dismiss(loadingToast)
      toast.error("Failed to mark as solved. Please try again.")
    }
  }

  const handleUnmark = async (questionId, questionTitle) => {
    if (!username) {
      setError("Please login to unmark problems")
      toast.error("Please login to unmark problems")
      return
    }

    const loadingToast = toast.loading("Unmarking...")

    try {
      await axios.patch(
        "https://backendcodeladder-2.onrender.com/unmarkquestion",
        {
          questionid: questionId,
          user: username,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
          },
        },
      )

      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.question_id === questionId ? { ...q, solved_by: (q.solved_by || []).filter((u) => u !== username) } : q,
        ),
      )

      setError("")
      toast.dismiss(loadingToast)
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-undo text-blue-600 text-sm"></i>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Problem Unmarked</div>
              <div className="text-sm text-gray-600 mt-1">
                "{questionTitle.length > 30 ? questionTitle.substring(0, 30) + "..." : questionTitle}" unmarked
              </div>
            </div>
          </div>
        ),
        {
          duration: 3000,
          style: {
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "16px",
            borderRadius: "12px",
            maxWidth: "400px",
          },
        },
      )
    } catch (error) {
      console.error("Error unmarking:", error)
      setError("Failed to unmark. Please try again.")
      toast.dismiss(loadingToast)
      toast.error("Failed to unmark. Please try again.")
    }
  }

  const toggleTagsExpansion = (questionId) => {
    setExpandedTags((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

  const handleTagClick = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        const newTags = prev.filter((t) => t !== tag)
        toast.success(`Removed filter: ${tag}`, {
          duration: 2000,
          style: {
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "12px",
          },
        })
        return newTags
      } else {
        const newTags = [...prev, tag]
        toast.success(`Added filter: ${tag}`, {
          duration: 2000,
          style: {
            background: "#dbeafe",
            border: "1px solid #3b82f6",
            borderRadius: "12px",
          },
        })
        return newTags
      }
    })
  }

  const clearAllFilters = () => {
    setSelectedTags([])
    setSearch("")
    toast.success("All filters cleared!", {
      duration: 2000,
      style: {
        background: "#f0fdf4",
        border: "1px solid #22c55e",
        borderRadius: "12px",
      },
    })
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.tags && q.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())))

    const matchesTags =
      selectedTags.length === 0 || (q.tags && selectedTags.every((selectedTag) => q.tags.includes(selectedTag)))

    const isSolved = q.solved_by?.includes(username)
    if (hideSolved && isSolved) return false

    return matchesSearch && matchesTags
  })

  const solvedCount = questions.filter((q) => q.solved_by?.includes(username)).length
  const completionPercentage = questions.length > 0 ? Math.round((solvedCount / questions.length) * 100) : 0

  // Calculate tag analytics
  const getTagAnalytics = () => {
    const tagStats = {}

    allTags.forEach((tag) => {
      const tagProblems = questions.filter((q) => q.tags && q.tags.includes(tag))
      const solvedTagProblems = tagProblems.filter((q) => q.solved_by?.includes(username))

      tagStats[tag] = {
        total: tagProblems.length,
        solved: solvedTagProblems.length,
        percentage: tagProblems.length > 0 ? Math.round((solvedTagProblems.length / tagProblems.length) * 100) : 0,
      }
    })

    return Object.entries(tagStats)
      .sort((a, b) => b[1].total - a[1].total) // Sort by total problems descending
      .slice(0, 12) // Show top 12 tags
  }

  const tagAnalytics = getTagAnalytics()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 section-padding">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center">
           
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loading Problems...</h2>
            <p className="text-gray-600 mb-8">Fetching the latest coding challenges for you</p>
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 section-padding">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Header Section */}
        <div className="text-center mb-16">
         

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">CodeLadder Problems</h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Track your progress and master coding challenges
          </p>

          {/* Beautiful Progress Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Progress Overview Card */}
            <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Progress</h3>
                <p className="text-gray-600">Keep up the great work!</p>
              </div>

              {/* Circular Progress */}
              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${completionPercentage * 2.51} 251`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900">{completionPercentage}%</div>
                    <div className="text-sm text-gray-600">Complete</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{solvedCount}</div>
                  <div className="text-xs text-gray-600 font-medium">Solved</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">{questions.length - solvedCount}</div>
                  <div className="text-xs text-gray-600 font-medium">Remaining</div>
                </div>
              </div>
            </div>

            {/* Tag Analytics Card */}
            <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Tag Analytics</h3>
                  <p className="text-gray-600">Your progress by category</p>
                </div>
                <button
                  onClick={() => setShowTagAnalytics(!showTagAnalytics)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all duration-200 font-medium text-sm"
                >
                  <i className={`fas fa-chevron-${showTagAnalytics ? "up" : "down"}`}></i>
                  {showTagAnalytics ? "Show Less" : "Show All"}
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {tagAnalytics.slice(0, showTagAnalytics ? tagAnalytics.length : 6).map(([tag, stats], index) => (
                  <div
                    key={tag}
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => handleTagClick(tag)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getTagColorDot(index)}`}></div>
                        <span className="font-semibold text-gray-900">{tag}</span>
                        {selectedTags.includes(tag) && <i className="fas fa-check text-blue-500 text-sm"></i>}
                      </div>
                      <div className="text-sm font-bold text-gray-700">
                        {stats.solved}/{stats.total}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getTagColorBar(index)}`}
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>{stats.percentage}% complete</span>
                      <span className="font-medium">{stats.total} problems</span>
                    </div>
                  </div>
                ))}
              </div>

              {!showTagAnalytics && tagAnalytics.length > 6 && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowTagAnalytics(true)}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    +{tagAnalytics.length - 6} more categories
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="card-elevated mb-8">
          <div className="space-y-6">
            {/* Search and Hide Solved Row */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search problems by title, tags, or difficulty..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-12 pr-4"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={hideSolved}
                      onChange={(e) => setHideSolved(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 ${
                        hideSolved ? "bg-blue-600 border-blue-600" : "border-gray-300 group-hover:border-blue-400"
                      }`}
                    >
                      {hideSolved && (
                        <i className="fas fa-check text-white text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-700 font-medium">Hide Solved</span>
                </label>
              </div>
            </div>

            {/* Tag Filters Section */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-filter text-white text-sm"></i>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Filter by Tags</h3>
                  {selectedTags.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {selectedTags.length} active
                    </span>
                  )}
                </div>
                {(selectedTags.length > 0 || search) && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium text-sm"
                  >
                    <i className="fas fa-times"></i>
                    Clear All
                  </button>
                )}
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-check-circle text-green-500"></i>
                    <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-all duration-200 transform hover:scale-105"
                      >
                        {tag}
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Available Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <i className="fas fa-tags text-gray-500"></i>
                  <span className="text-sm font-medium text-gray-700">Available Tags ({allTags.length}):</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allTags.map((tag, index) => {
                    const isSelected = selectedTags.includes(tag)
                    const problemCount = questions.filter((q) => q.tags && q.tags.includes(tag)).length

                    return (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                          isSelected ? "bg-blue-500 text-white shadow-lg" : `${getTagColor(index)} hover:shadow-md`
                        }`}
                        title={`${problemCount} problem${problemCount !== 1 ? "s" : ""} with this tag`}
                      >
                        {tag}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isSelected ? "bg-blue-400 text-blue-100" : "bg-white bg-opacity-50"
                          }`}
                        >
                          {problemCount}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="card border-l-4 border-red-500 bg-red-50 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Error Loading Problems</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Beautiful Enhanced Problems Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b-2 border-gray-100">
                  <th className="px-8 py-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-hashtag text-white text-sm"></i>
                      </div>
                      <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">#</span>
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-code text-white text-sm"></i>
                      </div>
                      <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">Problem</span>
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-tags text-white text-sm"></i>
                      </div>
                      <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">Tags</span>
                    </div>
                  </th>
                  <th className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-white text-sm"></i>
                      </div>
                      <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">Status</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-6 text-gray-500">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                          <i className="fas fa-search text-3xl text-gray-400"></i>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-gray-700 mb-2">No problems found</p>
                          <p className="text-gray-500">
                            {selectedTags.length > 0 || search
                              ? "Try adjusting your search or filter criteria"
                              : "No problems available"}
                          </p>
                          {(selectedTags.length > 0 || search) && (
                            <button
                              onClick={clearAllFilters}
                              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q, index) => {
                    const isSolved = q.solved_by?.includes(username)
                    const isExpanded = expandedTags[q.question_id]
                    const hasMoreTags = q.tags && q.tags.length > 4

                    return (
                      <tr
                        key={q.question_id}
                        className={`group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                          isSolved
                            ? "bg-gradient-to-r from-green-50/80 via-emerald-50/50 to-green-50/80 border-l-4 border-green-400"
                            : "bg-white hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30"
                        }`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                isSolved
                                  ? "bg-gradient-to-br from-green-100 to-green-200 text-green-700"
                                  : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            {isSolved && (
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                  <i className="fas fa-trophy text-white text-sm"></i>
                                </div>
                              </div>
                            )}
                            <div className="flex-1">
                              <a
                                href={q.link}
                                target="_blank"
                                rel="noreferrer"
                                className="group/link flex items-center gap-2 font-semibold text-gray-900 hover:text-blue-600 transition-all duration-200"
                              >
                                <span className="group-hover/link:underline">{q.title}</span>
                                <i className="fas fa-external-link-alt text-gray-400 text-xs opacity-0 group-hover/link:opacity-100 transition-all duration-200 transform group-hover/link:translate-x-1"></i>
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-6">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {q.tags && q.tags.length > 0 ? (
                                <>
                                  {(isExpanded ? q.tags : q.tags.slice(0, 4)).map((tag, tagIndex) => {
                                    const isFilterActive = selectedTags.includes(tag)
                                    return (
                                      <button
                                        key={tag}
                                        onClick={() => handleTagClick(tag)}
                                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${
                                          isFilterActive
                                            ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-200"
                                            : `${getTagColor(tagIndex)} hover:shadow-md`
                                        }`}
                                        title={
                                          isFilterActive ? "Click to remove filter" : "Click to filter by this tag"
                                        }
                                      >
                                        {tag}
                                        {isFilterActive && <i className="fas fa-check ml-1 text-xs"></i>}
                                      </button>
                                    )
                                  })}
                                  {hasMoreTags && (
                                    <button
                                      onClick={() => toggleTagsExpansion(q.question_id)}
                                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 hover:scale-105"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <i className="fas fa-chevron-up mr-1"></i>
                                          Show Less
                                        </>
                                      ) : (
                                        <>
                                          <i className="fas fa-chevron-down mr-1"></i>+{q.tags.length - 4} more
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 italic">
                                  <i className="fas fa-tag mr-1"></i>
                                  No tags
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-6 text-center">
                          <button
                            onClick={() =>
                              isSolved ? handleUnmark(q.question_id, q.title) : handleMarkSolved(q.question_id, q.title)
                            }
                            className={`group/btn relative inline-flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-3 ${
                              isSolved
                                ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700"
                                : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 hover:from-blue-500 hover:to-blue-600 hover:text-white shadow-md hover:shadow-lg"
                            }`}
                            title={isSolved ? "Mark as unsolved" : "Mark as solved"}
                          >
                            <i
                              className={`fas ${isSolved ? "fa-check-circle" : "fa-circle"} text-lg transition-all duration-200 group-hover/btn:scale-110`}
                            ></i>

                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                              {isSolved ? "Mark as unsolved" : "Mark as solved"}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Footer Stats */}
        {filteredQuestions.length > 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-list text-white text-sm"></i>
                </div>
                <span className="font-semibold">
                  Showing {filteredQuestions.length} of {questions.length} problems
                </span>
              </div>
              {search && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-search text-white text-sm"></i>
                  </div>
                  <span>matching "{search}"</span>
                </div>
              )}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-filter text-white text-sm"></i>
                  </div>
                  <span>
                    filtered by {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {hideSolved && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-eye-slash text-white text-sm"></i>
                  </div>
                  <span>hiding solved</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "16px",
          },
        }}
      />
    </div>
  )
}

// Helper function to get different colors for tags
function getTagColor(index) {
  const colors = [
    "bg-blue-100 text-blue-800 border border-blue-200",
    "bg-purple-100 text-purple-800 border border-purple-200",
    "bg-green-100 text-green-800 border border-green-200",
    "bg-yellow-100 text-yellow-800 border border-yellow-200",
    "bg-pink-100 text-pink-800 border border-pink-200",
    "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "bg-red-100 text-red-800 border border-red-200",
    "bg-teal-100 text-teal-800 border border-teal-200",
    "bg-orange-100 text-orange-800 border border-orange-200",
    "bg-cyan-100 text-cyan-800 border border-cyan-200",
  ]
  return colors[index % colors.length]
}

// Helper function for tag analytics color dots
function getTagColorDot(index) {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ]
  return colors[index % colors.length]
}

// Helper function for tag analytics progress bars
function getTagColorBar(index) {
  const colors = [
    "bg-gradient-to-r from-blue-400 to-blue-600",
    "bg-gradient-to-r from-purple-400 to-purple-600",
    "bg-gradient-to-r from-green-400 to-green-600",
    "bg-gradient-to-r from-yellow-400 to-yellow-600",
    "bg-gradient-to-r from-pink-400 to-pink-600",
    "bg-gradient-to-r from-indigo-400 to-indigo-600",
    "bg-gradient-to-r from-red-400 to-red-600",
    "bg-gradient-to-r from-teal-400 to-teal-600",
    "bg-gradient-to-r from-orange-400 to-orange-600",
    "bg-gradient-to-r from-cyan-400 to-cyan-600",
  ]
  return colors[index % colors.length]
}

export default Problemset
