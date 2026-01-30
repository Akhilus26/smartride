import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, getCrowdLevel, getCrowdLevelBg } from '@/types';
import { cn } from '@/lib/utils';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon
const createBusIcon = (crowdLevel: 'low' | 'medium' | 'high') => {
  const colors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        background-color: ${colors[crowdLevel]};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0">
          <path d="M8 6v6h8V6H8zm10-4H6c-1.1 0-2 .9-2 2v12c0 .55.23 1.05.59 1.41L6 16v1c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-1h2v1c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-1l1.41 1.41c.36-.36.59-.86.59-1.41V4c0-1.1-.9-2-2-2zm0 12H6V4h12v10z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Custom stop icon
const stopIcon = L.divIcon({
  className: 'custom-stop-marker',
  html: `
    <div style="
      background-color: #1e40af;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">
      <div style="
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

interface BusMapProps {
  buses: Bus[];
  stops?: { id: string; name: string; location: { latitude: number; longitude: number } }[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onBusClick?: (bus: Bus) => void;
  onStopClick?: (stopId: string) => void;
  selectedBusId?: string;
}

// Component to handle map control and ensure proper sizing
function MapControl({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;

    // Force Leaflet to recalculate its container size
    map.invalidateSize();

    // Smoothly focus on the new center if it changed
    map.flyTo(center, map.getZoom(), {
      animate: true,
      duration: 1.5
    });
  }, [center[0], center[1], map]); // Use individual coordinates to avoid array reference issues

  return null;
}

export function BusMap({
  buses,
  stops = [],
  center = [12.9716, 77.5946], // Default to Bangalore
  zoom = 13,
  height = '400px',
  onBusClick,
  onStopClick,
  selectedBusId,
}: BusMapProps) {
  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapControl center={center} />

        {/* Stop Markers */}
        {stops
          .filter((stop) => stop.location && stop.location.latitude && stop.location.longitude)
          .map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.location.latitude, stop.location.longitude]}
              icon={stopIcon}
              eventHandlers={{
                click: () => onStopClick?.(stop.id),
              }}
            >
              <Popup>
                <div className="font-medium">{stop.name}</div>
              </Popup>
            </Marker>
          ))}

        {/* Bus Markers */}
        {buses
          .filter((bus) => bus.location && bus.location.latitude && bus.location.longitude)
          .map((bus) => {
            const crowdLevel = getCrowdLevel(bus.passengerCount, bus.capacity);
            return (
              <Marker
                key={bus.id}
                position={[bus.location!.latitude, bus.location!.longitude]}
                icon={createBusIcon(crowdLevel)}
                eventHandlers={{
                  click: () => onBusClick?.(bus),
                }}
              >
                <Popup>
                  <div className="p-1">
                    <div className="font-bold text-lg">{bus.busNumber}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getCrowdLevelBg(crowdLevel))}>
                        {crowdLevel.toUpperCase()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {bus.passengerCount}/{bus.capacity}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {bus.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
