const colorMap = {
  purple: 'bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20',
  green: 'bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
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
