import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBus, useRoute, useFirestoreCollection } from '@/hooks/useFirestore';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Bus as BusIcon,
    ArrowLeft,
    Loader2,
    User,
    MapPin,
    Calendar,
    Clock,
    TrendingUp,
    Users,
    DollarSign,
    Ticket as TicketIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ticket, UserProfile } from '@/types';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { startOfDay, startOfMonth, startOfYear, isWithinInterval } from 'date-fns';

export default function BusDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: bus, loading: busLoading } = useBus(id || null);
    const { data: route } = useRoute(bus?.routeId || null);
    const { data: tickets, loading: ticketsLoading } = useFirestoreCollection<Ticket>('tickets', [where('busId', '==', id || '')]);
    const { data: users } = useFirestoreCollection<UserProfile>('users', [where('role', '==', 'conductor')]);

    const loading = busLoading || ticketsLoading;
    const conductor = users.find(u => u.uid === bus?.conductorId);

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
                <div className="text-center py-12">
                    <h2 className="text-xl font-bold">Bus not found</h2>
                    <Button variant="link" onClick={() => navigate('/admin/fleet')}>Back to Fleet</Button>
                </div>
            </Layout>
        );
    }

    const completedTickets = tickets.filter(t => ['BOARDED', 'EXITED'].includes(t.status));
    const now = new Date();

    const todayStats = {
        revenue: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfDay(now), end: now })).reduce((sum, t) => sum + (t.fare || 0), 0),
        tickets: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfDay(now), end: now })).length
    };

    const monthStats = {
        revenue: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfMonth(now), end: now })).reduce((sum, t) => sum + (t.fare || 0), 0),
        tickets: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfMonth(now), end: now })).length
    };

    const yearStats = {
        revenue: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfYear(now), end: now })).reduce((sum, t) => sum + (t.fare || 0), 0),
        tickets: completedTickets.filter(t => t.createdAt && isWithinInterval(t.createdAt.toDate(), { start: startOfYear(now), end: now })).length
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/fleet')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{bus.busNumber} Report</h1>
                        <p className="text-muted-foreground">Detailed activity and performance logs</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        {/* Bus Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Bus Profile</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <BusIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground font-medium uppercase text-[10px]">Status</div>
                                        <Badge className={cn(
                                            "capitalize",
                                            bus.status === 'started' ? "bg-success/15 text-success" :
                                                bus.status === 'maintenance' ? "bg-destructive/15 text-destructive" :
                                                    "bg-muted text-muted-foreground"
                                        )}>
                                            {bus.status === 'started' ? 'On Trip' : bus.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center gap-3 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <span className="text-muted-foreground">Route:</span>
                                            <p className="font-semibold">{route?.name || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <span className="text-muted-foreground">Conductor:</span>
                                            <p className="font-semibold">{conductor?.displayName || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <span className="text-muted-foreground">Current Occupancy:</span>
                                            <p className="font-semibold">{bus.passengerCount} / {bus.capacity}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Snapshot Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/10">
                                    <div className="text-sm font-medium">Today's Total</div>
                                    <div className="text-lg font-bold text-success">₹{todayStats.revenue}</div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                                    <div className="text-sm font-medium">This Month</div>
                                    <div className="text-lg font-bold text-primary">₹{monthStats.revenue}</div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-muted border">
                                    <div className="text-sm font-medium">Year To Date</div>
                                    <div className="text-lg font-bold">₹{yearStats.revenue}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {/* History Table */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Recent Activity History</CardTitle>
                                    <CardDescription>Latest ticket bookings and boarding events</CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{tickets.length}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Events</div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    {tickets.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">No recent activity found</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {tickets.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 10).map((ticket) => (
                                                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-full flex items-center justify-center",
                                                            ticket.status === 'BOARDED' ? "bg-success/10 text-success" :
                                                                ticket.status === 'EXITED' ? "bg-slate-100 text-slate-600" :
                                                                    "bg-blue-50 text-blue-600"
                                                        )}>
                                                            <TicketIcon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold">{ticket.status}</div>
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {ticket.createdAt ? format(ticket.createdAt.toDate(), 'PP p') : 'Unknown time'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold">₹{ticket.fare}</div>
                                                        <div className="text-[10px] capitalize text-muted-foreground">{ticket.paymentMethod} payment</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
