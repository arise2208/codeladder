import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Input, Button, Badge, LoadingSpinner, Modal, Pagination } from '../../components/ui';
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
    const diffRaw = getVal('difficulty').toUpperCase();
    const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(diffRaw) ? diffRaw : undefined;
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
    difficulty: 'EASY'
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
      await api.post('/questions', {
        ...formData,
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
        difficulty: 'EASY'
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
      await api.put(`/questions/${qId}`, {
        ...editModal.data,
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
        difficulty: r.difficulty,
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
          className="bg-[#6C5CE7] text-white flex gap-2 items-center"
        >
          <Plus size={16} /> {isCreating ? 'Cancel Manual Entry' : 'Create Single Question'}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setCsvModalOpen(true);
            setIsCreating(false);
          }}
          className="flex items-center gap-2 border-[#6C5CE7] text-[#6C5CE7] hover:bg-purple-50"
        >
          <FileSpreadsheet size={16} /> Import via CSV
        </Button>

        <Button
          variant="outline"
          onClick={downloadSampleCSV}
          className="flex items-center gap-2 border-[#E5E7EB] text-[#6B7280] hover:text-[#1E1F25]"
          title="Download Sample CSV Template"
        >
          <Download size={15} /> Sample CSV Template
        </Button>
      </div>

      {/* Single Question Manual Form */}
      {isCreating && (
        <div className="card-padded bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 animate-fadeIn">
          <h3 className="font-semibold text-sm text-[#1E1F25] mb-3">Add New Question</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="border border-[#E5E7EB] rounded-md p-2 text-sm"
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
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="border border-[#E5E7EB] rounded-md p-2 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <div className="col-span-full flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#00B894] text-white">
                Submit Question
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="card-padded bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or question ID..."
              icon={<Search size={18} className="text-[#6B7280]" />}
              className="pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button type="submit" className="bg-[#6C5CE7] text-white">
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
            className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1E1F25] bg-white focus:outline-none focus:border-[#6C5CE7]"
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
            className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1E1F25] bg-white focus:outline-none focus:border-[#6C5CE7]"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <Button
            variant="outline"
            onClick={fetchQuestions}
            className="flex items-center gap-2 border-[#E5E7EB] text-[#6B7280] hover:text-[#1E1F25]"
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
        <div className="card bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#FAFBFC]">
            <span className="text-sm font-semibold text-[#1E1F25]">
              Catalog Questions ({totalCount})
            </span>
            {(platformFilter || difficultyFilter || search) && (
              <span className="text-xs text-[#6B7280]">
                Filtered results
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="table-header bg-[#1E1F25] text-white text-xs uppercase tracking-wider">
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Platform</th>
                  <th className="p-3.5">External ID</th>
                  <th className="p-3.5">Difficulty</th>
                  <th className="p-3.5">Tags</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-sm">
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#6B7280]">
                      No questions found. Use "Create Single Question" or "Import via CSV" to add problems.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const questionId = q._id || q.id;
                    return (
                      <tr
                        key={questionId}
                        className="table-row hover:bg-[#F8F9FB] transition-colors"
                      >
                        <td className="p-3.5 font-medium text-[#6C5CE7]">
                          <a
                            href={q.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{q.title}</span>
                          </a>
                        </td>
                        <td className="p-3.5">
                          <Badge>{q.platform}</Badge>
                        </td>
                        <td className="p-3.5 text-sm font-mono text-[#6B7280]">{q.externalId}</td>
                        <td className="p-3.5">
                          <Badge>{q.difficulty || '—'}</Badge>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {q.tags && q.tags.length > 0 ? (
                              q.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                            {q.tags && q.tags.length > 3 && (
                              <span className="text-[10px] text-gray-500">
                                +{q.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditModal({
                                  isOpen: true,
                                  data: {
                                    ...q,
                                    tags: q.tags ? q.tags.join(', ') : ''
                                  }
                                })
                              }
                              title="Edit Question"
                            >
                              <Edit size={15} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50"
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
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
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
        <div className="space-y-4 text-sm text-[#1E1F25]">
          {/* Subheader & template info */}
          <div className="flex justify-between items-center bg-[#F8F9FB] p-3 rounded-lg border border-[#E5E7EB]">
            <div>
              <p className="font-semibold text-xs text-[#1E1F25]">Required Columns:</p>
              <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                platform, externalId, title, url, difficulty, tags
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadSampleCSV}
              className="text-xs flex items-center gap-1.5 text-[#6C5CE7] border-purple-200 hover:bg-purple-50 shrink-0"
            >
              <Download size={13} />
              <span>Template</span>
            </Button>
          </div>

          {/* Mode switch */}
          <div className="flex border-b border-[#E5E7EB] text-xs font-medium">
            <button
              onClick={() => setCsvInputMode('upload')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                csvInputMode === 'upload'
                  ? 'border-[#6C5CE7] text-[#6C5CE7]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E1F25]'
              }`}
            >
              Upload .CSV File
            </button>
            <button
              onClick={() => setCsvInputMode('paste')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                csvInputMode === 'paste'
                  ? 'border-[#6C5CE7] text-[#6C5CE7]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E1F25]'
              }`}
            >
              Paste CSV Content
            </button>
          </div>

          {csvInputMode === 'upload' ? (
            <div>
              <label className="border-2 border-dashed border-[#E5E7EB] hover:border-[#6C5CE7] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#FAFBFC]">
                <UploadCloud size={32} className="text-[#6C5CE7] mb-2" />
                <span className="font-medium text-xs text-[#1E1F25]">
                  {fileName ? fileName : 'Click to browse or drop a CSV file here'}
                </span>
                <span className="text-[11px] text-[#6B7280] mt-1">Supports UTF-8 formatted .csv files</span>
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
                className="w-full font-mono text-xs p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6C5CE7] resize-none"
              />
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#1E1F25]">
                  Parsed Rows Preview ({parsedRows.length} found)
                </span>
                <span className="text-[#6B7280]">
                  <strong className="text-emerald-600">{validQuestionsToImport.length} valid</strong>,{' '}
                  <strong className="text-rose-600">
                    {parsedRows.length - validQuestionsToImport.length} invalid
                  </strong>
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FB] sticky top-0 text-[11px] text-[#6B7280]">
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="p-2">Status</th>
                      <th className="p-2">Platform</th>
                      <th className="p-2">ID</th>
                      <th className="p-2">Title</th>
                      <th className="p-2">Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {parsedRows.slice(0, 50).map((r) => (
                      <tr
                        key={r.rowNum}
                        className={r.isValid ? 'bg-white' : 'bg-red-50/50'}
                      >
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="inline-flex items-center text-emerald-600 gap-1 font-medium">
                              <CheckCircle2 size={13} /> Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-rose-600 gap-1 font-medium"
                              title={r.errors.join(', ')}
                            >
                              <AlertCircle size={13} /> {r.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[11px]">{r.platform || '—'}</td>
                        <td className="p-2 font-mono text-[11px]">{r.externalId || '—'}</td>
                        <td className="p-2 truncate max-w-[140px]">{r.title || '—'}</td>
                        <td className="p-2 text-[11px]">{r.difficulty || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-gray-500 text-center">
                  Showing first 50 rows of {parsedRows.length} total.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCsvModalOpen(false);
                setParsedRows([]);
                setRawCsvText('');
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImportSubmit}
              disabled={importing || validQuestionsToImport.length === 0}
              className="bg-[#6C5CE7] text-white flex items-center gap-1.5"
            >
              {importing ? (
                <>
                  <LoadingSpinner className="w-3.5 h-3.5" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import {validQuestionsToImport.length} Questions</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        open={editModal.isOpen}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        title="Edit Question"
      >
        {editModal.data && (
          <form onSubmit={handleEdit} className="space-y-4 text-sm">
            <Input
              placeholder="Title"
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
              placeholder="URL"
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
              placeholder="Tags (comma separated)"
              value={editModal.data.tags}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, tags: e.target.value }
                })
              }
            />
            <select
              value={editModal.data.difficulty}
              onChange={(e) =>
                setEditModal({
                  ...editModal,
                  data: { ...editModal.data, difficulty: e.target.value }
                })
              }
              className="w-full border border-[#E5E7EB] rounded-md p-2 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModal({ isOpen: false, data: null })}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#6C5CE7] text-white">
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
        <p className="mb-4 text-[#1E1F25] text-sm">
          Are you sure you want to delete this question? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, id: null })}>
            Cancel
          </Button>
          <Button className="bg-red-500 text-white hover:bg-red-600" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
