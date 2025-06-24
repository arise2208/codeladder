import React, { useState, useMemo } from 'react';

// Rating color (Codeforces style)
const getColorByRating = (rating) => {
  if (rating == null) return "#000000"; 

  if (rating >= 3000) return "#ff0000";       
  if (rating >= 2600) return "#ff0000";       
  if (rating >= 2400) return "#ff8c00";       
  if (rating >= 2300) return "#aa00aa";       // International Master - purple
  if (rating >= 2100) return "#aa00aa";       // Master - purple
  if (rating >= 1900) return "#a0a";          // Candidate Master - violet
  if (rating >= 1600) return "#0000ff";       // Expert - blue
  if (rating >= 1400) return "#03a89e";       // Specialist - cyan
  if (rating >= 1200) return "#008000";       // Pupil - green
  return "#808080";                           // Newbie - gray
};


const getStatusDot = (status) => {
  if (status === "SOLVED") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#166534",
          marginRight: 6,
          verticalAlign: "middle"
        }}
        title="Solved"
      />
    );
  }
  if (status === "ATTEMPTED") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#c2410c",
          marginRight: 6,
          verticalAlign: "middle"
        }}
        title="Attempted"
      />
    );
  }
  if (status === "WRONG") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#ea580c",
          marginRight: 6,
          verticalAlign: "middle"
        }}
        title="Wrong Answer"
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "#d1d5db",
        marginRight: 6,
        verticalAlign: "middle"
      }}
      title="Not attempted"
    />
  );
};

const getCellBackgroundColor = (problems) => {
  return { background: 'white' };
};

