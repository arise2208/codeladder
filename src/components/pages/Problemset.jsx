import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Problemset() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!username || !token) {
      navigate('/login');
      return;
    }
    fetchQuestions();
  }, [username, token, navigate]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://backendcodeladder-2.onrender.com/problemset', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setQuestions(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to fetch questions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSolved = async (questionId) => {
    if (!username) {
      setError('Please login to mark problems as solved');
      return;
    }

    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/markquestion', {
        questionid: questionId,
        user: username
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.question_id === questionId
            ? { ...q, solved_by: [...(q.solved_by || []), username] }
            : q
        )
      );
      setError('');
    } catch (error) {
      console.error('Error marking as solved:', error);
      setError('Failed to mark as solved. Please try again.');
    }
  };

  const handleUnmark = async (questionId) => {
    if (!username) {
      setError('Please login to unmark problems');
      return;
    }

    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/unmarkquestion', {
        questionid: questionId,
        user: username
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.question_id === questionId
            ? { ...q, solved_by: (q.solved_by || []).filter(u => u !== username) }
            : q
        )
      );
      setError('');
    } catch (error) {
      console.error('Error unmarking:', error);
      setError('Failed to unmark. Please try again.');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
                         (q.tags && q.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
    const isSolved = q.solved_by?.includes(username);
    
    if (hideSolved && isSolved) return false;
    return matchesSearch;
  });

  const solvedCount = questions.filter(q => q.solved_by?.includes(username)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 section-padding">
        <div className="max-w-6xl mx-auto container-padding">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 animate-pulse">
              <i className="fas fa-code text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loading Problems...</h2>
            <p className="text-gray-600 mb-8">Fetching the latest coding challenges for you</p>
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 section-padding">
      <div className="max-w-6xl mx-auto container-padding">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-2 mb-6">
            <i className="fas fa-fire"></i>
            <span className="font-medium">Coding Challenges</span>
          </div>
          
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-6">
              <i className="fas fa-code text-white text-3xl"></i>
            </div>
          </div>
          
          <h1 className="section-header">Problem Set</h1>
          <p className="section-subheader mb-12">
            Master algorithms and data structures with our curated collection of coding problems
          </p>
          
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
                <i className="fas fa-list-ol text-white"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{questions.length}</div>
              <div className="text-gray-600 font-medium">Total Problems</div>
              <div className="text-xs text-blue-600 mt-2 font-medium">
                <i className="fas fa-trending-up mr-1"></i>
                Growing daily
              </div>
            </div>
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4">
                <i className="fas fa-check-circle text-white"></i>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">{solvedCount}</div>
              <div className="text-gray-600 font-medium">Solved</div>
              <div className="text-xs text-green-600 mt-2 font-medium">
                <i className="fas fa-trophy mr-1"></i>
                Keep going!
              </div>
            </div>
            <div className="card-elevated text-center group hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
                <i className="fas fa-target text-white"></i>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-1">{questions.length - solvedCount}</div>
              <div className="text-gray-600 font-medium">Remaining</div>
              <div className="text-xs text-orange-600 mt-2 font-medium">
                <i className="fas fa-rocket mr-1"></i>
                Challenge awaits
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="card-elevated mb-8">
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
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 ${
                    hideSolved 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {hideSolved && (
                      <i className="fas fa-check text-white text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>
                    )}
                  </div>
                </div>
                <span className="text-gray-700 font-medium">Hide Solved</span>
              </label>
              
              <div className="h-6 w-px bg-gray-200"></div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-hashtag text-gray-500"></i>
                      <span>#</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-code text-gray-500"></i>
                      <span>Problem</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-tags text-gray-500"></i>
                      <span>Tags</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-gray-900">
                    <div className="flex items-center justify-center gap-2">
                      <i className="fas fa-check-circle text-gray-500"></i>
                      <span>Status</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-search text-2xl"></i>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-700 mb-2">No problems found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q, index) => {
                    const isSolved = q.solved_by?.includes(username);
                    return (
                      <tr
                        key={q.question_id}
                        className={`group hover:bg-gray-50 transition-colors duration-200 ${
                          isSolved ? "bg-green-50/50" : "bg-white"
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-sm text-gray-500 font-medium">
                          {index + 1}
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
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 group-hover:underline"
                            >
                              {q.title}
                            </a>
                            <i className="fas fa-external-link-alt text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {q.tags && q.tags.length > 0 ? (
                              q.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="badge badge-primary text-xs">{tag}</span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm italic">No tags</span>
                            )}
                            {q.tags && q.tags.length > 3 && (
                              <span className="badge bg-gray-100 text-gray-600 text-xs">
                                +{q.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              isSolved
                                ? handleUnmark(q.question_id)
                                : handleMarkSolved(q.question_id)
                            }
                            className={`tooltip inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 font-medium ${
                              isSolved
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                            data-tooltip={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                          >
                            <i className={`fas ${isSolved ? 'fa-check' : 'fa-circle'} text-sm`}></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

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
  );
}

export default Problemset;