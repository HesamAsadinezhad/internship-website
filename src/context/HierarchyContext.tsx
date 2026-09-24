import React, { createContext, useContext, useState, useEffect } from 'react';
import { Complex, Line } from '../types';
import { useAuth } from './AuthContext';

interface HierarchyContextType {
  activeComplex: Complex | null;
  activeLine: Line | null;
  setActiveComplex: (c: Complex | null) => void;
  setActiveLine: (l: Line | null) => void;
  clearSelection: () => void;
}

const HierarchyContext = createContext<HierarchyContextType | undefined>(undefined);

export function HierarchyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeComplex, setActiveComplex] = useState<Complex | null>(null);
  const [activeLine, setActiveLine] = useState<Line | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initHierarchy = async () => {
      setIsInitializing(true);
      if (!user) {
        setActiveComplex(null);
        setActiveLine(null);
        setIsInitializing(false);
        return;
      }
      
      try {
        if (user.role === 'SUPER_ADMIN' || user.role === 'manager') {
          // Admins choose everything
          setActiveComplex(null);
          setActiveLine(null);
        } else if (user.role === 'COMPLEX_ADMIN' && user.complexId) {
          // Fetch complex details
          const res = await fetch('/api/complexes');
          if (res.ok) {
            const complexes = await res.json();
            if (Array.isArray(complexes)) {
              const myComplex = complexes.find((c: Complex) => c.id === user.complexId);
              if (myComplex) setActiveComplex(myComplex);
            }
          }
          setActiveLine(null); // They still need to choose a line
        } else if ((user.role === 'LINE_SUPERVISOR' || user.role === 'STATION_OPERATOR' || user.role === 'operator') && user.complexId && user.lineId) {
          // Fetch complex and line
          const [compRes, linesRes] = await Promise.all([
            fetch('/api/complexes'),
            fetch(`/api/complexes/${user.complexId}/lines`)
          ]);
          
          if (compRes.ok) {
            const complexes = await compRes.json();
            if (Array.isArray(complexes)) {
              const myComplex = complexes.find((c: Complex) => c.id === user.complexId);
              if (myComplex) setActiveComplex(myComplex);
            }
          }
          
          if (linesRes.ok) {
            const lines = await linesRes.json();
            if (Array.isArray(lines)) {
              const myLine = lines.find((l: Line) => l.id === user.lineId);
              if (myLine) setActiveLine(myLine);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load hierarchy data', err);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initHierarchy();
  }, [user]);

  const clearSelection = () => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'manager') {
      setActiveComplex(null);
      setActiveLine(null);
    } else if (user?.role === 'COMPLEX_ADMIN') {
      setActiveLine(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HierarchyContext.Provider value={{ activeComplex, activeLine, setActiveComplex, setActiveLine, clearSelection }}>
      {children}
    </HierarchyContext.Provider>
  );
}

export function useHierarchy() {
  const context = useContext(HierarchyContext);
  if (context === undefined) {
    throw new Error('useHierarchy must be used within a HierarchyProvider');
  }
  return context;
}
