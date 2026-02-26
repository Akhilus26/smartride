import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBuses, useRoutes, useStops } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { CrowdIndicator } from '@/components/CrowdIndicator';
import { Stop } from '@/types';
import {
  Ticket,
  MapPin,
  Bus,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Users
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, isAfter, parseISO, startOfToday } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { CreditCard, Wallet, Smartphone } from 'lucide-react';

export default function BookTicket() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const { data: buses, loading: busesLoading } = useBuses([where('status', 'in', ['active', 'started', 'starting', 'idle'])]);
  const { data: routes, loading: routesLoading } = useRoutes([where('isActive', '==', true)]);
  const { data: stops, loading: stopsLoading } = useStops();

  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [boardingStop, setBoardingStop] = useState<string>('');
  const [destinationStop, setDestinationStop] = useState<string>('');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const loading = busesLoading || routesLoading || stopsLoading;

  // Get route stops in the CORRECT order specified by the route
  const selectedRouteData = routes.find((r) => r.id === selectedRoute);

  // Create an ordered list of stops for the selected route
  const routeStops = React.useMemo(() => {
    if (!selectedRouteData || !stops.length) return [];

    // Log for debugging (invisible to user but helps structure)
    console.log('Finding stops for route:', selectedRouteData.name, 'Stop IDs:', selectedRouteData.stops);

    const orderedStops = (selectedRouteData.stops || [])
      .map(stopId => {
        const targetId = stopId.trim();
        const found = stops.find(s => s.id.trim() === targetId);
        if (!found) console.warn('Missing stop for ID:', targetId);
        return found;
      })
      .filter((s): s is Stop => !!s);

    return orderedStops;
  }, [selectedRouteData, stops]);

  // Get buses for selected route and filter by schedule
  const routeBuses = React.useMemo(() => {
    const today = startOfToday();
    return buses.filter((b) => {
      if (b.routeId !== selectedRoute) return false;

      // Show only buses with an active schedule
      if (!b.scheduledDate || !b.scheduledTime) return false;

      try {
        const scheduledDate = parseISO(b.scheduledDate);
        if (isNaN(scheduledDate.getTime())) return true; // Treat invalid dates as legacy

        // Show buses scheduled for today or any future date
        return isSameDay(scheduledDate, today) || isAfter(scheduledDate, today);
      } catch (e) {
        return true; // Safety fallback
      }
    });
  }, [buses, selectedRoute]);

  // Get index of boarding stop within the ordered routeStops
  const boardingStopIndex = React.useMemo(() => {
    if (!boardingStop) return -1;
    // Use trimmed comparison for robustness
    return routeStops.findIndex(s => s.id.trim() === boardingStop.trim());
  }, [routeStops, boardingStop]);

  // Filter destination stops to only include those that come AFTER the boarding stop
  const availableDestinationStops = React.useMemo(() => {
    if (boardingStopIndex === -1 || routeStops.length === 0) return [];

    const currentBus = routeBuses.find(b => b.id === selectedBus);

    // Only filter by current position if the bus has actually 'started' its trip
    const busStopIndex = currentBus?.status === 'started' ? (currentBus?.currentStopIndex ?? -1) : -1;

    return routeStops.filter((_, index) => {
      // Must be after boarding stop and after current bus position (if it has started)
      return index > boardingStopIndex && index > busStopIndex;
    });
  }, [routeStops, boardingStopIndex, selectedBus, routeBuses]);

  // Calculate fare based on stops: 10 RS base + 5 RS per additional stop
  const farePerTicket = React.useMemo(() => {
    if (!boardingStop || !destinationStop || !selectedRouteData) return 0;

    const bIndex = routeStops.findIndex(s => s.id.trim() === boardingStop.trim());
    const dIndex = routeStops.findIndex(s => s.id.trim() === destinationStop.trim());

    if (bIndex === -1 || dIndex === -1 || dIndex <= bIndex) return 0;

    const stopsTraveled = dIndex - bIndex;
    return 10 + (stopsTraveled - 1) * 5;
  }, [boardingStop, destinationStop, routeStops, selectedRouteData]);

  const totalFare = farePerTicket * ticketCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userProfile) {
      setError('You must be logged in to book a ticket');
      return;
    }

    if (!selectedBus || !boardingStop || !destinationStop) {
      setError('Please fill in all fields');
      return;
    }

    if (boardingStop === destinationStop) {
      setError('Boarding and destination stops cannot be the same');
      return;
    }

    setPaymentDialogOpen(true);
    setPaymentStatus('idle');
  };

  const handleProcessPayment = async () => {
    setPaymentStatus('processing');

    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const ticketData = {
        userId: userProfile!.uid,
        busId: selectedBus,
        routeId: selectedRoute,
        boardingStop,
        destinationStop,
        ticketCount,
        fare: totalFare,
        status: 'CONFIRMED',
        paymentMethod: 'online',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'tickets'), ticketData);
      setPaymentStatus('success');

      // Short delay to show success state
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Ticket Booked!',
        description: 'Your payment was successful and ticket is confirmed.',
      });

      setPaymentDialogOpen(false);
      navigate('/passenger/tickets');
    } catch (err: any) {
      console.error('Error booking ticket:', err);
      setError(err.message || 'Failed to book ticket');
      setPaymentDialogOpen(false);
    } finally {
      setPaymentStatus('idle');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Book a Ticket</h1>
          <p className="text-muted-foreground">
            Select your route and stops to book a bus ticket
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-xs text-muted-foreground space-y-1 text-center">
              <p>Buses: {busesLoading ? 'Connecting...' : 'Ready'}</p>
              <p>Routes: {routesLoading ? 'Connecting...' : 'Ready'}</p>
              <p>Stops: {stopsLoading ? 'Connecting...' : 'Ready'}</p>
            </div>
          </div>
        ) : routes.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active routes available. Please check back later.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Booking Details
                </CardTitle>
                <CardDescription>
                  Fill in your journey details below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Route Selection */}
                <div className="space-y-2">
                  <Label htmlFor="route">Select Route</Label>
                  <Select
                    value={selectedRoute}
                    onValueChange={(value) => {
                      setSelectedRoute(value);
                      setSelectedBus('');
                      setBoardingStop('');
                      setDestinationStop('');
                    }}
                  >
                    <SelectTrigger id="route">
                      <SelectValue placeholder="Choose a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bus Selection */}
                {selectedRoute && (
                  <div className="space-y-2">
                    <Label htmlFor="bus">Select Bus</Label>
                    {routeBuses.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No buses currently running on this route
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid gap-3">
                        {routeBuses.map((bus) => (
                          <div
                            key={bus.id}
                            onClick={() => setSelectedBus(bus.id)}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedBus === bus.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <Bus className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-medium">{bus.busNumber}</div>
                                <div className="text-sm text-muted-foreground">
                                  {bus.scheduledDate && (() => {
                                    try {
                                      const date = parseISO(bus.scheduledDate);
                                      if (isNaN(date.getTime())) return null;
                                      return (
                                        <span className="block italic">
                                          {format(date, 'MMM d, yyyy')}
                                        </span>
                                      );
                                    } catch (e) {
                                      return null;
                                    }
                                  })()}
                                  {bus.scheduledTime ? `Scheduled: ${bus.scheduledTime}` : `Capacity: ${bus.capacity} seats`}
                                </div>
                                {bus.scheduledTime && (
                                  <div className="text-xs text-muted-foreground">
                                    Capacity: {bus.capacity} seats
                                  </div>
                                )}
                              </div>
                            </div>
                            <CrowdIndicator
                              passengerCount={bus.passengerCount}
                              capacity={bus.capacity}
                              size="sm"
                              showCount={false}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stop Selection */}
                {selectedBus && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="boarding">Boarding Stop</Label>
                      <Select value={boardingStop} onValueChange={setBoardingStop}>
                        <SelectTrigger id="boarding">
                          <SelectValue placeholder="Select stop" />
                        </SelectTrigger>
                        <SelectContent>
                          {routeStops.length > 0 ? (
                            routeStops
                              .map((stop, index) => ({ stop, index }))
                              .filter(({ index }) => {
                                const currentBus = routeBuses.find(b => b.id === selectedBus);
                                const busStopIndex = currentBus?.status === 'started' ? (currentBus?.currentStopIndex ?? -1) : -1;

                                // Boarding rules:
                                // 1. Cannot board at the very last stop
                                // 2. Cannot board at a stop the bus has already passed (if started)
                                return index < routeStops.length - 1 && index >= busStopIndex;
                              })
                              .map(({ stop }) => (
                                <SelectItem key={stop.id} value={stop.id}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    {stop.name}
                                  </div>
                                </SelectItem>
                              ))
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground font-medium">
                              {loading ? 'Synchronizing with database...' : 'No matching stops found for this route.'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination Stop</Label>
                      <Select
                        value={destinationStop}
                        onValueChange={setDestinationStop}
                        disabled={!boardingStop}
                      >
                        <SelectTrigger id="destination">
                          <SelectValue placeholder={boardingStop ? "Select destination" : "Select boarding first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDestinationStops.length > 0 ? (
                            availableDestinationStops.map((stop) => (
                              <SelectItem key={stop.id} value={stop.id}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {stop.name}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground font-medium">
                              {boardingStop ? "The bus is too far along this route to book these stops." : "Please select a boarding stop first."}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Ticket Count Selection */}
                {selectedBus && boardingStop && destinationStop && (
                  <div className="space-y-4 p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <Label htmlFor="ticketCount" className="font-medium">Number of Tickets</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                          disabled={ticketCount <= 1}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{ticketCount}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setTicketCount(Math.min(6, ticketCount + 1))}
                          disabled={ticketCount >= 6}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum 6 tickets allowed per booking.
                    </p>
                  </div>
                )}

                {/* Journey Summary */}
                {boardingStop && destinationStop && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-3">Journey Summary</h4>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-success" />
                        {stops.find((s) => s.id === boardingStop)?.name}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-destructive" />
                        {stops.find((s) => s.id === destinationStop)?.name}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Fare per ticket</span>
                        <span>₹{farePerTicket}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Tickets</span>
                        <span>x{ticketCount}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold">Total Fare</span>
                        <span className="text-xl font-bold text-primary">₹{totalFare}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!selectedBus || !boardingStop || !destinationStop || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Proceed to Payment - ₹{totalFare}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {/* Mock Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={(open) => !isSubmitting && setPaymentDialogOpen(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Secure Payment</DialogTitle>
              <DialogDescription>
                Complete your payment of ₹{totalFare} to book your {ticketCount} ticket{ticketCount > 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {paymentStatus === 'idle' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" className="h-16 flex-col gap-2 border-primary bg-primary/5">
                      <CreditCard className="h-5 w-5" />
                      <span className="text-[10px]">Card</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex-col gap-2 opacity-50 cursor-not-allowed">
                      <Wallet className="h-5 w-5" />
                      <span className="text-[10px]">UPI</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex-col gap-2 opacity-50 cursor-not-allowed">
                      <Smartphone className="h-5 w-5" />
                      <span className="text-[10px]">NetBanking</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Card Details</Label>
                    <Input placeholder="XXXX XXXX XXXX 4242" disabled value="•••• •••• •••• 4242" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="MM/YY" disabled value="12/25" />
                      <Input placeholder="CVV" disabled value="•••" />
                    </div>
                  </div>
                </div>
              ) : paymentStatus === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="font-medium animate-pulse">Processing Payment...</p>
                  <p className="text-xs text-muted-foreground">Please do not refresh the page</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-success" />
                  </div>
                  <p className="text-xl font-bold">Payment Success!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Your {ticketCount} ticket{ticketCount > 1 ? 's' : ''} for ₹{totalFare} {ticketCount > 1 ? 'have' : 'has'} been confirmed.
                  </p>
                </div>
              )}
            </div>

            {paymentStatus === 'idle' && (
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleProcessPayment}>
                  Pay ₹{totalFare}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout >
  );
}
