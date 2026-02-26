import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBuses, useRoutes, useStops } from '@/hooks/useFirestore';
import { BusMap } from '@/components/BusMap';
import { CrowdIndicator } from '@/components/CrowdIndicator';
import { Bus as BusIcon, Loader2, Activity, Gauge, ArrowRight, AlertTriangle } from 'lucide-react';
import { where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useFirestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertCircle } from 'lucide-react';

export default function LiveMonitor() {
  const { toast } = useToast();
  const { data: buses, loading } = useBuses([where('status', 'in', ['active', 'started', 'starting'])]);
  const { data: stops } = useStops();
  const { data: routes } = useRoutes();

  // Incident Monitoring
  const { data: incidents } = useNotifications(
    [
      where('type', '==', 'incident'),
      where('isRead', '==', false)
    ],
    []
  );

  const prevIncidentsCount = React.useRef(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    }

    if (incidents && incidents.length > prevIncidentsCount.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.error('Audio play failed:', err));

      // Stop after 5 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, 5000);
    }
    prevIncidentsCount.current = incidents?.length || 0;
  }, [incidents]);

  const handleMarkIncidentResolved = async (incidentId: string) => {
    try {
      const incidentRef = doc(db, 'notifications', incidentId);
      await updateDoc(incidentRef, {
        isRead: true,
        status: 'resolved',
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Incident Resolved',
        description: 'The incident has been marked as resolved.',
      });
    } catch (err) {
      console.error('Error marking incident as resolved:', err);
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-success animate-pulse" />
          <h1 className="text-2xl font-bold">Live Monitor</h1>
          <span className="text-sm text-muted-foreground">({buses.length} active/started buses)</span>
        </div>

        {/* Incident Alerts */}
        {incidents && incidents.length > 0 && (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <Alert key={incident.id} variant="destructive" className="animate-pulse border-2">
                <AlertCircle className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-bold text-lg mb-1">PASSENGER INCIDENT REPORTED!</div>
                  <AlertDescription className="text-base font-medium">
                    {incident.message}
                  </AlertDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-background hover:bg-muted"
                  onClick={() => handleMarkIncidentResolved(incident.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark as Resolved
                </Button>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Bus Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <BusMap
                  buses={buses}
                  stops={stops.map((s) => ({ id: s.id, name: s.name, location: s.location }))}
                  height="500px"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Active Buses</h3>
            {buses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active buses</p>
            ) : (
              buses.map((bus) => {
                const route = routes.find((r) => r.id === bus.routeId);
                return (
                  <Card key={bus.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <BusIcon className="h-5 w-5 text-primary" />
                          <span className="font-medium">{bus.busNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {bus.hazard && (
                            <div className="flex items-center gap-1 bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-bold text-[10px] animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              HAZARD
                            </div>
                          )}
                          {route && bus.currentStopIndex === route.stops.length - 1 && (
                            <div className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Reached End
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{route?.name || 'No route'}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Speed</div>
                          <div className={cn(
                            "flex items-center gap-1 font-bold transition-colors",
                            (bus.location?.speed || 0) > 50 ? "text-destructive" : "text-primary"
                          )}>
                            <Gauge className="h-3.5 w-3.5" />
                            {bus.location?.speed || 0} <span className="text-[10px] font-normal">km/h</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Crowd</div>
                          <CrowdIndicator passengerCount={bus.passengerCount} capacity={bus.capacity} size="sm" showCount={false} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 bg-muted/30 p-2 rounded-md">
                        {(() => {
                          const currentStopId = route?.stops[bus.currentStopIndex || 0];
                          const nextStopId = route?.stops[(bus.currentStopIndex || 0) + 1];
                          const currentStop = stops.find(s => s.id === currentStopId);
                          const nextStop = stops.find(s => s.id === nextStopId);

                          return (
                            <>
                              {currentStop && (
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                                  <span className="text-muted-foreground shrink-0 w-12">Reached:</span>
                                  <span className="font-medium truncate">{currentStop.name}</span>
                                </div>
                              )}
                              {nextStop && (
                                <div className="flex items-center gap-2 text-xs">
                                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-muted-foreground shrink-0 w-12">Next:</span>
                                  <span className="font-medium truncate">{nextStop.name}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
