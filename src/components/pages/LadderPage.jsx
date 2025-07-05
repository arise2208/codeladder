import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const LadderPage = () => {
  const { tableId } = useParams();
  const [ladder, setLadder] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeSearchQuery, setRemoveSearchQuery] = useState('');
  const [collabSearchQuery, setCollabSearchQuery] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [currentView, setCurrentView] = useState('all'); // 'all' or 'revision'
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [collabMessage, setCollabMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (!username || !token) navigate('/login');
  }, [username, token, navigate]);

  useEffect(() => {
    const fetchLadder = async () => {
      try {
        const res = await axios.get(`https://backendcodeladder-2.onrender.com/ladder/${tableId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-username': username
          }
        });
        const ladderData = res.data;
        setLadder(ladderData);
        const userHasAccess = ladderData.user && ladderData.user.includes(username);
        setIsAuthorized(userHasAccess);
        setError(userHasAccess ? null : 'You do not have permission to access this ladder.');
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load ladder');
        setIsLoading(false);
      }
    };
    if (tableId && username && token) fetchLadder();
  }, [tableId, username, token]);

  useEffect(() => {
    if (!ladder || !ladder.questions || !isAuthorized) return;
    const fetchQuestions = async () => {
      try {
        const promises = ladder.questions.map((qId) =>
          axios.get(`https://backendcodeladder-2.onrender.com/question/${qId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-username': username
            }
          }).then(res => res.data)
        );
        const results = await Promise.all(promises);
        setQuestions(results);
        
        // Group questions by tags for structured display
        const grouped = groupQuestionsByTags(results);
        setGroupedQuestions(grouped);
      } catch {
        setError('Failed to load question details');
      }
    };
    fetchQuestions();
  }, [ladder, isAuthorized, token, username]);

  const groupQuestionsByTags = (questions) => {
    const groups = {};
    
    questions.forEach((question, index) => {
      const tags = question.tags || [];
      
      // Try to find a main category tag
      let category = 'Miscellaneous';
      
      // Define category mappings
      const categoryMappings = {
        'Arrays': ['array', 'arrays'],
        'Strings': ['string', 'strings'],
        'Dynamic Programming': ['dp', 'dynamic programming', 'dynamic-programming'],
        'Graphs': ['graph', 'graphs', 'dfs', 'bfs'],
        'Trees': ['tree', 'trees', 'binary tree'],
        'Math': ['math', 'mathematics', 'number theory'],
        'Greedy': ['greedy'],
        'Sorting': ['sorting', 'sort'],
        'Binary Search': ['binary search', 'binary-search'],
        'Two Pointers': ['two pointers', 'two-pointers'],
        'Sliding Window': ['sliding window', 'sliding-window'],
        'Backtracking': ['backtracking'],
        'Recursion': ['recursion', 'recursive'],
        'Data Structures': ['data structures', 'stack', 'queue', 'heap'],
      };

      // Find the best category match
      for (const [cat, keywords] of Object.entries(categoryMappings)) {
        if (tags.some(tag => keywords.some(keyword => 
          tag.toLowerCase().includes(keyword.toLowerCase())
        ))) {
          category = cat;
          break;
        }
      }

      if (!groups[category]) {
        groups[category] = [];
      }
      
      groups[category].push({
        ...question,
        originalIndex: index
      });
    });

    return groups;
  };

  const fetchAllQuestions = async () => {
    try {
      const res = await axios.get('https://backendcodeladder-2.onrender.com/problemset', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setAllQuestions(res.data);
    } catch {
      alert('Failed to fetch all questions');
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim()) return;
    try {
      await axios.post('https://backendcodeladder-2.onrender.com/collabtable', {
        source_table_id: Number(tableId),
        new_user_id: newCollaborator.trim(),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setCollabMessage(`✅ ${newCollaborator} added successfully!`);
      setNewCollaborator('');
      const ladderRes = await axios.get(`https://backendcodeladder-2.onrender.com/ladder/${tableId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setLadder(ladderRes.data);
    } catch (err) {
      setCollabMessage(`❌ Failed to add collaborator: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleRemoveCollaborator = async (userToRemove) => {
    try {
      const response = await fetch('https://backendcodeladder-2.onrender.com/removecollab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-username': username
        },
        body: JSON.stringify({ source_table_id: ladder.table_id, user_to_remove: userToRemove }),
      });
      const data = await response.json();
      if (response.ok) {
        setLadder((prev) => ({ ...prev, user: data.users }));
        setCollabMessage(`✅ Removed ${userToRemove} successfully`);
      } else {
        setCollabMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setCollabMessage('❌ Internal error');
    }
  };

  const toggleSelectToAdd = (id) => setSelectedToAdd(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  
  const handleAddToLadder = async () => {
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/edittable', {
        table_id: Number(tableId),
        questionIds: selectedToAdd,
        action: 'add',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setShowAddModal(false);
      setSelectedToAdd([]);
      setSearchQuery('');
      setLadder(prev => ({ ...prev, questions: [...prev.questions, ...selectedToAdd] }));
    } catch {
      alert('Failed to add questions');
    }
  };

  const toggleSelectToRemove = (id) =>
    setSelectedToRemove(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    
  const handleRemoveSelected = async () => {
    try {
      await axios.patch('https://backendcodeladder-2.onrender.com/edittable', {
        table_id: Number(tableId),
        questionIds: selectedToRemove,
        action: 'remove',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setLadder(prev => ({
        ...prev,
        questions: prev.questions.filter(q => !selectedToRemove.includes(q)),
      }));
      setQuestions(prev => prev.filter(q => !selectedToRemove.includes(q.question_id)));
      setSelectedToRemove([]);
      setShowRemoveModal(false);
      setRemoveSearchQuery('');
    } catch {
      alert('Failed to remove selected questions');
    }
  };

  const handleMarkSolved = async (questionId) => {
    try {
      await axios.patch(`https://backendcodeladder-2.onrender.com/markquestion`, {
        questionid: questionId,
        user: username,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setQuestions(prev =>
        prev.map(q =>
          q.question_id === questionId
            ? { ...q, solved_by: [...(q.solved_by || []), username] }
            : q
        )
      );
    } catch {
      alert('❌ Could not mark as solved');
    }
  };

  const handleUnmark = async (questionId) => {
    try {
      await axios.patch(`https://backendcodeladder-2.onrender.com/unmarkquestion`, {
        questionid: questionId,
        user: username,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-username': username
        }
      });
      setQuestions(prev =>
        prev.map(q =>
          q.question_id === questionId
            ? { ...q, solved_by: (q.solved_by || []).filter(u => u !== username) }
            : q
        )
      );
    } catch {
      alert('❌ Could not unmark the question');
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const getSectionProgress = (sectionQuestions) => {
    const solved = sectionQuestions.filter(q => q.solved_by?.includes(username)).length;
    const total = sectionQuestions.length;
    return { solved, total };
  };

  const getOverallProgress = () => {
    const solved = questions.filter(q => q.solved_by?.includes(username)).length;
    const total = questions.length;
    return { solved, total };
  };

  const filteredQuestions = allQuestions
    .filter(q => !ladder?.questions.includes(q.question_id))
    .filter(q => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(query) ||
        (q.tags && q.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    });

  const questionsToRemove = questions.filter(q => {
    if (!removeSearchQuery) return true;
    const query = removeSearchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      (q.tags && q.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  const filteredCollabs = ladder?.user?.filter(user => {
    if (!collabSearchQuery) return true;
    return user.toLowerCase().includes(collabSearchQuery.toLowerCase());
  }) || [];

  const handleAddModalClose = () => {
    setShowAddModal(false);
    setSearchQuery('');
    setSelectedToAdd([]);
  };

  const handleRemoveModalClose = () => {
    setShowRemoveModal(false);
    setRemoveSearchQuery('');
    setSelectedToRemove([]);
  };

  const handleCollabModalClose = () => {
    setShowCollabModal(false);
    setCollabSearchQuery('');
    setCollabMessage('');
    setNewCollaborator('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-300 mb-2">Loading...</h2>
              <p className="text-gray-500">Please wait while we load the ladder information.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-400 mb-4">🚫 Access Denied</h2>
              <p className="text-gray-400 mb-6">You do not have permission to access this ladder.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Go Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-400 mb-4">Error</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const progressPercentage = overallProgress.total > 0 ? (overallProgress.solved / overallProgress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {ladder?.table_title || `Ladder ${tableId}`}
              </h1>
              <p className="text-gray-400">Structured learning path</p>
            </div>
            
            {/* Progress Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {overallProgress.solved} / {overallProgress.total}
                </div>
                <div className="text-sm text-gray-400">completed</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentView('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'all'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Problems
            </button>
            <button
              onClick={() => setCurrentView('revision')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'revision'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Revision
            </button>
            
            {/* Search and Actions */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search problems..."
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option>Difficulty</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              
              <button
                onClick={() => { fetchAllQuestions(); setShowAddModal(true); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                Add Problems
              </button>
              
              <button
                onClick={() => setShowCollabModal(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-users"></i>
                Collaborators
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([sectionName, sectionQuestions]) => {
            const { solved, total } = getSectionProgress(sectionQuestions);
            const sectionProgress = total > 0 ? (solved / total) * 100 : 0;
            const isExpanded = expandedSections[sectionName] !== false; // Default to expanded

            return (
              <div key={sectionName} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(sectionName)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-gray-400`}></i>
                    <h3 className="text-xl font-semibold text-white">{sectionName}</h3>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-white font-medium">{solved} / {total}</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                        style={{ width: `${sectionProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="space-y-3">
                      {sectionQuestions.map((question, index) => {
                        const isSolved = question.solved_by?.includes(username);
                        return (
                          <div
                            key={question.question_id}
                            className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                              isSolved ? 'bg-green-900/30' : 'bg-gray-700/50 hover:bg-gray-700'
                            }`}
                          >
                            {/* Problem Number */}
                            <div className="w-8 text-center text-gray-400 font-mono text-sm">
                              {index + 1}
                            </div>

                            {/* Status Checkbox */}
                            <button
                              onClick={() =>
                                isSolved
                                  ? handleUnmark(question.question_id)
                                  : handleMarkSolved(question.question_id)
                              }
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                isSolved
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-500 hover:border-gray-400'
                              }`}
                            >
                              {isSolved && <i className="fas fa-check text-white text-xs"></i>}
                            </button>

                            {/* Problem Title */}
                            <div className="flex-1">
                              <a
                                href={question.link}
                                target="_blank"
                                rel="noreferrer"
                                className={`font-medium hover:underline transition-colors ${
                                  isSolved ? 'text-green-400' : 'text-white hover:text-blue-400'
                                }`}
                              >
                                {question.title}
                              </a>
                              
                              {/* Tags */}
                              {question.tags && question.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {question.tags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {question.tags.length > 3 && (
                                    <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                                      +{question.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSelectToRemove(question.question_id)}
                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                title="Remove from ladder"
                              >
                                <i className="fas fa-trash text-sm"></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Question Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleAddModalClose}>
            <div className="bg-gray-800 rounded-xl p-8 w-[520px] shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-xl mb-4 text-white">Select Questions to Add</h3>
              <input
                type="text"
                placeholder="🔍 Search questions by title or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 w-full mb-4 focus:outline-none focus:border-blue-500"
              />
              <div className="text-gray-400 text-sm mb-3">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    {searchQuery ? 'No questions match your search.' : 'No questions available to add.'}
                  </div>
                ) : (
                  filteredQuestions.map(q => (
                    <div
                      key={q.question_id}
                      className="flex justify-between items-center px-4 py-3 border-b border-gray-600 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white">{q.title}</div>
                        {q.tags && q.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.tags.map(tag =>
                              <span key={tag} className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">{tag}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        onChange={() => toggleSelectToAdd(q.question_id)}
                        checked={selectedToAdd.includes(q.question_id)}
                        className="ml-3 w-5 h-5 accent-blue-500"
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-gray-400">
                  {selectedToAdd.length} selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToLadder}
                    disabled={selectedToAdd.length === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Add Selected ({selectedToAdd.length})
                  </button>
                  <button
                    onClick={handleAddModalClose}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collaborators Modal */}
        {showCollabModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleCollabModalClose}>
            <div className="bg-gray-800 rounded-xl p-8 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-xl mb-4 text-white">Current Collaborators</h3>
              <input
                type="text"
                placeholder="🔍 Search collaborators..."
                value={collabSearchQuery}
                onChange={(e) => setCollabSearchQuery(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 w-full mb-4 focus:outline-none focus:border-blue-500"
              />
              <div className="mb-4">
                <div className="text-gray-400 text-sm mb-3">
                  {filteredCollabs.length} collaborator{filteredCollabs.length !== 1 ? "s" : ""} found
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700">
                  {filteredCollabs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      {collabSearchQuery ? 'No collaborators match your search.' : 'No collaborators found.'}
                    </div>
                  ) : (
                    filteredCollabs.map((user, idx) => (
                      <div key={user} className="flex items-center justify-between px-4 py-3 border-b border-gray-600 hover:bg-gray-600 transition-colors">
                        <div>
                          <span className="font-medium text-white">{user}</span>
                          {idx === 0 && <span className="ml-2 text-blue-400 font-medium">(Owner)</span>}
                          {user === username && <span className="ml-2 text-green-400 font-medium">(You)</span>}
                        </div>
                        {ladder.user[0] === username && idx !== 0 && (
                          <button
                            onClick={() => handleRemoveCollaborator(user)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {ladder.user[0] === username && (
                <div className="border-t border-gray-600 pt-4">
                  <input
                    type="text"
                    placeholder="Enter username to invite..."
                    value={newCollaborator}
                    onChange={(e) => setNewCollaborator(e.target.value)}
                    className="px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 w-full mb-3 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddCollaborator}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Add Collaborator
                  </button>
                  {collabMessage && (
                    <div className={`mt-3 text-center font-medium ${collabMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                      {collabMessage}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleCollabModalClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LadderPage;