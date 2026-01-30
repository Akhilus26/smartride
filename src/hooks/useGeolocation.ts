import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    heading: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = error.message;

      if (error.code === error.PERMISSION_DENIED) {
        if (!window.isSecureContext) {
          errorMessage = 'Geolocation requires a secure connection (HTTPS). Browsers block location access when using a local IP over HTTP.';
        } else {
          errorMessage = 'Location access was denied. Please allow location permissions in your browser settings and try again.';
        }
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage = 'Location information is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        errorMessage = 'Location request timed out.';
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        maximumAge: options.maximumAge ?? 10000,
        timeout: options.timeout ?? 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [options.enableHighAccuracy, options.maximumAge, options.timeout]);

  return state;
}

// Hook for tracking and updating bus location in real-time
export function useBusLocationTracker(busId: string | null) {
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(() => {
    if (!busId) {
      setError('No bus ID provided');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const busRef = doc(db, 'buses', busId);
          await updateDoc(busRef, {
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading,
              updatedAt: serverTimestamp(),
            },
            status: 'active',
            updatedAt: serverTimestamp(),
          });
          setError(null);
        } catch (err: any) {
          console.error('Error updating bus location:', err);
          setError(err.message);
        }
      },
      (err) => {
        let errorMessage = err.message;
        if (err.code === err.PERMISSION_DENIED) {
          if (!window.isSecureContext) {
            errorMessage = 'Geolocation requires a secure connection (HTTPS). Browsers block location access when using a local IP over HTTP.';
          } else {
            errorMessage = 'Location access was denied. Please allow location permissions in your browser settings and try again.';
          }
        }
        setError(errorMessage);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [busId]);

  const stopTracking = useCallback(async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    if (busId) {
      try {
        const busRef = doc(db, 'buses', busId);
        await updateDoc(busRef, {
          status: 'idle',
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Error updating bus status:', err);
      }
    }

    setIsTracking(false);
  }, [watchId, busId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return { isTracking, startTracking, stopTracking, error };
}
