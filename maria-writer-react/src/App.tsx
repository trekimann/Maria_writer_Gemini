import { StoreProvider } from './context/StoreContext';
import { MainLayout } from './components/templates/MainLayout';

function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}

export default App;
