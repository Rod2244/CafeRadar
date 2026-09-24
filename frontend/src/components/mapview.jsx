import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { LocateFixed, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const PHILIPPINES_CENTER = [12.8797, 121.774];
const MANILA_FALLBACK = [14.5995, 120.9842];
const MAXIMUM_RADAR_DISTANCE = 5000;

function MapCenterUpdater({ location }) {
  const map = useMap();

  useEffect(() => {
    map.setView(location, location === PHILIPPINES_CENTER ? 6 : 14, { animate: true });
  }, [location, map]);

  return null;
}

function distanceInMeters(first, second) {
  const earthRadius = 6371000;
  const latitudeDifference = ((second[0] - first[0]) * Math.PI) / 180;
  const longitudeDifference = ((second[1] - first[1]) * Math.PI) / 180;
  const latitudeOne = (first[0] * Math.PI) / 180;
  const latitudeTwo = (second[0] * Math.PI) / 180;
  const value = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function MapView({ cafes, onSelect }) {
  const [range, setRange] = useState(100);
  const [location, setLocation] = useState(MANILA_FALLBACK);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(() => typeof navigator !== 'undefined' && navigator.geolocation ? 'Detecting your location...' : 'Location unavailable, showing Manila');

  const findUser = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location is not supported by this browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation([coords.latitude, coords.longitude]);
        setLocationStatus('Using your current location');
        setIsLocating(false);
      },
      () => {
        setLocationStatus('Could not access your location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation([coords.latitude, coords.longitude]);
        setLocationStatus('Using your current location');
      },
      () => setLocationStatus('Location permission denied, showing Manila'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const visibleCafes = cafes.filter((cafe) => distanceInMeters(location, [cafe.coordinates.lat, cafe.coordinates.lng]) <= range);

  return <section className="map-view real-map-view">
    <MapContainer center={PHILIPPINES_CENTER} zoom={6} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapCenterUpdater location={location} />
      <Circle center={location} radius={range} pathOptions={{ color: '#ffb21a', fillColor: '#ffb21a', fillOpacity: 0.08, weight: 2 }} />
      <CircleMarker center={location} radius={8} pathOptions={{ color: '#fff', fillColor: '#2f9bff', fillOpacity: 1, weight: 3 }}><Popup><strong>{locationStatus}</strong></Popup></CircleMarker>
      {visibleCafes.map((cafe) => <CircleMarker key={cafe.id} center={[cafe.coordinates.lat, cafe.coordinates.lng]} radius={10} pathOptions={{ color: '#ffb21a', fillColor: '#111827', fillOpacity: 1, weight: 3 }} eventHandlers={{ click: () => onSelect(cafe) }}><Popup><strong>{cafe.name}</strong><br />{cafe.wifiSpeed} · {cafe.noiseLevel}</Popup></CircleMarker>)}
    </MapContainer>
    <button className="find-me-button" onClick={findUser} disabled={isLocating}><LocateFixed size={15} /> {isLocating ? 'Locating...' : 'Find me'}</button>
    <div className="map-caption real-map-caption"><strong><LocateFixed size={13} /> Philippines live map</strong><span>{locationStatus}</span><small>{visibleCafes.length} cafe{visibleCafes.length === 1 ? '' : 's'} within {range.toLocaleString()} m</small></div>
    <div className="radar-control"><div className="radar-control-heading"><span><Radar size={15} /> Scan radius</span><strong>{range.toLocaleString()} m</strong></div><input type="range" min="10" max={MAXIMUM_RADAR_DISTANCE} step="10" value={range} onChange={(event) => setRange(Number(event.target.value))} aria-label="Radar scan radius in meters" /><div className="range-labels"><span>10 m</span><span>5,000 m</span></div></div>
  </section>;
}
