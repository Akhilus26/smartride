import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useBuses, useRoutes, useFirestoreCollection } from '@/hooks/useFirestore';
import { Bus, UserProfile } from '@/types';
import {
  Bus as BusIcon,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { CrowdIndicator } from '@/components/CrowdIndicator';

export default function ManageBuses() {
  const { toast } = useToast();
  const { data: buses, loading: busesLoading } = useBuses();
  const { data: routes } = useRoutes();
  const { data: conductors } = useFirestoreCollection<UserProfile>('users', [where('role', '==', 'conductor')]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    busNumber: '',
    routeId: '',
    conductorId: '',
    capacity: '50',
    status: 'idle',
    scheduledTime: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loading = busesLoading;

  const filteredBuses = buses.filter((bus) =>
    bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      busNumber: '',
      routeId: '',
      conductorId: '',
      capacity: '50',
      status: 'idle',
      scheduledTime: '',
    });
    setEditingBus(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber,
      routeId: bus.routeId || '',
      conductorId: bus.conductorId || '',
      capacity: bus.capacity.toString(),
      status: bus.status || 'idle',
      scheduledTime: bus.scheduledTime || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingBus) {
        // Update existing bus
        const busRef = doc(db, 'buses', editingBus.id);
        await updateDoc(busRef, {
          busNumber: formData.busNumber,
          routeId: formData.routeId || null,
          conductorId: formData.conductorId || null,
          capacity: parseInt(formData.capacity),
          status: formData.status,
          scheduledTime: formData.scheduledTime || null,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Bus Updated', description: `${formData.busNumber} has been updated.` });
      } else {
        // Add new bus
        await addDoc(collection(db, 'buses'), {
          busNumber: formData.busNumber,
          routeId: formData.routeId || null,
          conductorId: formData.conductorId || null,
          capacity: parseInt(formData.capacity),
          passengerCount: 0,
          status: formData.status,
          scheduledTime: formData.scheduledTime || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Bus Added', description: `${formData.busNumber} has been added.` });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (busId: string) => {
    try {
      await deleteDoc(doc(db, 'buses', busId));
      toast({ title: 'Bus Deleted', description: 'The bus has been removed.' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Buses</h1>
            <p className="text-muted-foreground">
              Add, edit, and manage bus fleet
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bus
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="text-center py-12">
            <BusIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-1">No Buses Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'No buses match your search' : 'Get started by adding a bus'}
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Bus
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuses.map((bus) => {
              const route = routes.find((r) => r.id === bus.routeId);
              const conductor = conductors.find((c) => c.uid === bus.conductorId);

              return (
                <Card key={bus.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <BusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{bus.busNumber}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              ['active', 'started'].includes(bus.status)
                                ? 'bg-success/15 text-success'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {bus.status === 'started' ? 'On Trip' : bus.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Route: </span>
                      <span className="font-medium">{route?.name || 'Not assigned'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Conductor: </span>
                      <span className="font-medium">{conductor?.displayName || 'Not assigned'}</span>
                    </div>
                    {bus.scheduledTime && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Scheduled: </span>
                        <span className="font-medium">{bus.scheduledTime}</span>
                      </div>
                    )}
                    <CrowdIndicator
                      passengerCount={bus.passengerCount}
                      capacity={bus.capacity}
                      size="sm"
                    />
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(bus)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setDeleteConfirm(bus.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="busNumber">Bus Number</Label>
                <Input
                  id="busNumber"
                  value={formData.busNumber}
                  onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                  placeholder="e.g., BUS-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Scheduled Time (Optional)</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route">Route (Optional)</Label>
                <Select
                  value={formData.routeId}
                  onValueChange={(value) => setFormData({ ...formData, routeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conductor">Conductor (Optional)</Label>
                <Select
                  value={formData.conductorId}
                  onValueChange={(value) => setFormData({ ...formData, conductorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign a conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {conductors.map((conductor) => (
                      <SelectItem key={conductor.uid} value={conductor.uid}>
                        {conductor.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starting">Starting</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBus ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bus?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the bus.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
