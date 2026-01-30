import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { Ticket } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Ticket as TicketIcon, DollarSign } from 'lucide-react';

export default function Reports() {
  const { data: tickets, loading } = useFirestoreCollection<Ticket>('tickets');

  const completedTickets = tickets.filter((t) => ['BOARDED', 'EXITED'].includes(t.status));
  const totalRevenue = completedTickets.reduce((sum, t) => sum + (t.fare || 0), 0);

  const statusData = [
    { name: 'Confirmed', value: tickets.filter((t) => t.status === 'CONFIRMED').length, color: '#3b82f6' },
    { name: 'Boarded', value: tickets.filter((t) => t.status === 'BOARDED').length, color: '#22c55e' },
    { name: 'Exited', value: tickets.filter((t) => t.status === 'EXITED').length, color: '#6b7280' },
    { name: 'Cancelled', value: tickets.filter((t) => t.status === 'CANCELLED').length, color: '#ef4444' },
  ].filter((d) => d.value > 0);

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
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Ticket and revenue analytics</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{tickets.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold">{completedTickets.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No ticket data available</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
