"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ServiceState {
  id: string;
  enabled: boolean;
}

interface ServicesContextShape {
  services: Record<string, ServiceState>;
  toggleService: (id: string) => void;
  setServiceEnabled: (id: string, enabled: boolean) => void;
}

const ServicesContext = createContext<ServicesContextShape | undefined>(undefined);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Record<string, ServiceState>>({
    email: { id: 'email', enabled: true },
    totp: { id: 'totp', enabled: true },
    claudeSonnet: { id: 'claudeSonnet', enabled: true }
  });

  const toggleService = useCallback((id: string) => {
    setServices(prev => ({
      ...prev,
      [id]: { id, enabled: !prev[id]?.enabled }
    }));
  }, []);

  const setServiceEnabled = useCallback((id: string, enabled: boolean) => {
    setServices(prev => ({
      ...prev,
      [id]: { id, enabled }
    }));
  }, []);

  return (
    <ServicesContext.Provider value={{ services, toggleService, setServiceEnabled }}>
      {children}
    </ServicesContext.Provider>
  );
};

export function useServices() {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within ServicesProvider');
  return ctx;
}
