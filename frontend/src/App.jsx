import { useMemo, useState } from 'react';
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
import LandingPage from './components/landingpage';
import './App.css';

const NAV_ITEMS = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'saved', label: 'Saved Cafes', icon: Bookmark },
  { id: 'map', label: 'Radar Map', icon: MapIcon },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [cafes, setCafes] = useState(INITIAL_CAFES);
  const [activeTab, setActiveTab] = useState('discover');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedCafeIds, setSavedCafeIds] = useState(new Set(['1']));
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [reviewCafe, setReviewCafe] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [filters, setFilters] = useState({ openNow: false, fastWifi: false, outlets: false, quiet: false, coffeeStyle: 'All' });

  const filteredCafes = useMemo(() => cafes.filter((cafe) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = [cafe.name, cafe.address, cafe.tagline].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (!filters.openNow || cafe.isOpen) && (!filters.fastWifi || cafe.wifiCategory === 'fast') && (!filters.outlets || cafe.outlets === 'Plentiful') && (!filters.quiet || cafe.noiseLevel === 'Quiet') && (filters.coffeeStyle === 'All' || cafe.coffeeStyles.includes(filters.coffeeStyle)) && (activeTab !== 'saved' || savedCafeIds.has(cafe.id));
  }), [cafes, searchQuery, filters, activeTab, savedCafeIds]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'map') setViewMode('map');
    else if (tab === 'discover' || tab === 'saved') setViewMode('grid');
  };

  const toggleSave = (event, id) => {
    event.stopPropagation();
    setSavedCafeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;

  return <div className="app-shell">
    <aside className="sidebar"><div><div className="brand"><span className="brand-mark"><Coffee size={21} /></span><div><strong>CafeRadar</strong><small>Work-Ready Cafes</small></div></div><nav>{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => selectTab(id)}><Icon size={16} /> {label}{id === 'saved' && savedCafeIds.size > 0 && <span className="nav-count">{savedCafeIds.size}</span>}</button>)}</nav></div><button className="profile" onClick={() => setIsProfileOpen(true)} aria-label="Open Jane Doe profile"><span>JD</span><div><strong>Jane Doe</strong><small>Digital Nomad</small></div><Settings size={14} /></button></aside>
    <main className="main-content"><Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} viewMode={viewMode} setViewMode={setViewMode} onSelectTab={selectTab} /><div className="content-scroll">{activeTab === 'settings' ? <SettingsView /> : activeTab === 'assistant' ? <AIAssistant /> : <><FilterBar filters={filters} setFilters={setFilters} />{viewMode === 'grid' ? <section className="results"><div className="results-heading"><div><span className="eyebrow">Your workday, curated</span><h1>{activeTab === 'saved' ? 'Saved Spots' : 'Nearby Cafes'} <small>({filteredCafes.length} found)</small></h1></div><span className="location-label">Downtown radius <b>2 mi</b></span></div>{filteredCafes.length ? <div className="cafe-grid">{filteredCafes.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} isSaved={savedCafeIds.has(cafe.id)} onSelect={setSelectedCafe} onToggleSave={toggleSave} />)}</div> : <div className="empty-state"><Coffee size={36} /><h2>No cafes match your filters</h2><p>Try relaxing your search criteria or filter tags.</p></div>}</section> : <MapView cafes={filteredCafes} onSelect={setSelectedCafe} />}</>}</div></main>
    <CafeDrawer cafe={selectedCafe} isSaved={selectedCafe && savedCafeIds.has(selectedCafe.id)} onClose={() => setSelectedCafe(null)} onToggleSave={toggleSave} onAddReview={() => setReviewCafe(selectedCafe)} />
    <ReviewModal cafe={reviewCafe} rating={reviewRating} setRating={setReviewRating} text={reviewText} setText={setReviewText} onSubmit={submitReview} onClose={() => setReviewCafe(null)} />
    <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} savedCount={savedCafeIds.size} reviewCount={cafes.reduce((total, cafe) => total + cafe.reviews.filter((review) => review.author === 'You').length, 0)} />
  </div>;
}
