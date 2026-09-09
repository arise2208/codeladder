import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ContestGroup({
  title,
  subtitle,
  problemCount,
  problems = [],
  renderProblem,
  children,
  defaultExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const count = problemCount !== undefined ? problemCount : (problems?.length || 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-[#1E1F25] text-white hover:bg-[#2D2E36] transition-colors text-left"
      >
        <div className="flex flex-col items-start">
          <h3 className="font-semibold text-base md:text-lg text-white">{title}</h3>
          {subtitle && (
            <span className="text-xs text-[#A0A3B1]">{subtitle}</span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {count > 0 && <span className="text-xs text-[#A0A3B1]">{count} problems</span>}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        children ? (
          children
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1E1F25]">
              <thead className="bg-[#F8F9FB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3 font-medium">Problem</th>
                  <th className="px-6 py-3 font-medium">Platform</th>
                  <th className="px-6 py-3 font-medium">Difficulty</th>
                  <th className="px-6 py-3 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem, idx) => (
                  <React.Fragment key={problem._id || idx}>
                    {renderProblem ? renderProblem(problem) : null}
                  </React.Fragment>
                ))}
                {problems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280]">
                      No problems found in this contest.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
