import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { LocateFixed, Radar, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchDrivingRoute } from '../services/routing';
import 'leaflet/dist/leaflet.css';

const PHILIPPINES_CENTER = [12.8797, 121.774];
const MANILA_FALLBACK = [14.5995, 120.9842];
const MAXIMUM_RADAR_DISTANCE = 5000;

function MapCenterUpdater({ location, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(location, zoom, { animate: true });
  }, [location, map, zoom]);

  return null;
}

function RouteViewport({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route?.coordinates.length) {
      map.fitBounds(route.coordinates, { padding: [48, 48], maxZoom: 16, animate: true });
    }
  }, [map, route]);

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

export default function MapView({ cafes, focusedCafe, onClearFocusedCafe, onSelect }) {
  const [range, setRange] = useState(MAXIMUM_RADAR_DISTANCE);
  const [location, setLocation] = useState(MANILA_FALLBACK);
  const [hasCurrentLocation, setHasCurrentLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [routeAttempt, setRouteAttempt] = useState(0);
  const [locationStatus, setLocationStatus] = useState(() => typeof navigator !== 'undefined' && navigator.geolocation ? 'Detecting your location...' : 'Location unavailable, showing Manila');

  const findUser = () => {
    onClearFocusedCafe();

    if (!navigator.geolocation) {
      setLocationStatus('Location is not supported by this browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation([coords.latitude, coords.longitude]);
        setHasCurrentLocation(true);
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
        setHasCurrentLocation(true);
        setLocationStatus('Using your current location');
      },
      () => setLocationStatus('Location permission denied, showing Manila'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const routeKey = focusedCafe && hasCurrentLocation
    ? `${focusedCafe.id}:${location[0].toFixed(4)}:${location[1].toFixed(4)}:${routeAttempt}`
    : null;

  useEffect(() => {
    if (!focusedCafe || !hasCurrentLocation) return undefined;

    const controller = new AbortController();
    const requestKey = `${focusedCafe.id}:${location[0].toFixed(4)}:${location[1].toFixed(4)}:${routeAttempt}`;
    const destination = focusedCafe.coordinates;

    fetchDrivingRoute({
      origin: { lat: location[0], lng: location[1] },
      destination,
      signal: controller.signal,
    }).then((result) => {
      if (!controller.signal.aborted) setRoute({ ...result, key: requestKey });
    }).catch((error) => {
      if (!controller.signal.aborted) setRouteError({ key: requestKey, message: error.message });
    });

    return () => controller.abort();
  }, [focusedCafe, hasCurrentLocation, location, routeAttempt]);

  const mapCenter = focusedCafe ? [focusedCafe.coordinates.lat, focusedCafe.coordinates.lng] : location;
  const cafesToShow = focusedCafe && !cafes.some((cafe) => cafe.id === focusedCafe.id) ? [...cafes, focusedCafe] : cafes;
  const visibleCafes = cafesToShow.filter((cafe) => distanceInMeters(location, [cafe.coordinates.lat, cafe.coordinates.lng]) <= range);
  const activeRoute = route?.key === routeKey ? route : null;
  const activeRouteError = routeError?.key === routeKey ? routeError.message : null;
  const isRouteLoading = Boolean(focusedCafe && hasCurrentLocation && !activeRoute && !activeRouteError);

  const formatDistance = (meters) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  const formatDuration = (seconds) => {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`;
  };

  return <section className="map-view real-map-view">
    <MapContainer center={PHILIPPINES_CENTER} zoom={6} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapCenterUpdater location={mapCenter} zoom={focusedCafe ? 16 : 14} />
      <Circle center={location} radius={range} pathOptions={{ color: '#ffb21a', fillColor: '#ffb21a', fillOpacity: 0.08, weight: 2 }} />
      <CircleMarker center={location} radius={8} pathOptions={{ color: '#fff', fillColor: '#2f9bff', fillOpacity: 1, weight: 3 }}><Popup><strong>{locationStatus}</strong></Popup></CircleMarker>
      {visibleCafes.map((cafe) => <CircleMarker key={cafe.id} center={[cafe.coordinates.lat, cafe.coordinates.lng]} radius={10} pathOptions={{ color: '#ffb21a', fillColor: '#111827', fillOpacity: 1, weight: 3 }} eventHandlers={{ click: () => onSelect(cafe) }}><Popup><strong>{cafe.name}</strong><br />{cafe.wifiSpeed} · {cafe.noiseLevel}</Popup></CircleMarker>)}
      {activeRoute && <>
        <Polyline positions={activeRoute.coordinates} pathOptions={{ color: '#0d2635', weight: 10, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }} />
        <Polyline positions={activeRoute.coordinates} pathOptions={{ color: '#38d4ed', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
        <CircleMarker center={activeRoute.coordinates.at(-1)} radius={7} pathOptions={{ color: '#fff', fillColor: '#ffb21a', fillOpacity: 1, weight: 3 }}><Popup><strong>Destination: {focusedCafe.name}</strong></Popup></CircleMarker>
        <RouteViewport route={activeRoute} />
      </>}
    </MapContainer>
    <button className="find-me-button" onClick={findUser} disabled={isLocating}><LocateFixed size={15} /> {isLocating ? 'Locating...' : 'Find me'}</button>
    {focusedCafe && <aside className="route-panel" aria-live="polite">
      <div className="route-panel-heading"><span>Driving route</span><button type="button" onClick={onClearFocusedCafe} title="Clear route" aria-label="Clear route"><X size={15} /></button></div>
      <strong className="route-destination">{focusedCafe.name}</strong>
      {!hasCurrentLocation ? <p>{locationStatus.includes('denied') || locationStatus.includes('Could not') ? 'Enable location access, then tap Find me.' : 'Waiting for your current location...'}</p> : isRouteLoading ? <p>Finding the best route...</p> : activeRouteError ? <div className="route-error"><p>{activeRouteError}</p><button type="button" onClick={() => setRouteAttempt((attempt) => attempt + 1)}><RefreshCw size={13} /> Try again</button></div> : activeRoute && <div className="route-stats"><strong>{formatDistance(activeRoute.distanceMeters)}</strong><span>{formatDuration(activeRoute.durationSeconds)} by car</span></div>}
      <small>Route provided by OSRM · Map data © OpenStreetMap</small>
    </aside>}
    <div className="map-caption real-map-caption"><strong><LocateFixed size={13} /> Philippines live map</strong><span>{locationStatus}</span><small>{visibleCafes.length} cafe{visibleCafes.length === 1 ? '' : 's'} within {range.toLocaleString()} m</small></div>
    <div className="radar-control"><div className="radar-control-heading"><span><Radar size={15} /> Scan radius</span><strong>{range.toLocaleString()} m</strong></div><input type="range" min="10" max={MAXIMUM_RADAR_DISTANCE} step="10" value={range} onChange={(event) => setRange(Number(event.target.value))} aria-label="Radar scan radius in meters" /><div className="range-labels"><span>10 m</span><span>5,000 m</span></div></div>
  </section>;
}
