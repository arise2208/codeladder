import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'codechefSolvedProblems';

const CodeChefContest = () => {
  const [groupedContests, setGroupedContests] = useState({});
  const [solved, setSolved] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    const loadContestData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/codechef-contest.json');
        if (!response.ok) {
          throw new Error('Failed to load contest data');
        }
        const contestData = await response.json();
        
        // Group contests like START191A/B/C/D → START191
        const grouped = {};
        for (const contest of contestData) {
          const groupName = contest.contest.match(/^([A-Z]+\d+)/)?.[1]; // e.g., START191
          if (!grouped[groupName]) grouped[groupName] = [];
          grouped[groupName].push(contest);
        }
        setGroupedContests(grouped);

        // Load solved state from localStorage
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setSolved(JSON.parse(saved));
        }
        setError(null);
      } catch (err) {
        setError('Failed to load CodeChef contest data. Please make sure codechef-contest.json exists in the public folder.');
        console.error('Error loading contest data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContestData();
  }, []);

  const maxProblems = 9;
  const labels = 'ABCDEFGHI'.split('');

  // Helper: unique key for each problem cell
  const problemKey = (contestCode, problemCode) => `${contestCode}|${problemCode}`;

  // Toggle solved state and persist to localStorage
  const toggleSolved = (contestCode, problemCode) => {
    const key = problemKey(contestCode, problemCode);
    setSolved(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Calculate stats for a contest group
  const getGroupStats = (contests) => {
    let totalProblems = 0;
    let solvedProblems = 0;
    
    contests.forEach(contest => {
      contest.problems.forEach(problem => {
        totalProblems++;
        const key = problemKey(contest.contest, problem.code);
        if (solved[key]) solvedProblems++;
      });
    });
    
    return { totalProblems, solvedProblems };
  };

  // Filter contests based on search and completion status
  const filteredGroups = Object.entries(groupedContests).filter(([groupName, contests]) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = groupName.toLowerCase().includes(query) ||
        contests.some(contest => 
          contest.contest.toLowerCase().includes(query) ||
          contest.division.toLowerCase().includes(query) ||
          contest.problems.some(p => p.code.toLowerCase().includes(query))
        );
      if (!matchesSearch) return false;
    }

    // Hide completed filter
    if (hideCompleted) {
      const { totalProblems, solvedProblems } = getGroupStats(contests);
      if (totalProblems > 0 && solvedProblems === totalProblems) return false;
    }

    return true;
  });

  // Calculate overall stats
  const overallStats = Object.values(groupedContests).reduce((acc, contests) => {
    const { totalProblems, solvedProblems } = getGroupStats(contests);
    acc.totalProblems += totalProblems;
    acc.solvedProblems += solvedProblems;
    return acc;
  }, { totalProblems: 0, solvedProblems: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/30 section-padding">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 animate-pulse">
              <i className="fas fa-code text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loading CodeChef Contests...</h2>
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
            <i className="fas fa-trophy"></i>
            <span className="font-medium">CodeChef Contests</span>
          </div>
          
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
              <i className="fas fa-code text-white text-3xl"></i>
            </div>
          </div>
          
          <h1 className="section-header">CodeChef Contest Dashboard</h1>
          <p className="section-subheader mb-12">
            Track your progress across CodeChef contests and divisions
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
                <i className="fas fa-layer-group text-white"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{Object.keys(groupedContests).length}</div>
              <div className="text-gray-600 font-medium">Contest Groups</div>
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

        {/* Search and Filter Section */}
        <div className="card-elevated mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search contests, divisions, or problem codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 pr-4"
              />
            </div>
            
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>

        {/* Contest Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-gray-900 min-w-[120px]">Contest</th>
                  <th className="px-4 py-4 text-left font-bold text-gray-900 min-w-[100px]">Division</th>
                  {labels.map((label) => (
                    <th key={label} className="px-3 py-4 text-center font-bold text-gray-900 min-w-[80px]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
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
                  filteredGroups.map(([groupName, contests]) => {
                    const { totalProblems, solvedProblems } = getGroupStats(contests);
                    const completionPercentage = totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0;
                    
                    return (
                      <React.Fragment key={groupName}>
                        {/* Header row for the contest group */}
                        <tr className="bg-gradient-to-r from-orange-50 to-red-50">
                          <td colSpan={11} className="px-4 py-3 border-b border-orange-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                                  <i className="fas fa-trophy text-white text-sm"></i>
                                </div>
                                <span className="font-bold text-orange-800 text-lg">{groupName}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-orange-700 font-medium">
                                  {solvedProblems}/{totalProblems} solved ({Math.round(completionPercentage)}%)
                                </span>
                                <div className="w-24 h-2 bg-orange-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
                                    style={{ width: `${completionPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {contests.map((contest) => (
                          <tr key={contest.contest} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-4 py-3 font-medium text-gray-900">{contest.contest}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                contest.division.includes('1') ? 'bg-red-100 text-red-800' :
                                contest.division.includes('2') ? 'bg-orange-100 text-orange-800' :
                                contest.division.includes('3') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {contest.division}
                              </span>
                            </td>
                            {Array.from({ length: maxProblems }).map((_, i) => {
                              const p = contest.problems[i];
                              if (!p) return (
                                <td key={i} className="px-3 py-3 text-center text-gray-400">-</td>
                              );
                              const key = problemKey(contest.contest, p.code);
                              const isSolved = !!solved[key];
                              return (
                                <td key={i} className="px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors duration-200"
                                    >
                                      {p.code}
                                    </a>
                                    <button
                                      title={isSolved ? "Mark as unsolved" : "Mark as solved"}
                                      onClick={() => toggleSolved(contest.contest, p.code)}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                        isSolved 
                                          ? 'bg-green-500 text-white hover:bg-green-600' 
                                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                      }`}
                                      aria-pressed={isSolved}
                                    >
                                      {isSolved ? (
                                        <i className="fas fa-check text-xs"></i>
                                      ) : (
                                        <i className="fas fa-circle text-xs"></i>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        {filteredGroups.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <i className="fas fa-chart-bar text-orange-500"></i>
                <span className="font-medium">
                  Showing {filteredGroups.length} contest groups
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-search text-green-500"></i>
                  <span>matching "{searchQuery}"</span>
                </div>
              )}
              {hideCompleted && (
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-eye-slash text-blue-500"></i>
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

export default CodeChefContest;