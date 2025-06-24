import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContestTable from './components/pages/ContestTable';

const ProblemsetPage = () => {
  // --- ADDED FIELDS FOR CONSISTENCY ---
  const [groupedContests, setGroupedContests] = useState({});
  const [questionsMap, setQuestionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('compact');

  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!username || !token) {
      navigate('/login');
      return;
    }
    // fetchLadders(); // If you have this function, define or uncomment it.
    // eslint-disable-next-line
  }, [username, token, navigate]);

  // --- YOUR ORIGINAL LOGIC ---
  const [tableData, setTableData] = useState([]);
  const [contestsJsonRaw, setContestsJsonRaw] = useState({});

  useEffect(() => {
    const loadProblemset = async () => {
      try {
        const res = await fetch('/problemset.json');
        const json = await res.json();

        if (json.status !== 'OK') {
          console.error('Invalid problemset.json structure');
          return;
        }

        const problems = json.result.problems.map(p => ({
          contestId: p.contestId,
          contestName: undefined, 
          problemIndex: p.index,
          problemName: p.name,
          problemLink: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`,
          rating: p.rating || null,
          userStatus: 'NOT_ATTEMPTED', 
        }));

        setTableData(problems);
      } catch (err) {
        console.error('Failed to fetch problemset.json', err);
      }
    };

    const loadContests = async () => {
      try {
        const res = await fetch('/contest.json');
        const json = await res.json();
        setContestsJsonRaw(json);
      } catch (err) {
        console.error('Failed to fetch contest.json', err);
      }
    };

    loadProblemset();
    loadContests();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Codeforces contest upsolver</h1>
      <ContestTable tableData={tableData} contestsJsonRaw={contestsJsonRaw} />
    </div>
  );
};

export default ProblemsetPage;