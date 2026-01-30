import React, { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useConductorBus, useStops } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Camera,
  RefreshCw,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function QRScanner() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { bus, loading: busLoading } = useConductorBus(userProfile?.uid || '');
  const { data: stops } = useStops();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    ticket?: Ticket;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const getStopName = (stopId: string) => {
    return stops.find((s) => s.id === stopId)?.name || stopId;
  };

  const startScanner = () => {
    setIsScanning(true);
    setScanResult(null);

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => handleScan(decodedText),
          (error) => {
            // Ignore scan errors as they happen frequently
          }
        );
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = async (ticketId: string) => {
    if (processing || !bus) return;
    
    setProcessing(true);
    stopScanner();

    try {
      // Fetch ticket from Firestore
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        setScanResult({
          success: false,
          message: 'Ticket not found. Invalid QR code.',
        });
        setProcessing(false);
        return;
      }

      const ticket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;

      // Validate ticket
      if (ticket.busId !== bus.id) {
        setScanResult({
          success: false,
          message: 'This ticket is for a different bus.',
          ticket,
        });
        setProcessing(false);
        return;
      }

      if (ticket.status === 'BOARDED') {
        setScanResult({
          success: false,
          message: 'This ticket has already been scanned.',
          ticket,
        });
        setProcessing(false);
        return;
      }

      if (!['CONFIRMED', 'PENDING'].includes(ticket.status)) {
        setScanResult({
          success: false,
          message: `Ticket is ${ticket.status.toLowerCase()}. Cannot board.`,
          ticket,
        });
        setProcessing(false);
        return;
      }

      // Update ticket status to BOARDED
      await updateDoc(ticketRef, {
        status: 'BOARDED',
        boardedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Increment passenger count
      const busRef = doc(db, 'buses', bus.id);
      await updateDoc(busRef, {
        passengerCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      setScanResult({
        success: true,
        message: 'Passenger boarded successfully!',
        ticket: { ...ticket, status: 'BOARDED' },
      });

      toast({
        title: 'Passenger Boarded',
        description: `Ticket ${ticketId.slice(-8).toUpperCase()} validated.`,
      });
    } catch (err: any) {
      console.error('Error processing ticket:', err);
      setScanResult({
        success: false,
        message: err.message || 'Failed to process ticket',
      });
    }

    setProcessing(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (busLoading) {
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No bus assigned. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">QR Scanner</h1>
          <p className="text-muted-foreground">
            Scan passenger ticket QR codes to verify boarding
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Ticket Scanner
                </CardTitle>
                <CardDescription>
                  Point the camera at a passenger's QR code
                </CardDescription>
              </div>
              <Badge variant="outline">
                Bus: {bus.busNumber}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner Area */}
            {isScanning ? (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={stopScanner}
                >
                  Cancel Scan
                </Button>
              </div>
            ) : (
              <Button
                className="w-full h-32 flex-col gap-2"
                onClick={startScanner}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-8 w-8" />
                    <span>Tap to Start Scanning</span>
                  </>
                )}
              </Button>
            )}

            {/* Scan Result */}
            {scanResult && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  scanResult.success
                    ? 'bg-success/10 border-success'
                    : 'bg-destructive/10 border-destructive'
                }`}
              >
                <div className="flex items-start gap-3">
                  {scanResult.success ? (
                    <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {scanResult.success ? 'Success!' : 'Scan Failed'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.message}
                    </p>

                    {scanResult.ticket && (
                      <div className="mt-3 p-3 rounded-md bg-background/50">
                        <div className="text-xs text-muted-foreground mb-1">
                          Ticket #{scanResult.ticket.id.slice(-8).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-success" />
                          <span>{getStopName(scanResult.ticket.boardingStop)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <MapPin className="h-3 w-3 text-destructive" />
                          <span>{getStopName(scanResult.ticket.destinationStop)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  variant={scanResult.success ? 'default' : 'outline'}
                  onClick={startScanner}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scan Another
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
