import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bus, Route, Stop, Ticket, UserProfile } from '@/types';

// Generic hook for real-time collection listening
export function useFirestoreCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]); // Use simple collectionName dependency for maximum stability

  return { data, loading, error };
}

// Hook for real-time document listening
export function useFirestoreDoc<T>(collectionName: string, docId: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}/${docId}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
}

// Specific hooks for different collections
export function useBuses(constraints: QueryConstraint[] = []) {
  return useFirestoreCollection<Bus>('buses', constraints);
}

export function useBus(busId: string | null) {
  return useFirestoreDoc<Bus>('buses', busId);
}

export function useRoutes(constraints: QueryConstraint[] = []) {
  return useFirestoreCollection<Route>('routes', constraints);
}

export function useRoute(routeId: string | null) {
  return useFirestoreDoc<Route>('routes', routeId);
}

export function useStops(constraints: QueryConstraint[] = []) {
  return useFirestoreCollection<Stop>('stops', constraints);
}

export function useStop(stopId: string | null) {
  return useFirestoreDoc<Stop>('stops', stopId);
}

export function useTickets(userId?: string) {
  const constraints = userId ? [where('userId', '==', userId)] : [];
  return useFirestoreCollection<Ticket>('tickets', constraints);
}

export function useActiveTickets(userId: string) {
  const constraints = [
    where('userId', '==', userId),
    where('status', 'in', ['PENDING', 'CONFIRMED', 'BOARDED'])
  ];
  return useFirestoreCollection<Ticket>('tickets', constraints);
}

export function useCompletedTickets(userId: string) {
  const constraints = [
    where('userId', '==', userId),
    where('status', 'in', ['EXITED', 'CANCELLED', 'EXPIRED'])
  ];
  return useFirestoreCollection<Ticket>('tickets', constraints);
}

export function useBusTickets(busId: string, status?: string | string[]) {
  const constraints = status
    ? [where('busId', '==', busId), where('status', Array.isArray(status) ? 'in' : '==', status)]
    : [where('busId', '==', busId)];
  return useFirestoreCollection<Ticket>('tickets', constraints);
}

export function useConductorBus(conductorId: string) {
  const { data: buses, loading, error } = useFirestoreCollection<Bus>(
    'buses',
    [where('conductorId', '==', conductorId)]
  );
  return { bus: buses[0] || null, loading, error };
}
