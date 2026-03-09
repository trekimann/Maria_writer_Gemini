import React from 'react';
import { ThemeProvider } from '../../context/ThemeContext';

interface AppThemeProviderProps {
  children: React.ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};
