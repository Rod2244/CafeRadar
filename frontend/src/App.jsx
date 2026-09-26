import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Coffee, Compass, Map as MapIcon, MessageSquare, Settings } from 'lucide-react';
import { INITIAL_CAFES } from './data/mockdata';
import Header from './components/header';
import FilterBar from './components/filterbar';
import CafeCard from './components/cafecard';
import CafeDrawer from './components/cafedrawer';
import MapView from './components/mapview';
import ReviewModal from './components/reviewmodal';
import ProfileDrawer from './components/profiledrawer';
import SettingsView from './components/settingsview';
import AIAssistant from './components/aiassistant';
import RafaelChatWidget from './components/rafaelchatwidget';
import LandingPage from './components/landingpage';
import useRafaelChat from './hooks/useRafaelChat';
import './App.css';

const NAV_ITEMS = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'saved', label: 'Saved Cafes', icon: Bookmark },
  { id: 'map', label: 'Radar Map', icon: MapIcon },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const DISCOVER_RADIUS_METERS = 10000;

function distanceInMeters(first, second) {
  const earthRadius = 6371000;
  const latitudeDifference = ((second.lat - first.lat) * Math.PI) / 180;
  const longitudeDifference = ((second.lng - first.lng) * Math.PI) / 180;
  const latitudeOne = (first.lat * Math.PI) / 180;
  const latitudeTwo = (second.lat * Math.PI) / 180;
  const value = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getTabFromPath(pathname) {
  const tab = pathname.replace(/^\/+|\/+$/g, '');
  return NAV_ITEMS.some((item) => item.id === tab) ? tab : 'discover';
}

export default function App() {
  const rafaelChat = useRafaelChat();
  const [cafes, setCafes] = useState(INITIAL_CAFES);
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));
  const [viewMode, setViewMode] = useState(() => getTabFromPath(window.location.pathname) === 'map' ? 'map' : 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedCafeIds, setSavedCafeIds] = useState(new Set());
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [focusedCafe, setFocusedCafe] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Waiting for location access');
  const [reviewCafe, setReviewCafe] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(() => window.location.pathname === '/');
  const [filters, setFilters] = useState({ openNow: false, fastWifi: false, outlets: false, quiet: false, coffeeStyle: 'All' });

  useEffect(() => {
    if (showLanding || !['discover', 'saved', 'map', 'assistant'].includes(activeTab)) return undefined;
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocationStatus('Live location');
      },
      (error) => {
        setLocationStatus(error.code === 1 ? 'Location access denied' : 'Unable to update location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTab, showLanding]);

  const nearbyCafes = useMemo(() => {
    if (!userLocation) return activeTab === 'discover' ? [] : cafes;
    const cafesWithDistance = cafes.map((cafe) => {
      const distance = distanceInMeters(userLocation, cafe.coordinates);
      return { ...cafe, distance: distance < 100 ? '<0.1 km' : `${(distance / 1000).toFixed(1)} km` };
    });
    return activeTab === 'discover'
      ? cafesWithDistance.filter((cafe) => distanceInMeters(userLocation, cafe.coordinates) <= DISCOVER_RADIUS_METERS)
      : cafesWithDistance;
  }, [cafes, activeTab, userLocation]);

  const filteredCafes = useMemo(() => nearbyCafes.filter((cafe) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = [cafe.name, cafe.address, cafe.tagline].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (!filters.openNow || cafe.isOpen) && (!filters.fastWifi || cafe.wifiCategory === 'fast') && (!filters.outlets || cafe.outlets === 'Plentiful') && (!filters.quiet || cafe.noiseLevel === 'Quiet') && (filters.coffeeStyle === 'All' || cafe.coffeeStyles.includes(filters.coffeeStyle)) && (activeTab !== 'saved' || savedCafeIds.has(cafe.id));
  }), [nearbyCafes, searchQuery, filters, activeTab, savedCafeIds]);

  const assistantCafes = nearbyCafes.filter((cafe) => userLocation && distanceInMeters(userLocation, cafe.coordinates) <= DISCOVER_RADIUS_METERS);
  const savedCafes = cafes.filter((cafe) => savedCafeIds.has(cafe.id));

  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);
      setViewMode(tab === 'map' ? 'map' : 'grid');
      setShowLanding(window.location.pathname === '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'map') setViewMode('map');
    else if (tab === 'discover' || tab === 'saved') setViewMode('grid');
    if (window.location.pathname !== `/${tab}`) window.history.pushState({}, '', `/${tab}`);
  };

  const toggleSave = (event, id) => {
    event.stopPropagation();
    setSavedCafeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const navigateToCafe = (cafe) => {
    setFocusedCafe(cafe);
    selectTab('map');
    setSelectedCafe(null);
  };

  const submitReview = (event) => {
    event.preventDefault();
    if (!reviewText.trim() || !reviewCafe) return;
    const review = { id: `review-${Date.now()}`, author: 'You', rating: reviewRating, time: 'Just now', text: reviewText.trim() };
    setCafes((current) => current.map((cafe) => cafe.id === reviewCafe.id ? { ...cafe, reviews: [review, ...cafe.reviews], reviewCount: cafe.reviewCount + 1 } : cafe));
    setSelectedCafe((current) => current && current.id === reviewCafe.id ? { ...current, reviews: [review, ...current.reviews], reviewCount: current.reviewCount + 1 } : current);
    setReviewText('');
    setReviewCafe(null);
  };

  if (showLanding) return <LandingPage onEnter={() => { setShowLanding(false); selectTab('discover'); }} />;

  const displayedLocationStatus = typeof navigator !== 'undefined' && !navigator.geolocation
    ? 'Location is not supported by this browser'
    : locationStatus;

  return <div className="app-shell">
    <aside className="sidebar">
      <div>
        <div className="brand"><span className="brand-mark"><Coffee size={21} /></span><div><strong>CafeRadar</strong><small>Work-Ready Cafes</small></div></div>
        <nav>{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => selectTab(id)}><Icon size={16} /> {label}{id === 'saved' && savedCafeIds.size > 0 && <span className="nav-count">{savedCafeIds.size}</span>}</button>)}</nav>
      </div>
      <button className="profile" onClick={() => setIsProfileOpen(true)} aria-label="Open Jane Doe profile"><span>JD</span><div><strong>Jane Doe</strong><small>Digital Nomad</small></div><Settings size={14} /></button>
    </aside>
    <main className="main-content">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} viewMode={viewMode} setViewMode={setViewMode} onSelectTab={selectTab} />
      <div className="content-scroll">
        {activeTab === 'settings' ? <SettingsView /> : activeTab === 'assistant' ? <AIAssistant chat={rafaelChat} nearbyCafes={assistantCafes} savedCafes={savedCafes} userLocation={userLocation} /> : <>
          <FilterBar filters={filters} setFilters={setFilters} />
          {viewMode === 'grid' ? <section className="results">
            <div className="results-heading">
              <div><span className="eyebrow">Your workday, curated</span><h1>{activeTab === 'saved' ? 'Saved Spots' : 'Nearby Cafes'} <small>({filteredCafes.length} found)</small></h1></div>
              <span className="location-label">{activeTab === 'discover' ? displayedLocationStatus : 'Downtown radius'} <b>{activeTab === 'discover' ? '10 km' : '2 mi'}</b></span>
              {activeTab === 'discover' && <small className="osm-attribution">Cafe data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>}
            </div>
            {filteredCafes.length ? <div className="cafe-grid">{filteredCafes.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} isSaved={savedCafeIds.has(cafe.id)} onSelect={setSelectedCafe} onToggleSave={toggleSave} />)}</div> : <div className="empty-state">
              <Coffee size={36} />
              <h2>{activeTab === 'discover' && !userLocation ? displayedLocationStatus : 'No cafes match your filters'}</h2>
              <p>{activeTab === 'discover' && !userLocation ? 'Allow location access to find cafes near you.' : 'Try relaxing your search criteria or filter tags.'}</p>
            </div>}
          </section> : <MapView cafes={cafes} focusedCafe={focusedCafe} onClearFocusedCafe={() => setFocusedCafe(null)} onSelect={setSelectedCafe} />}
        </>}
      </div>
    </main>
    <RafaelChatWidget activeTab={activeTab} chat={rafaelChat} nearbyCafes={assistantCafes} savedCafes={savedCafes} userLocation={userLocation} />
    <CafeDrawer cafe={selectedCafe} isSaved={selectedCafe && savedCafeIds.has(selectedCafe.id)} onClose={() => setSelectedCafe(null)} onToggleSave={toggleSave} onAddReview={() => setReviewCafe(selectedCafe)} onNavigate={navigateToCafe} />
    <ReviewModal cafe={reviewCafe} rating={reviewRating} setRating={setReviewRating} text={reviewText} setText={setReviewText} onSubmit={submitReview} onClose={() => setReviewCafe(null)} />
    <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} savedCount={savedCafeIds.size} reviewCount={cafes.reduce((total, cafe) => total + cafe.reviews.filter((review) => review.author === 'You').length, 0)} />
  </div>;
}
