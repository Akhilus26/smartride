import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Lock, User, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut as signOutOfSecondary } from 'firebase/auth';
import { auth, db, firebaseConfig } from '@/lib/firebase';
import { initializeApp } from 'firebase/app';
import { FirebaseError } from 'firebase/app';

/**
 * Page for Admin to create a new Conductor account.
 * Uses a secondary Firebase app instance to prevent the current Admin from being signed out.
 */
export default function CreateConductor() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateConductor = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Initialize a secondary app to handle creation without affecting primary auth session
        const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // 1. Create the Auth account on the secondary instance
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // Update the profile name on the secondary instance
            await updateProfile(user, { displayName });

            // 2. Create the Firestore profile (using the primary db instance is fine)
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName,
                role: 'conductor',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 3. Sign out of the secondary instance immediately
            await signOutOfSecondary(secondaryAuth);

            toast({
                title: 'Conductor Created',
                description: `Account for ${displayName} has been created successfully.`,
            });

            // Clear form
            setEmail('');
            setPassword('');
            setDisplayName('');

        } catch (err: any) {
            console.error('Error creating conductor:', err);
            let message = 'Failed to create conductor account';
            if (err instanceof FirebaseError) {
                if (err.code === 'auth/email-already-in-use') message = 'Email already in use';
                if (err.code === 'auth/weak-password') message = 'Password is too weak';
            }
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-xl mx-auto space-y-6">
                <Button variant="ghost" asChild className="mb-2">
                    <Link to="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Add New Conductor</h1>
                    <p className="text-muted-foreground">
                        Create a new account with conductor privileges
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Conductor Details
                        </CardTitle>
                        <CardDescription>
                            Enter the credentials for the new conductor. They will be able to log in immediately.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleCreateConductor}>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="e.g. John Doe"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="conductor@smartbus.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-9"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20">
                                    <Shield className="h-4 w-4 text-warning" />
                                    <span className="text-sm font-medium text-warning">Conductor</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Conductor Account'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </Layout>
    );
}
