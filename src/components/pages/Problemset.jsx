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
  const [currentPage, setCurrentPage] = useState(1)
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  )
  const QUESTIONS_PER_PAGE = 20
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
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

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
      toast.success("Problems loaded successfully")
    } catch (error) {
      console.error("Error fetching questions:", error)
      setError("Failed to fetch questions. Please try again later.")
      toast.error("Failed to fetch questions. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSolved = async (questionId) => {
    if (!username) {
      setError("Please login to mark problems as solved")
      toast.error("Please login to mark problems as solved")
      return
    }

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
      toast.success("Marked as solved!")
    } catch (error) {
      console.error("Error marking as solved:", error)
      setError("Failed to mark as solved. Please try again.")
      toast.error("Failed to mark as solved. Please try again.")
    }
  }

  const handleUnmark = async (questionId) => {
    if (!username) {
      setError("Please login to unmark problems")
      toast.error("Please login to unmark problems")
      return
    }

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
      toast.success("Marked as unsolved!")
    } catch (error) {
      console.error("Error unmarking:", error)
      setError("Failed to unmark. Please try again.")
      toast.error("Failed to unmark. Please try again.")
    }
  }

  // Enhanced question title styling function
  const getQuestionStyle = (tags) => {
    if (!tags || tags.length === 0) return "text-gray-900"

    // LeetCode difficulty coloring
    const hasEasy = tags.some((tag) => tag.toLowerCase() === "easy")
    const hasMedium = tags.some((tag) => tag.toLowerCase() === "medium")
    const hasHard = tags.some((tag) => tag.toLowerCase() === "hard")

    if (hasEasy) {
      return "text-sky-600 hover:text-sky-700"
    }
    if (hasMedium) {
      return "text-yellow-600 hover:text-yellow-700"
    }
    if (hasHard) {
      return "text-red-600 hover:text-red-700"
    }

    // CodeChef rating coloring
    const isCodeChef = tags.some((t) => t.toLowerCase().includes("codechef"))
    const numericTag = tags.find((tag) => /^\d+$/.test(tag))

    if (isCodeChef && numericTag) {
      const rating = Number.parseInt(numericTag)
      if (isNaN(rating)) {
        return "text-gray-400" // unrated or invalid
      }
      // CodeChef color mapping based on stars:
      // 1★: <1400 (gray), 2★: 1400-1599 (green), 3★: 1600-1799 (cyan), 4★: 1800-1999 (blue),
      // 5★: 2000-2199 (violet), 6★: 2200-2499 (orange), 7★: 2500-2799 (red), 8★: 2800-2999 (pink), 9★: >=3000 (black/yellow)
      if (rating < 1400) {
        return "text-gray-600 hover:text-gray-700" // 1★ Newbie
      }
      if (rating < 1600) {
        return "text-green-600 hover:text-green-700" // 2★ Beginner
      }
      if (rating < 1800) {
        return "text-cyan-600 hover:text-cyan-700" // 3★ Specialist
      }
      if (rating < 2000) {
        return "text-blue-600 hover:text-blue-700" // 4★ Expert
      }
      if (rating < 2200) {
        return "text-violet-600 hover:text-violet-700" // 5★ Candidate Master
      }
      if (rating < 2500) {
        return "text-orange-600 hover:text-orange-700" // 6★ Master
      }
      if (rating < 2800) {
        return "text-red-600 hover:text-red-700" // 7★ International Master
      }
      if (rating < 3000) {
        return "text-pink-600 hover:text-pink-700" // 8★ Grandmaster
      }
      // 9★ Legendary Grandmaster
      return "text-black bg-yellow-200 hover:text-black"
    }

    // Default styling
    return "text-gray-900 hover:text-blue-600"
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.tags && q.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())))
    const isSolved = q.solved_by?.includes(username)
    if (hideSolved && isSolved) return false
    return matchesSearch
  })

  const solvedCount = questions.filter((q) => q.solved_by?.includes(username)).length

  // Pagination logic
  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE)
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  )

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Reset to page 1 if search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, hideSolved])

  if (loading) {
    return (
      <div
        className={`min-h-screen section-padding ${
          theme === "dark"
            ? "bg-gray-900 text-gray-100"
            : "bg-gradient-to-br from-gray-50 to-blue-50/30 text-gray-900"
        }`}
      >
        <div className={`max-w-6xl mx-auto container-padding ${
          theme === "dark" ? "bg-gray-900 text-gray-100" : ""
        }`}>
          <div className={`text-center ${theme === "dark" ? "bg-gray-900 text-gray-100" : ""}`}>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 animate-pulse ${
              theme === "dark"
                ? "bg-gradient-to-br from-blue-900 to-indigo-900"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            }`}>
              <i className="fas fa-code text-white text-2xl"></i>
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === "dark" ? "text-gray-100" : "text-gray-900"
            }`}>Loading Problems...</h2>
            <p className={`mb-8 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}>Fetching the latest coding challenges for you</p>
            <div className="flex justify-center">
              <div className={`animate-spin w-8 h-8 border-4 rounded-full ${
                theme === "dark"
                  ? "border-blue-900 border-t-transparent"
                  : "border-blue-600 border-t-transparent"
              }`}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen section-padding ${
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gradient-to-br from-gray-50 to-blue-50/30 text-gray-900"
      }`}
    >
      <Toaster position="top-right" />
      <div className={`max-w-6xl mx-auto container-padding ${
        theme === "dark" ? "bg-gray-900 text-gray-100" : ""
      }`}>
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <>
                <i className="fas fa-sun"></i>
                <span className="text-sm">Light</span>
              </>
            ) : (
              <>
                <i className="fas fa-moon"></i>
                <span className="text-sm">Dark</span>
              </>
            )}
          </button>
        </div>
        {/* Header Section */}
        <div className={`text-center mb-16 ${
          theme === "dark" ? "bg-gray-900 text-gray-100" : ""
        }`}>
          {/* ...existing code... */}
          <h1
            className={`section-header ${
              theme === "dark" ? "text-gray-100" : "text-gray-900"
            }`}
          >
            Problem Set
          </h1>
          <p className="section-subheader mb-12">
            Master algorithms and data structures with our curated collection of coding problems
          </p>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className={`card-elevated text-center group hover:scale-105 transition-all duration-300 ${
              theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""
            }`}>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
                <i className="fas fa-list-ol text-white"></i>
              </div>
              <div className={`text-3xl font-bold mb-1 ${
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              }`}>{questions.length}</div>
              <div className={`font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Total Problems</div>
              <div className={`text-xs mt-2 font-medium ${
                theme === "dark" ? "text-blue-300" : "text-blue-600"
              }`}>
                <i className="fas fa-trending-up mr-1"></i>
                Growing daily
              </div>
            </div>

            <div className={`card-elevated text-center group hover:scale-105 transition-all duration-300 ${
              theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""
            }`}>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4">
                <i className="fas fa-check-circle text-white"></i>
              </div>
              <div className={`text-3xl font-bold mb-1 ${
                theme === "dark" ? "text-green-400" : "text-green-600"
              }`}>{solvedCount}</div>
              <div className={`font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Solved</div>
              <div className={`text-xs mt-2 font-medium ${
                theme === "dark" ? "text-green-300" : "text-green-600"
              }`}>
                <i className="fas fa-trophy mr-1"></i>
                Keep going!
              </div>
            </div>

            <div className={`card-elevated text-center group hover:scale-105 transition-all duration-300 ${
              theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""
            }`}>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
                <i className="fas fa-target text-white"></i>
              </div>
              <div className={`text-3xl font-bold mb-1 ${
                theme === "dark" ? "text-orange-400" : "text-orange-600"
              }`}>{questions.length - solvedCount}</div>
              <div className={`font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Remaining</div>
              <div className={`text-xs mt-2 font-medium ${
                theme === "dark" ? "text-orange-300" : "text-orange-600"
              }`}>
                <i className="fas fa-rocket mr-1"></i>
                Challenge awaits
              </div>
            </div>
          </div>
        </div>
        {/* Enhanced Search and Filter Section */}
        <div className={`card-elevated mb-8 ${
          theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""
        }`}>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <i className={`fas fa-search ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}></i>
              </div>
              <input
                type="text"
                placeholder="Search problems by title, tags, or difficulty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`input-field pl-12 pr-4 ${
                  theme === "dark"
                    ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-400"
                    : ""
                }`}
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
                      hideSolved
                        ? "bg-blue-600 border-blue-600"
                        : theme === "dark"
                        ? "border-gray-700 group-hover:border-blue-400"
                        : "border-gray-300 group-hover:border-blue-400"
                    }`}
                  >
                    {hideSolved && (
                      <i className="fas fa-check text-white text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>
                    )}
                  </div>
                </div>
                <span className={`font-medium ${
                  theme === "dark" ? "text-gray-100" : "text-gray-700"
                }`}>Hide Solved</span>
              </label>
              <div className={`h-6 w-px ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              }`}></div>
              <div className={`flex items-center gap-2 text-sm ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>
                <i className="fas fa-filter"></i>
                <span className="font-medium">Filters</span>
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

        {/* Enhanced Problems Table */}
        <div className={`card-elevated overflow-hidden ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
              }`}>
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-hashtag text-gray-500 dark:text-gray-400"></i>
                      <span>#</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-code text-gray-500 dark:text-gray-400"></i>
                      <span>Problem</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-tags text-gray-500 dark:text-gray-400"></i>
                      <span>Tags</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center justify-center gap-2">
                      <i className="fas fa-check-circle text-gray-500 dark:text-gray-400"></i>
                      <span>Status</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={theme === "dark" ? "divide-y divide-gray-700" : "divide-y divide-gray-100"}>
                {paginatedQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={`px-6 py-16 text-center ${
                      theme === "dark" ? "bg-gray-900 text-gray-400" : "bg-white text-gray-500"
                    }`}>
                      <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <i className="fas fa-search text-2xl"></i>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">No problems found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedQuestions.map((q, index) => {
                    const isSolved = q.solved_by?.includes(username)
                    return (
                      <tr
                        key={q.question_id}
                        className={`group transition-colors duration-200 ${
                          isSolved
                            ? theme === "dark"
                              ? "bg-green-900/30"
                              : "bg-green-50/50"
                            : theme === "dark"
                              ? "bg-gray-900"
                              : "bg-white"
                        } ${
                          theme === "dark"
                            ? "hover:bg-gray-800"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {(currentPage - 1) * QUESTIONS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {isSolved && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <i className="fas fa-check text-white text-xs"></i>
                                </div>
                              </div>
                            )}
                            <a
                              href={q.link}
                              target="_blank"
                              rel="noreferrer"
                              className={`font-semibold transition-colors duration-200 group-hover:underline ${getQuestionStyle(q.tags)}`}
                            >
                              {q.title}
                            </a>
                            <i className="fas fa-external-link-alt text-gray-400 dark:text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {q.tags && q.tags.length > 0 ? (
                              q.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm italic">No tags</span>
                            )}
                            {q.tags && q.tags.length > 3 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                +{q.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => (isSolved ? handleUnmark(q.question_id) : handleMarkSolved(q.question_id))}
                            className={`tooltip inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 font-medium ${
                              isSolved
                                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                                : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:text-blue-400"
                            }`}
                            data-tooltip={isSolved ? "Mark as unsolved" : "Mark as solved"}
                          >
                            <i className={`fas ${isSolved ? "fa-check" : "fa-circle"} text-sm`}></i>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-center mt-8 gap-3">
            <nav className="inline-flex items-center gap-1 rounded-lg shadow-sm bg-white dark:bg-gray-800 px-4 py-2 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-gray-900 dark:text-blue-300"
                }`}
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-gray-900 dark:text-blue-300"
                }`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                )
                .map((page, idx, arr) => {
                  if (
                    idx > 0 &&
                    page !== arr[idx - 1] + 1
                  ) {
                    return (
                      <span key={`ellipsis-${page}`} className="px-2 text-gray-400 select-none">...</span>
                    )
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-gray-50 text-gray-700 hover:bg-blue-100 dark:bg-gray-900 dark:text-blue-300"
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-gray-900 dark:text-blue-300"
                }`}
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-gray-900 dark:text-blue-300"
                }`}
              >
                Last
              </button>
            </nav>
            <form
              className="flex items-center gap-2 mt-2"
              onSubmit={e => {
                e.preventDefault()
                const page = Number(e.target.page.value)
                if (page >= 1 && page <= totalPages) {
                  handlePageChange(page)
                }
              }}
            >
              <label htmlFor="jump-page" className="text-sm text-gray-700 dark:text-gray-200">Jump to page:</label>
              <input
                id="jump-page"
                name="page"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={currentPage}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-center text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors text-sm"
              >
                Go
              </button>
            </form>
          </div>
        )}

        {/* Enhanced Footer Stats */}
        {filteredQuestions.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <i className="fas fa-list text-blue-500"></i>
                <span className="font-medium">
                  Showing {filteredQuestions.length} of {questions.length} problems
                </span>
              </div>
              {search && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-search text-green-500"></i>
                  <span>matching "{search}"</span>
                </div>
              )}
              {hideSolved && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-eye-slash text-orange-500"></i>
                  <span>hiding solved</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Problemset
