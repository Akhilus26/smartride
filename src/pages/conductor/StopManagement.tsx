import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useConductorBus, useRoute, useStops, useBusTickets } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MapPin, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Users,
  ArrowRight
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function StopManagement() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { bus, loading: busLoading } = useConductorBus(userProfile?.uid || '');
  const { data: route, loading: routeLoading } = useRoute(bus?.routeId || null);
  const { data: allStops, loading: stopsLoading } = useStops();
  const { data: boardedTickets } = useBusTickets(bus?.id || '', 'BOARDED');
  
  const [processing, setProcessing] = useState(false);
  const [arrivedStopId, setArrivedStopId] = useState<string | null>(null);

  const loading = busLoading || routeLoading || stopsLoading;

  // Get route stops in order
  const routeStops = route
    ? route.stops.map((stopId) => allStops.find((s) => s.id === stopId)).filter(Boolean)
    : [];

  // Count passengers exiting at each stop
  const getExitingCount = (stopId: string) => {
    return boardedTickets.filter((t) => t.destinationStop === stopId).length;
  };

  const handleArriveAtStop = async (stopId: string) => {
    if (!bus || processing) return;

    setProcessing(true);
    setArrivedStopId(stopId);

    try {
      // Find all boarded tickets with this destination
      const ticketsToExit = boardedTickets.filter(
        (t) => t.destinationStop === stopId
      );

      if (ticketsToExit.length > 0) {
        const batch = writeBatch(db);

        // Update each ticket to EXITED
        ticketsToExit.forEach((ticket) => {
          const ticketRef = doc(db, 'tickets', ticket.id);
          batch.update(ticketRef, {
            status: 'EXITED',
            exitedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        // Decrement passenger count
        const busRef = doc(db, 'buses', bus.id);
        batch.update(busRef, {
          passengerCount: increment(-ticketsToExit.length),
          currentStopIndex: route?.stops.indexOf(stopId),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();

        toast({
          title: 'Passengers Exited',
          description: `${ticketsToExit.length} passenger(s) marked as exited at this stop.`,
        });
      } else {
        // Just update the current stop
        const busRef = doc(db, 'buses', bus.id);
        await updateDoc(busRef, {
          currentStopIndex: route?.stops.indexOf(stopId),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Arrived at Stop',
          description: 'No passengers exiting at this stop.',
        });
      }
    } catch (err: any) {
      console.error('Error processing stop arrival:', err);
      toast({
        title: 'Error',
        description: 'Failed to process stop arrival',
        variant: 'destructive',
      });
    }

    setProcessing(false);
    setTimeout(() => setArrivedStopId(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!bus) {
    return (
      <Layout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No bus assigned. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  if (!route || routeStops.length === 0) {
    return (
      <Layout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No route or stops assigned to this bus.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Stop Management</h1>
          <p className="text-muted-foreground">
            {route.name} - Mark arrivals and process passenger exits
          </p>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{bus.passengerCount}</div>
                  <div className="text-sm text-muted-foreground">On Board</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{routeStops.length}</div>
                  <div className="text-sm text-muted-foreground">Total Stops</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stop List */}
        <Card>
          <CardHeader>
            <CardTitle>Route Stops</CardTitle>
            <CardDescription>
              Tap "Arrived" when you reach each stop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routeStops.map((stop, index) => {
                if (!stop) return null;
                const exitingCount = getExitingCount(stop.id);
                const isCurrentStop = bus.currentStopIndex === index;
                const isPastStop = bus.currentStopIndex !== undefined && index < bus.currentStopIndex;
                const justArrived = arrivedStopId === stop.id;

                return (
                  <div
                    key={stop.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-all',
                      justArrived && 'bg-success/10 border-success',
                      isCurrentStop && !justArrived && 'bg-primary/5 border-primary',
                      isPastStop && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                          isPastStop
                            ? 'bg-muted text-muted-foreground'
                            : isCurrentStop
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        )}
                      >
                        {isPastStop ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{stop.name}</div>
                        {exitingCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {exitingCount} exiting here
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {exitingCount > 0 && (
                        <Badge variant="outline" className="bg-warning/15 text-warning">
                          {exitingCount} exit
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={justArrived ? 'default' : 'outline'}
                        disabled={processing || isPastStop}
                        onClick={() => handleArriveAtStop(stop.id)}
                      >
                        {processing && arrivedStopId === stop.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : justArrived ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Arrived
                          </>
                        ) : (
                          'Arrived'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
