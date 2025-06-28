import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LETTERS = 'ABCD'.split('');

// --- Helper functions & constants ---
const EASY_COLOR = "#00b8a3";
const MEDIUM_COLOR = "#ffc01e";
const HARD_COLOR = "#ff375f";

const getLeetCodeDifficultyStyle = (tags = []) => {
  const lowerTags = tags.map(t => t.toLowerCase());
  if (lowerTags.includes('easy')) return { color: EASY_COLOR, fontWeight: '600' };
  if (lowerTags.includes('medium')) return { color: MEDIUM_COLOR, fontWeight: '600' };
  if (lowerTags.includes('hard')) return { color: HARD_COLOR, fontWeight: '600' };
  return { color: '#374151', fontWeight: '500' };
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

  // ---- Stats for difficulty widget & skills panel ----
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

  // Difficulty stats
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  solvedProblems.forEach(q => {
    if (q.tags?.some(t => t.toLowerCase() === 'easy')) difficultyCount.Easy += 1;
    else if (q.tags?.some(t => t.toLowerCase() === 'medium')) difficultyCount.Medium += 1;
    else if (q.tags?.some(t => t.toLowerCase() === 'hard')) difficultyCount.Hard += 1;
  });
  const totalEasy = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='easy')).length;
  const totalMedium = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='medium')).length;
  const totalHard = Object.values(questionsMap).filter(q=>q.tags?.some(t=>t.toLowerCase()==='hard')).length;
  const solved = difficultyCount.Easy + difficultyCount.Medium + difficultyCount.Hard;
  const total = totalEasy + totalMedium + totalHard;

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 section-padding">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 animate-pulse">
              <i className="fab fa-leetcode text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loading LeetCode Contests...</h2>
            <p className="text-gray-600 mb-8">Fetching the latest contest data for you</p>
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 section-padding">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-6">
              <i className="fas fa-exclamation-triangle text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">Error Loading Data</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              <i className="fas fa-refresh mr-2"></i>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 section-padding">
      <div className="max-w-7xl mx-auto container-padding">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 rounded-full px-4 py-2 mb-6">
            <i className="fab fa-leetcode"></i>
            <span className="font-medium">LeetCode Contests</span>
          </div>
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
              <i className="fab fa-leetcode text-white text-3xl"></i>
            </div>
          </div>
          <h1 className="section-header">LeetCode Contest Dashboard</h1>
          <p className="section-subheader mb-12">
            Track your progress across LeetCode contests with detailed problem statistics and skill analysis
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
                <i className="fas fa-layer-group text-white"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{contests.length}</div>
              <div className="text-gray-600 font-medium">Total Contests</div>
            </div>
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4">
                <i className="fas fa-check-circle text-white"></i>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">{overallStats.solvedProblems}</div>
              <div className="text-gray-600 font-medium">Problems Solved</div>
            </div>
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
                <i className="fas fa-list-ol text-white"></i>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">{overallStats.totalProblems}</div>
              <div className="text-gray-600 font-medium">Total Problems</div>
            </div>
          </div>
        </div>

        {/* Enhanced Difficulty Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Difficulty Progress Cards */}
          <div className="card-elevated">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-chart-pie text-orange-500"></i>
              Difficulty Progress
            </h3>
            <div className="space-y-6">
              {/* Easy */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: EASY_COLOR }}></div>
                    <span className="font-semibold text-gray-900">Easy</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {difficultyCount.Easy} / {totalEasy}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      backgroundColor: EASY_COLOR,
                      width: `${totalEasy > 0 ? (difficultyCount.Easy / totalEasy) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalEasy > 0 ? Math.round((difficultyCount.Easy / totalEasy) * 100) : 0}% completed
                </div>
              </div>

              {/* Medium */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: MEDIUM_COLOR }}></div>
                    <span className="font-semibold text-gray-900">Medium</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {difficultyCount.Medium} / {totalMedium}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      backgroundColor: MEDIUM_COLOR,
                      width: `${totalMedium > 0 ? (difficultyCount.Medium / totalMedium) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalMedium > 0 ? Math.round((difficultyCount.Medium / totalMedium) * 100) : 0}% completed
                </div>
              </div>

              {/* Hard */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: HARD_COLOR }}></div>
                    <span className="font-semibold text-gray-900">Hard</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {difficultyCount.Hard} / {totalHard}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      backgroundColor: HARD_COLOR,
                      width: `${totalHard > 0 ? (difficultyCount.Hard / totalHard) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalHard > 0 ? Math.round((difficultyCount.Hard / totalHard) * 100) : 0}% completed
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900">Overall Progress</span>
                <span className="text-lg font-bold text-blue-600">
                  {solved} / {total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${total > 0 ? (solved / total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-2 text-center">
                {total > 0 ? Math.round((solved / total) * 100) : 0}% of all problems solved
              </div>
            </div>
          </div>

          {/* Skills Panel */}
          <div className="card-elevated">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-brain text-purple-500"></i>
              Skills Mastered
            </h3>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {skillStatGroups.map((group) =>
                group.arr.length > 0 ? (
                  <div key={group.label} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        group.label === 'Advanced' ? 'bg-red-500' :
                        group.label === 'Intermediate' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getShownArr(group.arr, group.label).map(item => (
                        <span key={item.skill} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                          {item.skill} 
                          <span className="text-blue-700 font-bold text-xs bg-blue-100 px-1.5 py-0.5 rounded-full">
                            {item.count}
                          </span>
                        </span>
                      ))}
                      {group.arr.length > 3 && (
                        <button
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-semibold transition-colors"
                          onClick={() =>
                            setShowGroup(g => ({ ...g, [group.label]: !g[group.label] }))
                          }
                        >
                          {showGroup[group.label] ? 'Show less' : `+${group.arr.length - 3} more`}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null
              )}
              {otherSkills.length > 0 && (
                <div className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    Other Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getShownArr(otherSkills, 'Other').map(item => (
                      <span key={item.skill} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                        {item.skill} 
                        <span className="text-blue-700 font-bold text-xs bg-blue-100 px-1.5 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      </span>
                    ))}
                    {otherSkills.length > 3 && (
                      <button
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-semibold transition-colors"
                        onClick={() =>
                          setShowGroup(g => ({ ...g, ['Other']: !g['Other'] }))
                        }
                      >
                        {showGroup['Other'] ? 'Show less' : `+${otherSkills.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="card-elevated mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search contests, problems, or contest types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 pr-4"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 ${
                    hideCompleted 
                      ? 'bg-orange-600 border-orange-600' 
                      : 'border-gray-300 group-hover:border-orange-400'
                  }`}>
                    {hideCompleted && (
                      <i className="fas fa-check text-white text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>
                    )}
                  </div>
                </div>
                <span className="text-gray-700 font-medium">Hide Completed</span>
              </label>
              
              {/* Contest Type Filter */}
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
              
              {/* View Mode Toggle */}
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
          </div>
        </div>

        {/* Contest Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            {viewMode === 'compact' ? (
              <table className="w-full min-w-[800px]">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-gray-900 min-w-[120px]">Contest</th>
                    {LETTERS.map((letter) => (
                      <React.Fragment key={letter}>
                        <th className="px-3 py-4 text-center font-bold text-gray-900 min-w-[120px]">
                          Problem {letter}
                        </th>
                        <th className="px-3 py-4 text-center font-bold text-gray-900 min-w-[60px]">
                          Points
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="px-4 py-4 text-center font-bold text-gray-900 min-w-[80px]">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContests.length === 0 ? (
                    <tr>
                      <td colSpan={LETTERS.length * 2 + 2} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-search text-2xl"></i>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-700 mb-2">No contests found</p>
                            <p className="text-sm">Try adjusting your search or filter criteria</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredContests.map((contest) => {
                      const problems = contest.problems.slice(0, LETTERS.length);
                      const { markedPoints } = getStats(contest);
                      return (
                        <tr key={contest.url} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-4 py-3">
                            <a
                              href={contest.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 font-bold hover:text-blue-900 hover:underline transition-colors duration-200"
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
                                <td className="px-3 py-3 text-center">
                                  <div className="flex flex-col items-center gap-2">
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
                                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
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
                                <td className="px-3 py-3 text-center font-medium">
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
                  <div className="text-center text-gray-500">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-search text-2xl"></i>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700 mb-2">No contests found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  filteredContests.map((contest) => {
                    const { totalProblems, solvedProblems, markedPoints } = getStats(contest);
                    const completionPercentage =
                      totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0;
                    return (
                      <div key={contest.url} className="border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <a
                            href={contest.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-800 text-lg hover:text-blue-900 hover:underline transition-colors duration-200"
                          >
                            {contest.url.match(/contest\/([^/]+)\//i)?.[1] || contest.url}
                          </a>
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                                style={{ width: `${completionPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-600">
                              {solvedProblems}/{totalProblems} solved
                            </span>
                            <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                              {markedPoints} pts
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {contest.problems.map((problem, idx) => {
                            const solvedFlag = isSolved(problem);
                            const backendQ = getBackendQuestion(problem);
                            const tags = backendQ?.tags || [];
                            return (
                              <div
                                key={problem.link}
                                className={`p-4 border rounded-lg flex flex-col gap-3 transition-all duration-200 ${
                                  solvedFlag ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {LETTERS[idx] || idx + 1}
                                  </span>
                                  <button
                                    title={solvedFlag ? "Mark as unsolved" : "Mark as solved"}
                                    onClick={() => toggleSolved(problem)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
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
                                  className="font-medium hover:underline transition-colors duration-200 text-sm leading-tight"
                                  style={getLeetCodeDifficultyStyle(tags)}
                                >
                                  {getProblemName(problem.link)}
                                </a>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                    {problem.points || '0'} pts
                                  </span>
                                  {tags.length > 0 && (
                                    <span 
                                      className="px-2 py-1 rounded text-xs font-medium"
                                      style={{ 
                                        backgroundColor: tags.some(t => t.toLowerCase() === 'easy') ? '#dcfdf4' :
                                                        tags.some(t => t.toLowerCase() === 'medium') ? '#fef3c7' :
                                                        tags.some(t => t.toLowerCase() === 'hard') ? '#fee2e2' : '#f3f4f6',
                                        color: tags.some(t => t.toLowerCase() === 'easy') ? EASY_COLOR :
                                               tags.some(t => t.toLowerCase() === 'medium') ? MEDIUM_COLOR :
                                               tags.some(t => t.toLowerCase() === 'hard') ? HARD_COLOR : '#6b7280'
                                      }}
                                    >
                                      {tags.find(t => ['easy', 'medium', 'hard'].includes(t.toLowerCase()))?.toLowerCase() || 'unknown'}
                                    </span>
                                  )}
                                </div>
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
        </div>

        {/* Footer Stats */}
        {filteredContests.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <i className="fas fa-chart-bar text-orange-500"></i>
                <span className="font-medium">
                  Showing {filteredContests.length} contests
                </span>
              </div>
              {contestType !== 'all' && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className={`fas ${contestType === 'biweekly' ? 'fa-infinity' : 'fa-calendar-week'} text-blue-500`}></i>
                  <span>{contestType.charAt(0).toUpperCase() + contestType.slice(1)}</span>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-search text-green-500"></i>
                  <span>matching "{searchQuery}"</span>
                </div>
              )}
              {hideCompleted && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-eye-slash text-purple-500"></i>
                  <span>hiding completed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeetCodeContest;