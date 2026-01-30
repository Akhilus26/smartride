import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Shield, Loader2 } from 'lucide-react';

export default function Profile() {
    const { userProfile } = useAuth();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [phone, setPhone] = useState(userProfile?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;

        setIsSubmitting(true);
        try {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, {
                displayName,
                phone,
                updatedAt: serverTimestamp(),
            });

            toast({
                title: 'Profile Updated',
                description: 'Your profile details have been successfully updated.',
            });
        } catch (err: any) {
            console.error('Error updating profile:', err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your personal information and account settings
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Personal Information
                        </CardTitle>
                        <CardDescription>
                            Update your basic information below. Email cannot be changed.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUpdateProfile}>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        value={userProfile?.email || ''}
                                        disabled
                                        className="pl-9 bg-muted/50"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Email is linked to your authentication and cannot be modified.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="Enter your full name"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        placeholder="Enter your phone number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Account Role</Label>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-dashed">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium capitalize">{userProfile?.role}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    'Save Profile'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </Layout>
    );
}
