import { SlidersHorizontal, Wifi, Zap } from 'lucide-react';

export default function FilterBar({ filters, setFilters }) {
	const toggle = (key) => setFilters((current) => ({ ...current, [key]: !current[key] }));
	return <section className="filterbar"><div className="filter-group"><span className="filter-label"><SlidersHorizontal size={14} /> Filters</span><button className={filters.fastWifi ? 'filter-chip selected cyan' : 'filter-chip'} onClick={() => toggle('fastWifi')}><Wifi size={14} /> Wi-Fi Listed</button><button className={filters.outlets ? 'filter-chip selected amber' : 'filter-chip'} onClick={() => toggle('outlets')}><Zap size={14} /> Power Outlets</button></div></section>;
}
