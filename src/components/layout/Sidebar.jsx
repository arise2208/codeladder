import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Layers,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  FolderOpen,
  Plus,
  Users,
  BookOpen,
  Shield,
  Star,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useStarred } from '../../context/StarredContext';
import SidebarLink from './SidebarLink';
import api from '../../lib/api';
import { CodeforcesIcon, CodeChefIcon, LeetCodeIcon } from '../ui/PlatformIcon';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { starredCount } = useStarred();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userLadders, setUserLadders] = useState([]);
  const [loadingLadders, setLoadingLadders] = useState(false);

  const username = (user?.username || localStorage.getItem('username') || '').toLowerCase();
  const userRole = (user?.role || localStorage.getItem('role') || '').toUpperCase();
  const isAdmin = Boolean(user && (userRole === 'ADMIN' || username === 'admin' || username === 'deepanshu'));

  useEffect(() => {
    if (user && !isAdmin) {
      let isMounted = true;
      setLoadingLadders(true);
      api
        .get('/ladders')
        .then(({ data }) => {
          if (isMounted) setUserLadders(data.ladders || []);
        })
        .catch(() => {
          if (isMounted) setUserLadders([]);
        })
        .finally(() => {
          if (isMounted) setLoadingLadders(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [user, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#ffa116] flex items-center justify-center">
          <Layers size={18} className="text-[#1a1a1a]" />
        </div>
        <div>
          <p className="text-xs text-[#8b949e] font-medium">Platform</p>
          <h2 className="text-base font-bold text-[#eff2f6] tracking-tight">CodeLadder</h2>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <SidebarLink to="/" icon={Home} label="Home" onClick={closeMobile} />
        <SidebarLink to="/problemset" icon={ClipboardList} label="Problemset" onClick={closeMobile} />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">Contest Upsolvers</p>
        </div>
        <SidebarLink to="/contest/codeforces" icon={CodeforcesIcon} label="Codeforces" onClick={closeMobile} />
        <SidebarLink to="/contest/codechef" icon={CodeChefIcon} label="CodeChef" onClick={closeMobile} />
        <SidebarLink to="/contest/leetcode" icon={LeetCodeIcon} label="LeetCode" onClick={closeMobile} />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">Workspace</p>
        </div>
        <SidebarLink to="/ladders" icon={Layers} label="Ladders" onClick={closeMobile} />
        <SidebarLink
          to="/starred"
          icon={Star}
          label="Starred"
          badge={starredCount > 0 ? starredCount : undefined}
          onClick={closeMobile}
        />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">Community</p>
        </div>
        <SidebarLink to="/blogs" icon={BookOpen} label="Blogs" onClick={closeMobile} />

        {/* Dynamic Section: Admin Panel (for admins) OR My Ladders (for regular users) */}
        {isAdmin ? (
          <>
            <div className="pt-4 pb-2 px-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">Admin Panel</p>
            </div>
            <SidebarLink to="/admin/users" icon={Users} label="Users" onClick={closeMobile} />
            <SidebarLink to="/admin/ladders" icon={Layers} label="Ladders" onClick={closeMobile} />
            <SidebarLink to="/admin/questions" icon={BookOpen} label="Questions" onClick={closeMobile} />
          </>
        ) : user ? (
          <>
            <div className="pt-4 pb-2 px-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">My Ladders</p>
              <Link
                to="/ladders"
                onClick={closeMobile}
                className="text-[10px] text-[#8b949e] hover:text-[#ffa116] flex items-center gap-0.5"
                title="Create Ladder"
              >
                <Plus size={12} />
                <span>New</span>
              </Link>
            </div>

            {loadingLadders ? (
              <div className="px-4 py-2">
                <p className="text-xs text-[#8b949e] italic">Loading ladders...</p>
              </div>
            ) : userLadders.length === 0 ? (
              <div className="px-4 py-2">
                <p className="text-xs text-[#8b949e]">No ladders yet</p>
                <Link
                  to="/ladders"
                  onClick={closeMobile}
                  className="mt-1 text-xs text-[#ffa116] hover:underline block"
                >
                  + Create your first ladder
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {userLadders.slice(0, 5).map((ladder) => (
                  <SidebarLink
                    key={ladder._id}
                    to={`/ladders/${ladder._id}`}
                    icon={FolderOpen}
                    label={ladder.title}
                    onClick={closeMobile}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">Workspace</p>
            <div className="mt-2 p-3 rounded-lg bg-[#282828] border border-[#383838]">
              <p className="text-xs text-[#8b949e]">Sign in to create ladders and track solved problems.</p>
              <Link
                to="/login"
                onClick={closeMobile}
                className="mt-2 inline-block text-xs font-semibold text-[#ffa116] hover:underline"
              >
                Sign In →
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-[#383838] space-y-1">
        {user ? (
          <>
            <div className="px-4 py-2 mb-1 rounded-lg bg-[#282828] border border-[#383838] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#eff2f6] truncate">{user.username}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ffa116]/20 text-[#ffa116] border border-[#ffa116]/40">
                {user.role}
              </span>
            </div>
            <SidebarLink to="/profile" icon={User} label="Profile" onClick={closeMobile} />
            <SidebarLink to="/settings" icon={Settings} label="Settings" onClick={closeMobile} />
            <SidebarLink icon={LogOut} label="Logout" onClick={handleLogout} />
          </>
        ) : (
          <>
            <SidebarLink to="/login" icon={User} label="Login" onClick={closeMobile} />
            <SidebarLink to="/register" icon={Layers} label="Register" onClick={closeMobile} />
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#282828] border border-[#383838] text-[#eff2f6] shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={closeMobile} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#1a1a1a] border-r border-[#383838]">
            <button
              onClick={closeMobile}
              className="absolute top-4 right-4 text-[#8b949e] hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px] bg-[#1a1a1a] border-r border-[#383838] z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
