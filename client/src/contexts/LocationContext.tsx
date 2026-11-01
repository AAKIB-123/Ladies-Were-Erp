import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Location } from '../types';
import { useAuth } from './AuthContext';

interface LocationContextType {
  locations: Location[];
  selectedLocation: Location | null;
  setSelectedLocation: (loc: Location | null) => void;
  isLoading: boolean;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSelectedLocation = useCallback((loc: Location | null) => {
    setSelectedLocationState(loc);
    if (loc) {
      localStorage.setItem('lw_selected_location_id', loc._id || (loc.id as string));
    } else {
      localStorage.removeItem('lw_selected_location_id');
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    if (!user) {
      setLocations([]);
      setSelectedLocationState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/locations');
      if (res.data.success && Array.isArray(res.data.locations)) {
        const fetchedLocs: Location[] = res.data.locations;
        setLocations(fetchedLocs);

        const savedId = localStorage.getItem('lw_selected_location_id');
        let matched = fetchedLocs.find((l) => (l._id || l.id) === savedId);

        if (!matched && fetchedLocs.length > 0) {
          matched = fetchedLocs[0];
        }

        if (matched) {
          setSelectedLocation(matched);
        } else {
          setSelectedLocation(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, setSelectedLocation]);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocation,
        setSelectedLocation,
        isLoading,
        refreshLocations
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
