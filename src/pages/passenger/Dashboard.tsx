import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuses, useRoutes, useActiveTickets } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { BusMap } from '@/components/BusMap';
import { CrowdIndicator } from '@/components/CrowdIndicator';
import {
  MapPin,
  Ticket,
  Navigation,
  Clock,
  Bus,
  Loader2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { where } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PassengerDashboard() {
  const { userProfile } = useAuth();
  const { data: buses, loading: busesLoading } = useBuses([where('status', 'in', ['active', 'started'])]);
  const { data: routes, loading: routesLoading } = useRoutes([where('isActive', '==', true)]);
  const { data: activeTickets, loading: ticketsLoading } = useActiveTickets(userProfile?.uid || '');

  const loading = busesLoading || routesLoading || ticketsLoading;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {userProfile?.displayName?.split(' ')[0] || 'Passenger'}!
            </h1>
            <p className="text-muted-foreground">Track buses and manage your tickets</p>
          </div>
          <Button asChild>
            <Link to="/passenger/book">
              <Ticket className="mr-2 h-4 w-4" />
              Book Ticket
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Buses
                  </CardTitle>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{buses.length}</div>
                  <p className="text-xs text-muted-foreground">Currently running</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Routes
                  </CardTitle>
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{routes.length}</div>
                  <p className="text-xs text-muted-foreground">Active routes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    My Active Tickets
                  </CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTickets.length}</div>
                  <p className="text-xs text-muted-foreground">Pending & boarded</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Wait Time
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {buses.length > 0 ? '~5 min' : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Estimated</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Tickets Alert */}
            {activeTickets.length > 0 && (
              <Alert>
                <Ticket className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    You have {activeTickets.length} active ticket{activeTickets.length > 1 ? 's' : ''}
                  </span>
                  <Button variant="link" size="sm" asChild className="p-0 h-auto">
                    <Link to="/passenger/tickets">
                      View tickets <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Live Bus Map */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live Bus Tracking</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time locations of all active buses
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/passenger/track">
                    Full Map <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {buses.length > 0 ? (
                  <BusMap buses={buses} height="350px" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium">No Active Buses</h3>
                    <p className="text-sm text-muted-foreground">
                      There are currently no buses running. Check back later.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Buses List */}
            {buses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Nearby Buses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {buses.slice(0, 5).map((bus) => (
                      <div
                        key={bus.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Bus className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{bus.busNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {(() => {
                                const route = routes.find(r => r.id === bus.routeId);
                                const isLastStop = route && bus.currentStopIndex === route.stops.length - 1;
                                if (isLastStop) return 'Destination Reached';
                                return bus.status === 'started' ? 'Started' : bus.status === 'active' ? 'In Service' : 'Idle';
                              })()}
                            </div>
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
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
