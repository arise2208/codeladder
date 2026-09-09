import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, currentPage: propCurrentPage, totalPages, onPageChange }) {
  const activePage = page ?? propCurrentPage ?? 1;
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const range = 2;
  for (let i = Math.max(1, activePage - range); i <= Math.min(totalPages, activePage + range); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(activePage - 1)}
        disabled={activePage <= 1}
        className="p-2 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      {pages[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6]">1</button>
          {pages[0] > 2 && <span className="px-2 text-[#9CA3AF]">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            p === activePage ? 'bg-[#6C5CE7] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
          }`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-[#9CA3AF]">…</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6]">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(activePage + 1)}
        disabled={activePage >= totalPages}
        className="p-2 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
