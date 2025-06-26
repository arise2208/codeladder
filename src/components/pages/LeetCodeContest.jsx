import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LETTERS = 'ABCD'.split('');

// Helper to normalize LeetCode URLs (removes trailing slash)
const normalizeLink = (link) => link ? link.replace(/\/$/, '') : '';

const LeetCodeContest = () => {
  const [contests, setContests] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('compact');
  const [unlinkedQuestions, setUnlinkedQuestions] = useState([]);

  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    if (!username || !token) {
      navigate('/login');
    }
    // eslint-disable-next-line
  }, [username, token, navigate]);

  // Fetch contest and problemset
  useEffect(() => {
    const loadLeetCodeData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/leetcode.json');
        if (!res.ok) throw new Error('Failed to load contest data');
        const data = await res.json();
        setContests(data);

        const qres = await axios.get('https://backendcodeladder-2.onrender.com/problemset', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-username': username
          }
        });

        // Use normalized link as key
        const map = {};
        qres.data.forEach(q => {
          if (q.link) map[normalizeLink(q.link)] = q;
        });
        setQuestionsMap(map);

        // Find unlinked questions using normalized links
        const missing = [];
        data.forEach(contest => {
          contest.problems.forEach(problem => {
            if (!problem.link || !map[normalizeLink(problem.link)]) {
              missing.push({
                contest: contest.contest || contest.url,
                link: problem.link,
                name: getProblemName(problem.link),
              });
            }
          });
        });
        setUnlinkedQuestions(missing);

        setError('');
      } catch (err) {
        setError('Failed to load LeetCode contest data or problem set.');
        console.error('Error loading contest data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLeetCodeData();
    // eslint-disable-next-line
  }, [token, username]);

  // Helper: get backend question for this problem (by url)
  const getBackendQuestion = (problem) => {
    if (!problem.link) return null;
    return questionsMap[normalizeLink(problem.link)] || null;
  };

  // Helper: solved status for this problem for current user
  const isSolved = (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ || !backendQ.solved_by) return false;
    return backendQ.solved_by.includes(username);
  };

  // Mark as solved
  const handleMarkSolved = async (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ) {
      setError('Matching problem not found in backend!');
      return;
    }
    if (!username) {
      setError('Please login to mark problems as solved');
      return;
    }
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/markquestion', {
        questionid: backendQ.question_id,
        user: username
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setQuestionsMap(prevMap => ({
        ...prevMap,
        [normalizeLink(backendQ.link)]: {
          ...backendQ,
          solved_by: [...(backendQ.solved_by || []), username]
        }
      }));
      setError('');
    } catch (error) {
      setError('Failed to mark as solved. Please try again.');
    }
  };

  // Unmark as solved
  const handleUnmark = async (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ) {
      setError('Matching problem not found in backend!');
      return;
    }
    if (!username) {
      setError('Please login to unmark problems');
      return;
    }
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/unmarkquestion', {
        questionid: backendQ.question_id,
        user: username
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setQuestionsMap(prevMap => ({
        ...prevMap,
        [normalizeLink(backendQ.link)]: {
          ...backendQ,
          solved_by: (backendQ.solved_by || []).filter(u => u !== username)
        }
      }));
      setError('');
    } catch (error) {
      setError('Failed to unmark. Please try again.');
    }
  };

  // Toggle solved state
  const toggleSolved = (problem) => {
    if (isSolved(problem)) {
      handleUnmark(problem);
    } else {
      handleMarkSolved(problem);
    }
  };

  // Get problem name from link
  const getProblemName = (link) =>
    link
      ? link.replace('https://leetcode.com/problems/', '').replace(/\/$/, '').replace(/-/g, ' ')
      : '';

  // Calculate stats for a contest
  const getStats = (contest) => {
    let totalProblems = 0;
    let solvedProblems = 0;
    let markedPoints = 0;
    contest.problems.forEach((problem) => {
      totalProblems++;
      if (isSolved(problem)) {
        solvedProblems++;
        markedPoints += parseInt(problem.points || '0', 10);
      }
    });
    return { totalProblems, solvedProblems, markedPoints };
  };

  // Filter contests based on search and completion status
  const filteredContests = contests.filter((contest) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        contest.contest?.toLowerCase().includes(query) ||
        contest.url?.toLowerCase().includes(query) ||
        contest.problems.some((p) =>
          getProblemName(p.link).toLowerCase().includes(query)
        );
      if (!matchesSearch) return false;
    }
    // Hide completed filter
    if (hideCompleted) {
      const { totalProblems, solvedProblems } = getStats(contest);
      if (totalProblems > 0 && solvedProblems === totalProblems) return false;
    }
    return true;
  });

  // Calculate overall stats
  const overallStats = contests.reduce(
    (acc, contest) => {
      const { totalProblems, solvedProblems } = getStats(contest);
      acc.totalProblems += totalProblems;
      acc.solvedProblems += solvedProblems;
      return acc;
    },
    { totalProblems: 0, solvedProblems: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
        <div className="animate-spin w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full mb-4"></div>
        <div className="text-lg">Loading LeetCode Contests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
          <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
        </div>
        <h2 className="text-2xl font-bold mb-4">Error Loading Data</h2>
        <p className="mb-8">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded bg-orange-600 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 section-padding">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Header & Stats */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-800 mb-4">LeetCode Contest Dashboard</h1>
          <p className="mb-8 text-gray-600">
            Track your progress across LeetCode contests with detailed problem statistics
          </p>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8">
            <div className="bg-white rounded-xl px-6 py-4 shadow text-center">
              <div className="text-3xl font-bold text-blue-700">{contests.length}</div>
              <div className="text-gray-600 font-medium">Contests</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-4 shadow text-center">
              <div className="text-3xl font-bold text-green-700">{overallStats.solvedProblems}</div>
              <div className="text-gray-600 font-medium">Problems Solved</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-4 shadow text-center">
              <div className="text-3xl font-bold text-blue-700">{overallStats.totalProblems}</div>
              <div className="text-gray-600 font-medium">Total Problems</div>
            </div>
          </div>
        </div>
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search contests or problems..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field px-4 py-2 rounded border border-gray-300 focus:outline-blue-400 flex-1"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={e => setHideCompleted(e.target.checked)}
            />
            <span className="text-gray-600">Hide Completed</span>
          </label>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'compact'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-th mr-1"></i>
              Compact
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'detailed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-list mr-1"></i>
              Detailed
            </button>
          </div>
        </div>
        {/* Contest Table */}
        <div className="bg-white rounded-xl shadow overflow-auto">
          {viewMode === 'compact' ? (
            <table className="w-full min-w-[800px]">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-blue-900 min-w-[120px]">Contest</th>
                  {LETTERS.map((letter) => (
                    <React.Fragment key={letter}>
                      <th className="px-3 py-4 text-center font-bold text-blue-900 min-w-[120px]">
                        Problem {letter}
                      </th>
                      <th className="px-3 py-4 text-center font-bold text-blue-900 min-w-[60px]">
                        Points
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="px-4 py-4 text-center font-bold text-blue-900 min-w-[80px]">Marked Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContests.length === 0 ? (
                  <tr>
                    <td colSpan={LETTERS.length * 2 + 2} className="px-6 py-16 text-center text-gray-500">
                      No contests found.
                    </td>
                  </tr>
                ) : (
                  filteredContests.map((contest) => {
                    const problems = contest.problems.slice(0, LETTERS.length);
                    const { markedPoints } = getStats(contest);
                    return (
                      <tr key={contest.url}>
                        <td className="px-4 py-3">
                          <a
                            href={contest.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 font-bold underline"
                          >
                            {contest.url.match(/contest\/([^/]+)\//i)?.[1] ||
                              contest.url}
                          </a>
                        </td>
                        {LETTERS.map((_, idx) => {
                          const problem = problems[idx];
                          if (!problem)
                            return (
                              <React.Fragment key={idx}>
                                <td className="px-3 py-3 text-center text-gray-400">
                                  N/A
                                </td>
                                <td className="px-3 py-3 text-center text-gray-400">
                                  -
                                </td>
                              </React.Fragment>
                            );
                          const solvedFlag = isSolved(problem);
                          return (
                            <React.Fragment key={problem.link}>
                              <td className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <a
                                    href={problem.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors duration-200 text-sm"
                                  >
                                    {getProblemName(problem.link)}
                                  </a>
                                  <button
                                    title={solvedFlag ? "Mark as unsolved" : "Mark as solved"}
                                    onClick={() => toggleSolved(problem)}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                      solvedFlag
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                    }`}
                                    aria-pressed={solvedFlag}
                                  >
                                    {solvedFlag ? (
                                      <i className="fas fa-check text-xs"></i>
                                    ) : (
                                      <i className="fas fa-circle text-xs"></i>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {problem.points || "-"}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-bold text-green-600">{markedPoints}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            // Detailed List View
            <div className="space-y-6 p-6">
              {filteredContests.length === 0 ? (
                <div className="text-center text-gray-500">No contests found.</div>
              ) : (
                filteredContests.map((contest) => {
                  const { totalProblems, solvedProblems, markedPoints } = getStats(contest);
                  const completionPercentage =
                    totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0;
                  return (
                    <div key={contest.url} className="border border-gray-100 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <a
                          href={contest.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-800 text-lg underline"
                        >
                          {contest.url.match(/contest\/([^/]+)\//i)?.[1] ||
                            contest.url}
                        </a>
                        <div className="w-32 h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-green-700">
                          {solvedProblems}/{totalProblems} solved, <b>{markedPoints}</b> points
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {contest.problems.map((problem, idx) => {
                          const solvedFlag = isSolved(problem);
                          return (
                            <div
                              key={problem.link}
                              className={`p-4 border rounded-lg flex flex-col gap-2 ${solvedFlag ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-medium text-gray-600">
                                  {LETTERS[idx] || idx + 1}
                                </span>
                                <button
                                  title={solvedFlag ? "Mark as unsolved" : "Mark as solved"}
                                  onClick={() => toggleSolved(problem)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    solvedFlag
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                  }`}
                                  aria-pressed={solvedFlag}
                                >
                                  {solvedFlag ? (
                                    <i className="fas fa-check text-xs"></i>
                                  ) : (
                                    <i className="fas fa-circle text-xs"></i>
                                  )}
                                </button>
                              </div>
                              <a
                                href={problem.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors duration-200 text-sm"
                              >
                                {getProblemName(problem.link)}
                              </a>
                              <span className="text-xs text-gray-600">
                                Points: <b>{problem.points || '-'}</b>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {/* Footer */}
        {filteredContests.length > 0 && (
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100 text-gray-600">
              <i className="fas fa-chart-bar text-blue-500"></i>
              Showing {filteredContests.length} contests
              {searchQuery && (
                <>
                  <i className="fas fa-search text-green-500"></i>
                  matching "{searchQuery}"
                </>
              )}
              {hideCompleted && (
                <>
                  <i className="fas fa-eye-slash text-blue-500"></i>
                  hiding completed
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeetCodeContest;