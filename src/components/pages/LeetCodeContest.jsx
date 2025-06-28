import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LETTERS = 'ABCD'.split('');

// --- Helper functions & constants (as before) ---
const EASY_COLOR = "#23b6b6";
const MEDIUM_COLOR = "#c49000";
const HARD_COLOR = "#a52626";
const getLeetCodeDifficultyStyle = (tags = []) => {
  const lowerTags = tags.map(t => t.toLowerCase());
  if (lowerTags.includes('easy')) return { color: '#1da1f2' };
  if (lowerTags.includes('medium')) return { color: '#c49000' };
  if (lowerTags.includes('hard')) return { color: '#a52626' };
  return { color: '#444' };
};
const normalizeLink = (link) => link ? link.replace(/\/$/, '') : '';
const getContestType = (contest) => {
  const url = contest.url?.toLowerCase() || '';
  const name = contest.contest?.toLowerCase() || '';
  if (url.includes('biweekly') || name.includes('biweekly')) return 'biweekly';
  if (url.includes('weekly') || name.includes('weekly')) return 'weekly';
  return 'other';
};
const SKILL_GROUPS = [
  {
    label: 'Advanced',
    skills: [
      'Dynamic Programming', 'Union Find', 'Topological Sort', 'Trie',
      'Segment Tree', 'Binary Indexed Tree', 'Suffix Array', 'Monotonic Stack'
    ]
  },
  {
    label: 'Intermediate',
    skills: [
      'Breadth-First Search', 'Depth-First Search', 'Graph', 'Backtracking',
      'Greedy', 'Heap', 'Priority Queue', 'Stack', 'Queue'
    ]
  },
  {
    label: 'Fundamental',
    skills: [
      'Array', 'Matrix', 'String', 'Hash Table', 'Sorting',
      'Two Pointers', 'Bit Manipulation', 'Math', 'Simulation'
    ]
  }
];

