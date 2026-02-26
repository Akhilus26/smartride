import React from 'react';
import { Navbar } from './Navbar';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const passengerNavItems = [
  { label: 'Dashboard', href: '/passenger' },
  { label: 'Track Bus', href: '/passenger/track' },
  { label: 'Book Ticket', href: '/passenger/book' },
  { label: 'My Tickets', href: '/passenger/tickets' },
  { label: 'Notifications', href: '/passenger/notifications' },
];

const conductorNavItems = [
  { label: 'Dashboard', href: '/conductor' },
  { label: 'QR Scanner', href: '/conductor/scanner' },
  { label: 'Stop Management', href: '/conductor/stops' },
];

const adminNavItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Fleet Status', href: '/admin/fleet' },
  { label: 'Buses', href: '/admin/buses' },
  { label: 'Routes', href: '/admin/routes' },
  { label: 'Stops', href: '/admin/stops' },
  { label: 'Live Monitor', href: '/admin/monitor' },
  { label: 'Reports', href: '/admin/reports' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Add Conductor', href: '/admin/conductors/new' },
  { label: 'Notifications', href: '/admin/notifications' },
];

export function Layout({ children }: LayoutProps) {
  const { userProfile } = useAuth();

  const getNavItems = () => {
    switch (userProfile?.role) {
      case 'admin':
        return adminNavItems;
      case 'conductor':
        return conductorNavItems;
      case 'passenger':
        return passengerNavItems;
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar navItems={getNavItems()} />
      <main className="container py-6">{children}</main>
    </div>
  );
}
