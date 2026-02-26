import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConductorBus, useRoute, useBusTickets, useStops, useNotifications } from '@/hooks/useFirestore';
import { useBusTracking } from '@/contexts/BusTrackingContext';
import { useAuth } from '@/contexts/AuthContext';
import { CrowdIndicator, CrowdProgress } from '@/components/CrowdIndicator';
import { BusMap } from '@/components/BusMap';
import {
  Bus,
  Play,
  Square,
  Users,
  MapPin,
  Ticket,
  QrCode,
  Loader2,
  AlertCircle,
  Navigation,
  UserPlus,
  UserMinus,
  Check,
  Gauge,
  ArrowRight,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isAfter, parseISO, format, startOfToday, isSameDay } from 'date-fns';

export default function ConductorDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { bus, loading: busLoading } = useConductorBus(userProfile?.uid || '');
  const { data: route } = useRoute(bus?.routeId || null);
  const { data: activeTickets } = useBusTickets(bus?.id || '', ['CONFIRMED', 'BOARDED']);
  const { data: allStops } = useStops();
  const { isTracking, startTracking, stopTracking, error: trackingError } = useBusTracking();

  const { data: incidents } = useNotifications(
    bus?.id ? [
      where('type', '==', 'incident'),
      where('busId', '==', bus.id),
      where('isRead', '==', false)
    ] : [where('busId', '==', 'NON_EXISTENT_BUS_ID')],
    [bus?.id]
  );

  const [cashDialogOpen, setCashDialogOpen] = React.useState(false);
  const [selectedDestination, setSelectedDestination] = React.useState('');
  const [isSubmittingCash, setIsSubmittingCash] = React.useState(false);

  // Audio Alert Logic
  const prevIncidentsCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio object
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'); // Emergency Siren
      audioRef.current.loop = false;
    }

    if (incidents && incidents.length > prevIncidentsCount.current) {
      // New incident reported!
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.error('Audio play failed:', err));

      // Stop after 5 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, 5000);

      // Also trigger a vibration pattern if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }

    prevIncidentsCount.current = incidents?.length || 0;
  }, [incidents]);

  const loading = busLoading;

  const [isReportingHazard, setIsReportingHazard] = React.useState(false);
  const [hazardDialogOpen, setHazardDialogOpen] = React.useState(false);
  const [hazardReason, setHazardReason] = React.useState('');
  const [otherReason, setOtherReason] = React.useState('');
  const [showScheduleAlert, setShowScheduleAlert] = useState(false);

  useEffect(() => {
    if (!bus || bus.status !== 'starting' || !bus.scheduledDate || !bus.scheduledTime) {
      setShowScheduleAlert(false);
      return;
    }

    const checkSchedule = () => {
      const today = startOfToday();
      const scheduledDate = parseISO(bus.scheduledDate);

      if (isSameDay(scheduledDate, today)) {
        const [hours, minutes] = bus.scheduledTime.split(':').map(Number);
        const scheduledDateTime = new Date();
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        if (isAfter(new Date(), scheduledDateTime)) {
          setShowScheduleAlert(true);
        } else {
          setShowScheduleAlert(false);
        }
      } else {
        setShowScheduleAlert(false);
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [bus]);

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

  const handleStartTrip = async () => {
    if (!bus) return;

    if (bus.status !== 'starting') {
      toast({
        title: 'Cannot Start Trip',
        description: 'The bus status must be "starting" to begin a trip. Please contact admin if needed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      startTracking(bus.id);
      const busRef = doc(db, 'buses', bus.id);
      await updateDoc(busRef, {
        status: 'started',
        hazard: false,
        currentStopIndex: 0, // Auto-mark first stop as arrived
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Trip Started',
        description: 'Trip status updated to Started. GPS tracking is now active.',
      });
    } catch (err) {
      console.error('Error starting trip:', err);
    }
  };

  const handleReportHazard = async () => {
    if (!bus || !hazardReason) return;
    if (hazardReason === 'others' && !otherReason) return;

    setIsReportingHazard(true);
    try {
      const busRef = doc(db, 'buses', bus.id);
      const reasonDisplay = hazardReason === 'others' ? otherReason : hazardReason;

      await updateDoc(busRef, {
        status: 'maintenance',
        hazard: true,
        hazardReason: hazardReason,
        hazardOtherReason: hazardReason === 'others' ? otherReason : null,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        type: 'hazard',
        busId: bus.id,
        message: `Bus ${bus.busNumber} has got some issue due to ${reasonDisplay}`,
        hazardReason: hazardReason,
        hazardOtherReason: hazardReason === 'others' ? otherReason : null,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Hazard Reported',
        description: 'Admin and passengers have been notified. Bus status updated to maintenance.',
        variant: 'destructive',
      });

      setHazardDialogOpen(false);
      setHazardReason('');
      setOtherReason('');

      if (isTracking) {
        handleEndTrip();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to report hazard',
        variant: 'destructive',
      });
    } finally {
      setIsReportingHazard(false);
    }
  };

  const handleEndTrip = async () => {
    if (!bus) return;

    try {
      await stopTracking(bus.id);

      const busRef = doc(db, 'buses', bus.id);
      await updateDoc(busRef, {
        status: 'idle',
        passengerCount: 0,
        currentStopIndex: 0,
        hazard: false,
        hazardReason: null,
        hazardOtherReason: null,
        scheduledDate: null,
        scheduledTime: null,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Trip Ended',
        description: 'Trip ended. All counts and schedules have been reset to default.',
      });
    } catch (err) {
      console.error('Error ending trip:', err);
    }
  };

  const handleAddCashPassenger = async () => {
    if (!bus || !selectedDestination) return;

    setIsSubmittingCash(true);
    try {
      const busRef = doc(db, 'buses', bus.id);
      await updateDoc(busRef, {
        passengerCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Also create a "cash ticket" record for tracking purposes
      await addDoc(collection(db, 'tickets'), {
        busId: bus.id,
        routeId: bus.routeId,
        boardingStop: 'CASH_BOARDING', // Or current stop if we knew it
        destinationStop: selectedDestination,
        fare: route?.fare || 0,
        status: 'BOARDED',
        paymentMethod: 'cash',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Passenger Added',
        description: 'Cash passenger added with destination.',
      });
      setCashDialogOpen(false);
      setSelectedDestination('');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add passenger',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCash(false);
    }
  };

  const handleDecrementPassenger = async () => {
    if (!bus || bus.passengerCount <= 0) return;

    try {
      const busRef = doc(db, 'buses', bus.id);
      await updateDoc(busRef, {
        passengerCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Passenger count updated',
        description: 'Passenger count has been manually decremented.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update passenger count',
        variant: 'destructive',
      });
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

  if (!bus) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No bus assigned to your account. Please contact an administrator to assign you to a bus.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
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

        {/* Schedule Alert */}
        {showScheduleAlert && (
          <Alert className="bg-primary/10 border-primary animate-bounce">
            <Bell className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-bold text-primary">Scheduled Time Reached!</div>
              <AlertDescription>
                It is now past the scheduled departure time ({bus?.scheduledTime}). You can start the trip.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Conductor Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your bus and passengers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              onClick={() => setHazardDialogOpen(true)}
              disabled={isReportingHazard}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Hazard
            </Button>
            {isTracking ? (
              <Button variant="destructive" onClick={handleEndTrip}>
                <Square className="mr-2 h-4 w-4" />
                End Trip
              </Button>
            ) : (
              <Button onClick={handleStartTrip} disabled={bus.status !== 'starting'}>
                <Play className="mr-2 h-4 w-4" />
                Start Trip
              </Button>
            )}
          </div>
        </div>

        {trackingError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{trackingError}</AlertDescription>
          </Alert>
        )}

        {/* Bus Info Card */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bus className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{bus.busNumber}</CardTitle>
                    <CardDescription>
                      {route?.name || 'No route assigned'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isTracking && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/15 text-success text-sm font-medium">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      {route && bus.currentStopIndex === (route.stops.length - 1) ? 'Destination Reached' : 'Live'}
                    </div>
                  )}
                  <CrowdIndicator
                    passengerCount={bus.passengerCount}
                    capacity={bus.capacity}
                    showCount={false}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CrowdProgress
                passengerCount={bus.passengerCount}
                capacity={bus.capacity}
              />

              {bus.location && isTracking && (
                <div className="mt-4">
                  <BusMap
                    buses={[bus]}
                    stops={allStops.filter(s => route?.stops.includes(s.id))}
                    height="300px"
                    center={[bus.location.latitude, bus.location.longitude]}
                    zoom={15}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Passengers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">{bus.passengerCount}</span>
                    <span className="text-muted-foreground">/ {bus.capacity}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleDecrementPassenger}
                    disabled={bus.passengerCount <= 0}
                    title="Manual passenger exit (-1)"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{activeTickets.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Speed & Route Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className={cn(
                        "h-5 w-5",
                        (bus.location?.speed || 0) > 50 ? "text-destructive" : "text-primary"
                      )} />
                      <span className={cn(
                        "text-2xl font-bold",
                        (bus.location?.speed || 0) > 50 && "text-destructive"
                      )}>
                        {bus.location?.speed || 0}
                      </span>
                      <span className="text-muted-foreground text-sm font-normal">km/h</span>
                    </div>
                    {isTracking && (bus.location?.speed || 0) > 50 && (
                      <span className="text-[10px] font-bold text-destructive uppercase animate-pulse">
                        Overspeeding!
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    {(() => {
                      const currentStopId = route?.stops[bus.currentStopIndex || 0];
                      const nextStopId = route?.stops[(bus.currentStopIndex || 0) + 1];
                      const currentStop = allStops.find(s => s.id === currentStopId);
                      const nextStop = allStops.find(s => s.id === nextStopId);

                      return (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            <span className="text-muted-foreground shrink-0 w-12">Reached:</span>
                            <span className="font-medium truncate">{currentStop?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-muted-foreground shrink-0 w-12">Next:</span>
                            <span className="font-medium truncate">{nextStop?.name || 'End of Route'}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Button asChild size="lg" className="h-auto py-6 flex-col gap-2">
            <Link to="/conductor/scanner">
              <QrCode className="h-6 w-6" />
              <span>Scan Tickets</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-auto py-6 flex-col gap-2"
            onClick={() => setCashDialogOpen(true)}
          >
            <UserPlus className="h-6 w-6" />
            <span>Add Cash Passenger</span>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-auto py-6 flex-col gap-2">
            <Link to="/conductor/stops">
              <MapPin className="h-6 w-6" />
              <span>Manage Stops</span>
            </Link>
          </Button>
        </div>

        {/* Report Hazard Dialog */}
        <Dialog open={hazardDialogOpen} onOpenChange={setHazardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Hazard</DialogTitle>
              <DialogDescription>
                Select the reason for reporting a hazard. This will notify admin and passengers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="hazard-reason">Reason</Label>
                <Select
                  value={hazardReason}
                  onValueChange={setHazardReason}
                >
                  <SelectTrigger id="hazard-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="medical issue">Medical Issue</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hazardReason === 'others' && (
                <div className="space-y-2">
                  <Label htmlFor="other-reason">Specify Reason</Label>
                  <Textarea
                    id="other-reason"
                    placeholder="Enter the reason here..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHazardDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReportHazard}
                disabled={!hazardReason || (hazardReason === 'others' && !otherReason) || isReportingHazard}
              >
                {isReportingHazard ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Report Hazard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Cash Passenger Dialog */}
        <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cash Passenger</DialogTitle>
              <DialogDescription>
                Select destination for the cash-paying passenger.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Stop</Label>
                <Select
                  value={selectedDestination}
                  onValueChange={setSelectedDestination}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStops
                      .filter(s => route?.stops.includes(s.id))
                      .map((stop) => {
                        const stopIndex = route?.stops.indexOf(stop.id) ?? -1;
                        const currentStopIndex = bus?.currentStopIndex ?? -1;
                        const isPastOrCurrent = stopIndex <= currentStopIndex;

                        return (
                          <SelectItem
                            key={stop.id}
                            value={stop.id}
                            disabled={isPastOrCurrent}
                          >
                            {stop.name} {isPastOrCurrent && '(Passed/Current)'}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCashDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCashPassenger}
                disabled={!selectedDestination || isSubmittingCash}
              >
                {isSubmittingCash ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm Arrival
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
