import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStops } from '@/hooks/useFirestore';
import { Stop } from '@/types';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  Navigation
} from 'lucide-react';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function ManageStops() {
  const { toast } = useToast();
  const { data: stops, loading } = useStops();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredStops = stops.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', address: '', latitude: '', longitude: '' });
    setEditingStop(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (stop: Stop) => {
    setEditingStop(stop);
    setFormData({
      name: stop.name,
      address: stop.address || '',
      latitude: stop.location.latitude.toString(),
      longitude: stop.location.longitude.toString(),
    });
    setDialogOpen(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
          toast({ title: 'Location Retrieved', description: 'Current GPS coordinates added.' });
        },
        (error) => {
          let errorMessage = error.message;
          if (error.code === error.PERMISSION_DENIED) {
            if (!window.isSecureContext) {
              errorMessage = 'Geolocation requires a secure connection (HTTPS). Browsers block location access when using a local IP over HTTP.';
            } else {
              errorMessage = 'Location access was denied. Please allow location permissions in your browser settings and try again.';
            }
          }
          toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.latitude || !formData.longitude) {
      toast({ title: 'Validation Error', description: 'Please provide valid latitude and longitude.', variant: 'destructive' });
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: 'Validation Error', description: 'Invalid coordinates. Please check your input.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const stopData = {
        name: formData.name,
        address: formData.address,
        location: {
          latitude: lat,
          longitude: lng,
        },
        routeIds: editingStop?.routeIds || [],
        updatedAt: serverTimestamp(),
      };

      if (editingStop) {
        const stopRef = doc(db, 'stops', editingStop.id);
        await updateDoc(stopRef, stopData);
        toast({ title: 'Stop Updated', description: `${formData.name} has been updated.` });
      } else {
        await addDoc(collection(db, 'stops'), {
          ...stopData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Stop Added', description: `${formData.name} has been added.` });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (stopId: string) => {
    try {
      await deleteDoc(doc(db, 'stops', stopId));
      toast({ title: 'Stop Deleted', description: 'The stop has been removed.' });
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
            <h1 className="text-2xl font-bold">Manage Stops</h1>
            <p className="text-muted-foreground">Add and manage bus stops</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stop
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-1">No Stops Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'No stops match your search' : 'Get started by adding a stop'}
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Stop
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStops.map((stop) => (
              <Card key={stop.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15 text-warning">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{stop.name}</h3>
                      {stop.address && (
                        <p className="text-sm text-muted-foreground truncate">{stop.address}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {stop.location?.latitude?.toFixed(4) || '0.0000'}, {stop.location?.longitude?.toFixed(4) || '0.0000'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(stop)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(stop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStop ? 'Edit Stop' : 'Add New Stop'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Stop Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Central Station"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Location Coordinates</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={getCurrentLocation}>
                    <Navigation className="h-4 w-4 mr-1" />
                    Use Current
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 mb-2">
                    <LocationPickerMap
                      initialLocation={
                        (formData.latitude && formData.longitude &&
                          !isNaN(parseFloat(formData.latitude)) &&
                          !isNaN(parseFloat(formData.longitude)))
                          ? {
                            latitude: parseFloat(formData.latitude),
                            longitude: parseFloat(formData.longitude),
                          }
                          : undefined
                      }
                      onLocationSelect={(lat, lng) =>
                        setFormData({
                          ...formData,
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="12.9716"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="77.5946"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingStop ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Stop?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              This action cannot be undone. Routes using this stop will need to be updated.
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
