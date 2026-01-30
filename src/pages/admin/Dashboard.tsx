import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBuses, useRoutes, useStops, useFirestoreCollection } from '@/hooks/useFirestore';
import { Ticket, Bus as BusType, getCrowdLevel, Route as RouteType } from '@/types';
import {
  Bus,
  Route,
  MapPin,
  Ticket as TicketIcon,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Activity,
  Clock,
  ArrowRight,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { subDays, isWithinInterval, startOfDay, endOfDay, format, parseISO } from 'date-fns';

export default function AdminDashboard() {
  const { data: buses, loading: busesLoading } = useBuses();
  const { data: routes, loading: routesLoading } = useRoutes();
  const { data: stops, loading: stopsLoading } = useStops();
  const { data: tickets, loading: ticketsLoading } = useFirestoreCollection<Ticket>('tickets');

  const loading = busesLoading || routesLoading || stopsLoading || ticketsLoading;

  // Process data for analytics
  const now = new Date();
  const today = { start: startOfDay(now), end: endOfDay(now) };
  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);

  const getTicketsInInterval = (start: Date, end: Date) => {
    return tickets.filter(t => {
      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();
      return isWithinInterval(date, { start, end });
    });
  };

  const todayTickets = getTicketsInInterval(today.start, today.end);
  const weeklyTickets = getTicketsInInterval(weekAgo, now);
  const monthlyTickets = getTicketsInInterval(monthAgo, now);

  const totalRevenue = tickets
    .filter((t) => ['BOARDED', 'EXITED'].includes(t.status))
    .reduce((sum, t) => sum + (t.fare || 0), 0);

  // Route-wise distribution
  const routeDistribution = routes.map(route => ({
    name: route.name,
    count: tickets.filter(t => t.routeId === route.id).length
  })).sort((a, b) => b.count - a.count);

  const topRoutes = routeDistribution.slice(0, 3);

  // Peak Hours Analysis (all time)
  const hourCounts = Array(24).fill(0);
  tickets.forEach(ticket => {
    if (ticket.createdAt) {
      const hour = ticket.createdAt.toDate().getHours();
      hourCounts[hour]++;
    }
  });

  const peakHourData = hourCounts.map((count, hour) => ({
    hour: `${hour}:00`,
    count
  }));

  const maxHour = peakHourData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), { hour: 'N/A', count: 0 });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      title: 'Today\'s Tickets',
      value: todayTickets.length,
      subtitle: `${todayTickets.filter(t => t.status === 'BOARDED').length} currently boarded`,
      icon: TicketIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Weekly Sales',
      value: weeklyTickets.length,
      subtitle: 'Last 7 days',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Monthly Total',
      value: monthlyTickets.length,
      subtitle: 'Last 30 days',
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Active Buses',
      value: buses.filter(b => b.status === 'active').length,
      subtitle: 'On road now',
      icon: Bus,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and fleet management
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/reports">
                Detailed Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/monitor">
                <Activity className="mr-2 h-4 w-4" />
                Live Monitor
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 text-primary-foreground">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Commeting out charts as requested */}
        {/*
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ticket Distribution (Global)</CardTitle>
              <CardDescription>Number of tickets booked per route</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peak Booking Time</CardTitle>
              <CardDescription>Hour-wise booking frequency</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="relative h-48 w-48 flex items-center justify-center">
                <div className="absolute inset-0 border-8 border-primary/10 rounded-full" />
                <div className="text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-3xl font-bold">{maxHour.hour}</div>
                  <div className="text-xs text-muted-foreground">Peak booking window</div>
                </div>
              </div>
              <div className="w-full space-y-2 mt-4 text-primary-foreground">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Top Performing Route</span>
                  <span className="font-bold">{topRoutes[0]?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average Daily Fare</span>
                  <span className="font-bold">₹{Math.round(totalRevenue / Math.max(tickets.length / 10, 1))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        */}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Management</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/buses">
                  <Bus className="h-6 w-6 text-primary" />
                  <div className="text-sm font-semibold">Buses</div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/routes">
                  <Route className="h-6 w-6 text-info" />
                  <div className="text-sm font-semibold">Routes</div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/stops">
                  <MapPin className="h-6 w-6 text-warning" />
                  <div className="text-sm font-semibold">Stops</div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 border-primary/30 hover:bg-primary/5">
                <Link to="/admin/conductors/new">
                  <Users className="h-6 w-6 text-primary" />
                  <div className="text-sm font-semibold text-primary">Add Conductor</div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/users">
                  <ShieldCheck className="h-6 w-6 text-accent" />
                  <div className="text-sm font-semibold">All Users</div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Active Buses Snapshot */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Fleet</CardTitle>
                <CardDescription>Live status of buses on road</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/monitor" className="text-primary hover:underline">
                  View Map
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {buses.filter(b => b.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No buses currently active
                </div>
              ) : (
                <div className="space-y-4">
                  {buses
                    .filter((b) => b.status === 'active')
                    .slice(0, 4)
                    .map((bus) => {
                      const crowdLevel = getCrowdLevel(bus.passengerCount, bus.capacity);
                      return (
                        <div key={bus.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Bus className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{bus.busNumber}</div>
                              <div className="text-xs text-muted-foreground">Capacity: {bus.capacity}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-bold">{bus.passengerCount}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Onboard</div>
                            </div>
                            <div className={cn(
                              "w-2 h-8 rounded-full",
                              crowdLevel === 'low' ? 'bg-success' : crowdLevel === 'medium' ? 'bg-warning' : 'bg-destructive'
                            )} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
