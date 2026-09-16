import React from 'react';
import {
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Globe,
  Lock,
  Star,
  Check,
} from 'lucide-react';
import PlatformIcon from '../ui/PlatformIcon';
import { getCfRatingStyle } from '../../lib/ratingStyles';

/**
 * Standardized StatusBadge component for rendering problem statuses,
 * platform badges, difficulty/ratings, user roles, contest states, and validation flags.
 */
export default function StatusBadge({
  type = 'status', // 'status' | 'platform' | 'difficulty' | 'rating' | 'role' | 'visibility' | 'validation' | 'contest'
  status,
  platform,
  difficulty,
  rating,
  role,
  isPublic,
  isValid,
  error,
  label,
  size = 'sm', // 'xs' | 'sm' | 'md'
  interactive = false,
  onClick,
  title,
  className = '',
  children,
}) {
  // Size classes
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  }[size] || 'text-xs px-2.5 py-0.5';

  // Determine badge type with strict precedence
  const resolvedType = type !== 'status' ? type : (
    status !== undefined ? 'status' :
    rating !== undefined ? 'rating' :
    difficulty !== undefined ? 'difficulty' :
    platform !== undefined ? 'platform' :
    role !== undefined ? 'role' :
    isPublic !== undefined ? 'visibility' :
    isValid !== undefined ? 'validation' :
    'status'
  );

  // 1. TYPE: PLATFORM
  if (resolvedType === 'platform') {
    const p = (platform || '').toUpperCase();
    let badgeStyle = 'bg-[#282828] text-[#8b949e] border-[#383838]';
    let labelText = platform || 'Other';

    if (p === 'LEETCODE') {
      badgeStyle = 'bg-[#FFA116]/10 text-[#FFA116] border-[#FFA116]/30';
      labelText = 'LeetCode';
    } else if (p === 'CODEFORCES') {
      badgeStyle = 'bg-[#2196F3]/10 text-[#58a6ff] border-[#2196F3]/30';
      labelText = 'Codeforces';
    } else if (p === 'CODECHEF') {
      badgeStyle = 'bg-[#E67E22]/10 text-[#F59E0B] border-[#E67E22]/30';
      labelText = 'CodeChef';
    } else if (p === 'ATCODER') {
      badgeStyle = 'bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30';
      labelText = 'AtCoder';
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${sizeClasses} ${badgeStyle} ${className}`}
        title={title || labelText}
      >
        <PlatformIcon platform={p} size={size === 'xs' ? 11 : 13} />
        {label || labelText}
      </span>
    );
  }

  // 2. TYPE: RATING (Codeforces / CodeChef / Generic)
  if (resolvedType === 'rating') {
    if (platform === 'CODEFORCES' && rating) {
      const style = getCfRatingStyle(rating);
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold border shadow-2xs ${sizeClasses} ${className}`}
          style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
          title={title || `Codeforces Rating: ${rating} (${style.label})`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
          {rating}
        </span>
      );
    }

    if (platform === 'CODECHEF' && rating) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#E67E22]/15 text-[#F59E0B] border border-[#E67E22]/40 ${sizeClasses} ${className}`}
          title={title || `CodeChef Rating: ${rating}`}
        >
          <Star size={11} className="fill-[#F59E0B]" />
          <span>{rating}</span>
        </span>
      );
    }

    if (rating) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#282828] text-[#e6edf3] border border-[#383838] ${sizeClasses} ${className}`}
          title={title || `Rating: ${rating}`}
        >
          <span>{rating}</span>
        </span>
      );
    }
  }

  // 3. TYPE: DIFFICULTY
  if (resolvedType === 'difficulty') {
    const d = (difficulty || '').toUpperCase();
    let diffStyle = 'bg-[#282828] text-[#8b949e] border-[#383838]';
    let diffLabel = difficulty || 'Unrated';

    if (d === 'EASY') {
      diffStyle = 'bg-[#00B8A3]/10 text-[#00B8A3] border-[#00B8A3]/30';
      diffLabel = 'Easy';
    } else if (d === 'MEDIUM') {
      diffStyle = 'bg-[#FFC01E]/10 text-[#FFC01E] border-[#FFC01E]/30';
      diffLabel = 'Medium';
    } else if (d === 'HARD') {
      diffStyle = 'bg-[#EF4743]/10 text-[#EF4743] border-[#EF4743]/30';
      diffLabel = 'Hard';
    }

    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold border ${sizeClasses} ${diffStyle} ${className}`}
        title={title || diffLabel}
      >
        {label || diffLabel}
      </span>
    );
  }

  // 4. TYPE: ROLE (Ladder or User roles)
  if (resolvedType === 'role') {
    const r = (role || '').toUpperCase();
    const config = {
      OWNER: { bg: 'bg-[#ffa116]/15', text: 'text-[#ffa116]', border: 'border-[#ffa116]/30', dot: 'bg-[#ffa116]', label: 'Owner' },
      WRITE: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Editor' },
      EDITOR: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Editor' },
      READ: { bg: 'bg-[#1a1a1a]', text: 'text-[#8b949e]', border: 'border-[#383838]', dot: 'bg-[#8b949e]', label: 'Viewer' },
      VIEWER: { bg: 'bg-[#1a1a1a]', text: 'text-[#8b949e]', border: 'border-[#383838]', dot: 'bg-[#8b949e]', label: 'Viewer' },
      ADMIN: { bg: 'bg-purple-500/15', text: 'text-[#c084fc]', border: 'border-purple-500/30', dot: 'bg-[#c084fc]', label: 'Admin' },
      USER: { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-500/30', dot: 'bg-gray-400', label: 'User' },
    }[r] || { bg: 'bg-[#1a1a1a]', text: 'text-[#8b949e]', border: 'border-[#383838]', dot: 'bg-[#8b949e]', label: r || 'Member' };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${sizeClasses} ${config.bg} ${config.text} ${config.border} ${className}`}
        title={title || config.label}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {label || config.label}
      </span>
    );
  }

  // 5. TYPE: VISIBILITY (Public / Private)
  if (resolvedType === 'visibility') {
    if (isPublic) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold bg-[#2cbb5d]/15 text-[#2cbb5d] border border-[#2cbb5d]/30 ${sizeClasses} ${className}`}
          title={title || 'Community Ladder'}
        >
          <Globe size={11} />
          <span>{label || 'Community'}</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md font-semibold bg-[#1a1a1a] text-[#8b949e] border border-[#383838] ${sizeClasses} ${className}`}
        title={title || 'Private Ladder'}
      >
        <Lock size={11} />
        <span>{label || 'Private'}</span>
      </span>
    );
  }

  // 6. TYPE: VALIDATION (e.g., CSV imports)
  if (resolvedType === 'validation') {
    if (isValid) {
      return (
        <span
          className={`inline-flex items-center gap-1 text-emerald-400 font-medium ${sizeClasses} ${className}`}
          title={title || 'Valid item'}
        >
          <CheckCircle2 size={13} />
          <span>{label || 'Valid'}</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 text-rose-400 font-medium ${sizeClasses} ${className}`}
        title={title || error || 'Invalid item'}
      >
        <AlertCircle size={13} />
        <span className="truncate">{label || error || 'Invalid'}</span>
      </span>
    );
  }

  // 7. TYPE: CONTEST STATE
  if (type === 'contest') {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'done') {
      return (
        <span className={`inline-flex items-center text-[#3fb950] font-bold gap-1 ${sizeClasses} ${className}`}>
          <CheckCircle2 size={12} />
          <span>{label || 'Done'}</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center text-[#58a6ff] font-semibold gap-1 ${sizeClasses} ${className}`}>
        <span>{label || status || 'In Progress'}</span>
      </span>
    );
  }

  // 8. TYPE: STATUS (Problem solved / practised / blind status)
  const normStatus = typeof status === 'boolean' ? (status ? 'solved' : 'unsolved') : (status || '').toLowerCase();

  if (normStatus === 'practised' || normStatus === 'practised-solved') {
    if (interactive && onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          title={title || 'Marked as Practised! Click to reset to ?'}
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-xs ${sizeClasses} ${className}`}
        >
          <CheckCircle size={13} className="text-emerald-400" />
          <span>{label || 'Practised'}</span>
        </button>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}
        title={title || 'Practised'}
      >
        <CheckCircle size={13} className="text-emerald-400" />
        <span>{label || 'Practised'}</span>
      </span>
    );
  }

  if (normStatus === 'blind-unsolved' || normStatus === 'practice') {
    if (interactive && onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          title={title || 'Click to mark as Practised'}
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-[#282828] hover:bg-amber-400/10 text-amber-400 hover:text-amber-300 border border-[#383838] hover:border-amber-400/50 transition-all duration-150 cursor-pointer shadow-xs group/btn ${sizeClasses} ${className}`}
        >
          <HelpCircle size={13} className="text-amber-400 group-hover/btn:text-amber-300" />
          <span>{label || '? Practise'}</span>
        </button>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-[#282828] text-amber-400 border border-[#383838] ${sizeClasses} ${className}`}
        title={title || 'Unpractised (Practice Mode)'}
      >
        <HelpCircle size={13} className="text-amber-400" />
        <span>{label || '? Practise'}</span>
      </span>
    );
  }

  if (normStatus === 'in-ladder') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-gray-400 font-medium ${sizeClasses} ${className}`}
        title={title || 'Already in ladder'}
      >
        <Check size={14} />
        <span>{label || 'In Ladder'}</span>
      </span>
    );
  }

  if (normStatus === 'solved') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-emerald-500 font-medium ${className}`}
        title={title || 'Solved & Verified'}
      >
        <CheckCircle size={18} className="text-emerald-500" />
        {label && <span className="text-xs">{label}</span>}
      </span>
    );
  }

  // Fallback / unsolved
  return (
    <span
      className={`inline-flex items-center gap-1 text-gray-400 ${className}`}
      title={title || 'Unsolved'}
    >
      <CheckCircle size={18} className="text-gray-300 dark:text-gray-600" />
      {label && <span className="text-xs text-gray-500">{label}</span>}
      {children}
    </span>
  );
}
