import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
// reusing the fix from BusMap or doing it locally if BusMap's isn't global enough (it usually is if imported once, but safe to repeat or import)
// To keep it simple and self-contained, I'll re-apply the fix or assume it handles itself if the app has run it. 
// Better to ensure it works isolated.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerMapProps {
    initialLocation?: { latitude: number; longitude: number };
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string;
}

function LocationMarker({
    position,
    setPosition,
    onLocationSelect
}: {
    position: L.LatLng | null,
    setPosition: (pos: L.LatLng) => void,
    onLocationSelect: (lat: number, lng: number) => void
}) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            // map.flyTo(position, map.getZoom()); // Optional: Auto-center on external update
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} />
    );
}

// Component to handle external center updates and ensure map is properly sized
function MapControl({ center }: { center: L.LatLngExpression | null }) {
    const map = useMap();

    useEffect(() => {
        // Fix for map not rendering correctly in dialogs/tabs
        const timer = setTimeout(() => {
            map.invalidateSize();
            if (center) {
                map.setView(center, map.getZoom());
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [center, map]);

    return null;
}

export function LocationPickerMap({
    initialLocation,
    onLocationSelect,
    height = '300px'
}: LocationPickerMapProps) {
    // Default to Bangalore or a safe default if no initial location
    const defaultCenter: L.LatLngExpression = [12.9716, 77.5946];

    const [position, setPosition] = useState<L.LatLng | null>(
        initialLocation && !isNaN(initialLocation.latitude) && !isNaN(initialLocation.longitude)
            ? new L.LatLng(initialLocation.latitude, initialLocation.longitude)
            : null
    );

    useEffect(() => {
        if (initialLocation && !isNaN(initialLocation.latitude) && !isNaN(initialLocation.longitude)) {
            // Only update if the values actually changed to avoid infinite loops with inline objects
            const currentLat = position?.lat;
            const currentLng = position?.lng;

            if (currentLat !== initialLocation.latitude || currentLng !== initialLocation.longitude) {
                setPosition(new L.LatLng(initialLocation.latitude, initialLocation.longitude));
            }
        }
    }, [initialLocation?.latitude, initialLocation?.longitude]);

    const center = position || defaultCenter;

    return (
        <div className="rounded-md overflow-hidden border border-input shadow-sm" style={{ height }}>
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                    position={position}
                    setPosition={setPosition}
                    onLocationSelect={onLocationSelect}
                />
                {position && <MapControl center={position} />}
            </MapContainer>
        </div>
    );
}
