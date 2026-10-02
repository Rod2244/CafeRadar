import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Coffee, Compass, Map as MapIcon, MessageSquare, Settings } from 'lucide-react';
import { fetchNearbyCafes, fetchSavedCafes, submitCafeCheckin, updateCafeSaved } from './services/cafes';
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
import { clearStoredSession, getStoredSession, restoreSession, signOut, storeSession } from './services/auth';
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
  const [cafes, setCafes] = useState([]);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));
  const [viewMode, setViewMode] = useState(() => getTabFromPath(window.location.pathname) === 'map' ? 'map' : 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedCafeIds, setSavedCafeIds] = useState(new Set());
  const [savedCafeRecords, setSavedCafeRecords] = useState([]);
  const [savingCafeIds, setSavingCafeIds] = useState(new Set());
  const [savedCafeError, setSavedCafeError] = useState('');
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [focusedCafe, setFocusedCafe] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Waiting for location access');
  const [reviewCafe, setReviewCafe] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [showLanding, setShowLanding] = useState(() => window.location.pathname === '/');
  const [authReady, setAuthReady] = useState(false);
  const [filters, setFilters] = useState({ openNow: false, fastWifi: false, outlets: false, quiet: false, coffeeStyle: 'All' });

  useEffect(() => {
    let isMounted = true;
    setAuthReady(false);

    restoreSession()
      .then((result) => {
        if (!isMounted) return;

        const user = result?.user || null;
        setAuthenticatedUser(user);

        if (!user && window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }

        setShowLanding(!user || window.location.pathname === '/');
      })
      .catch(() => {
        if (isMounted) {
          setAuthenticatedUser(null);
          setShowLanding(true);
          if (window.location.pathname !== '/') {
            window.history.replaceState({}, '', '/');
          }
        }
      })
      .finally(() => {
        if (isMounted) setAuthReady(true);
      });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const session = getStoredSession();
    if (!authenticatedUser || !session?.access_token) return undefined;

    let isMounted = true;
    const controller = new AbortController();
    fetchSavedCafes(session.access_token, controller.signal)
      .then((records) => {
        if (!isMounted) return;
        setSavedCafeRecords(records);
        setSavedCafeIds(new Set(records.map((cafe) => cafe.id)));
        setSavedCafeError('');
      })
      .catch((error) => {
        if (isMounted && error.name !== 'AbortError') setSavedCafeError(error.message);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authenticatedUser]);

  useEffect(() => {
    if (!authReady || !authenticatedUser || showLanding || !['discover', 'saved', 'map', 'assistant'].includes(activeTab)) return undefined;
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const nextLocation = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation((previousLocation) => (
          previousLocation && distanceInMeters(previousLocation, nextLocation) < 250
            ? previousLocation
            : nextLocation
        ));
        setLocationStatus('Live location');
      },
      (error) => {
        setLocationStatus(error.code === 1 ? 'Location access denied' : 'Unable to update location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTab, authReady, authenticatedUser, showLanding]);

  useEffect(() => {
    if (!userLocation) {
      setCafes([]);
      return undefined;
    }

    let isMounted = true;
    const controller = new AbortController();

    const loadNearbyCafes = async () => {
      setIsLoadingCafes(true);
      try {
        const nearby = await fetchNearbyCafes({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: 10000,
          signal: controller.signal,
        });

        if (isMounted) {
          setCafes(nearby);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Could not fetch nearby cafes:', error);
        }
        if (isMounted) {
          setCafes([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCafes(false);
        }
      }
    };

    loadNearbyCafes();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [userLocation]);

  const cafeRecords = useMemo(() => {
    const recordsById = new Map(savedCafeRecords.map((cafe) => [cafe.id, cafe]));
    cafes.forEach((cafe) => recordsById.set(cafe.id, cafe));
    return [...recordsById.values()];
  }, [cafes, savedCafeRecords]);

  const nearbyCafes = useMemo(() => {
    if (!userLocation) return activeTab === 'discover' ? [] : cafeRecords;

    const cafesWithDistance = cafeRecords
      .map((cafe) => {
        const meters = distanceInMeters(userLocation, cafe.coordinates);
        return {
          ...cafe,
          _distanceMeters: meters,
          distance: meters < 100 ? '<0.1 km' : `${(meters / 1000).toFixed(1)} km`,
        };
      })
      .sort((first, second) => first._distanceMeters - second._distanceMeters);

    return activeTab === 'discover'
      ? cafesWithDistance.filter((cafe) => cafe._distanceMeters <= DISCOVER_RADIUS_METERS)
      : cafesWithDistance;
  }, [cafeRecords, activeTab, userLocation]);

  const filteredCafes = useMemo(() => nearbyCafes.filter((cafe) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = [cafe.name, cafe.address, cafe.tagline].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (!filters.openNow || cafe.isOpen) && (!filters.fastWifi || cafe.hasWifi) && (!filters.outlets || cafe.hasOutlets) && (!filters.quiet || cafe.noiseLevel === 'Quiet') && (filters.coffeeStyle === 'All' || cafe.coffeeStyles.includes(filters.coffeeStyle)) && (activeTab !== 'saved' || savedCafeIds.has(cafe.id));
  }), [nearbyCafes, searchQuery, filters, activeTab, savedCafeIds]);

  const assistantCafes = nearbyCafes.filter((cafe) => userLocation && distanceInMeters(userLocation, cafe.coordinates) <= DISCOVER_RADIUS_METERS);
  const savedCafes = savedCafeRecords;

  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      const isRootRoute = window.location.pathname === '/';
      setActiveTab(tab);
      setViewMode(tab === 'map' ? 'map' : 'grid');

      if (!authenticatedUser && !isRootRoute) {
        window.history.replaceState({}, '', '/');
        setShowLanding(true);
        return;
      }

      setShowLanding(isRootRoute && !authenticatedUser);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticatedUser]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
    if (tab === 'map') setViewMode('map');
    else if (tab === 'discover' || tab === 'saved') setViewMode('grid');
    if (window.location.pathname !== `/${tab}`) window.history.pushState({}, '', `/${tab}`);
  };

  const handleAuthenticated = ({ user, session }) => {
    storeSession(session);
    setAuthenticatedUser(user);
    setShowLanding(false);
    selectTab('discover');
  };

  const handleProfileUpdated = ({ user, session }) => {
    if (session) storeSession(session);
    setAuthenticatedUser(user);
  };

  const handleSignOut = async () => {
    const session = getStoredSession();
    try {
      if (session?.access_token) await signOut(session.access_token);
    } catch {
      // Clear the local session even if the backend cannot be reached.
    } finally {
      clearStoredSession();
      setAuthenticatedUser(null);
      setSavedCafeIds(new Set());
      setSavedCafeRecords([]);
      setSavedCafeError('');
      setIsProfileOpen(false);
      setShowLanding(true);
      window.history.replaceState({}, '', '/');
    }
  };

  const toggleSave = async (event, id) => {
    event?.stopPropagation();
    if (savingCafeIds.has(id)) return;

    const saved = !savedCafeIds.has(id);
    const session = getStoredSession();
    if (!session?.access_token) {
      setSavedCafeError('Your session has expired. Please sign in again.');
      return;
    }

    const cafe = [...cafes, ...savedCafeRecords, selectedCafe].find((item) => item?.id === id);
    setSavingCafeIds((current) => new Set(current).add(id));
    setSavedCafeError('');
    try {
      await updateCafeSaved({ cafeId: id, saved, accessToken: session.access_token });
      setSavedCafeIds((current) => {
        const next = new Set(current);
        if (saved) next.add(id); else next.delete(id);
        return next;
      });
      setSavedCafeRecords((current) => {
        if (!saved) return current.filter((item) => item.id !== id);
        if (!cafe) return current;
        return [cafe, ...current.filter((item) => item.id !== id)];
      });
    } catch (error) {
      setSavedCafeError(error.message || 'Could not update your saved cafes.');
    } finally {
      setSavingCafeIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const navigateToCafe = (cafe) => {
    setFocusedCafe(cafe);
    selectTab('map');
    setSelectedCafe(null);
  };

  const handleCafeCheckin = async (cafeId, businessLevel) => {
    const session = getStoredSession();
    if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');

    const result = await submitCafeCheckin({ cafeId, businessLevel, accessToken: session.access_token });
    const aggregate = result ? {
      busyness: result.business_level,
      checkinCount: Number(result.checkin_count) || 0,
      tagline: result.business_level
        ? `Community reports this cafe is ${result.business_level.replace('_', ' ')}.`
        : 'Cafe listing from OpenStreetMap. No recent busyness reports.',
    } : {};
    setCafes((current) => current.map((cafe) => cafe.id === cafeId ? { ...cafe, ...aggregate } : cafe));
    setSelectedCafe((current) => current?.id === cafeId ? { ...current, ...aggregate } : current);
    return result;
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

  if (!authReady) return <div className="auth-check-screen" aria-busy="true"><div className="auth-check-card" role="status" aria-live="polite"><span className="auth-loading-spinner" aria-hidden="true" />Loading CafeRadar...</div></div>;
  if (!authenticatedUser || showLanding) return <LandingPage onEnter={() => { setShowLanding(false); selectTab('discover'); }} onAuthenticated={handleAuthenticated} />;

  const profileName = authenticatedUser?.user_metadata?.full_name || authenticatedUser?.email?.split('@')[0] || 'Jane Doe';
  const profileInitials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const displayedLocationStatus = typeof navigator !== 'undefined' && !navigator.geolocation
    ? 'Location is not supported by this browser'
    : locationStatus;

  return <div className={`app-shell ${isMobileNavOpen || isProfileOpen ? 'nav-open' : ''}`}>
    <button className={`mobile-nav-backdrop ${isMobileNavOpen ? 'visible' : ''}`} type="button" aria-label="Close navigation drawer" onClick={() => setIsMobileNavOpen(false)} />
    <aside className={`sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
      <div>
        <div className="brand"><span className="brand-mark"><Coffee size={21} /></span><div><strong>CafeRadar</strong><small>Work-Ready Cafes</small></div></div>
        <nav>{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => selectTab(id)}><Icon size={16} /> {label}{id === 'saved' && savedCafeIds.size > 0 && <span className="nav-count">{savedCafeIds.size}</span>}</button>)}</nav>
      </div>
      <button className="profile" onClick={() => { setIsProfileOpen(true); setIsMobileNavOpen(false); }} aria-label={`Open ${profileName} profile`}><span>{profileInitials}</span><div><strong>{profileName}</strong><small>{authenticatedUser?.email || 'Digital Nomad'}</small></div><Settings size={14} /></button>
    </aside>
    <main className="main-content">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} viewMode={viewMode} setViewMode={setViewMode} onSelectTab={selectTab} onToggleSidebar={() => setIsMobileNavOpen((current) => !current)} isMobileNavOpen={isMobileNavOpen} />
      <div className="content-scroll">
        {activeTab === 'settings' ? <SettingsView key={authenticatedUser?.id || 'guest'} user={authenticatedUser} onProfileUpdated={handleProfileUpdated} /> : activeTab === 'assistant' ? <AIAssistant chat={rafaelChat} nearbyCafes={assistantCafes} savedCafes={savedCafes} userLocation={userLocation} userInitials={profileInitials} /> : <>
          <FilterBar filters={filters} setFilters={setFilters} />
          {viewMode === 'grid' ? <section className="results">
            <div className="results-heading">
              <div><span className="eyebrow">Your workday, curated</span><h1>{activeTab === 'saved' ? 'Saved Spots' : 'Nearby Cafes'} <small>({filteredCafes.length} found)</small></h1></div>
              <span className="location-label">{activeTab === 'discover' ? displayedLocationStatus : 'Downtown radius'} <b>{activeTab === 'discover' ? '10 km' : '2 mi'}</b></span>
              {activeTab === 'discover' && <small className="osm-attribution">Cafe data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>}
            </div>
            {savedCafeError && !selectedCafe && <p className="saved-cafe-error" role="alert">{savedCafeError}</p>}
            {isLoadingCafes ? <div className="empty-state">
              <Coffee size={36} />
              <h2>Finding nearby cafes...</h2>
              <p>Checking the live cafe feed near your current location.</p>
            </div> : filteredCafes.length ? <div className="cafe-grid">{filteredCafes.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} isSaved={savedCafeIds.has(cafe.id)} isSaving={savingCafeIds.has(cafe.id)} onSelect={setSelectedCafe} onToggleSave={toggleSave} />)}</div> : <div className="empty-state">
              <Coffee size={36} />
              <h2>{activeTab === 'discover' && !userLocation ? displayedLocationStatus : 'No cafes match your filters'}</h2>
              <p>{activeTab === 'discover' && !userLocation ? 'Allow location access to find cafes near you.' : 'Try relaxing your search criteria or filter tags.'}</p>
            </div>}
          </section> : <MapView cafes={cafeRecords} focusedCafe={focusedCafe} onClearFocusedCafe={() => setFocusedCafe(null)} onSelect={setSelectedCafe} />}
        </>}
      </div>
    </main>
    <RafaelChatWidget activeTab={activeTab} chat={rafaelChat} nearbyCafes={assistantCafes} savedCafes={savedCafes} userLocation={userLocation} userInitials={profileInitials} />
    <CafeDrawer key={selectedCafe?.id || 'closed'} cafe={selectedCafe} isSaved={selectedCafe && savedCafeIds.has(selectedCafe.id)} isSaving={selectedCafe && savingCafeIds.has(selectedCafe.id)} saveError={savedCafeError} onClose={() => setSelectedCafe(null)} onToggleSave={toggleSave} onAddReview={() => setReviewCafe(selectedCafe)} onNavigate={navigateToCafe} onCheckin={handleCafeCheckin} />
    <ReviewModal cafe={reviewCafe} rating={reviewRating} setRating={setReviewRating} text={reviewText} setText={setReviewText} onSubmit={submitReview} onClose={() => setReviewCafe(null)} />
    <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} onSignOut={handleSignOut} user={authenticatedUser} savedCount={savedCafeIds.size} reviewCount={cafes.reduce((total, cafe) => total + cafe.reviews.filter((review) => review.author === 'You').length, 0)} />
  </div>;
}
