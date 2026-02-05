import { useState, useEffect } from 'react';

interface GeolocationState {
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    isLoading: false,
    error: null,
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          isLoading: false,
          error: null,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setState({
          coordinates: null,
          isLoading: false,
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: false, // Don't require high accuracy
        timeout: 5000, // Shorter timeout
        maximumAge: 60000, // Accept cached location up to 1 minute old
      }
    );
  };

  // Don't auto-fetch on mount - let user request it explicitly
  // useEffect(() => {
  //   getCurrentLocation();
  // }, []);

  return {
    ...state,
    getCurrentLocation,
  };
};