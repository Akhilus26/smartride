import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { UserProfile } from '@/types';
import {
    Users,
    Search,
    Trash2,
    Loader2,
    Mail,
    User as UserIcon,
    ShieldCheck,
    Calendar
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function ManageUsers() {
    const { toast } = useToast();
    const { data: users, loading } = useFirestoreCollection<UserProfile>('users');

    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredUsers = users.filter((user) =>
        (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (user: UserProfile) => {
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'users', user.uid));
            toast({
                title: 'User Deleted',
                description: `User ${user.displayName || user.email} has been permanently removed.`
            });
            setDeleteConfirm(null);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setIsDeleting(false);
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">
                        View and manage all registered users in the system
                    </p>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium mb-1">No Users Found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? 'No users match your search' : 'No users registered yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredUsers.map((user) => (
                            <Card key={user.uid} className="overflow-hidden">
                                <CardHeader className="pb-3 flex flex-row items-center space-x-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <UserIcon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">
                                            {user.displayName || 'Anonymous User'}
                                        </CardTitle>
                                        <Badge variant="outline" className="mt-1">
                                            {user.role}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-muted-foreground gap-2">
                                            <Mail className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{user.email || 'No email provided'}</span>
                                        </div>
                                        {user.createdAt && (
                                            <div className="flex items-center text-muted-foreground gap-2">
                                                <Calendar className="h-4 w-4 shrink-0" />
                                                <span>Joined: {format(new Date(user.createdAt.toDate()), 'MMM dd, yyyy')}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-muted-foreground gap-2">
                                            <ShieldCheck className="h-4 w-4 shrink-0" />
                                            <span>UID: {user.uid.substring(0, 8)}...</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            className="w-full text-destructive hover:bg-destructive hover:text-white"
                                            onClick={() => setDeleteConfirm(user)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Permanently Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation */}
                <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Permanent Deletion</DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                            <p className="text-muted-foreground">
                                Are you sure you want to delete <span className="font-bold text-foreground">{deleteConfirm?.displayName || deleteConfirm?.email}</span>?
                            </p>
                            <p className="text-sm text-destructive mt-2 font-medium">
                                This action is irreversible and will remove all associated user data.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
