import { CheckCircle, Heart, MapPin, Navigation, Plus, Star, Volume2, Wifi, X, Zap } from 'lucide-react';

export default function CafeDrawer({ cafe, isSaved, onClose, onToggleSave, onAddReview, onNavigate }) {
	if (!cafe) return null;
	return <div className="drawer-backdrop" onClick={onClose}>
		<aside className="cafe-drawer" onClick={(event) => event.stopPropagation()}>
			<div className="drawer-hero">
				<img src={cafe.image} alt={cafe.name} />
				<div className="image-shade" />
				<button className="icon-button drawer-close" onClick={onClose} aria-label="Close cafe details"><X size={18} /></button>
				<div className="drawer-title"><span className="verified">Cafe listing</span><h2>{cafe.name}</h2><p><MapPin size={14} /> {cafe.address}</p></div>
			</div>
			<div className="drawer-content">
				<div className="drawer-metrics"><Info icon={<Wifi />} value={cafe.wifiSpeed} label="WiFi" /><Info icon={<Zap />} value={cafe.outlets} label="Outlets" /><Info icon={<Volume2 />} value={cafe.noiseLevel} label="Noise level" /></div>
				<Section title="About"><p className="drawer-copy">{cafe.tagline}</p></Section>
				<Section title="Amenities"><div className="amenities">{cafe.amenities.length ? cafe.amenities.map((amenity) => <span key={amenity}><CheckCircle size={13} /> {amenity}</span>) : <p className="drawer-copy">No amenities listed.</p>}</div></Section>
				<Section title="Popular Work Hours"><p className="drawer-copy">Hours are not listed.</p></Section>
				<Section title={`Community Reviews (${cafe.reviewCount})`}>
					<div className="review-heading"><span /><button className="text-button" onClick={onAddReview}><Plus size={14} /> Add Review</button></div>
					<div className="reviews">{cafe.reviews.map((review) => <div className="review" key={review.id}><div className="review-meta"><strong>{review.author}</strong><small>{review.time}</small></div><div className="stars">{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={12} fill="currentColor" />)}</div><p>{review.text}</p></div>)}</div>
				</Section>
				<a className="osm-source-link" href={cafe.osmUrl} target="_blank" rel="noreferrer">View source in OpenStreetMap</a>
			</div>
			<div className="drawer-footer">
				<button className={isSaved ? 'secondary-button' : 'primary-button'} onClick={(event) => onToggleSave(event, cafe.id)}><Heart size={16} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved in Collection' : 'Save Cafe to Favorites'}</button>
				<button className="primary-button" onClick={() => onNavigate(cafe)}><Navigation size={16} /> Navigate</button>
			</div>
		</aside>
	</div>;
}

function Info({ icon, value, label }) { return <div className="drawer-info">{icon}<strong>{value}</strong><small>{label}</small></div>; }
function Section({ title, aside, children }) { return <section className="drawer-section"><div className="section-heading"><h3>{title}</h3>{aside && <small>{aside}</small>}</div>{children}</section>; }
