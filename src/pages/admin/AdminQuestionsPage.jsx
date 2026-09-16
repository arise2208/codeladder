import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Input, Button, Badge, LoadingSpinner, Modal, Pagination } from '../../components/ui';
import BaseTable from '../../components/shared/BaseTable';
import StatusBadge from '../../components/shared/StatusBadge';
import api, { getErrorMessage } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Edit,
  Trash2,
  Plus,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  RefreshCw
} from 'lucide-react';

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField.trim());
      currentField = '';
      if (row.some((f) => f !== '')) {
        lines.push(row);
      }
      row = [];
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    if (row.some((f) => f !== '')) lines.push(row);
  }

  if (lines.length === 0) return [];

  // Header mapping (case-insensitive)
  const rawHeaders = lines[0].map((h) => h.toLowerCase().replace(/[\s_-]/g, ''));
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    if (['platform'].includes(h)) headerMap.platform = idx;
    else if (['externalid', 'id', 'problemid', 'code', 'number'].includes(h)) headerMap.externalId = idx;
    else if (['title', 'name', 'problemname', 'problemtitle'].includes(h)) headerMap.title = idx;
    else if (['url', 'link', 'problemlink'].includes(h)) headerMap.url = idx;
    else if (['difficulty', 'diff', 'level'].includes(h)) headerMap.difficulty = idx;
    else if (['rating', 'rate', 'elo', 'points', 'score'].includes(h)) headerMap.rating = idx;
    else if (['tags', 'tag', 'topics', 'categories'].includes(h)) headerMap.tags = idx;
  });

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    const getVal = (field) => {
      const idx = headerMap[field];
      return idx !== undefined && r[idx] !== undefined ? r[idx] : '';
    };

    const platform = getVal('platform').toUpperCase();
    const externalId = getVal('externalId');
    const title = getVal('title');
    const url = getVal('url');
    const ratingRaw = getVal('rating');
    const rating = ratingRaw && !isNaN(Number(ratingRaw)) ? Number(ratingRaw) : undefined;
    const diffRaw = getVal('difficulty').toUpperCase();
    const difficulty = platform === 'LEETCODE'
      ? (['EASY', 'MEDIUM', 'HARD'].includes(diffRaw) ? diffRaw : undefined)
      : 'N/A';
    const tagsRaw = getVal('tags');
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,;|]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const errors = [];
    if (!['LEETCODE', 'CODEFORCES', 'CODECHEF', 'ATCODER'].includes(platform)) {
      errors.push(`Platform must be LEETCODE, CODEFORCES, CODECHEF, or ATCODER`);
    }
    if (!externalId) errors.push('Missing external ID');
    if (!title) errors.push('Missing Title');
    if (!url) errors.push('Missing URL');

    parsed.push({
      rowNum: i + 1,
      platform,
      externalId,
      title,
      url,
      difficulty,
      rating,
      tags,
      isValid: errors.length === 0,
      errors
    });
  }

  return parsed;
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Manual Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'LEETCODE',
    externalId: '',
    title: '',
    url: '',
    tags: '',
    difficulty: 'EASY',
    rating: ''
  });

  // CSV Import Modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvInputMode, setCsvInputMode] = useState('upload'); // 'upload' | 'paste'
  const [rawCsvText, setRawCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);

  // Edit / Delete modals
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (platformFilter) params.platform = platformFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;

      let res;
      try {
        res = await api.get('/admin/questions', { params });
      } catch {
        res = await api.get('/questions', { params });
      }

      const data = res.data;
      const list = Array.isArray(data) ? data : data.questions || [];
      setQuestions(list);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
      setTotalCount(data.pagination?.total || list.length);
    } catch (err) {
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [page, search, platformFilter, difficultyFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const isLC = formData.platform === 'LEETCODE';
      await api.post('/questions', {
        platform: formData.platform,
        externalId: formData.externalId,
        title: formData.title,
        url: formData.url,
        difficulty: isLC ? formData.difficulty : 'N/A',
        rating: !isLC && formData.rating ? Number(formData.rating) : undefined,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      });
      toast.success('Question created');
      setFormData({
        platform: 'LEETCODE',
        externalId: '',
        title: '',
        url: '',
        tags: '',
        difficulty: 'EASY',
        rating: ''
      });
      setIsCreating(false);
      fetchQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create question'));
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const qId = editModal.data?._id || editModal.data?.id;
    try {
      const isLC = editModal.data.platform === 'LEETCODE';
      await api.put(`/questions/${qId}`, {
        ...editModal.data,
        difficulty: isLC ? editModal.data.difficulty : 'N/A',
        rating: !isLC && editModal.data.rating ? Number(editModal.data.rating) : undefined,
        tags:
          typeof editModal.data.tags === 'string'
            ? editModal.data.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : editModal.data.tags
      });
      toast.success('Question updated');
      setEditModal({ isOpen: false, data: null });
      fetchQuestions();
    } catch (err) {
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/questions/${deleteModal.id}`);
      toast.success('Question deleted');
      setDeleteModal({ isOpen: false, id: null });
      fetchQuestions();
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  // CSV file reading
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRawCsvText(text);
        const parsed = parseCSV(text);
        setParsedRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  // CSV text pasting
  const handleTextChange = (e) => {
    const text = e.target.value;
    setRawCsvText(text);
    const parsed = parseCSV(text);
    setParsedRows(parsed);
  };

  // Sample CSV template download
  const downloadSampleCSV = () => {
    const csvContent =
      'platform,externalId,title,url,difficulty,tags\n' +
      'LEETCODE,1,"Two Sum",https://leetcode.com/problems/two-sum/,EASY,"array,hash-table"\n' +
      'LEETCODE,15,"3Sum",https://leetcode.com/problems/3sum/,MEDIUM,"array,two-pointers"\n' +
      'CODEFORCES,4A,"Watermelon",https://codeforces.com/problemset/problem/4/A,EASY,"brute-force,math"\n' +
      'CODECHEF,FLOW001,"Add Two Numbers",https://www.codechef.com/problems/FLOW001,EASY,"basic-math"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_codeladder_questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validQuestionsToImport = useMemo(() => {
    return parsedRows
      .filter((r) => r.isValid)
      .map((r) => ({
        platform: r.platform,
        externalId: r.externalId,
        title: r.title,
        url: r.url,
        difficulty: r.platform === 'LEETCODE' ? r.difficulty : 'N/A',
        rating: r.platform !== 'LEETCODE' && r.rating ? Number(r.rating) : undefined,
        tags: r.tags
      }));
  }, [parsedRows]);

  const handleBulkImportSubmit = async () => {
    if (validQuestionsToImport.length === 0) {
      toast.error('No valid questions found to import');
      return;
    }

    try {
      setImporting(true);
      const res = await api.post('/admin/questions/bulk', {
        questions: validQuestionsToImport
      });

      const data = res.data;
      toast.success(data.message || `Imported ${validQuestionsToImport.length} questions successfully!`);
      setCsvModalOpen(false);
      setRawCsvText('');
      setParsedRows([]);
      setFileName('');
      fetchQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to bulk import questions'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: Questions Catalog"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Questions' }]}
      />

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setIsCreating(!isCreating);
            if (!isCreating) setCsvModalOpen(false);
          }}
          className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold flex gap-2 items-center"
        >
          <Plus size={16} /> {isCreating ? 'Cancel Manual Entry' : 'Create Single Question'}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setCsvModalOpen(true);
            setIsCreating(false);
          }}
          className="flex items-center gap-2 border-[#ffa116] text-[#ffa116] hover:bg-[#ffa116]/10"
        >
          <FileSpreadsheet size={16} /> Import via CSV
        </Button>

        <Button
          variant="outline"
          onClick={downloadSampleCSV}
          className="flex items-center gap-2 border-[#383838] text-gray-400 hover:text-[#eff2f6] hover:bg-[#282828]"
          title="Download Sample CSV Template"
        >
          <Download size={15} /> Sample CSV Template
        </Button>
      </div>

      {/* Single Question Manual Form */}
      {isCreating && (
        <div className="card-padded bg-[#282828] rounded-xl border border-[#383838] shadow-sm p-4 animate-fadeIn">
          <h3 className="font-semibold text-sm text-[#eff2f6] mb-3">Add New Question</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="border border-[#383838] bg-[#1a1a1a] text-[#eff2f6] rounded-md p-2 text-sm"
            >
              <option value="LEETCODE">LeetCode</option>
              <option value="CODEFORCES">Codeforces</option>
              <option value="CODECHEF">CodeChef</option>
              <option value="ATCODER">AtCoder</option>
            </select>
            <Input
              placeholder="External ID (e.g. 1 or 4A)"
              value={formData.externalId}
              onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
              required
            />
            <Input
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Input
              placeholder="URL"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
            <Input
              placeholder="Tags (comma separated, e.g. dp, tree)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            {formData.platform === 'LEETCODE' ? (
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="border border-[#383838] bg-[#1a1a1a] text-[#eff2f6] rounded-md p-2 text-sm"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            ) : (
              <Input
                type="number"
                placeholder="Rating (e.g. 1200)"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              />
            )}
            <div className="col-span-full flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)} className="border-[#383838] text-gray-300 hover:bg-[#383838]">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold">
                Submit Question
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="card-padded bg-[#282828] rounded-xl border border-[#383838] shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or question ID..."
              icon={<Search size={18} className="text-gray-500" />}
              className="pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button type="submit" className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
            className="border border-[#383838] rounded-lg px-3 py-2 text-sm text-[#eff2f6] bg-[#1a1a1a] focus:outline-none focus:border-[#ffa116]"
          >
            <option value="">All Platforms</option>
            <option value="LEETCODE">LeetCode</option>
            <option value="CODEFORCES">Codeforces</option>
            <option value="CODECHEF">CodeChef</option>
            <option value="ATCODER">AtCoder</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="border border-[#383838] rounded-lg px-3 py-2 text-sm text-[#eff2f6] bg-[#1a1a1a] focus:outline-none focus:border-[#ffa116]"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <Button
            variant="outline"
            onClick={fetchQuestions}
            className="flex items-center gap-2 border-[#383838] text-gray-400 hover:text-[#eff2f6] hover:bg-[#1a1a1a]"
            title="Refresh questions"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {/* Questions Data Table */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="card bg-[#282828] rounded-xl border border-[#383838] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#383838] flex justify-between items-center bg-[#1a1a1a]">
            <span className="text-sm font-semibold text-[#eff2f6]">
              Catalog Questions ({totalCount})
            </span>
            {(platformFilter || difficultyFilter || search) && (
              <span className="text-xs text-gray-400">
                Filtered results
              </span>
            )}
          </div>

          <BaseTable
            variant="dark"
            className="border-[#383838]"
            headerClassName="bg-[#1a1a1a] border-b border-[#383838] text-gray-300 text-xs uppercase tracking-wider"
            bodyClassName="divide-y divide-[#383838] text-sm"
            headers={
              <tr>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider">Title</th>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-32">Platform</th>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-28">External ID</th>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-28">Difficulty</th>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider">Tags</th>
                <th className="px-4 py-3.5 font-semibold text-xs tracking-wider text-right w-28">Actions</th>
              </tr>
            }
            emptyMessage='No questions found. Use "Create Single Question" or "Import via CSV" to add problems.'
            footer={
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            }
          >
            {questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No questions found. Use "Create Single Question" or "Import via CSV" to add problems.
                </td>
              </tr>
            ) : (
              questions.map((q) => {
                const questionId = q._id || q.id;
                return (
                  <tr
                    key={questionId}
                    className="h-16 min-h-[4rem] hover:bg-[#323232] transition-colors align-middle"
                  >
                    <td className="px-4 py-3 font-medium text-[#ffa116] align-middle">
                      <a
                        href={q.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <span className="truncate max-w-md">{q.title}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <StatusBadge type="platform" platform={q.platform} />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400 align-middle whitespace-nowrap">{q.externalId}</td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      {q.platform === 'LEETCODE' ? (
                        <StatusBadge type="difficulty" difficulty={q.difficulty} />
                      ) : (q.rating || q.metadata?.rating) ? (
                        <StatusBadge type="rating" platform={q.platform} rating={q.rating || q.metadata?.rating} />
                      ) : (
                        <span className="text-xs text-[#8b949e] font-mono px-2 py-0.5 rounded bg-[#30363d]/30 border border-[#30363d]">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {q.tags && q.tags.length > 0 ? (
                          q.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center text-[11px] bg-[#1a1a1a] text-gray-300 border border-[#383838] hover:border-[#ffa116]/50 hover:text-[#ffa116] hover:bg-[#ffa116]/10 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                        {q.tags && q.tags.length > 3 && (
                          <span className="text-[11px] text-gray-500 self-center">
                            +{q.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditModal({
                              isOpen: true,
                              data: {
                                ...q,
                                rating: q.rating ?? q.metadata?.rating ?? '',
                                tags: q.tags ? q.tags.join(', ') : ''
                              }
                            })
                          }
                          title="Edit Question"
                          className="border-[#383838] text-gray-300 hover:bg-[#383838]"
                        >
                          <Edit size={15} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-400 border-rose-900/50 hover:bg-rose-950/30"
                          onClick={() => setDeleteModal({ isOpen: true, id: questionId })}
                          title="Delete Question"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </BaseTable>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      <Modal
        open={csvModalOpen}
        isOpen={csvModalOpen}
        onClose={() => {
          if (!importing) {
            setCsvModalOpen(false);
            setParsedRows([]);
            setRawCsvText('');
          }
        }}
        title="Import Questions via CSV"
      >
        <div className="space-y-4 text-sm text-[#eff2f6]">
          {/* Subheader & template info */}
          <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-lg border border-[#383838]">
            <div>
              <p className="font-semibold text-xs text-[#eff2f6]">Required Columns:</p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                platform, externalId, title, url, difficulty, tags
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadSampleCSV}
              className="text-xs flex items-center gap-1.5 text-[#ffa116] border-[#ffa116]/30 hover:bg-[#ffa116]/10 shrink-0"
            >
              <Download size={13} />
              <span>Template</span>
            </Button>
          </div>

          {/* Mode switch */}
          <div className="flex border-b border-[#383838] text-xs font-medium">
            <button
              onClick={() => setCsvInputMode('upload')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                csvInputMode === 'upload'
                  ? 'border-[#ffa116] text-[#ffa116] font-bold'
                  : 'border-transparent text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              Upload .CSV File
            </button>
            <button
              onClick={() => setCsvInputMode('paste')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                csvInputMode === 'paste'
                  ? 'border-[#ffa116] text-[#ffa116] font-bold'
                  : 'border-transparent text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              Paste CSV Content
            </button>
          </div>

          {csvInputMode === 'upload' ? (
            <div>
              <label className="border-2 border-dashed border-[#383838] hover:border-[#ffa116] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#1a1a1a]">
                <UploadCloud size={32} className="text-[#ffa116] mb-2" />
                <span className="font-medium text-xs text-[#eff2f6]">
                  {fileName ? fileName : 'Click to browse or drop a CSV file here'}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">Supports UTF-8 formatted .csv files</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <textarea
                rows={5}
                placeholder="platform,externalId,title,url,difficulty,tags&#10;LEETCODE,1,Two Sum,https://leetcode.com/problems/two-sum/,EASY,array&#10;CODEFORCES,4A,Watermelon,https://codeforces.com/problemset/problem/4/A,EASY,math"
                value={rawCsvText}
                onChange={handleTextChange}
                className="w-full font-mono text-xs p-3 border border-[#383838] bg-[#1a1a1a] text-[#eff2f6] rounded-lg focus:outline-none focus:border-[#ffa116] resize-none placeholder:text-gray-500"
              />
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#eff2f6]">
                  Parsed Rows Preview ({parsedRows.length} found)
                </span>
                <span className="text-gray-400">
                  <strong className="text-emerald-400">{validQuestionsToImport.length} valid</strong>,{' '}
                  <strong className="text-rose-400">
                    {parsedRows.length - validQuestionsToImport.length} invalid
                  </strong>
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto">
                <BaseTable
                  variant="dark"
                  stickyHeader={true}
                  className="rounded-lg text-xs"
                  headers={
                    <tr className="bg-[#1a1a1a] text-[11px] text-gray-400 border-b border-[#383838]">
                      <th className="p-2 w-28">Status</th>
                      <th className="p-2 w-24">Platform</th>
                      <th className="p-2 w-20">ID</th>
                      <th className="p-2">Title</th>
                      <th className="p-2 w-16">Diff</th>
                    </tr>
                  }
                >
                  {parsedRows.slice(0, 50).map((r) => (
                    <tr
                      key={r.rowNum}
                      className={`min-h-[2.5rem] align-middle ${r.isValid ? 'bg-[#282828] hover:bg-[#323232]' : 'bg-rose-950/30 text-rose-200'}`}
                    >
                      <td className="p-2 align-middle">
                        <StatusBadge
                          type="validation"
                          isValid={r.isValid}
                          error={r.errors?.[0]}
                          size="xs"
                        />
                      </td>
                      <td className="p-2 font-mono text-[11px] text-gray-300 align-middle">{r.platform || '—'}</td>
                      <td className="p-2 font-mono text-[11px] text-gray-300 align-middle">{r.externalId || '—'}</td>
                      <td className="p-2 truncate max-w-[140px] text-[#eff2f6] align-middle">{r.title || '—'}</td>
                      <td className="p-2 text-[11px] text-gray-300 align-middle">
                        {r.platform === 'LEETCODE' ? (r.difficulty || '—') : (r.rating ? `Rating: ${r.rating}` : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </BaseTable>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-gray-500 text-center">
                  Showing first 50 rows of {parsedRows.length} total.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#383838]">
            <Button
              variant="outline"
              onClick={() => setCsvModalOpen(false)}
              className="border-[#383838] text-gray-300 hover:bg-[#383838]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImportSubmit}
              disabled={importing || validQuestionsToImport.length === 0}
              className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold"
            >
              {importing
                ? 'Importing...'
                : `Import ${validQuestionsToImport.length} Questions`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        title="Edit Question"
      >
        {editModal.data && (
          <form onSubmit={handleEdit} className="space-y-4">
            <Input
              label="Title"
              value={editModal.data.title}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, title: e.target.value }
                })
              }
              required
            />
            <Input
              label="External ID"
              value={editModal.data.externalId}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, externalId: e.target.value }
                })
              }
              required
            />
            <Input
              label="URL"
              type="url"
              value={editModal.data.url}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, url: e.target.value }
                })
              }
              required
            />
            <Input
              label="Tags (comma separated)"
              placeholder="Tags (comma separated)"
              value={editModal.data.tags}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, tags: e.target.value }
                })
              }
            />
            {editModal.data.platform === 'LEETCODE' ? (
              <select
                value={editModal.data.difficulty || 'EASY'}
                onChange={(e) =>
                  setEditModal({
                    ...editModal,
                    data: { ...editModal.data, difficulty: e.target.value }
                  })
                }
                className="w-full border border-[#383838] bg-[#1a1a1a] text-[#eff2f6] rounded-md p-2 text-sm"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            ) : (
              <Input
                label="Rating (Elo)"
                type="number"
                placeholder="Rating (e.g. 1200)"
                value={editModal.data.rating ?? ''}
                onChange={(e) =>
                  setEditModal({
                    ...editModal,
                    data: { ...editModal.data, rating: e.target.value }
                  })
                }
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="border-[#383838] text-gray-300 hover:bg-[#383838]"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold">
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Question Modal */}
      <Modal
        open={deleteModal.isOpen}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Delete Question"
      >
        <p className="mb-4 text-[#eff2f6] text-sm">
          Are you sure you want to delete this question? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, id: null })} className="border-[#383838] text-gray-300 hover:bg-[#383838]">
            Cancel
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
