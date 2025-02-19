'use client';

import {SessionProvider} from 'next-auth/react';
import {ThemeProvider} from '@/contexts/theme-context';
import React from 'react';
import {DragDropProvider} from '@/contexts/drag-drop-context';

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers: React.FC<ProvidersProps> = ({children}) => {
  return (
    <SessionProvider>
      <ThemeProvider>
        <DragDropProvider>
          {children}
        </DragDropProvider>
      </ThemeProvider>
    </SessionProvider>
  );
};

export default Providers;
