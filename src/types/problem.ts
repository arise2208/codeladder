export type Platform = 'LEETCODE' | 'CODEFORCES' | 'CODECHEF' | 'ATCODER' | string;
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'N/A' | string;

export interface ProblemMetadata {
  rating?: number;
  index?: string;
  contestId?: number | string;
  points?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface ProblemState {
  solved?: boolean;
  starred?: boolean;
  practised?: boolean;
}

export interface Problem {
  _id: string;
  id?: string;
  externalId?: string;
  title: string;
  url: string;
  platform: Platform;
  difficulty?: Difficulty;
  rating?: number;
  tags: string[];
  metadata?: ProblemMetadata;
  order?: number;
  state?: ProblemState;
  isSolved?: boolean;
  isStarred?: boolean;
  isPractised?: boolean;
}

export default Problem;
