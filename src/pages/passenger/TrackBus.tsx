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
import { where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function TrackBus() {
  const { data: buses, loading: busesLoading } = useBuses([where('status', 'in', ['active', 'started'])]);
  const { data: stops, loading: stopsLoading } = useStops();
  const { data: routes, loading: routesLoading } = useRoutes();
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loading = busesLoading || stopsLoading || routesLoading;

  const filteredBuses = buses.filter((bus) =>
    bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapCenter: [number, number] = selectedBus?.location
    ? [selectedBus.location.latitude, selectedBus.location.longitude]
    : [12.9716, 77.5946];

  const handleBusClick = (bus: Bus) => {
    setSelectedBus(bus);
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
            {/* Bus List */}
            <div className="lg:col-span-1 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by bus number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Bus Cards */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredBuses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No buses match your search' : 'No active buses'}
                  </div>
                ) : (
                  filteredBuses.map((bus) => (
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
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                {(() => {
                                  const route = routes.find(r => r.id === bus.routeId);
                                  const isLastStop = route && bus.currentStopIndex === route.stops.length - 1;
                                  if (isLastStop) return 'Destination Reached';
                                  return bus.status === 'started' ? 'Started' : 'Live';
                                })()}
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
                            <CrowdIndicator
                              passengerCount={bus.passengerCount}
                              capacity={bus.capacity}
                              size="sm"
                              showCount={false}
                            />
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

                        <CrowdProgress
                          passengerCount={bus.passengerCount}
                          capacity={bus.capacity}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

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
                      {buses.length} active bus{buses.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  {selectedBus && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBus(null)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear selection
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <BusMap
                    buses={buses}
                    stops={stops.map((s) => ({
                      id: s.id,
                      name: s.name,
                      location: s.location,
                    }))}
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
