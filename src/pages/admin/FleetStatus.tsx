import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBuses, useRoutes, useFirestoreCollection } from '@/hooks/useFirestore';
import { Bus, Ticket, getCrowdLevelColor } from '@/types';
import {
    Bus as BusIcon,
    ArrowRight,
    Loader2,
    Activity,
    MapPin,
    Clock,
    BarChart3,
    ChevronRight,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { startOfDay, startOfMonth, startOfYear, isWithinInterval } from 'date-fns';

export default function FleetStatus() {
    const { data: buses, loading: busesLoading } = useBuses();
    const { data: routes } = useRoutes();
    const { data: tickets } = useFirestoreCollection<Ticket>('tickets');

    const loading = busesLoading;

    const getBusStats = (busId: string) => {
        const busTickets = tickets.filter(t => t.busId === busId && ['BOARDED', 'EXITED'].includes(t.status));
        const now = new Date();

        const todayTickets = busTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfDay(now), end: now }));
        const monthTickets = busTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfMonth(now), end: now }));
        const yearTickets = busTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfYear(now), end: now }));

        return {
            todayRevenue: todayTickets.reduce((sum, t) => sum + (t.fare || 0), 0),
            monthRevenue: monthTickets.reduce((sum, t) => sum + (t.fare || 0), 0),
            yearRevenue: yearTickets.reduce((sum, t) => sum + (t.fare || 0), 0),
        };
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Fleet Status</h1>
                        <p className="text-muted-foreground">Monitor real-time status and performance of all buses</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-success" />
                            <span>{buses.filter(b => b.status === 'started' || b.status === 'active').length} Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                            <span>{buses.filter(b => b.status === 'idle').length} Idle</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {buses.map((bus) => {
                        const route = routes.find(r => r.id === bus.routeId);
                        const busStats = getBusStats(bus.id);
                        const statusLabel = bus.status === 'started' ? 'On Trip' : bus.status === 'idle' ? 'Idle' : bus.status === 'maintenance' ? 'Maintenance' : bus.status;

                        return (
                            <Card key={bus.id} className="group hover:border-primary/50 transition-all overflow-hidden">
                                <CardHeader className="pb-3 border-b bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <BusIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{bus.busNumber}</CardTitle>
                                                <CardDescription className="line-clamp-1">{route?.name || 'No assigned route'}</CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={cn(
                                            "capitalize",
                                            bus.status === 'started' ? "bg-success/15 text-success hover:bg-success/20" :
                                                bus.status === 'maintenance' ? "bg-destructive/15 text-destructive hover:bg-destructive/20" :
                                                    "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}>
                                            {bus.hazard && <AlertTriangle className="h-3 w-3 mr-1" />}
                                            {statusLabel}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-3 gap-2 py-1">
                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Today</div>
                                            <div className="font-bold text-sm">₹{busStats.todayRevenue}</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Month</div>
                                            <div className="font-bold text-sm">₹{busStats.monthRevenue}</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-muted/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Year</div>
                                            <div className="font-bold text-sm">₹{busStats.yearRevenue}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm px-1">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            <span>{bus.passengerCount} Onboard</span>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 hover:bg-primary/10 hover:text-primary">
                                            <Link to={`/admin/fleet/${bus.id}`}>
                                                View Details <ChevronRight className="h-4 w-4 ml-1" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}
