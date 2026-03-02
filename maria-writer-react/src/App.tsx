import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { HelpProvider } from './context/HelpContext';
import { AuthProvider } from './context/AuthContext';
import { HelpModal } from './components/molecules/HelpModal';
import { MainLayout } from './components/templates/MainLayout';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <HelpProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <>
                    <MainLayout />
                    <HelpModal />
                  </>
                }
              />
              {/* Catch-all: send unknown paths to the editor */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HelpProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
