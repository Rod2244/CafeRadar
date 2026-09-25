import { Compass, Map as MapIcon, Search, X } from 'lucide-react';

export default function Header({ searchQuery, setSearchQuery, viewMode, setViewMode, onSelectTab }) {
	const showDiscover = () => { setViewMode('grid'); onSelectTab('discover'); };
	const showMap = () => { setViewMode('map'); onSelectTab('map'); };
	return <header className="topbar"><div className="search-wrap"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search cafes" placeholder="Search cafes, high-speed wifi, quiet spots..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />{searchQuery && <button className="icon-button search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={15} /></button>}</div><div className="view-switcher" aria-label="View mode"><button className={viewMode === 'grid' ? 'active' : ''} onClick={showDiscover}><Compass size={14} /> Grid</button><button className={viewMode === 'map' ? 'active' : ''} onClick={showMap}><MapIcon size={14} /> Radar Map</button></div></header>;
}
