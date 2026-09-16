import React from 'react';
import ProblemRow from './ProblemRow';

/**
 * QuestionRow - Delegates to standardized ProblemRow in problemset mode.
 * Maintained for backwards compatibility.
 */
export default function QuestionRow({
  question,
  isSolved = false,
  isVerified = null,
  isStarred = false,
  onStar,
  onAddToLadder,
  onSelectTag,
  rowHeight = 'h-16 min-h-[4rem]',
  className = '',
}) {
  return (
    <ProblemRow
      mode="problemset"
      question={question}
      isSolved={isSolved}
      isVerified={isVerified}
      isStarred={isStarred}
      onStar={onStar}
      onAddToLadder={onAddToLadder}
      onSelectTag={onSelectTag}
      rowHeight={rowHeight}
      className={className}
    />
  );
}
