import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { Ticket } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Ticket as TicketIcon, DollarSign, Calendar, CreditCard, Banknote } from 'lucide-react';
import { startOfDay, startOfMonth, startOfYear, isWithinInterval, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const { data: tickets, loading } = useFirestoreCollection<Ticket>('tickets');

  const now = new Date();
  const periods = {
    today: { start: startOfDay(now), end: endOfDay(now) },
    month: { start: startOfMonth(now), end: now },
    year: { start: startOfYear(now), end: now },
  };

  const getStatsForPeriod = (start: Date, end: Date) => {
    const periodTickets = tickets.filter(t => {
      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();
      return isWithinInterval(date, { start, end });
    });

    const completed = periodTickets.filter(t => ['BOARDED', 'EXITED'].includes(t.status));
    const online = completed.filter(t => t.paymentMethod === 'online');
    const cash = completed.filter(t => t.paymentMethod === 'cash');

    return {
      totalTickets: periodTickets.length,
      completedCount: completed.length,
      revenue: completed.reduce((sum, t) => sum + (t.fare || 0), 0),
      onlineRevenue: online.reduce((sum, t) => sum + (t.fare || 0), 0),
      cashRevenue: cash.reduce((sum, t) => sum + (t.fare || 0), 0),
      onlineCount: online.length,
      cashCount: cash.length,
    };
  };

  const stats = {
    today: getStatsForPeriod(periods.today.start, periods.today.end),
    month: getStatsForPeriod(periods.month.start, periods.month.end),
    year: getStatsForPeriod(periods.year.start, periods.year.end),
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

  const renderStatCards = (s: typeof stats.today) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">₹{s.revenue.toLocaleString()}</div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1 text-primary"><CreditCard className="h-3 w-3" /> ₹{s.onlineRevenue}</span>
            <span className="flex items-center gap-1 text-orange-500"><Banknote className="h-3 w-3" /> ₹{s.cashRevenue}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Sold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.totalTickets}</div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-primary">{s.onlineCount} Online</span>
            <span className="text-orange-500">{s.cashCount} Offline</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Completed Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.completedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Passenger journeys</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Ticket Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{s.completedCount > 0 ? Math.round(s.revenue / s.completedCount) : 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Based on completed sales</p>
        </CardContent>
      </Card>
    </div>
  );

  const paymentData = (s: typeof stats.today) => [
    { name: 'Online', value: s.onlineRevenue, color: '#3b82f6' },
    { name: 'Cash', value: s.cashRevenue, color: '#f97316' },
  ].filter(d => d.value > 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Detailed ticket and revenue analytics</p>
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="today" className="px-6">Today</TabsTrigger>
            <TabsTrigger value="month" className="px-6">This Month</TabsTrigger>
            <TabsTrigger value="year" className="px-6">This Year</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {renderStatCards(stats.today)}
            <div className="grid lg:grid-cols-2 gap-6">
              <RevenueChart data={stats.today} title="Today's Revenue Mix" />
              <TicketVolume s={stats.today} title="Today's Sales Breakdown" />
            </div>
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            {renderStatCards(stats.month)}
            <div className="grid lg:grid-cols-2 gap-6">
              <RevenueChart data={stats.month} title="Monthly Revenue Mix" />
              <TicketVolume s={stats.month} title="Monthly Sales Breakdown" />
            </div>
          </TabsContent>

          <TabsContent value="year" className="space-y-6">
            {renderStatCards(stats.year)}
            <div className="grid lg:grid-cols-2 gap-6">
              <RevenueChart data={stats.year} title="Yearly Revenue Mix" />
              <TicketVolume s={stats.year} title="Yearly Sales Breakdown" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function RevenueChart({ data, title }: { data: any, title: string }) {
  const pieData = [
    { name: 'Online', value: data.onlineRevenue, color: '#3b82f6' },
    { name: 'Cash', value: data.cashRevenue, color: '#f97316' },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>Revenue split by payment method</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketVolume({ s, title }: { s: any, title: string }) {
  const barData = [
    { name: 'Online', count: s.onlineCount, color: '#3b82f6' },
    { name: 'Cash (Offline)', count: s.cashCount, color: '#f97316' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>Ticket volume by channel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
