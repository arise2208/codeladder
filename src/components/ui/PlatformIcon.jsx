import React from 'react';

/**
 * Authentic vector icons for competitive programming platforms:
 * - LeetCode: Official brand logo in brand orange (#FFA116)
 * - Codeforces: Official 3-bar logo (Yellow #FFCA28, Blue #2196F3, Red #F44336)
 * - CodeChef: Official brand vector in brand amber/orange (#D97706)
 * - AtCoder: Minimal geometric logo in brand cyan/emerald (#10B981)
 */

export function LeetCodeIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 text-[#FFA116] ${className}`}
      aria-label="LeetCode"
    >
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
  );
}

export function CodeforcesIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Codeforces"
    >
      {/* Left bar - Yellow */}
      <path
        d="M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.673 21 0 20.328 0 19.5V9c0-.828.673-1.5 1.5-1.5h3z"
        fill="#FFCA28"
      />
      {/* Middle bar - Blue */}
      <path
        d="M13.5 3C14.328 3 15 3.672 15 4.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.827 0-1.5-.672-1.5-1.5v-15c0-.828.673-1.5 1.5-1.5h3z"
        fill="#2196F3"
      />
      {/* Right bar - Red */}
      <path
        d="M22.5 10.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z"
        fill="#F44336"
      />
    </svg>
  );
}

export function CodeChefIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 text-[#E67E22] ${className}`}
      aria-label="CodeChef"
    >
      <path d="M11.2574.0039c-.37.0101-.7353.041-1.1003.095C9.6164.153 9.0766.4236 8.482.694c-.757.3244-1.5147.6486-2.2176.7027-1.1896.3785-1.568.919-1.8925 1.3516 0 .054-.054.1079-.054.1079-.4325.865-.4873 1.73-.325 2.5952.1621.5407.3786 1.0282.5408 1.5148.3785 1.0274.7578 2.0007.92 3.1362.1622.3244.3235.7571.4316 1.1897.2704.8651.542 1.8383 1.353 2.5952l.0057-.0028c.0175.0183.0301.0387.0482.0568.0072-.0036.0141-.0063.0213-.0099l-.0213-.5849c.6489-.9733 1.5673-1.6221 2.865-1.8925.5195-.1093 1.081-.1497 1.6625-.1278a8.7733 8.7733 0 0 1 1.7988.2357c1.4599.3785 2.595 1.1358 2.6492 1.7846.0273.3549.0398.6952.0326 1.0364-.001.064-.0046.1285-.007.193l.1362.0682c.075-.0375.1424-.107.2059-.1902.0008-.001.002-.002.0028-.0028.0018-.0023.0039-.0061.0057-.0085.0396-.0536.0747-.1236.1107-.1931.0188-.0377.0372-.0866.0554-.1292.2048-.4622.362-1.1536.538-1.9635.0541-.2703.1092-.4864.1633-.7027.4326-.9733 1.0266-1.8382 1.6213-2.6492.9733-1.3518 1.8928-2.5962 1.7846-4.0561-1.784-3.4608-4.2718-4.0017-5.5695-4.272-.2163-.0541-.3233-.0539-.4856-.108-1.3382-.2433-2.4945-.3953-3.6046-.3648zm5.0428 14.3788a9.8602 9.8602 0 0 0-.0326-.9824c-.0541-.703-1.1892-1.46-2.7032-1.8386-.588-.1336-1.1764-.2142-1.7448-.2356-.539-.0137-1.0657.0248-1.5546.1277-1.2436.2704-2.2162.9193-2.811 1.8925l.0511 1.431c.6672-.3558 1.7326-.8747 3.139-.9994.0662-.0059.1368-.0059.2044-.0099.1177-.013.2667-.044.4444-.044 1.6075 0 3.2682.5336 4.8767 1.6483.039-.2744.0611-.549.071-.8234l.044.0227c.0028-.0622.0143-.1268.0156-.1888z" />
    </svg>
  );
}

export function AtCoderIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 text-[#10B981] ${className}`}
      aria-label="AtCoder"
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 6L7 16h10L12 6z" fill="currentColor" />
    </svg>
  );
}

export function PlatformIcon({ platform, size = 16, className = '' }) {
  const norm = String(platform || '').toUpperCase();
  switch (norm) {
    case 'LEETCODE':
      return <LeetCodeIcon size={size} className={className} />;
    case 'CODEFORCES':
      return <CodeforcesIcon size={size} className={className} />;
    case 'CODECHEF':
      return <CodeChefIcon size={size} className={className} />;
    case 'ATCODER':
      return <AtCoderIcon size={size} className={className} />;
    default:
      return null;
  }
}

/**
 * Reusable GitHub-dark styled platform badge with authentic SVG icon + platform title
 */
export function PlatformBadge({ platform, size = 'sm', className = '' }) {
  const norm = String(platform || '').toUpperCase();

  const config = {
    LEETCODE: {
      name: 'LeetCode',
      icon: <LeetCodeIcon size={size === 'xs' ? 12 : 14} />,
      classes: 'bg-[#FFA116]/10 text-[#FFA116] border-[#FFA116]/30'
    },
    CODEFORCES: {
      name: 'Codeforces',
      icon: <CodeforcesIcon size={size === 'xs' ? 12 : 14} />,
      classes: 'bg-[#2196F3]/10 text-[#58a6ff] border-[#2196F3]/30'
    },
    CODECHEF: {
      name: 'CodeChef',
      icon: <CodeChefIcon size={size === 'xs' ? 12 : 14} />,
      classes: 'bg-[#E67E22]/10 text-[#F59E0B] border-[#E67E22]/30'
    },
    ATCODER: {
      name: 'AtCoder',
      icon: <AtCoderIcon size={size === 'xs' ? 12 : 14} />,
      classes: 'bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30'
    }
  }[norm] || {
    name: platform || 'Other',
    icon: null,
    classes: 'bg-[#282828] text-[#8b949e] border-[#383838]'
  };

  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${pad} ${config.classes} ${className}`}
    >
      {config.icon}
      <span>{config.name}</span>
    </span>
  );
}

export default PlatformIcon;