const fetchCodeforcesSubmissions = async (username) => {
  const resp = await fetch(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}`
  );
  const data = await resp.json();
  if (data.status !== "OK") throw new Error(data.comment || "Failed to fetch");
  return data.result;
};

const updateTableDataWithSubmissions = (tableData, submissions) => {
  const solved = new Set();
  const attempted = new Set();
  
  submissions.forEach((sub) => {
    if (sub.problem && sub.problem.contestId && sub.problem.index) {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      if (sub.verdict === "OK") {
        solved.add(key);
      } else {
        attempted.add(key);
      }
    }
  });

  return tableData.map((row) => {
    const key = `${row.contestId}-${row.problemIndex || row.index}`;
    if (solved.has(key)) {
      return { ...row, userStatus: "SOLVED" };
    } else if (attempted.has(key)) {
      return { ...row, userStatus: "WRONG" };
    }
    return { ...row, userStatus: row.userStatus || undefined };
  });
};

function UsernameSubmissionChecker({ username, setUsername, checking, checkResult, onCheck }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        justifyContent: "center",
        margin: "24px 0",
        padding: "20px",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        borderRadius: "12px",
        border: "1px solid #e2e8f0"
      }}
    >
      <input
        type="text"
        value={username}
        placeholder="Enter Codeforces username"
        onChange={(e) => setUsername(e.target.value)}
        style={{
          padding: "12px 16px",
          border: "2px solid #e2e8f0",
          borderRadius: "8px",
          fontSize: "15px",
          minWidth: 250,
          background: "white",
          outline: "none",
          transition: "all 0.2s",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
        }}
        disabled={checking}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCheck();
        }}
        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
        onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
      />
      <button
        onClick={onCheck}
        disabled={checking || !username.trim()}
        style={{
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "15px",
          background: checking
            ? "#94a3b8"
            : "#3b82f6",
          color: "white",
          border: "none",
          minWidth: 140,
          minHeight: 48,
          cursor: checking || !username.trim() ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}
        onMouseEnter={(e) => {
          if (!checking && username.trim()) {
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        }}
      >
        {checking ? "Checking..." : "Check Status"}
      </button>
      {checkResult && (
        <span style={{
          fontSize: "14px",
          color: checkResult.success ? "#16a34a" : "#ef4444",
          fontWeight: 500
        }}>
          {checkResult.message}
        </span>
      )}
    </div>
  );
}

const EXCLUDE_PROBLEM_LETTERS = new Set([
  '0', '1', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'U'
]);

const contestFilterOptions = [
  { label: "All", value: "all", color: "#64748b", description: "Show all contests" },
  { label: "Div. 1", value: "div1", color: "#dc2626", description: "Division 1 only" },
  { label: "Div. 2", value: "div2", color: "#ea580c", description: "Division 2 only" },
  { label: "Div. 3", value: "div3", color: "#ca8a04", description: "Division 3 only" },
  { label: "Div. 4", value: "div4", color: "#16a34a", description: "Division 4 only" },
  { label: "Div. 1+2", value: "div1+div2", color: "#9333ea", description: "Combined Div. 1 + Div. 2" },
  { label: "Educational", value: "edu", color: "#0284c7", description: "Educational rounds" },
  { label: "Global", value: "global", color: "#059669", description: "Global rounds" },
  { label: "ICPC", value: "icpc", color: "#7c3aed", description: "ICPC-style contests" },
  { label: "Others", value: "others", color: "#6b7280", description: "Other contest types" }
];

function getContestFilterPredicate(filter) {
  if (filter === "all") return () => true;
  if (filter === "div1") return (contest) => /Div\. 1(?!\+)/i.test(contest.name) && !/Div\. 2/i.test(contest.name);
  if (filter === "div2") return (contest) => /Div\. 2(?!\+)/i.test(contest.name) && !/Div\. 1/i.test(contest.name) && !/Div\. 3/i.test(contest.name) && !/Educational/i.test(contest.name);
  if (filter === "div3") return (contest) => /Div\. 3/i.test(contest.name);
  if (filter === "div4") return (contest) => /Div\. 4/i.test(contest.name);
  if (filter === "div1+div2") return (contest) => /Div\. 1 \+ Div\. 2/i.test(contest.name);
  if (filter === "edu") return (contest) => /Educational/i.test(contest.name);
  if (filter === "global") return (contest) => /Global/i.test(contest.name);
  if (filter === "icpc") return (contest) => /ICPC/i.test(contest.name) || /ACM/i.test(contest.name);
  if (filter === "others") return (contest) => {
    const name = contest.name;
    return !/Div\. [1-4]/i.test(name) && 
           !/Educational/i.test(name) && 
           !/Global/i.test(name) && 
           !/ICPC/i.test(name) && 
           !/ACM/i.test(name);
  };
  return () => true;
}

const ContestTable = ({
  tableData: initialTableData,
  contestsJsonRaw = {},
}) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [tableData, setTableData] = useState(initialTableData);
  const [contestFilter, setContestFilter] = useState("all");

  // Extract contestsJson as the result array
  const contestsJson = useMemo(() => {
    if (Array.isArray(contestsJsonRaw)) return contestsJsonRaw;
    if (contestsJsonRaw && Array.isArray(contestsJsonRaw.result)) return contestsJsonRaw.result;
    return [];
  }, [contestsJsonRaw]);

  // Build a map of contestId -> contest name
  const contestIdToName = useMemo(() => {
    const map = new Map();
    contestsJson.forEach((c) => map.set(Number(c.id), c.name));
    return map;
  }, [contestsJson]);

  // Filtering contests
  const filteredContestIds = useMemo(() => {
    const pred = getContestFilterPredicate(contestFilter);
    return contestsJson.filter(pred).map((c) => Number(c.id));
  }, [contestFilter, contestsJson]);

  // Build groupings
  const contestsMap = new Map();
  const baseProblemLetters = new Set();

  tableData.forEach(row => {
    if (filteredContestIds.length && !filteredContestIds.includes(Number(row.contestId))) return;

    const baseLetter = row.problemIndex
      ? row.problemIndex.charAt(0)
      : row.index
      ? row.index.charAt(0)
      : "";
    if (baseLetter && !EXCLUDE_PROBLEM_LETTERS.has(baseLetter)) baseProblemLetters.add(baseLetter);

    const contestId = Number(row.contestId);
    if (!contestsMap.has(contestId)) {
      const contestName = contestIdToName.get(contestId) || `Contest ${contestId}`;
      contestsMap.set(contestId, {
        contestName,
        contestId: row.contestId,
        problems: {}
      });
    }

    const contest = contestsMap.get(contestId);
    if (!contest.problems[baseLetter]) {
      contest.problems[baseLetter] = [];
    }
    contest.problems[baseLetter].push(row);
  });

  const sortedBaseLetters = Array.from(baseProblemLetters).sort();
  const contests = Array.from(contestsMap.values());

  const handleCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const submissions = await fetchCodeforcesSubmissions(username);
      const updated = updateTableDataWithSubmissions(initialTableData, submissions);
      setTableData(updated);
      setCheckResult({ success: true, message: "Solved problems highlighted!" });
    } catch (e) {
      setCheckResult({ success: false, message: e.message || 'Check failed' });
    }
    setChecking(false);
  };

  const containerStyle = {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    background: '#f8fafc'
  };

  const tableStyle = {
    minWidth: '100%',
    backgroundColor: 'white',
    borderCollapse: 'separate',
    borderSpacing: 0
  };

  const theadStyle = {
    backgroundColor: '#f1f5f9'
  };

  const thStyle = {
    padding: '10px 10px',
    border: '1px solid #e2e8f0',
    fontWeight: 700,
    fontSize: '14px',
    color: '#1e293b',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    letterSpacing: 0.5,
    textShadow: "0 1px 0 #fff",
    minWidth: 55,
    maxWidth: 110,
    width: 65,
    textAlign: 'center'
  };

  const contestNameThStyle = {
    ...thStyle,
    textAlign: 'left',
    borderRight: '2px solid #cbd5e1',
    position: 'sticky',
    left: 0,
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    zIndex: 10,
    minWidth: 160,
    maxWidth: 220,
    width: 180
  };

  const problemHeaderStyle = {
    ...thStyle,
    textAlign: 'center',
    padding: '10px 2px'
  };

  const trHoverStyle = {
    transition: 'all 0.2s ease'
  };

  const tdStyle = {
    padding: '8px 8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: "#fff",
    minWidth: 55,
    maxWidth: 110,
    width: 65,
    textAlign: 'center'
  };

  const contestNameCellStyle = {
    ...tdStyle,
    fontWeight: '600',
    borderRight: '2px solid #cbd5e1',
    position: 'sticky',
    left: 0,
    background: '#fff',
    zIndex: 10,
    minWidth: 160,
    maxWidth: 220,
    width: 180,
    textAlign: 'left'
  };

  const problemCellStyle = {
    ...tdStyle,
    padding: '6px 2px'
  };

  const problemsContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const problemItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const problemLinkStyle = (rating) => ({
    display: 'inline-block',
    fontSize: '13px',
    fontWeight: 500,
    color: getColorByRating(rating),
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: 90,
    background: "none"
  });

  const emptyCellStyle = {
    color: '#cbd5e1',
    fontSize: '13px',
    textAlign: 'center',
    fontWeight: '300'
  };

  if (tableData.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 0'
      }}>
        <UsernameSubmissionChecker
          username={username}
          setUsername={setUsername}
          checking={checking}
          checkResult={checkResult}
          onCheck={handleCheck}
        />
        <p style={{
          color: '#6b7280',
          fontSize: '18px',
          margin: 0
        }}>No contest data available</p>
      </div>
    );
  }

  return (
    <div>
      <UsernameSubmissionChecker
        username={username}
        setUsername={setUsername}
        checking={checking}
        checkResult={checkResult}
        onCheck={handleCheck}
      />

      {/* Enhanced Filters */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <span style={{ 
            fontWeight: 700, 
            color: "#1e293b",
            fontSize: '16px',
            marginRight: '8px'
          }}>
            Filter Contests:
          </span>
          <span style={{
            fontSize: '14px',
            color: '#64748b',
            fontStyle: 'italic'
          }}>
            {contestFilter !== 'all' && `${contests.length} contests shown`}
          </span>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          {contestFilterOptions.map(opt => (
            <label key={opt.value} style={{
              cursor: 'pointer',
              fontWeight: contestFilter === opt.value ? 600 : 500,
              color: contestFilter === opt.value ? "white" : opt.color,
              background: contestFilter === opt.value 
                ? `linear-gradient(135deg, ${opt.color} 0%, ${opt.color}dd 100%)`
                : "transparent",
              padding: "10px 16px",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              border: `2px solid ${contestFilter === opt.value ? opt.color : '#e2e8f0'}`,
              textAlign: 'center',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              boxShadow: contestFilter === opt.value 
                ? `0 4px 12px ${opt.color}40`
                : '0 2px 4px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              if (contestFilter !== opt.value) {
                e.target.style.borderColor = opt.color;
                e.target.style.color = opt.color;
                e.target.style.background = `${opt.color}10`;
              }
            }}
            onMouseLeave={(e) => {
              if (contestFilter !== opt.value) {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.color = opt.color;
                e.target.style.background = 'transparent';
              }
            }}
            title={opt.description}
            >
              <input
                type="radio"
                value={opt.value}
                checked={contestFilter === opt.value}
                onChange={() => setContestFilter(opt.value)}
                style={{ display: 'none' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div style={containerStyle}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={contestNameThStyle}>Contest Name</th>
              {sortedBaseLetters.map(letter => (
                <th key={letter} style={problemHeaderStyle}>
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contests.map(contest => (
              <tr
                key={contest.contestId}
                style={trHoverStyle}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.transform = "scale(1.002)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <td style={contestNameCellStyle}>{contest.contestName}</td>
                {sortedBaseLetters.map(letter => {
                  const problems = contest.problems[letter] || [];
                  const cellBgStyle = getCellBackgroundColor(problems);
                  return (
                    <td key={letter} style={{ ...problemCellStyle, ...cellBgStyle }}>
                      {problems.length > 0 ? (
                        <div style={problemsContainerStyle}>
                          {problems.map(problem => (
                            <div key={problem.problemIndex || problem.index} style={{
                              ...problemItemStyle,
                              background: problem.userStatus === 'SOLVED' 
                                ? '#dcfce7' 
                                : problem.userStatus === 'WRONG' 
                                ? '#fed7aa' 
                                : 'transparent',
                              padding: '2px 2px',
                              borderRadius: '4px',
                              border: problem.userStatus === 'SOLVED' 
                                ? '1px solid #16a34a' 
                                : problem.userStatus === 'WRONG' 
                                ? '1px solid #ea580c' 
                                : '1px solid transparent'
                            }}>
                              {getStatusDot(problem.userStatus)}
                              <a
                                href={problem.problemLink || problem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={problemLinkStyle(problem.rating)}
                                title={problem.problemName || problem.name}
                                onMouseEnter={e => (e.target.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.target.style.textDecoration = 'none')}
                              >
                                {problem.problemIndex || problem.index}{": "}
                                <span>{problem.problemName || problem.name}</span>
                                {problem.rating ? (
                                  <span style={{
                                    fontWeight: 400,
                                    fontSize: "11px",
                                    marginLeft: 4,
                                    color: "#64748b"
                                  }}>
                                    [{problem.rating}]
                                  </span>
                                ) : ""}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={emptyCellStyle}>–</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContestTable;