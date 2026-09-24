import { Clock, SlidersHorizontal, Volume2, Wifi, Zap } from 'lucide-react';
import { COFFEE_STYLES } from '../data/mockdata';

export default function FilterBar({ filters, setFilters }) {
	const toggle = (key) => setFilters((current) => ({ ...current, [key]: !current[key] }));
	return <section className="filterbar"><div className="filter-group"><span className="filter-label"><SlidersHorizontal size={14} /> Filters</span><button className={filters.openNow ? 'filter-chip selected green' : 'filter-chip'} onClick={() => toggle('openNow')}><Clock size={14} /> Open Now</button><button className={filters.fastWifi ? 'filter-chip selected cyan' : 'filter-chip'} onClick={() => toggle('fastWifi')}><Wifi size={14} /> High-Speed WiFi</button><button className={filters.outlets ? 'filter-chip selected amber' : 'filter-chip'} onClick={() => toggle('outlets')}><Zap size={14} /> Plentiful Outlets</button><button className={filters.quiet ? 'filter-chip selected blue' : 'filter-chip'} onClick={() => toggle('quiet')}><Volume2 size={14} /> Quiet Vibe</button></div><label className="coffee-select">Coffee:<select value={filters.coffeeStyle} onChange={(event) => setFilters((current) => ({ ...current, coffeeStyle: event.target.value }))}>{COFFEE_STYLES.map((style) => <option key={style} value={style}>{style === 'All' ? 'All Coffee Styles' : style}</option>)}</select></label></section>;
}
