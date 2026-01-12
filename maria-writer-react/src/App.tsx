import { StoreProvider } from './context/StoreContext';
import { HelpProvider } from './context/HelpContext';
import { HelpModal } from './components/molecules/HelpModal';
import { MainLayout } from './components/templates/MainLayout';

function App() {
  return (
    <StoreProvider>
      <HelpProvider>
        <MainLayout />
        <HelpModal />
      </HelpProvider>
    </StoreProvider>
  );
}

export default App;
