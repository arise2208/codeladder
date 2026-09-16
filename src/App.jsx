import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { RequireAuth, RequireRole } from './auth/RouteGuards';
import Sidebar from './components/layout/Sidebar';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProblemsetPage = lazy(() => import('./pages/ProblemsetPage'));
const CodeforcesContestPage = lazy(() => import('./pages/CodeforcesContestPage'));
const CodeChefContestPage = lazy(() => import('./pages/CodeChefContestPage'));
const LeetCodeContestPage = lazy(() => import('./pages/LeetCodeContestPage'));
const LaddersPage = lazy(() => import('./pages/LaddersPage'));
const LadderDetailPage = lazy(() => import('./pages/LadderDetailPage'));
const StarredProblemsPage = lazy(() => import('./pages/StarredProblemsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BlogsPage = lazy(() => import('./pages/BlogsPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const BlogEditorPage = lazy(() => import('./pages/BlogEditorPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminLaddersPage = lazy(() => import('./pages/admin/AdminLaddersPage'));
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage'));

const SuspenseFallback = () => <LoadingSpinner fullScreen />;

export default function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen text="Restoring session..." />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#eff2f6]">
      <Sidebar />

      <main className="lg:ml-[260px] min-h-screen">
        <div className="p-6 lg:p-8">
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="/problemset" element={<ProblemsetPage />} />
              <Route path="/contest/codeforces" element={<CodeforcesContestPage />} />
              <Route path="/contest/codechef" element={<CodeChefContestPage />} />
              <Route path="/contest/leetcode" element={<LeetCodeContestPage />} />

              {/* Community Blogs */}
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/blogs/create" element={<RequireAuth><BlogEditorPage /></RequireAuth>} />
              <Route path="/blog/:blogId" element={<BlogDetailPage />} />
              <Route path="/blogs/:blogId" element={<BlogDetailPage />} />
              <Route path="/blogs/:blogId/edit" element={<RequireAuth><BlogEditorPage /></RequireAuth>} />

              {/* Protected - User */}
              <Route path="/starred" element={<RequireAuth><StarredProblemsPage /></RequireAuth>} />
              <Route path="/favorites" element={<RequireAuth><StarredProblemsPage /></RequireAuth>} />
              <Route path="/ladders" element={<RequireAuth><LaddersPage /></RequireAuth>} />
              <Route path="/ladder/:ladderId" element={<RequireAuth><LadderDetailPage /></RequireAuth>} />
              <Route path="/ladders/:ladderId" element={<RequireAuth><LadderDetailPage /></RequireAuth>} />
              {/* User Profiles */}
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

              {/* Protected - Admin */}
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<RequireRole role="ADMIN"><AdminUsersPage /></RequireRole>} />
              <Route path="/admin/ladders" element={<RequireRole role="ADMIN"><AdminLaddersPage /></RequireRole>} />
              <Route path="/admin/questions" element={<RequireRole role="ADMIN"><AdminQuestionsPage /></RequireRole>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
