import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveTickets, useCompletedTickets, useStops } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket } from '@/types';
import QRCode from 'react-qr-code';
import { 
  Ticket as TicketIcon, 
  MapPin, 
  Clock, 
  QrCode, 
  Loader2,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function MyTickets() {
  const { userProfile } = useAuth();
  const { data: activeTickets, loading: activeLoading } = useActiveTickets(userProfile?.uid || '');
  const { data: completedTickets, loading: completedLoading } = useCompletedTickets(userProfile?.uid || '');
  const { data: stops } = useStops();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const loading = activeLoading || completedLoading;

  const getStopName = (stopId: string) => {
    return stops.find((s) => s.id === stopId)?.name || stopId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">Pending</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-info/15 text-info border-info/30">Confirmed</Badge>;
      case 'BOARDED':
        return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Boarded</Badge>;
      case 'EXITED':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const handleShowQR = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setQrDialogOpen(true);
  };

  const TicketCard = ({ ticket, showQR = false }: { ticket: Ticket; showQR?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TicketIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-mono text-sm text-muted-foreground">
                #{ticket.id.slice(-8).toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(ticket.createdAt)}
              </div>
            </div>
          </div>
          {getStatusBadge(ticket.status)}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">From</div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-success" />
              <span className="text-sm font-medium">{getStopName(ticket.boardingStop)}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">To</div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-destructive" />
              <span className="text-sm font-medium">{getStopName(ticket.destinationStop)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-lg font-bold">₹{ticket.fare}</div>
          {showQR && ['CONFIRMED', 'PENDING'].includes(ticket.status) && (
            <Button size="sm" onClick={() => handleShowQR(ticket)}>
              <QrCode className="h-4 w-4 mr-2" />
              Show QR
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground">
            View and manage your bus tickets
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Active ({activeTickets.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed ({completedTickets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeTickets.length === 0 ? (
                <div className="text-center py-12">
                  <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No Active Tickets</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You don't have any active tickets at the moment
                  </p>
                  <Button asChild>
                    <a href="/passenger/book">Book a Ticket</a>
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} showQR />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedTickets.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No Completed Tickets</h3>
                  <p className="text-sm text-muted-foreground">
                    Your completed trips will appear here
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Your Ticket QR Code</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode
                    value={selectedTicket.id}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-center">
                  <div className="font-mono text-sm text-muted-foreground">
                    #{selectedTicket.id.slice(-8).toUpperCase()}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                    <span>{getStopName(selectedTicket.boardingStop)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{getStopName(selectedTicket.destinationStop)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Show this QR code to the conductor when boarding
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
