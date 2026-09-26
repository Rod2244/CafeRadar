import { Heart, Star, Volume2, Wifi, Zap } from 'lucide-react';

export default function CafeCard({ cafe, isSaved, onSelect, onToggleSave }) {
	return <article className="cafe-card" onClick={() => onSelect(cafe)}>
		<div className="card-image-wrap">
			<img src={cafe.image} alt="Cafe interior" className="card-image" />
			<div className="image-shade" />
			<span className={`status-badge ${cafe.isOpen === true ? 'open' : cafe.isOpen === false ? 'closed' : 'unknown'}`}>{cafe.isOpen === true ? 'Open Now' : cafe.isOpen === false ? 'Closed' : 'Hours not listed'}</span>
			<span className="distance-badge">{cafe.distance}</span>
			<button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={(event) => onToggleSave(event, cafe.id)} aria-label={isSaved ? `Remove ${cafe.name} from saved` : `Save ${cafe.name}`}><Heart size={15} fill={isSaved ? 'currentColor' : 'none'} /></button>
			<div className="card-title"><h3>{cafe.name}</h3><p>{cafe.address}</p></div>
		</div>
		<div className="card-content">
			<p className="tagline">{cafe.tagline}</p>
			<div className="metrics"><Metric icon={<Wifi size={13} />} value={cafe.wifiSpeed} label="WiFi" color="cyan" /><Metric icon={<Zap size={13} />} value={cafe.outlets} label="Outlets" color="amber" /><Metric icon={<Volume2 size={13} />} value={cafe.noiseLevel} label="Noise" color="blue" /></div>
			<div className="card-footer">
				<span className="rating">{cafe.rating ? <><Star size={14} fill="currentColor" /> {cafe.rating} <small>({cafe.reviewCount})</small></> : 'No rating listed'}</span>
				<div className="style-tags">{cafe.coffeeStyles.map((style) => <span key={style}>{style}</span>)}</div>
			</div>
		</div>
	</article>;
}

function Metric({ icon, value, label, color }) { return <div className={`metric ${color}`}><span>{icon} {value}</span><small>{label}</small></div>; }
