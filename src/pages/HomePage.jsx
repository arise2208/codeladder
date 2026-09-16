import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStarred } from '../context/StarredContext';
import api from '../lib/api';
import {
  ClipboardList,
  Flame,
  Layers,
  Globe,
  EyeOff,
  CheckCircle2,
  Star,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChefHat,
  Lightbulb,
  FolderOpen,
  ThumbsUp,
  Zap,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import Button from '../components/ui/Button';
import { PlatformIcon, CodeforcesIcon, LeetCodeIcon, CodeChefIcon } from '../components/ui/PlatformIcon';
import RecentActionsWidget from '../components/shared/RecentActionsWidget';
import { formatDistanceToNow } from 'date-fns';

export default function HomePage() {
  const { user } = useAuth();
  const { starredCount } = useStarred();

  const [stats, setStats] = useState({
    solved: 0,
    starred: 0,
    practised: 0,
    publicLaddersCount: 0,
    totalLikesReceived: 0
  });
  const [communityLadders, setCommunityLadders] = useState([]);
  const [userLadders, setUserLadders] = useState([]);
  const [trendingBlogs, setTrendingBlogs] = useState([]);

  useEffect(() => {
    // Fetch trending blogs (public)
    api.get('/blogs', { params: { sort: 'trending', limit: 3 } })
      .then(({ data }) => setTrendingBlogs(data.blogs || []))
      .catch(() => {});

    if (user) {
      const fetchData = async () => {
        try {
          const [statsRes, marketRes, laddersRes] = await Promise.allSettled([
            api.get(`/users/${user.username}/stats`),
            api.get('/ladders/marketplace'),
            api.get('/ladders')
          ]);

          if (statsRes.status === 'fulfilled' && statsRes.value?.data?.stats) {
            setStats(statsRes.value.data.stats);
          }
          if (marketRes.status === 'fulfilled' && marketRes.value?.data?.ladders) {
            setCommunityLadders(marketRes.value.data.ladders.slice(0, 3));
          }
          if (laddersRes.status === 'fulfilled' && laddersRes.value?.data?.ladders) {
            setUserLadders(laddersRes.value.data.ladders);
          }
        } catch (error) {
          console.error('Failed to load home page data', error);
        }
      };
      fetchData();
    }
  }, [user]);

  const activeLadder = userLadders.length > 0 ? userLadders[0] : null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO SHOWCASE BANNER                                                  */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181920] via-[#222430] to-[#121318] text-white p-8 sm:p-12 border border-gray-800/80 shadow-xl">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#6C5CE7]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6C5CE7]/20 border border-[#6C5CE7]/40 text-[#A29BFE] text-xs font-semibold tracking-wide">
            <Sparkles size={14} className="text-[#6C5CE7]" />
            <span>The Modern Competitive Programming Mastery Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {user ? (
              <>
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A29BFE] via-[#6C5CE7] to-[#00B894]">{user.username}</span>.
              </>
            ) : (
              <>
                Level Up Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A29BFE] via-[#6C5CE7] to-[#00B894]">Problem Solving</span>
              </>
            )}
          </h1>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            CodeLadder brings together <strong>Codeforces</strong>, <strong>LeetCode</strong>, and <strong>CodeChef</strong> into structured rating ladders, spoiler-free <strong>Blind Revision Mode</strong>, and comprehensive contest upsolving.
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/problemset">
              <Button size="lg" className="bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white font-bold flex items-center gap-2 shadow-lg shadow-[#6C5CE7]/25">
                <ClipboardList size={18} />
                Browse Problemset
              </Button>
            </Link>

            <Link to="/ladders">
              <Button size="lg" variant="outline" className="border-gray-700 text-gray-200 hover:bg-white/10 flex items-center gap-2">
                <Globe size={18} className="text-[#00B894]" />
                Community Ladders
              </Button>
            </Link>

            <Link to="/contest/codeforces">
              <Button size="lg" variant="outline" className="border-gray-700 text-gray-200 hover:bg-white/10 flex items-center gap-2">
                <CodeforcesIcon size={18} />
                Contest Upsolvers
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Mini Highlights for Logged-in User */}
        {user && (
          <div className="mt-8 pt-6 border-t border-gray-800/80 flex flex-wrap items-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Signed in as <strong>@{user.username}</strong> ({user.role})</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{stats.solved} Solved</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <EyeOff size={14} className="text-amber-400" />
              <span>{stats.practised} Blind Practised</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <ThumbsUp size={14} className="text-[#58a6ff]" />
              <span>{stats.totalUpvotesReceived ?? stats.totalLikesReceived ?? 0} Community Upvotes</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. LOGGED-IN: STATS & RESUME ACTIVE LADDER                               */}
      {/* ========================================================================= */}
      {user && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#e6edf3]">Your Practice Overview</h2>
              <p className="text-xs text-[#8b949e]">Key metrics across your ladders and problem set</p>
            </div>
            <Link to="/profile" className="text-xs font-semibold text-[#58a6ff] hover:underline flex items-center gap-1">
              View Public Profile <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HomeMetricCard
              icon={<CheckCircle2 size={22} className="text-[#3fb950]" />}
              bg="bg-[#238636]/10 text-[#3fb950] border-[#238636]/30"
              title="Problems Solved"
              value={stats.solved}
              subtitle="Verified solves"
              to="/problemset"
            />
            <HomeMetricCard
              icon={<Star size={22} className="text-[#d29922]" />}
              bg="bg-[#bb8009]/10 text-[#d29922] border-[#bb8009]/30"
              title="Starred Problems"
              value={user ? (starredCount ?? stats.starred) : stats.starred}
              subtitle="Saved for later"
              to="/starred"
            />
            <HomeMetricCard
              icon={<EyeOff size={22} className="text-[#a371f7]" />}
              bg="bg-[#8957e5]/10 text-[#a371f7] border-[#8957e5]/30"
              title="Blind Practised"
              value={stats.practised}
              subtitle="Revision sessions"
              to="/ladders"
            />
            <HomeMetricCard
              icon={<ThumbsUp size={22} className="text-[#58a6ff]" />}
              bg="bg-[#1f6feb]/10 text-[#58a6ff] border-[#1f6feb]/30"
              title="Community Rep"
              value={`${stats.totalUpvotesReceived ?? stats.totalLikesReceived ?? 0} Upvotes`}
              subtitle={`${stats.publicLaddersCount} Public Ladders`}
              to="/ladders"
            />
          </div>

          {/* Resume Recent Ladder Prompt */}
          {activeLadder && (
            <div className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] flex items-center justify-center shrink-0">
                  <FolderOpen size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#58a6ff]">Active Ladder</span>
                    {activeLadder.isPublic && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238636]/20 text-[#3fb950] font-bold">
                        Community
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#e6edf3]">{activeLadder.title}</h3>
                  <p className="text-xs text-[#8b949e]">
                    {activeLadder.questionCount || 0} questions • {activeLadder.solvedCount || 0} solved
                  </p>
                </div>
              </div>

              <Link to={`/ladder/${activeLadder._id}`}>
                <Button size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs flex items-center gap-1.5 shrink-0">
                  Resume Ladder <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. "WHAT IS CODELADDER?" - CORE PILLARS & FEATURES                        */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] text-xs font-bold mb-1.5">
            <Zap size={13} />
            <span>Built for Serious Problem Solvers</span>
          </div>
          <h2 className="text-2xl font-black text-[#e6edf3]">What Makes CodeLadder Different</h2>
          <p className="text-sm text-[#8b949e]">
            Everything you need to systematically break through your rating plateau.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureShowcaseCard
            icon={<Layers size={24} className="text-[#58a6ff]" />}
            iconBg="bg-[#58a6ff]/10"
            title="Structured Rating Ladders"
            description="Group problems by rating tiers (800 to 2400+) or topic paths. Build your own or organize multi-platform problem collections."
            tag="Curated Paths"
            to="/ladders"
          />

          <FeatureShowcaseCard
            icon={<EyeOff size={24} className="text-[#d29922]" />}
            iconBg="bg-[#bb8009]/10"
            title="Blind Revision Mode"
            description="Practice without rating bias or tag spoilers. Simulate real contest pressure with persistent session tracking or clean resets."
            tag="Anti-Bias Practice"
            to="/ladders"
          />

          <FeatureShowcaseCard
            icon={<Globe size={24} className="text-[#3fb950]" />}
            iconBg="bg-[#238636]/10"
            title="Community Ladders"
            description="Discover battle-tested roadmaps from top coders. Read author claims, upvote high-quality ladders, and publish your own."
            tag="Community Curated"
            to="/ladders"
          />

          <FeatureShowcaseCard
            icon={<CodeforcesIcon size={24} />}
            iconBg="bg-[#388bfd]/10"
            title="Contest Upsolvers"
            description="Turn missed contest problems into rating gains. Dedicated upsolving views for Codeforces, LeetCode, and CodeChef rounds."
            tag="3-Platform Support"
            to="/contest/codeforces"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS: THE 4-STEP MASTERY WORKFLOW                              */}
      {/* ========================================================================= */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="max-w-xl">
          <div className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider">Methodology</div>
          <h2 className="text-xl font-bold text-[#e6edf3] mt-1">How to Level Up with CodeLadder</h2>
          <p className="text-xs text-[#8b949e] mt-1">
            Follow our proven loop to accelerate problem pattern recognition and contest performance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <StepItem
            step="01"
            title="Build or Fork a Ladder"
            description="Pick a topic or rating bracket and curate problems into a ladder, or explore upvoted Community Ladders."
          />
          <StepItem
            step="02"
            title="Switch to Blind Revision"
            description="Solve blind without knowing difficulty or tags. Track whether you can solve without preconceived bias."
          />
          <StepItem
            step="03"
            title="Upsolve Every Contest"
            description="After rounds, open contest matrices to solve the exact problems that blocked you from placing higher."
          />
          <StepItem
            step="04"
            title="Publish & Help Others"
            description="Publish your mastered ladders to Community Ladders with your claim to build your public profile reputation."
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTEST UPSOLVERS LAUNCHPAD                                           */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e6edf3]">Contest Upsolver Hub</h2>
            <p className="text-xs text-[#8b949e]">Select your preferred platform to start upsolving recent rounds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ContestPlatformCard
            title="Codeforces Rounds"
            description="Div. 1, Div. 2, Div. 3, Div. 4 & Educational contest upsolvers with official ratings."
            icon={<PlatformIcon platform="CODEFORCES" size={26} />}
            badge="Div 1 / 2 / 3 / 4"
            to="/contest/codeforces"
            accent="hover:border-[#388bfd]"
          />
          <ContestPlatformCard
            title="LeetCode Contests"
            description="Weekly & Biweekly contest problem sets to prepare for high-speed technical interviews."
            icon={<PlatformIcon platform="LEETCODE" size={26} />}
            badge="Weekly & Biweekly"
            to="/contest/leetcode"
            accent="hover:border-[#FFA116]"
          />
          <ContestPlatformCard
            title="CodeChef Challenges"
            description="Starters, Cook-Off, and Lunchtime contest problem sets with division categorization."
            icon={<PlatformIcon platform="CODECHEF" size={26} />}
            badge="Starters & Rated"
            to="/contest/codechef"
            accent="hover:border-[#d29922]"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FEATURED COMMUNITY LADDERS SPOTLIGHT                                   */}
      {/* ========================================================================= */}
      {user && communityLadders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#58a6ff]" />
              <h2 className="text-lg font-bold text-[#e6edf3]">Trending Community Ladders</h2>
            </div>
            <Link to="/ladders" className="text-xs font-semibold text-[#58a6ff] hover:underline flex items-center gap-1">
              Explore All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {communityLadders.map((ladder) => (
              <div
                key={ladder._id}
                className="bg-[#161b22] rounded-xl border border-[#30363d] hover:border-[#58a6ff]/50 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#58a6ff]/10 text-[#58a6ff]">
                      {ladder.questionCount || 0} Problems
                    </span>
                    <span className="text-xs text-[#8b949e] flex items-center gap-1">
                      <ThumbsUp size={12} className="text-[#3fb950]" />
                      <strong className="text-[#e6edf3]">{ladder.likesCount || 0}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#e6edf3] line-clamp-1">{ladder.title}</h3>
                  <p className="text-xs text-[#8b949e] mt-1 line-clamp-2">
                    {ladder.description || 'Curated problem ladder for competitive practice.'}
                  </p>

                  {ladder.ownerUsername && (
                    <p className="text-[11px] text-[#8b949e] mt-3">
                      By <span className="font-semibold text-[#e6edf3]">@{ladder.ownerUsername}</span>
                    </p>
                  )}
                </div>

                <Link to={`/ladder/${ladder._id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold text-[#58a6ff] border-[#30363d] bg-[#21262d] hover:bg-[#30363d] flex items-center justify-center gap-1.5">
                    Open Community Ladder <ArrowRight size={13} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RECENT ACTIONS & COMMUNITY BLOGS                                      */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#58a6ff]" />
            <h2 className="text-lg font-bold text-[#e6edf3]">Community Pulse: Recent Actions & Blogs</h2>
          </div>
          <Link to="/blogs" className="text-xs font-semibold text-[#58a6ff] hover:underline flex items-center gap-1">
            Explore All Blogs <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Trending Blogs Highlight */}
          <div className="lg:col-span-8 space-y-3">
            {trendingBlogs.length === 0 ? (
              <div className="bg-[#161b22] rounded-2xl border border-dashed border-[#30363d] p-8 text-center space-y-2">
                <BookOpen size={30} className="mx-auto text-[#8b949e]" />
                <h4 className="text-sm font-bold text-[#e6edf3]">Codeforces-Style Community Blogging</h4>
                <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                  Share your algorithm tutorials, contest write-ups, and problem walk-throughs with the competitive programming community.
                </p>
                <div className="pt-2">
                  <Link to="/blogs/create">
                    <Button size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold">
                      + Write First Blog
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              trendingBlogs.map((b) => (
                <div
                  key={b._id}
                  className="bg-[#161b22] rounded-xl border border-[#30363d] hover:border-[#58a6ff]/40 hover:shadow-md transition-all p-5 space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
                        <Link to={`/profile/${b.authorUsername}`} className="font-bold text-[#58a6ff] hover:underline">
                          @{b.authorUsername}
                        </Link>
                        <span>•</span>
                        <span>{b.createdAt ? formatDistanceToNow(new Date(b.createdAt), { addSuffix: true }) : ''}</span>
                      </div>
                      <Link to={`/blog/${b._id}`} className="block mt-1">
                        <h3 className="text-base font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors line-clamp-1">
                          {b.title}
                        </h3>
                      </Link>
                    </div>

                    <div className={`shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                      b.score > 0
                        ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/30'
                        : b.score < 0
                        ? 'bg-[#da3633]/15 text-[#f85149] border-[#da3633]/30'
                        : 'bg-[#21262d] text-[#8b949e] border-[#30363d]'
                    }`}>
                      <ThumbsUp size={11} className={b.score > 0 ? 'fill-[#3fb950]' : ''} />
                      <span>{b.score > 0 ? `+${b.score}` : b.score}</span>
                    </div>
                  </div>

                  {b.summary && (
                    <p className="text-xs text-[#8b949e] line-clamp-2 leading-relaxed">
                      {b.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#30363d] text-xs text-[#8b949e]">
                    <span className="flex items-center gap-1 text-[11px]">
                      <MessageSquare size={12} /> {b.commentsCount || 0} comments
                    </span>
                    <Link to={`/blog/${b._id}`} className="font-bold text-[#58a6ff] hover:underline inline-flex items-center gap-1">
                      Read Article <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Codeforces Recent Actions Feed */}
          <div className="lg:col-span-4">
            <RecentActionsWidget maxItems={8} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. VERIFIED INTEGRITY NOTICE (2-MINUTE LOCK)                              */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8b949e]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-[#58a6ff] shrink-0" />
          <span>
            <strong className="text-[#e6edf3]">Verified Practice Integrity:</strong> Solved markings and ladder community votes lock after 2 minutes to keep rankings and practice history authentic.
          </span>
        </div>
        <Link to="/problemset" className="text-[#58a6ff] hover:underline font-semibold shrink-0">
          Open Problem Matrix →
        </Link>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

function HomeMetricCard({ icon, bg, title, value, subtitle, to }) {
  return (
    <Link to={to} className="block group">
      <div className="bg-[#161b22] p-5 rounded-2xl border border-[#30363d] hover:border-[#58a6ff]/50 hover:shadow-md transition-all space-y-2">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bg}`}>
            {icon}
          </div>
          <ArrowRight size={14} className="text-[#8b949e] group-hover:text-[#58a6ff] group-hover:translate-x-0.5 transition-all" />
        </div>
        <div>
          <div className="text-2xl font-black text-[#e6edf3]">{value}</div>
          <div className="text-xs font-bold text-[#8b949e]">{title}</div>
          <div className="text-[11px] text-[#8b949e]/70">{subtitle}</div>
        </div>
      </div>
    </Link>
  );
}

function FeatureShowcaseCard({ icon, iconBg, title, description, tag, to }) {
  return (
    <Link to={to} className="block group h-full">
      <div className="bg-[#161b22] p-5 rounded-2xl border border-[#30363d] hover:border-[#58a6ff]/50 hover:shadow-md transition-all flex flex-col justify-between h-full space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
              {icon}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
              {tag}
            </span>
          </div>
          <h3 className="text-base font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            {description}
          </p>
        </div>
        <div className="pt-2 text-xs font-bold text-[#58a6ff] flex items-center gap-1 group-hover:gap-1.5 transition-all">
          Explore Feature <ArrowRight size={13} />
        </div>
      </div>
    </Link>
  );
}

function StepItem({ step, title, description }) {
  return (
    <div className="space-y-2">
      <span className="text-2xl font-black text-[#58a6ff]/40 tracking-wider font-mono">
        {step}
      </span>
      <h3 className="text-sm font-bold text-[#e6edf3]">{title}</h3>
      <p className="text-xs text-[#8b949e] leading-relaxed">{description}</p>
    </div>
  );
}

function ContestPlatformCard({ title, description, icon, badge, to, accent }) {
  return (
    <Link to={to} className="block group">
      <div className={`bg-[#161b22] p-5 rounded-2xl border border-[#30363d] ${accent} hover:shadow-md transition-all space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-[#0d1117] flex items-center justify-center border border-[#30363d]">
            {icon}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#21262d] text-[#8b949e]">
            {badge}
          </span>
        </div>
        <div>
          <h3 className="text-base font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="pt-2 text-xs font-bold text-[#58a6ff] flex items-center gap-1">
          Open Upsolver <ArrowRight size={13} />
        </div>
      </div>
    </Link>
  );
}
