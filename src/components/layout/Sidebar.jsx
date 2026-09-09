import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Flame,
  ChefHat,
  Lightbulb,
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
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import SidebarLink from './SidebarLink';
import api from '../../lib/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
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
        <div className="w-8 h-8 rounded-lg bg-[#6C5CE7] flex items-center justify-center">
          <Layers size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-[#6B7280] font-medium">Platform</p>
          <h2 className="text-base font-bold text-white tracking-tight">CodeLadder</h2>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <SidebarLink to="/" icon={Home} label="Home" onClick={closeMobile} />
        <SidebarLink to="/problemset" icon={ClipboardList} label="Problemset" onClick={closeMobile} />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Contest Upsolvers</p>
        </div>
        <SidebarLink to="/contest/codeforces" icon={Flame} label="Codeforces" onClick={closeMobile} />
        <SidebarLink to="/contest/codechef" icon={ChefHat} label="CodeChef" onClick={closeMobile} />
        <SidebarLink to="/contest/leetcode" icon={Lightbulb} label="LeetCode" onClick={closeMobile} />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Workspace</p>
        </div>
        <SidebarLink to="/ladders" icon={Layers} label="Ladders" onClick={closeMobile} />

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Community</p>
        </div>
        <SidebarLink to="/blogs" icon={BookOpen} label="Blogs" onClick={closeMobile} />

        {/* Dynamic Section: Admin Panel (for admins) OR My Ladders (for regular users) */}
        {isAdmin ? (
          <>
            <div className="pt-4 pb-2 px-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Admin Panel</p>
            </div>
            <SidebarLink to="/admin/users" icon={Users} label="Users" onClick={closeMobile} />
            <SidebarLink to="/admin/ladders" icon={Layers} label="Ladders" onClick={closeMobile} />
            <SidebarLink to="/admin/questions" icon={BookOpen} label="Questions" onClick={closeMobile} />
          </>
        ) : user ? (
          <>
            <div className="pt-4 pb-2 px-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">My Ladders</p>
              <Link
                to="/ladders"
                onClick={closeMobile}
                className="text-[10px] text-[#A0A3B1] hover:text-[#6C5CE7] flex items-center gap-0.5"
                title="Create Ladder"
              >
                <Plus size={12} />
                <span>New</span>
              </Link>
            </div>

            {loadingLadders ? (
              <div className="px-4 py-2">
                <p className="text-xs text-[#6B7280] italic">Loading ladders...</p>
              </div>
            ) : userLadders.length === 0 ? (
              <div className="px-4 py-2">
                <p className="text-xs text-[#6B7280]">No ladders yet</p>
                <Link
                  to="/ladders"
                  onClick={closeMobile}
                  className="mt-1 text-xs text-[#6C5CE7] hover:underline block"
                >
                  + Create your first ladder
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {userLadders.map((ladder) => (
                  <SidebarLink
                    key={ladder._id}
                    to={`/ladder/${ladder._id}`}
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Workspace</p>
            <div className="mt-2 p-3 rounded-lg bg-[#2D2E36]/50 border border-[#2D2E36]">
              <p className="text-xs text-[#A0A3B1]">Sign in to create ladders and track solved problems.</p>
              <Link
                to="/login"
                onClick={closeMobile}
                className="mt-2 inline-block text-xs font-semibold text-[#6C5CE7] hover:underline"
              >
                Sign In →
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-[#2D2E36] space-y-1">
        {user ? (
          <>
            <div className="px-4 py-2 mb-1 rounded-lg bg-[#2D2E36]/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate">{user.username}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6C5CE7]/20 text-[#6C5CE7]">
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
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#1E1F25] text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#1E1F25]">
            <button
              onClick={closeMobile}
              className="absolute top-4 right-4 text-[#A0A3B1] hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px] bg-[#1E1F25] z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
