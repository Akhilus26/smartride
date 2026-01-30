import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface BusTrackingContextType {
    isTracking: boolean;
    startTracking: (busId: string) => void;
    stopTracking: (busId: string) => Promise<void>;
    error: string | null;
}

const BusTrackingContext = createContext<BusTrackingContextType | undefined>(undefined);

export function BusTrackingProvider({ children }: { children: React.ReactNode }) {
    const [isTracking, setIsTracking] = useState(false);
    const [watchId, setWatchId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const startTracking = useCallback((busId: string) => {
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
                    const speedInMs = position.coords.speed || 0;
                    const speedInKmh = Math.round(speedInMs * 3.6);

                    await updateDoc(busRef, {
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            heading: position.coords.heading,
                            speed: speedInKmh,
                            updatedAt: serverTimestamp(),
                        },
                        status: 'started',
                        updatedAt: serverTimestamp(),
                    });

                    // Overspeed notification
                    if (speedInKmh > 50) {
                        await addDoc(collection(db, 'notifications'), {
                            type: 'overspeed',
                            busId: busId,
                            speed: speedInKmh,
                            isRead: false,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });
                    }

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
                toast({
                    title: 'Tracking Error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            }
        );

        setWatchId(id);
        setIsTracking(true);
    }, [toast]);

    const stopTracking = useCallback(async (busId: string) => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }

        if (busId) {
            try {
                const busRef = doc(db, 'buses', busId);
                await updateDoc(busRef, {
                    status: 'ended',
                    updatedAt: serverTimestamp(),
                });
            } catch (err: any) {
                console.error('Error updating bus status:', err);
            }
        }

        setIsTracking(false);
    }, [watchId]);

    // Clean up on unmount (refresh or close)
    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    return (
        <BusTrackingContext.Provider value={{ isTracking, startTracking, stopTracking, error }}>
            {children}
        </BusTrackingContext.Provider>
    );
}

export function useBusTracking() {
    const context = useContext(BusTrackingContext);
    if (context === undefined) {
        throw new Error('useBusTracking must be used within a BusTrackingProvider');
    }
    return context;
}
