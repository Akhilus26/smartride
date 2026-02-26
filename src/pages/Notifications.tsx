import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNotifications, useBuses, useConductorBus } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { AppNotification } from '@/types';
import {
    Bell,
    AlertTriangle,
    Clock,
    Bus as BusIcon,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { where, orderBy, QueryConstraint } from 'firebase/firestore';

export default function NotificationsPage() {
    const { userProfile } = useAuth();

    const { bus: conductorBus, loading: busLoading } = useConductorBus(userProfile?.role === 'conductor' ? userProfile.uid : '');

    // Filter notifications based on role
    // Admins see all, passengers see hazard/trip_completed, conductors see their bus only
    const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc')
    ];

    if (userProfile?.role === 'passenger') {
        constraints.push(where('type', 'in', ['hazard', 'trip_completed']));
    } else if (userProfile?.role === 'conductor') {
        // Conductors ONLY see incidents for their assigned bus
        if (conductorBus?.id) {
            constraints.push(where('busId', '==', conductorBus.id));
            constraints.push(where('type', '==', 'incident'));
        } else {
            // If no bus assigned/loading, ensure no notifications are shown
            // Using a dummy where clause that will never match
            constraints.push(where('busId', '==', 'NON_EXISTENT_BUS_ID'));
        }
    }

    const { data: notifications, loading: notificationsLoading } = useNotifications(constraints, [userProfile?.role, conductorBus?.id]);
    const { data: buses } = useBuses();

    const loading = notificationsLoading || busLoading;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'hazard':
                return <AlertTriangle className="h-5 w-5 text-destructive" />;
            case 'incident':
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            case 'overspeed':
                return <AlertCircle className="h-5 w-5 text-orange-500" />;
            case 'trip_completed':
                return <CheckCircle2 className="h-5 w-5 text-success" />;
            default:
                return <Bell className="h-5 w-5 text-primary" />;
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    <p className="text-muted-foreground">
                        Stay updated with the latest alerts and activities
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">No notifications yet</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                When important events happen, you'll see them here.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification: AppNotification) => {
                            const bus = buses.find(b => b.id === notification.busId);
                            return (
                                <Card key={notification.id} className={cn(
                                    "transition-all hover:shadow-md",
                                    !notification.isRead && "border-l-4 border-l-primary"
                                )}>
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-grow space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold capitalize flex items-center gap-2">
                                                        {notification.type.replace('_', ' ')}
                                                        {notification.status === 'resolved' && (
                                                            <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold uppercase">
                                                                Resolved
                                                            </span>
                                                        )}
                                                        {bus && (
                                                            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                                                                <BusIcon className="h-3 w-3" />
                                                                {bus.busNumber}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {notification.createdAt ? format(notification.createdAt.toDate(), 'PPp') : 'Just now'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground">
                                                    {notification.message}
                                                </p>
                                                {(notification.type === 'hazard' || notification.type === 'incident') && (notification.hazardReason || notification.hazardOtherReason) && (
                                                    <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                                                        <span className="font-semibold">Reason: </span>
                                                        <span className="capitalize">{notification.hazardReason === 'others' ? notification.hazardOtherReason : notification.hazardReason}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
