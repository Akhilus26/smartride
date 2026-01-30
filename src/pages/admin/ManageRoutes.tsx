import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRoutes, useStops } from '@/hooks/useFirestore';
import { Route, Stop } from '@/types';
import { 
  Route as RouteIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Search,
  MapPin
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export default function ManageRoutes() {
  const { toast } = useToast();
  const { data: routes, loading: routesLoading } = useRoutes();
  const { data: stops } = useStops();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fare: '25',
    estimatedDuration: '30',
    isActive: true,
    stops: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loading = routesLoading;

  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      fare: '25',
      estimatedDuration: '30',
      isActive: true,
      stops: [],
    });
    setEditingRoute(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description || '',
      fare: route.fare.toString(),
      estimatedDuration: route.estimatedDuration.toString(),
      isActive: route.isActive,
      stops: route.stops,
    });
    setDialogOpen(true);
  };

  const handleStopToggle = (stopId: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, stops: [...formData.stops, stopId] });
    } else {
      setFormData({ ...formData, stops: formData.stops.filter((s) => s !== stopId) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingRoute) {
        const routeRef = doc(db, 'routes', editingRoute.id);
        await updateDoc(routeRef, {
          name: formData.name,
          description: formData.description,
          fare: parseFloat(formData.fare),
          estimatedDuration: parseInt(formData.estimatedDuration),
          isActive: formData.isActive,
          stops: formData.stops,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Route Updated', description: `${formData.name} has been updated.` });
      } else {
        await addDoc(collection(db, 'routes'), {
          name: formData.name,
          description: formData.description,
          fare: parseFloat(formData.fare),
          estimatedDuration: parseInt(formData.estimatedDuration),
          isActive: formData.isActive,
          stops: formData.stops,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Route Added', description: `${formData.name} has been added.` });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (routeId: string) => {
    try {
      await deleteDoc(doc(db, 'routes', routeId));
      toast({ title: 'Route Deleted', description: 'The route has been removed.' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getStopNames = (stopIds: string[]) => {
    return stopIds
      .map((id) => stops.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(' → ');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Routes</h1>
            <p className="text-muted-foreground">
              Create and manage bus routes
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-12">
            <RouteIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-1">No Routes Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'No routes match your search' : 'Get started by adding a route'}
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Route
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRoutes.map((route) => (
              <Card key={route.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15 text-info">
                        <RouteIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{route.name}</h3>
                          <Badge
                            variant="outline"
                            className={
                              route.isActive
                                ? 'bg-success/15 text-success'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {route.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {route.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {route.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Fare: <strong>₹{route.fare}</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Duration: <strong>{route.estimatedDuration} min</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Stops: <strong>{route.stops.length}</strong>
                          </span>
                        </div>
                        {route.stops.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {getStopNames(route.stops)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(route)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteConfirm(route.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Route Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Route A - Downtown"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fare">Fare (₹)</Label>
                  <Input
                    id="fare"
                    type="number"
                    value={formData.fare}
                    onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Route</Label>
              </div>
              <div className="space-y-2">
                <Label>Select Stops (in order)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {stops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stops available. Add stops first.</p>
                  ) : (
                    stops.map((stop) => (
                      <div key={stop.id} className="flex items-center gap-2">
                        <Checkbox
                          id={stop.id}
                          checked={formData.stops.includes(stop.id)}
                          onCheckedChange={(checked) => handleStopToggle(stop.id, !!checked)}
                        />
                        <Label htmlFor={stop.id} className="text-sm font-normal cursor-pointer">
                          {stop.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRoute ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Route?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              This action cannot be undone. Buses assigned to this route will need to be reassigned.
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
