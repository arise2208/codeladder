import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api, { getErrorMessage } from '../lib/api';
import {
  ArrowLeft,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  Sigma,
  Info,
  List,
  ListOrdered,
  Minus,
  Eye,
  PenTool,
  Sparkles,
  Save,
  Tag,
  X,
  AlertCircle,
  Zap,
  Search
} from 'lucide-react';
import Button from '../components/ui/Button';
import NotionRenderer from '../components/shared/NotionRenderer';
import toast from 'react-hot-toast';

const SUGGESTED_TAGS = [
  'editorial',
  'tutorial',
  'dynamic-programming',
  'graphs',
  'math',
  'data-structures',
  'greedy',
  'strings',
  'interviews'
];

const SLASH_COMMANDS = [
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section header (# Title)',
    icon: Heading1,
    action: (insert) => insert('# ', '\n', 'Section Title')
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section header (## Subtitle)',
    icon: Heading2,
    action: (insert) => insert('## ', '\n', 'Sub-heading')
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small subsection (### Topic)',
    icon: Heading3,
    action: (insert) => insert('### ', '\n', 'Topic Heading')
  },
  {
    id: 'code',
    label: 'C++ Code Block',
    description: 'Syntax-highlighted code block with copy button',
    icon: Code,
    action: (insert) => insert('```cpp\n', '\n```\n', '// Implementation\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    return 0;\n}')
  },
  {
    id: 'math',
    label: 'Inline Math',
    description: 'Time complexity or KaTeX math formula ($O(N)$)',
    icon: Sigma,
    action: (insert) => insert('$', '$', 'O(N \\log N)')
  },
  {
    id: 'math-block',
    label: 'Math Equation Block',
    description: 'Centered LaTeX equation block ($$...$$)',
    icon: Sigma,
    action: (insert) => insert('$$\n', '\n$$\n', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}')
  },
  {
    id: 'callout-note',
    label: 'Callout Note',
    description: 'Highlight key observations or insights',
    icon: Info,
    action: (insert) => insert('> [!NOTE]\n> ', '\n', 'Key observation: notice that array elements are non-negative.')
  },
  {
    id: 'callout-tip',
    label: 'Callout Tip',
    description: 'Performance trick or optimization note',
    icon: Sparkles,
    action: (insert) => insert('> [!TIP]\n> ', '\n', 'Pro tip: Precomputing prefix sums reduces queries from O(N) to O(1).')
  },
  {
    id: 'callout-warning',
    label: 'Callout Warning',
    description: 'Integer overflow or edge-case warning',
    icon: AlertCircle,
    action: (insert) => insert('> [!WARNING]\n> ', '\n', 'Warning: Watch out for 32-bit integer overflow; use long long in C++.')
  },
  {
    id: 'bullet-list',
    label: 'Bulleted List',
    description: 'Unordered list of items',
    icon: List,
    action: (insert) => insert('- ', '\n', 'First item')
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    description: 'Ordered list of steps',
    icon: ListOrdered,
    action: (insert) => insert('1. ', '\n', 'Step one')
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Visual horizontal line divider',
    icon: Minus,
    action: (insert) => insert('\n---\n\n', '')
  }
];

export default function BlogEditorPage() {
  const { blogId } = useParams();
  const isEditing = Boolean(blogId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [quota, setQuota] = useState(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Fetch blog data if editing
  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      api.get(`/blogs/${blogId}`)
        .then(({ data }) => {
          const b = data.blog;
          setTitle(b.title || '');
          setContent(b.content || '');
          setTags(b.tags || []);
        })
        .catch((err) => {
          toast.error(getErrorMessage(err, 'Failed to load blog for editing'));
          navigate('/blogs');
        })
        .finally(() => setLoading(false));
    }
  }, [blogId, isEditing, navigate]);

  // Fetch quota
  useEffect(() => {
    if (user && !isEditing) {
      api.get('/blogs/me/quota')
        .then(({ data }) => setQuota(data))
        .catch(() => {});
    }
  }, [user, isEditing]);

  const charCount = content.length;
  const maxChars = 50000;
  const isOverLimit = charCount > maxChars;

  // Toolbar action helpers: inserts markdown snippet into textarea
  const insertText = (before, after = '', placeholder = '') => {
    const textarea = document.getElementById('blog-editor-textarea');
    if (!textarea) {
      setContent((prev) => prev + before + placeholder + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || placeholder;

    const replacement = before + selected + after;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const filteredSlashCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!slashFilter.trim()) return true;
    const q = slashFilter.toLowerCase();
    return cmd.label.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q);
  });

  const handleSelectSlashCommand = (cmd) => {
    const textarea = document.getElementById('blog-editor-textarea');
    if (textarea) {
      const cursor = textarea.selectionStart;
      if (cursor > 0 && content[cursor - 1] === '/') {
        const newContent = content.substring(0, cursor - 1) + content.substring(cursor);
        setContent(newContent);
        setTimeout(() => {
          textarea.setSelectionRange(cursor - 1, cursor - 1);
          cmd.action(insertText);
        }, 0);
      } else {
        cmd.action(insertText);
      }
    } else {
      cmd.action(insertText);
    }
    setSlashMenuOpen(false);
    setSlashFilter('');
    setSlashSelectedIndex(0);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart;
    if (cursor > 0 && val[cursor - 1] === '/') {
      const isStartOrSpace = cursor === 1 || /\s/.test(val[cursor - 2]);
      if (isStartOrSpace) {
        setSlashMenuOpen(true);
        setSlashFilter('');
        setSlashSelectedIndex(0);
      }
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (!slashMenuOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setSlashMenuOpen(false);
      setSlashFilter('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashSelectedIndex((prev) => (prev + 1) % (filteredSlashCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashSelectedIndex((prev) => (prev - 1 + (filteredSlashCommands.length || 1)) % (filteredSlashCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSlashCommands[slashSelectedIndex]) {
        handleSelectSlashCommand(filteredSlashCommands[slashSelectedIndex]);
      }
    }
  };

  const handleAddTag = (tagToAdd) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Please provide a blog title');
      return;
    }
    if (title.trim().length > 200) {
      toast.error('Blog title cannot exceed 200 characters');
      return;
    }
    if (!content.trim()) {
      toast.error('Blog content cannot be empty');
      return;
    }
    if (content.length > maxChars) {
      toast.error(`Blog content exceeds maximum allowed size of ${maxChars.toLocaleString()} characters`);
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/blogs/${blogId}`, {
          title: title.trim(),
          content,
          tags
        });
        toast.success('Blog updated successfully!');
        navigate(`/blog/${blogId}`);
      } else {
        const { data } = await api.post('/blogs', {
          title: title.trim(),
          content,
          tags
        });
        toast.success('Blog published to the community!', { icon: '🚀' });
        navigate(`/blog/${data.blog._id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save blog'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24">
      {/* 1. Header Navigation & Publish CTA */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={isEditing ? `/blog/${blogId}` : '/blogs'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#ffa116] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{isEditing ? 'Cancel & Return' : 'Back to Blogs'}</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Quota & Character count pills */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {!isEditing && quota && (
              <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                quota.count >= 5
                  ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
              }`}>
                {quota.count} / {quota.max} Blogs Used
              </span>
            )}

            <span className={`px-2.5 py-1 rounded-lg font-mono font-semibold border ${
              isOverLimit
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                : charCount > 40000
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                : 'bg-[#282828] text-gray-400 border-[#383838]'
            }`}>
              {charCount.toLocaleString()} / {maxChars.toLocaleString()} chars
            </span>
          </div>

          <Button
            onClick={handlePublish}
            disabled={saving || isOverLimit || !title.trim() || !content.trim()}
            className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ffa116]/20 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Publishing...' : isEditing ? 'Save Changes' : 'Publish Blog'}</span>
          </Button>
        </div>
      </div>

      {/* Quota warning banner if at limit */}
      {!isEditing && quota && quota.count >= 5 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-start gap-3 text-xs">
          <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Blog Quota Reached:</strong> You have reached your limit of 5 active blogs. Please edit or delete one of your existing blogs before publishing a new one.
          </div>
        </div>
      )}

      {/* 2. Main Editor Paper */}
      <div className="bg-[#282828] rounded-3xl border border-[#383838] shadow-xs overflow-hidden">
        {/* Title Input */}
        <div className="p-6 sm:p-8 border-b border-[#383838] space-y-4">
          <input
            type="text"
            placeholder="Untitled Blog Post..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl sm:text-4xl font-black text-[#eff2f6] placeholder:text-gray-500 bg-transparent border-none outline-hidden focus:ring-0"
          />

          {/* Tags Selector */}
          <div className="space-y-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Tag size={12} /> Tags:
              </span>

              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30 text-xs font-semibold"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="+ add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                className="text-xs px-2.5 py-1 border border-[#383838] bg-[#1a1a1a] rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-gray-500 w-44"
              />
            </div>

            {/* Suggested Tags Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-500 font-semibold">Suggestions:</span>
              {SUGGESTED_TAGS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleAddTag(st)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#383838] text-gray-400 hover:text-[#ffa116] border border-[#383838] transition-colors"
                >
                  +{st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Notion-Style Toolbar & Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#383838] text-xs overflow-x-auto">
          {/* Formatting Shortcuts */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => insertText('# ', '', 'Heading 1')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Heading 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText('## ', '', 'Heading 2')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Heading 2"
            >
              <Heading2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText('### ', '', 'Heading 3')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Heading 3"
            >
              <Heading3 size={16} />
            </button>

            <div className="w-px h-4 bg-[#383838] mx-1" />

            <button
              type="button"
              onClick={() => insertText('**', '**', 'bold text')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer font-bold"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText('*', '*', 'italic text')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer italic"
              title="Italic"
            >
              <Italic size={16} />
            </button>

            <div className="w-px h-4 bg-[#383838] mx-1" />

            <button
              type="button"
              onClick={() => insertText('```cpp\n', '\n```', '// Your solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Code Block"
            >
              <Code size={16} />
            </button>

            <button
              type="button"
              onClick={() => insertText('$', '$', 'O(N \\log N)')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer font-mono"
              title="LaTeX Math Formula"
            >
              <Sigma size={16} />
            </button>

            <button
              type="button"
              onClick={() => insertText('> [!NOTE]\n> ', '', 'Here is a key insight or hint.')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Callout Note"
            >
              <Info size={16} />
            </button>

            <div className="w-px h-4 bg-[#383838] mx-1" />

            <button
              type="button"
              onClick={() => insertText('- ', '', 'List item')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Bulleted List"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText('1. ', '', 'First item')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText('\n---\n\n', '')}
              className="p-1.5 rounded hover:bg-[#282828] text-gray-300 hover:text-[#eff2f6] cursor-pointer"
              title="Divider"
            >
              <Minus size={16} />
            </button>

            <div className="w-px h-4 bg-[#383838] mx-1" />

            <button
              type="button"
              onClick={() => {
                setSlashMenuOpen(!slashMenuOpen);
                setSlashFilter('');
                setSlashSelectedIndex(0);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                slashMenuOpen
                  ? 'bg-[#ffa116] text-[#1a1a1a] shadow-xs'
                  : 'bg-[#ffa116]/10 text-[#ffa116] hover:bg-[#ffa116]/20 border border-[#ffa116]/30'
              }`}
              title="Open Notion Slash Commands Menu (/)"
            >
              <Zap size={13} />
              <span>Slash (/)</span>
            </button>
          </div>

          {/* Write vs Preview Toggle */}
          <div className="flex items-center gap-1 bg-[#282828] p-0.5 rounded-lg border border-[#383838] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === 'write'
                  ? 'bg-[#383838] text-[#ffa116] shadow-2xs'
                  : 'text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              <span className="flex items-center gap-1">
                <PenTool size={12} /> Write
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#383838] text-[#ffa116] shadow-2xs'
                  : 'text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Eye size={12} /> Notion Preview
              </span>
            </button>
          </div>
        </div>

        {/* Notion Slash Commands Palette */}
        {slashMenuOpen && activeTab === 'write' && (
          <div className="bg-[#1f1f1f] text-[#eff2f6] p-4 border-b border-[#383838] shadow-xl transition-all">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#383838]">
              <div className="flex items-center gap-2 flex-1">
                <Search size={14} className="text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter slash commands (e.g. heading, math, code, callout, list)..."
                  value={slashFilter}
                  onChange={(e) => {
                    setSlashFilter(e.target.value);
                    setSlashSelectedIndex(0);
                  }}
                  autoFocus
                  className="w-full bg-transparent text-xs text-[#eff2f6] placeholder:text-gray-500 border-none outline-hidden focus:ring-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-gray-500 font-mono">↑↓ Navigate • Enter to select • Esc</span>
                <button
                  type="button"
                  onClick={() => {
                    setSlashMenuOpen(false);
                    setSlashFilter('');
                  }}
                  className="text-gray-400 hover:text-[#eff2f6] p-1 rounded-md hover:bg-[#282828]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-3 max-h-64 overflow-y-auto">
              {filteredSlashCommands.length === 0 ? (
                <div className="col-span-full py-4 text-center text-xs text-gray-500">
                  No matching slash commands for "{slashFilter}"
                </div>
              ) : (
                filteredSlashCommands.map((cmd, idx) => {
                  const IconComponent = cmd.icon;
                  const isSelected = idx === slashSelectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => handleSelectSlashCommand(cmd)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#ffa116] text-[#1a1a1a] shadow-md font-bold'
                          : 'hover:bg-[#282828] text-gray-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-[#1a1a1a]/20 text-[#1a1a1a]' : 'bg-[#1a1a1a] text-[#ffa116]'}`}>
                        <IconComponent size={15} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-[12px]">{cmd.label}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-[#1a1a1a]/80' : 'text-gray-400'}`}>
                          {cmd.description}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. Editor / Preview Area */}
        <div className="p-6 sm:p-8 min-h-[500px]">
          {activeTab === 'write' ? (
            <textarea
              id="blog-editor-textarea"
              rows={22}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Write your article in Notion-style markdown... Type '/' for instant slash command blocks, use headers, code blocks (```cpp), LaTeX math ($O(N)$), callouts (> [!NOTE]), and more."
              className="w-full h-full text-[15px] font-mono leading-relaxed text-[#eff2f6] placeholder:text-gray-500 bg-transparent border-none outline-hidden resize-y focus:ring-0"
            />
          ) : (
            <div className="space-y-6">
              {title && (
                <h1 className="text-2xl sm:text-4xl font-black text-[#eff2f6] tracking-tight pb-3 border-b border-[#383838]">
                  {title}
                </h1>
              )}
              {content.trim() ? (
                <NotionRenderer content={content} />
              ) : (
                <div className="text-center py-12 text-gray-500 text-xs italic">
                  Nothing to preview yet. Switch back to Write tab to begin writing!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
