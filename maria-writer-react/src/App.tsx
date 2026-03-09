import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { HelpProvider } from './context/HelpContext';
import { AuthProvider } from './context/AuthContext';
import { AuthFrame } from './components/atoms/AuthFrame';
import { HelpModal } from './components/molecules/HelpModal';
import { AppThemeProvider } from './components/providers/AppThemeProvider';
import { MainLayout } from './components/templates/MainLayout';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { ProjectStatisticsPage } from './components/pages/ProjectStatisticsPage';
import { UserProfilePage } from './components/pages/UserProfilePage';
import { AdminPage } from './components/pages/AdminPage';
import { AdminRoute } from './components/atoms/AdminRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <AppThemeProvider>
            <HelpProvider>
              <Routes>
                <Route path="/login" element={<AuthFrame><LoginPage /></AuthFrame>} />
                <Route path="/register" element={<AuthFrame><RegisterPage /></AuthFrame>} />
                <Route path="/" element={<Navigate to="/editor" replace />} />
                <Route
                  path="/editor"
                  element={
                    <AuthFrame>
                      <>
                        <MainLayout />
                        <HelpModal />
                      </>
                    </AuthFrame>
                  }
                />
                <Route path="/statistics" element={<AuthFrame><ProjectStatisticsPage /></AuthFrame>} />
                <Route path="/profile" element={<AuthFrame requireAuth><UserProfilePage /></AuthFrame>} />
                <Route
                  path="/admin"
                  element={
                    <AuthFrame requireAuth>
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>
                    </AuthFrame>
                  }
                />
                {/* Catch-all: send unknown paths to the editor */}
                <Route path="*" element={<Navigate to="/editor" replace />} />
              </Routes>
            </HelpProvider>
          </AppThemeProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
