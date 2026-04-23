import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuses, useStops, useRoutes } from '@/hooks/useFirestore';
import { BusMap } from '@/components/BusMap';
import { CrowdIndicator, CrowdProgress } from '@/components/CrowdIndicator';
import { Bus, Route } from '@/types';
import {
  Search,
  Bus as BusIcon,
  MapPin,
  Loader2,
  X,
  Navigation,
  Gauge,
  ArrowRight
} from 'lucide-react';
import { where, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { isAfter, parseISO, startOfToday, isSameDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useFirestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export default function TrackBus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userTickets } = useTickets(user?.uid);
  const { data: buses, loading: busesLoading } = useBuses([where('status', '==', 'started')], []);
  const { data: stops, loading: stopsLoading } = useStops([], []);
  const { data: routes, loading: routesLoading } = useRoutes([], []);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Incident Reporting State
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentReason, setIncidentReason] = useState('');
  const [incidentOtherReason, setIncidentOtherReason] = useState('');
  const [isReportingIncident, setIsReportingIncident] = useState(false);

  const loading = busesLoading || stopsLoading || routesLoading;

  const filteredBuses = buses.filter((bus) => {
    const matchesSearch = bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase());
    // Only show starting buses that have a route assigned
    return matchesSearch && bus.routeId;
  });

  const selectedBus = buses.find(b => b.id === selectedBusId) || null;

  const mapCenter: [number, number] = selectedBus?.location
    ? [selectedBus.location.latitude, selectedBus.location.longitude]
    : [12.9716, 77.5946];

  const handleBusClick = (bus: Bus) => {
    setSelectedBusId(bus.id);
  };

  const handleReportIncident = async () => {
    if (!selectedBus || !incidentReason || !user) return;

    setIsReportingIncident(true);
    try {
      // Play warning sound when reporting
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(err => console.error('Audio play failed:', err));

      const reasonDisplay = incidentReason === 'others' ? incidentOtherReason : incidentReason;

      await addDoc(collection(db, 'notifications'), {
        type: 'incident',
        busId: selectedBus.id,
        message: `Passenger reported an incident on Bus ${selectedBus.busNumber} due to ${reasonDisplay}`,
        hazardReason: incidentReason,
        hazardOtherReason: incidentReason === 'others' ? incidentOtherReason : null,
        isRead: false,
        status: 'pending',
        reportedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Incident Reported',
        description: 'Conductor and Admin have been notified.',
        variant: 'destructive',
      });

      setIncidentDialogOpen(false);
      setIncidentReason('');
      setIncidentOtherReason('');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to report incident',
        variant: 'destructive',
      });
    } finally {
      setIsReportingIncident(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Track Bus</h1>
          <p className="text-muted-foreground">
            View real-time bus locations and crowd levels
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Bus List & Selection */}
            <div className="lg:col-span-1 space-y-4">
              {/* Bus Selection Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="bus-select">Select Bus to Track</Label>
                <Select
                  value={selectedBusId || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedBusId(null);
                    } else {
                      setSelectedBusId(value);
                    }
                  }}
                >
                  <SelectTrigger id="bus-select" className="w-full">
                    <SelectValue placeholder="Select a running bus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Running Buses</SelectItem>
                    {buses.map((bus) => {
                      const route = routes.find(r => r.id === bus.routeId);
                      return (
                        <SelectItem key={bus.id} value={bus.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{bus.busNumber}</span>
                            <span className="text-xs text-muted-foreground">{route?.name || 'Unknown Route'}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Fallback */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Or search by bus number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Bus Cards */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {(selectedBus ? [selectedBus] : filteredBuses).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No buses match your search' : 'No active buses'}
                  </div>
                ) : (
                  (selectedBus ? [selectedBus] : filteredBuses).map((bus) => (
                    <Card
                      key={bus.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selectedBus?.id === bus.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleBusClick(bus)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                              <BusIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold">{bus.busNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                {routes.find(r => r.id === bus.routeId)?.name || 'Starting Soon'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Speed</div>
                            <div className={cn(
                              "flex items-center gap-1 font-bold",
                              (bus.location?.speed || 0) > 50 ? "text-destructive" : "text-primary"
                            )}>
                              <Gauge className="h-3 w-3" />
                              {bus.location?.speed || 0} km/h
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Crowd</div>
                            {bus.status === 'started' ? (
                              <CrowdIndicator
                                passengerCount={bus.passengerCount}
                                capacity={bus.capacity}
                                size="sm"
                                showCount={false}
                              />
                            ) : (
                              <div className="text-xs font-medium text-muted-foreground italic">Not on trip</div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          {(() => {
                            const route = routes.find(r => r.id === bus.routeId);
                            const currentStopId = route?.stops[bus.currentStopIndex || 0];
                            const nextStopId = route?.stops[(bus.currentStopIndex || 0) + 1];
                            const currentStop = stops.find(s => s.id === currentStopId);
                            const nextStop = stops.find(s => s.id === nextStopId);

                            return (
                              <>
                                {currentStop && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                    <span className="text-muted-foreground shrink-0">Reached:</span>
                                    <span className="font-medium truncate">{currentStop.name}</span>
                                  </div>
                                )}
                                {nextStop && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <ArrowRight className="h-3 w-3 text-primary" />
                                    <span className="text-muted-foreground shrink-0">Next:</span>
                                    <span className="font-medium truncate">{nextStop.name}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                          {bus.status === 'started' && (
                            <CrowdProgress
                              passengerCount={bus.passengerCount}
                              capacity={bus.capacity}
                            />
                          )}

                          {(() => {
                            const boardedTicket = userTickets?.find(t =>
                              t.busId === bus.id &&
                              t.status === 'BOARDED' &&
                              t.userId === user.uid
                            );

                            if (!boardedTicket) return null;

                            const route = routes.find(r => r.id === bus.routeId);
                            if (!route) return null;

                            const boardingIndex = route.stops.indexOf(boardedTicket.boardingStop);
                            const destinationIndex = route.stops.indexOf(boardedTicket.destinationStop);
                            const currentIndex = bus.currentStopIndex || 0;

                            const isStopEligible = currentIndex >= boardingIndex && currentIndex <= destinationIndex;

                            if (!isStopEligible) return null;

                            return (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBusId(bus.id);
                                  setIncidentDialogOpen(true);
                                }}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Report Incident
                              </Button>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Incident Dialog */}
            <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Incident</DialogTitle>
                  <DialogDescription>
                    Report an abuse or medical emergency on this bus. Conductor and Admin will be notified immediately.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="incident-reason">Type of Incident</Label>
                    <Select
                      value={incidentReason}
                      onValueChange={setIncidentReason}
                    >
                      <SelectTrigger id="incident-reason">
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abuse">Abuse / Harassment</SelectItem>
                        <SelectItem value="medical emergency">Medical Emergency</SelectItem>
                        <SelectItem value="others">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {incidentReason === 'others' && (
                    <div className="space-y-2">
                      <Label htmlFor="incident-other">Specify Reason</Label>
                      <textarea
                        id="incident-other"
                        className="w-full min-h-[100px] p-3 rounded-md border bg-background"
                        placeholder="Please describe the incident..."
                        value={incidentOtherReason}
                        onChange={(e) => setIncidentOtherReason(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIncidentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReportIncident}
                    disabled={!incidentReason || (incidentReason === 'others' && !incidentOtherReason) || isReportingIncident}
                  >
                    {isReportingIncident ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Send Alert
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="sticky top-20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Navigation className="h-5 w-5" />
                      Live Map
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(() => {
                        const activeCount = (selectedBus ? [selectedBus] : buses).length;
                        return `${activeCount} running bus${activeCount !== 1 ? 'es' : ''}`;
                      })()}
                    </p>
                  </div>
                  {selectedBus && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBusId(null)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear selection
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <BusMap
                    buses={selectedBus ? [selectedBus] : filteredBuses}
                    stops={(() => {
                      if (!selectedBus) return [];
                      const route = routes.find(r => r.id === selectedBus.routeId);
                      if (!route) return [];
                      return stops
                        .filter(s => route.stops.includes(s.id))
                        .map(s => ({
                          id: s.id,
                          name: s.name,
                          location: s.location,
                        }));
                    })()}
                    center={mapCenter}
                    zoom={selectedBus ? 15 : 13}
                    height="500px"
                    onBusClick={handleBusClick}
                    selectedBusId={selectedBus?.id}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
