const colorMap = {
  purple: 'bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/30',
  green: 'bg-[#2cbb5d]/15 text-[#2cbb5d] border-[#2cbb5d]/40',
  blue: 'bg-[#388bfd]/15 text-[#58a6ff] border-[#388bfd]/30',
  orange: 'bg-[#ffa116]/15 text-[#ffa116] border-[#ffa116]/40',
  red: 'bg-[#ef4743]/15 text-[#ef4743] border-[#ef4743]/40',
  gray: 'bg-[#282828] text-[#8b949e] border-[#383838]',
  yellow: 'bg-[#ffa116]/15 text-[#ffa116] border-[#ffa116]/40',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorMap[color] || colorMap.gray} ${className}`}>
      {children}
    </span>
  );
}

export const platformColor = (platform) => {
  const map = { LEETCODE: 'orange', CODEFORCES: 'blue', CODECHEF: 'purple', ATCODER: 'green' };
  return map[platform?.toUpperCase()] || 'gray';
};

export const difficultyColor = (difficulty) => {
  const map = { EASY: 'green', MEDIUM: 'yellow', HARD: 'red' };
  return map[difficulty?.toUpperCase()] || 'gray';
};