const LeetCodeContest = () => {
  // --- State and hooks (as before) ---
  const [contests, setContests] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('compact');
  const [unlinkedQuestions, setUnlinkedQuestions] = useState([]);
  const [contestType, setContestType] = useState('all');
  const [showGroup, setShowGroup] = useState({});

  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!username || !token) navigate('/login');
  }, [username, token, navigate]);

  useEffect(() => {
    const loadLeetCodeData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/leetcode.json');
        if (!res.ok) throw new Error('Failed to load contest data');
        const data = await res.json();
        setContests(data);

        const qres = await axios.get('https://backendcodeladder-2.onrender.com/problemset', {
          headers: { Authorization: `Bearer ${token}`, 'x-username': username }
        });

        const map = {};
        qres.data.forEach(q => { if (q.link) map[normalizeLink(q.link)] = q; });
        setQuestionsMap(map);

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
      } finally {
        setLoading(false);
      }
    };
    loadLeetCodeData();
  }, [token, username]);

  const getBackendQuestion = (problem) => {
    if (!problem.link) return null;
    return questionsMap[normalizeLink(problem.link)] || null;
  };

  const isSolved = (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ || !backendQ.solved_by) return false;
    return backendQ.solved_by.includes(username);
  };

  const handleMarkSolved = async (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ) { setError('Matching problem not found in backend!'); return; }
    if (!username) { setError('Please login to mark problems as solved'); return; }
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/markquestion', {
        questionid: backendQ.question_id, user: username
      }, { headers: { Authorization: `Bearer ${token}`, 'x-username': username } });
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

  const handleUnmark = async (problem) => {
    const backendQ = getBackendQuestion(problem);
    if (!backendQ) { setError('Matching problem not found in backend!'); return; }
    if (!username) { setError('Please login to unmark problems'); return; }
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/unmarkquestion', {
        questionid: backendQ.question_id, user: username
      }, { headers: { Authorization: `Bearer ${token}`, 'x-username': username } });
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

  const toggleSolved = (problem) => { isSolved(problem) ? handleUnmark(problem) : handleMarkSolved(problem); };

  const getProblemName = (link) =>
    link
      ? link.replace('https://leetcode.com/problems/', '').replace(/\/$/, '').replace(/-/g, ' ')
      : '';

  const getStats = (contest) => {
    let totalProblems = 0, solvedProblems = 0, markedPoints = 0;
    contest.problems.forEach((problem) => {
      totalProblems++;
      if (isSolved(problem)) {
        solvedProblems++;
        markedPoints += parseInt(problem.points || '0', 10);
      }
    });
    return { totalProblems, solvedProblems, markedPoints };
  };

  // ---- Stats for arc widget & skills panel ----
  const solvedProblems = Object.values(questionsMap).filter(
    q => q.solved_by && q.solved_by.includes(username)
  );
  const tagCount = {};
  solvedProblems.forEach(q => {
    (q.tags || []).forEach(tag => {
      const tagLabel = tag.trim();
      if (!tagLabel) return;
      if (['easy', 'medium', 'hard'].includes(tagLabel.toLowerCase())) return;
      tagCount[tagLabel] = (tagCount[tagLabel] || 0) + 1;
    });
  });
  const skillStatGroups = SKILL_GROUPS.map(group => {
    const arr = group.skills
      .map(skill => ({
        skill,
        count: tagCount[skill] || 0
      }))
      .filter(item => item.count > 0);
    return { ...group, arr };
  });
  const shownSkills = new Set(SKILL_GROUPS.flatMap(g => g.skills));
  const otherSkills = Object.entries(tagCount)
    .filter(([tag]) => !shownSkills.has(tag))
    .map(([tag, count]) => ({ skill: tag, count }));
  const getShownArr = (arr, groupLabel) =>
    showGroup[groupLabel] ? arr : arr.slice(0, 3);

  // Arc chart & difficulty stats
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  let attempting = 0;
  solvedProblems.forEach(q => {
    if (q.tags?.some(t => t.toLowerCase() === 'easy')) difficultyCount.Easy += 1;
    else if (q.tags?.some(t => t.toLowerCase() === 'medium')) difficultyCount.Medium += 1;
    else if (q.tags?.some(t => t.toLowerCase() === 'hard')) difficultyCount.Hard += 1;
    if (q.is_attempting) attempting++;
  });
  const totalEasy = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='easy')).length;
  const totalMedium = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='medium')).length;
  const totalHard = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='hard')).length;
  const solved = difficultyCount.Easy + difficultyCount.Medium + difficultyCount.Hard;
  const total = totalEasy + totalMedium + totalHard;
  const radius = 80, stroke = 10, cx = 90, cy = 90;
  const circumference = 2 * Math.PI * radius;
  const easyAngle = total ? (totalEasy / total) * 360 : 0;
  const mediumAngle = total ? (totalMedium / total) * 360 : 0;
  const hardAngle = total ? (totalHard / total) * 360 : 0;
  const angleToLen = (angle) => (angle / 360) * circumference;
  const easyStart = 0;
  const mediumStart = easyAngle;
  const hardStart = easyAngle + mediumAngle;

  // ---- Filtered contests and stats ----
  const filteredContests = contests.filter((contest) => {
    if (contestType !== 'all') {
      const type = getContestType(contest);
      if (type !== contestType) return false;
    }
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
    if (hideCompleted) {
      const { totalProblems, solvedProblems } = getStats(contest);
      if (totalProblems > 0 && solvedProblems === totalProblems) return false;
    }
    return true;
  });

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
        {/* LeetCode arc/difficulty widget */}
        <div
          style={{
            background: "#181818",
            borderRadius: 16,
            padding: 24,
            color: "#fff",
            display: "flex",
            gap: 32,
            alignItems: "center",
            maxWidth: 480,
            margin: "0 auto 2rem auto",
            boxShadow: "0 2px 16px 0 #0008"
          }}
        >
          {/* Arc Chart */}
          <div style={{ position: "relative", width: 180, height: 180 }}>
            <svg width={180} height={180}>
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#222" strokeWidth={stroke} />
              {easyAngle > 0 &&
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={EASY_COLOR}
                  strokeWidth={stroke}
                  strokeDasharray={`${angleToLen(easyAngle)} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              }
              {mediumAngle > 0 &&
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={MEDIUM_COLOR}
                  strokeWidth={stroke}
                  strokeDasharray={`${angleToLen(mediumAngle)} ${circumference}`}
                  strokeDashoffset={-angleToLen(mediumStart)}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              }
              {hardAngle > 0 &&
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={HARD_COLOR}
                  strokeWidth={stroke}
                  strokeDasharray={`${angleToLen(hardAngle)} ${circumference}`}
                  strokeDashoffset={-angleToLen(hardStart)}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              }
            </svg>
            <div style={{
              position: "absolute",
              top: 0, left: 0, width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ fontWeight: "bold", fontSize: 42, lineHeight: 1 }}>{solved}</div>
              <div style={{ fontSize: 20, color: "#ccc" }}>/ {total}</div>
              <div style={{ color: "#8bffb4", fontWeight: 700, marginTop: 8, fontSize: 18 }}>Solved</div>
              {attempting > 0 && (
                <div style={{ color: "#bbb", marginTop: 6, fontSize: 16 }}>{attempting} Attempting</div>
              )}
            </div>
          </div>
          {/* Difficulty counts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              background: "#222",
              borderRadius: 8,
              padding: "10px 18px",
              minWidth: 100,
              marginBottom: 8,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                color: EASY_COLOR,
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 2,
                letterSpacing: 1
              }}>Easy</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{difficultyCount.Easy}<span style={{ color: "#888", fontWeight: 400, fontSize: 16 }}>/{totalEasy}</span></div>
            </div>
            <div style={{
              background: "#222",
              borderRadius: 8,
              padding: "10px 18px",
              minWidth: 100,
              marginBottom: 8,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                color: MEDIUM_COLOR,
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 2,
                letterSpacing: 1
              }}>Med.</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{difficultyCount.Medium}<span style={{ color: "#888", fontWeight: 400, fontSize: 16 }}>/{totalMedium}</span></div>
            </div>
            <div style={{
              background: "#222",
              borderRadius: 8,
              padding: "10px 18px",
              minWidth: 100,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                color: HARD_COLOR,
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 2,
                letterSpacing: 1
              }}>Hard</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{difficultyCount.Hard}<span style={{ color: "#888", fontWeight: 400, fontSize: 16 }}>/{totalHard}</span></div>
            </div>
          </div>
        </div>

        {/* ---- Skills Panel ---- */}
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-8">
          <div className="flex-1 min-w-[340px] bg-white rounded-xl shadow px-6 py-6">
            <h3 className="text-lg font-semibold mb-3">Skills</h3>
            {skillStatGroups.map((group) =>
              group.arr.length > 0 ? (
                <div key={group.label} className="mb-3">
                  <div className="font-semibold text-sm text-gray-700 mb-1">{group.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {getShownArr(group.arr, group.label).map(item => (
                      <span key={item.skill} className="inline-block bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                        {item.skill} <span className="text-blue-700 font-bold">x{item.count}</span>
                      </span>
                    ))}
                    {group.arr.length > 3 && (
                      <button
                        className="text-blue-600 hover:underline ml-1 text-sm font-semibold"
                        onClick={() =>
                          setShowGroup(g => ({ ...g, [group.label]: !g[group.label] }))
                        }
                      >
                        {showGroup[group.label] ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            )}
            {otherSkills.length > 0 && (
              <div className="mb-3">
                <div className="font-semibold text-sm text-gray-700 mb-1">Other</div>
                <div className="flex flex-wrap gap-2">
                  {getShownArr(otherSkills, 'Other').map(item => (
                    <span key={item.skill} className="inline-block bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                      {item.skill} <span className="text-blue-700 font-bold">x{item.count}</span>
                    </span>
                  ))}
                  {otherSkills.length > 3 && (
                    <button
                      className="text-blue-600 hover:underline ml-1 text-sm font-semibold"
                      onClick={() =>
                        setShowGroup(g => ({ ...g, ['Other']: !g['Other'] }))
                      }
                    >
                      {showGroup['Other'] ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Contest Table & Filters ---- */}
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
          {/* Weekly/Biweekly/All selection */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setContestType('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                contestType === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >All</button>
            <button
              onClick={() => setContestType('weekly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                contestType === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >Weekly</button>
            <button
              onClick={() => setContestType('biweekly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                contestType === 'biweekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >Biweekly</button>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'compact'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-th mr-1"></i>Compact
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'detailed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-list mr-1"></i>Detailed
            </button>
          </div>
        </div>
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
                            {contest.url.match(/contest\/([^/]+)\//i)?.[1] || contest.url}
                          </a>
                        </td>
                        {LETTERS.map((_, idx) => {
                          const problem = problems[idx];
                          if (!problem)
                            return (
                              <React.Fragment key={idx}>
                                <td className="px-3 py-3 text-center text-gray-400">N/A</td>
                                <td className="px-3 py-3 text-center text-gray-400">-</td>
                              </React.Fragment>
                            );
                          const solvedFlag = isSolved(problem);
                          const backendQ = getBackendQuestion(problem);
                          const tags = backendQ?.tags || [];
                          return (
                            <React.Fragment key={problem.link}>
                              <td className="px-3 py-3 text-center transition-all duration-150 rounded">
                                <div className="flex flex-col items-center gap-1">
                                  <a
                                    href={problem.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline transition-colors duration-200 text-sm"
                                    style={getLeetCodeDifficultyStyle(tags)}
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
                          {contest.url.match(/contest\/([^/]+)\//i)?.[1] || contest.url}
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
                          const backendQ = getBackendQuestion(problem);
                          const tags = backendQ?.tags || [];
                          return (
                            <div
                              key={problem.link}
                              className={`p-4 border rounded-lg flex flex-col gap-2 transition-all duration-150`}
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
                                className="font-medium hover:underline transition-colors duration-200 text-sm"
                                style={getLeetCodeDifficultyStyle(tags)}
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
        {filteredContests.length > 0 && (
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100 text-gray-600">
              <i className="fas fa-chart-bar text-blue-500"></i>
              Showing {filteredContests.length} contests
              {contestType !== 'all' && (
                <>
                  <i className={`fas ${contestType === 'biweekly' ? 'fa-infinity' : 'fa-calendar-week'} text-orange-500`}></i>
                  {contestType.charAt(0).toUpperCase() + contestType.slice(1)}
                </>
              )}
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