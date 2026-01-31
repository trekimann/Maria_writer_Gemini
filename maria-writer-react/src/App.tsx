import { StoreProvider } from './context/StoreContext';
import { HelpProvider } from './context/HelpContext';
import { ThemeProvider } from './context/ThemeContext';
import { HelpModal } from './components/molecules/HelpModal';
import { MainLayout } from './components/templates/MainLayout';

function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <HelpProvider>
          <MainLayout />
          <HelpModal />
        </HelpProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}

export default App;
