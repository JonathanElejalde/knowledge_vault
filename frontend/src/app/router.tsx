import * as React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { LoginPage } from './routes/auth/login';
import { SignupPage } from './routes/auth/signup';
import { NotFoundPage } from './routes/NotFoundPage';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';
import MainLayout from '@/components/organisms/MainLayout';

// Import existing feature pages
import DashboardPage from '@/features/dashboard/DashboardPage';
import PomodoroPage from '@/features/pomodoro/pages/PomodoroPage';

// Lazy load other protected routes
const Notes = React.lazy(() => import('@/features/notes/pages/NotesPage'));
const CreateNote = React.lazy(() => import('@/features/notes/pages/CreateNotePage'));
const ViewNote = React.lazy(() => import('@/features/notes/pages/ViewNotePage'));
const Projects = React.lazy(() => import('@/features/projects/pages/ProjectsPage'));
const Anki = React.lazy(() => import('@/features/anki/pages/AnkiPage'));


// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Wrap lazy-loaded components with Suspense
const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <React.Suspense fallback={<LoadingFallback />}>
    <Component />
  </React.Suspense>
);

// Root layout component that conditionally renders MainLayout
function RootLayout() {
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith('/auth/');

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/auth/login',
        element: <LoginPage />,
      },
      {
        path: '/auth/signup',
        element: <SignupPage />,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/pomodoro',
        element: (
          <ProtectedRoute>
            <PomodoroPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/notes',
        element: (
          <ProtectedRoute>
            {withSuspense(Notes)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/notes/new',
        element: (
          <ProtectedRoute>
            {withSuspense(CreateNote)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/notes/edit/:id',
        element: (
          <ProtectedRoute>
            {withSuspense(CreateNote)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/notes/:id',
        element: (
          <ProtectedRoute>
            {withSuspense(ViewNote)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/projects',
        element: (
          <ProtectedRoute>
            {withSuspense(Projects)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/anki',
        element: (
          <ProtectedRoute>
            {withSuspense(Anki)}
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
} 