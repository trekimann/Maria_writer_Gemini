import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
  isOpen: boolean;
  helpId: string | null;
  openHelp: (id: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [helpId, setHelpId] = useState<string | null>(null);

  const openHelp = (id: string) => {
    setHelpId(id);
    setIsOpen(true);
  };

  const closeHelp = () => {
    setIsOpen(false);
    setHelpId(null);
  };

  return (
    <HelpContext.Provider value={{ isOpen, helpId, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};
