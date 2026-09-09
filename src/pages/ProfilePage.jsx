import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LoadingSpinner, Badge, Button } from '../components/ui';
import PlatformInsights from '../components/profile/PlatformInsights';
import { useAuth } from '../auth/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Calendar,
  Flame,
  Trophy,
  Settings,
  Code2,
  Sparkles,
  Globe,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Share2,
  BookOpen,
  MessageSquare,
  Eye,
  PenLine
} from 'lucide-react';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';

export default function ProfilePage() {
  const { username: paramUsername } = useParams();
  const { user } = useAuth();

  const targetUsername = paramUsername || user?.username;
  const isOwnProfile = !paramUsername || (user && user.username === paramUsername);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ solved: 0, starred: 0, publicLaddersCount: 0, blogsCount: 0, totalLikesReceived: 0, totalUpvotesReceived: 0 });
  const [contributedLadders, setContributedLadders] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUsername) return;
      try {
        setLoading(true);
        setNotFound(false);

        const { data } = await api.get(`/users/${targetUsername}`);

        setProfile(data.user || null);
        setStats(data.stats || { solved: 0, starred: 0, publicLaddersCount: 0, blogsCount: 0, totalLikesReceived: 0, totalUpvotesReceived: 0 });
        setContributedLadders(data.contributedLadders || []);
        setBlogs(data.blogs || []);
        setSolvedQuestions(data.solvedQuestions || []);
        setPlatforms(data.user?.accounts || []);
      } catch (err) {
        console.error('Failed to load profile data', err);
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [targetUsername]);

  const currentYear = new Date().getFullYear();
  const signupYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : currentYear;
  const availableYears = useMemo(() => {
    const minYear = Math.min(signupYear, currentYear - 1);
    const years = [];
    for (let y = currentYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [signupYear, currentYear]);

  // Calculate streaks
  const { currentStreak, longestStreak, totalActiveDays } = useMemo(() => {
    const datesSet = new Set();
    (solvedQuestions || []).forEach((sq) => {
      const rawDate = sq?.state?.solvedAt || sq?.state?.firstSolvedAt || sq?.solvedAt || sq?.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          datesSet.add(format(startOfDay(d), 'yyyy-MM-dd'));
        }
      }
    });

    const sortedDates = Array.from(datesSet).sort();
    if (sortedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    }

    const totalActiveDays = sortedDates.length;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');

    let currentStreak = 0;
    if (datesSet.has(todayStr) || datesSet.has(yesterdayStr)) {
      let checkDate = datesSet.has(todayStr) ? startOfDay(new Date()) : subDays(startOfDay(new Date()), 1);
      while (datesSet.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    return { currentStreak, longestStreak, totalActiveDays };
  }, [solvedQuestions]);

  const handleShareProfile = () => {
    const profileUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile URL copied to clipboard!', { icon: '🔗' });
    } else {
      toast(profileUrl);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold">
          ?
        </div>
        <h2 className="text-xl font-bold text-gray-800">User Not Found</h2>
        <p className="text-sm text-gray-500">
          We couldn't find a user profile for <strong>@{targetUsername}</strong>.
        </p>
        <div className="pt-2">
          <Link to="/ladders">
            <Button variant="primary" size="sm">
              Explore Community Ladders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const signupDateStr = profile?.createdAt
    ? format(new Date(profile.createdAt), 'MMMM yyyy')
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-7 pb-12">
      {/* 1. Header & Identity Showcase Banner */}
      <div className="bg-gradient-to-r from-[#181920] via-[#20222B] to-[#181920] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-gray-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#6C5CE7]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Avatar with initial */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#2D2E36] to-[#3B3C46] border-2 border-[#6C5CE7]/40 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-inner shrink-0">
              {(profile?.username || targetUsername || 'U')[0].toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {profile?.username || targetUsername}
                </h1>
                {profile?.role && (
                  <Badge variant={profile.role === 'ADMIN' ? 'purple' : 'neutral'} size="sm">
                    {profile.role}
                  </Badge>
                )}
                {contributedLadders.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/40">
                    <Globe size={11} /> Community Curator
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                {signupDateStr && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-500" />
                    Member since {signupDateStr}
                  </span>
                )}
                {isOwnProfile && profile?.email && (
                  <span className="hidden sm:inline text-gray-500">•</span>
                )}
                {isOwnProfile && profile?.email && (
                  <span className="text-gray-400">{profile.email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            {isOwnProfile ? (
              <>
                <Link to="/settings" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto border-gray-700 text-gray-200 hover:bg-white/10 flex items-center gap-1.5">
                    <Settings size={14} /> Settings
                  </Button>
                </Link>
                <Link to="/problemset" className="flex-1 sm:flex-none">
                  <Button variant="primary" size="sm" className="w-full sm:w-auto flex items-center gap-1.5">
                    <Code2 size={14} /> Practice
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  onClick={handleShareProfile}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-gray-700 text-gray-200 hover:bg-white/10 flex items-center gap-1.5"
                >
                  <Share2 size={14} /> Share Profile
                </Button>
                <Link to="/ladders" className="flex-1 sm:flex-none">
                  <Button variant="primary" size="sm" className="w-full sm:w-auto flex items-center gap-1.5">
                    <Globe size={14} /> Community Ladders
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-8 pt-6 border-t border-gray-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00B894] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.solved}</div>
              <div className="text-xs text-gray-400">Total Solved</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Flame size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{currentStreak} <span className="text-xs font-normal text-gray-400">days</span></div>
              <div className="text-xs text-gray-400">Current Streak</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{longestStreak} <span className="text-xs font-normal text-gray-400">days</span></div>
              <div className="text-xs text-gray-400">Max Streak</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{totalActiveDays} <span className="text-xs font-normal text-gray-400">days</span></div>
              <div className="text-xs text-gray-400">Active Days</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#A29BFE] shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{contributedLadders.length}</div>
              <div className="text-xs text-gray-400">Public Ladders</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{blogs.length} <span className="text-xs font-normal text-gray-400">/ 5</span></div>
              <div className="text-xs text-gray-400">Blogs Written</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ThumbsUp size={20} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalUpvotesReceived ?? stats.totalLikesReceived ?? 0}</div>
              <div className="text-xs text-gray-400">Upvotes Received</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Community Contributions Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#6C5CE7]" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#1E1F25]">Community Contributions</h2>
              <span className="text-xs font-mono font-bold bg-[#6C5CE7]/10 text-[#6C5CE7] px-2 py-0.5 rounded-full">
                {contributedLadders.length} {contributedLadders.length === 1 ? 'Ladder' : 'Ladders'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Publicly curated problem collections shared with the community
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <ThumbsUp size={13} className="text-emerald-600 fill-emerald-600" />
              <span>{stats.totalUpvotesReceived ?? stats.totalLikesReceived ?? 0} Total Upvotes Received</span>
            </div>
          </div>
        </div>

        {contributedLadders.length === 0 ? (
          <div className="text-center py-10 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <Globe size={32} className="mx-auto text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-700">No public ladders yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {isOwnProfile
                ? 'You have not listed any ladders on Community Ladders yet. Go to My Ladders and click "Publish" on any ladder!'
                : `@${profile?.username || targetUsername} hasn't published any public ladders to the community yet.`}
            </p>
            {isOwnProfile && (
              <Link to="/ladders" className="inline-block mt-4">
                <Button size="sm" variant="primary" className="text-xs">
                  Go to My Ladders
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributedLadders.map((ladder) => (
              <div
                key={ladder._id}
                className="bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      to={`/ladders/${ladder._id}`}
                      className="font-bold text-sm text-[#1E1F25] group-hover:text-[#6C5CE7] transition-colors line-clamp-1 flex-1"
                    >
                      {ladder.title}
                    </Link>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                      {ladder.publishedAt ? formatDistanceToNow(new Date(ladder.publishedAt), { addSuffix: true }) : ''}
                    </span>
                  </div>

                  {ladder.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-3">
                      “{ladder.description}”
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-2 text-xs">
                  <div className="flex items-center gap-3 text-gray-500">
                    <div>
                      <span className="font-semibold text-gray-800">{ladder.questionCount || 0}</span> problems
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        <ThumbsUp size={11} className="fill-emerald-600" /> {ladder.upvotesCount ?? ladder.likesCount ?? 0}
                      </span>
                      {(ladder.downvotesCount > 0 || ladder.dislikesCount > 0) && (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                          <ThumbsDown size={11} className="fill-rose-500" /> {ladder.downvotesCount ?? ladder.dislikesCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/ladders/${ladder._id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#6C5CE7] hover:underline"
                  >
                    <span>Explore</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2.5 Blogs & Community Editorials Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#6C5CE7]" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#1E1F25]">Blogs & Community Editorials</h2>
              <span className="text-xs font-mono font-bold bg-[#6C5CE7]/10 text-[#6C5CE7] px-2 py-0.5 rounded-full">
                {blogs.length} / 5 Slots
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Author insights, algorithmic guides, and contest problem write-ups
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isOwnProfile && (
              <Link to="/blogs/create">
                <Button size="sm" variant="primary" className="flex items-center gap-1.5 text-xs">
                  <PenLine size={13} /> Write Blog
                </Button>
              </Link>
            )}
            <Link to="/blogs">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs border-gray-200">
                Explore All Blogs <ArrowRight size={13} />
              </Button>
            </Link>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-10 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-700">No blogs published yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {isOwnProfile
                ? 'You have not authored any blogs or editorials yet. Share your problem breakdowns and algorithmic techniques with the community (up to 5 blogs per user).'
                : `@${profile?.username || targetUsername} hasn't published any blogs or editorials yet.`}
            </p>
            {isOwnProfile && (
              <Link to="/blogs/create" className="inline-block mt-4">
                <Button size="sm" variant="primary" className="text-xs flex items-center gap-1.5 mx-auto">
                  <PenLine size={13} /> Write Your First Blog
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blogs.map((blog) => (
              <div
                key={blog._id}
                className="bg-white rounded-xl border border-gray-200 hover:border-[#6C5CE7]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      to={`/blogs/${blog._id}`}
                      className="font-bold text-sm text-[#1E1F25] group-hover:text-[#6C5CE7] transition-colors line-clamp-2 flex-1"
                    >
                      {blog.title}
                    </Link>
                  </div>

                  {blog.summary && (
                    <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                      {blog.summary}
                    </p>
                  )}

                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {blog.tags.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                      {blog.tags.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">+{blog.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-2 text-xs">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <ThumbsUp size={11} className="fill-emerald-600" /> {blog.score ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <MessageSquare size={11} /> {blog.commentsCount || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Eye size={11} /> {blog.viewsCount || 0}
                    </span>
                  </div>

                  <Link
                    to={`/blogs/${blog._id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#6C5CE7] hover:underline"
                  >
                    <span>Read</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Platform Insights & Analytics Suite */}
      <PlatformInsights
        solvedQuestions={solvedQuestions}
        platformAccounts={platforms}
        currentUser={profile || user}
        availableYears={availableYears}
      />
    </div>
  );
}
