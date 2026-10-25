import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const venuePin = L.divIcon({
    className: 'booking-location-pin',
    html: '<span aria-hidden="true"></span>',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
});

function RecenterMap({ center }: { center: LatLngExpression }) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, Math.max(map.getZoom(), 16));
    }, [center, map]);

    return null;
}

type Props = {
    latitude: number;
    longitude: number;
    onMove: (latitude: number, longitude: number) => void;
};

export default function BookingLocationMap({ latitude, longitude, onMove }: Props) {
    const center: LatLngExpression = [latitude, longitude];

    return (
        <div className="overflow-hidden rounded-xl border border-[#d7c0a2]">
            <MapContainer
                center={center}
                zoom={16}
                scrollWheelZoom={false}
                className="h-[300px] w-full sm:h-[360px]"
                aria-label="Map to choose the venue location"
            >
                <RecenterMap center={center} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                <Marker
                    position={center}
                    icon={venuePin}
                    draggable
                    eventHandlers={{
                        dragend: (event) => {
                            const point = event.target.getLatLng();
                            onMove(point.lat, point.lng);
                        },
                    }}
                    title="Drag this pin to the venue"
                    alt="Venue location pin"
                />
            </MapContainer>
            <p className="bg-white px-3 py-2 text-xs text-[#62594f]">
                Drag the pin to the exact venue. Map data © OpenStreetMap contributors.
            </p>
        </div>
    );
}
