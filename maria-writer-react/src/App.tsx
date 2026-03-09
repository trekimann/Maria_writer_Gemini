import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { HelpProvider } from './context/HelpContext';
import { AuthProvider } from './context/AuthContext';
import { AuthFrame } from './components/atoms/AuthFrame';
import { HelpModal } from './components/molecules/HelpModal';
import { MainLayout } from './components/templates/MainLayout';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { UserProfilePage } from './components/pages/UserProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
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
              <Route path="/profile" element={<AuthFrame requireAuth><UserProfilePage /></AuthFrame>} />
              {/* Catch-all: send unknown paths to the editor */}
              <Route path="*" element={<Navigate to="/editor" replace />} />
            </Routes>
          </HelpProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
