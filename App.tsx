import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import NewAuthScreen from './components/AuthScreen';
import NewDashboard from './components/Dashboard';

// 로딩 컴포넌트
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-gray-600">로딩 중...</p>
    </div>
  </div>
);

// 인증이 필요한 라우트를 보호하는 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// 메인 앱 라우터
const AppRouter: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // 로그인했지만 프로필이 없는 경우 프로필 설정 화면으로
  if (user && !userProfile) {
    return <NewAuthScreen onLogin={() => {}} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/auth" 
          element={(user && userProfile) ? <Navigate to="/" replace /> : <NewAuthScreen onLogin={() => {}} />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <NewDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100 text-gray-800">
        <AppRouter />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#059669',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#dc2626',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
};

export default App;
