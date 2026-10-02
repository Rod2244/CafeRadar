import { useState } from 'react';
import { CheckCircle, CreditCard, Heart, MapPin, Navigation, Plus, Star, Wifi, X, Zap } from 'lucide-react';

export default function CafeDrawer({ cafe, isSaved, isSaving, saveError, onClose, onToggleSave, onAddReview, onNavigate, onCheckin }) {
	const [businessLevel, setBusinessLevel] = useState('moderate');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [checkinMessage, setCheckinMessage] = useState('');
	const [checkinError, setCheckinError] = useState(false);

	if (!cafe) return null;

	const submitCheckin = async () => {
		setIsSubmitting(true);
		setCheckinMessage('');
		setCheckinError(false);
		try {
			const result = await onCheckin(cafe.id, businessLevel);
			setCheckinMessage(`Thanks. ${result?.business_level?.replace('_', ' ') || businessLevel} · ${result?.checkin_count || 0} recent reports`);
		} catch (error) {
			setCheckinError(true);
			setCheckinMessage(error.message || 'Could not save your check-in.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return <div className="drawer-backdrop" onClick={onClose}>
		<aside className="cafe-drawer" onClick={(event) => event.stopPropagation()}>
			<div className="drawer-hero">
				<img src={cafe.image} alt={cafe.name} />
				<div className="image-shade" />
				<button className="icon-button drawer-close" onClick={onClose} aria-label="Close cafe details"><X size={18} /></button>
				<div className="drawer-title"><span className="verified">Cafe listing</span><h2>{cafe.name}</h2><p><MapPin size={14} /> {cafe.address}</p></div>
			</div>
			<div className="drawer-content">
				<div className="drawer-metrics"><Info icon={<Wifi />} value={cafe.wifiSpeed} label="WiFi" /><Info icon={<Zap />} value={cafe.outlets} label="Outlets" /><Info icon={<CreditCard />} value={cafe.acceptsGcash ? 'Accepted' : 'Not listed'} label="GCash" /></div>
				<Section title="About"><p className="drawer-copy">{cafe.tagline}</p></Section>
				<Section title="Amenities"><div className="amenities">{cafe.amenities.length ? cafe.amenities.map((amenity) => <span key={amenity}><CheckCircle size={13} /> {amenity}</span>) : <p className="drawer-copy">No amenities listed.</p>}</div></Section>
				<Section title="Opening Hours"><p className="drawer-copy">{cafe.openingHours || 'Hours are not listed.'}</p></Section>
				<Section title="Live Busyness" aside={`${cafe.checkinCount || 0} reports in 24h`}>
					<p className="drawer-copy">{cafe.busyness ? `Recently reported as ${cafe.busyness.replace('_', ' ')}.` : 'No recent community reports.'}</p>
					<div className="busyness-checkin">
						<label htmlFor="cafe-busyness">How busy is it now?</label>
						<div>
							<select id="cafe-busyness" value={businessLevel} onChange={(event) => setBusinessLevel(event.target.value)}>
								<option value="quiet">Quiet</option>
								<option value="moderate">Moderate</option>
								<option value="busy">Busy</option>
								<option value="very_busy">Very busy</option>
							</select>
							<button type="button" onClick={submitCheckin} disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Check in'}</button>
						</div>
						{checkinMessage && <small className={checkinError ? 'checkin-message error' : 'checkin-message'} role="status">{checkinMessage}</small>}
					</div>
				</Section>
				<Section title={`Community Reviews (${cafe.reviewCount})`}>
					<div className="review-heading"><span /><button className="text-button" onClick={onAddReview}><Plus size={14} /> Add Review</button></div>
					<div className="reviews">{cafe.reviews.map((review) => <div className="review" key={review.id}><div className="review-meta"><strong>{review.author}</strong><small>{review.time}</small></div><div className="stars">{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={12} fill="currentColor" />)}</div><p>{review.text}</p></div>)}</div>
				</Section>
				<a className="osm-source-link" href={cafe.osmUrl} target="_blank" rel="noreferrer">View source in OpenStreetMap</a>
			</div>
			<div className="drawer-footer">
				{saveError && <small className="saved-cafe-error" role="alert">{saveError}</small>}
				<button className={isSaved ? 'secondary-button' : 'primary-button'} onClick={(event) => onToggleSave(event, cafe.id)} disabled={isSaving}><Heart size={16} fill={isSaved ? 'currentColor' : 'none'} /> {isSaving ? 'Updating saved cafes...' : isSaved ? 'Saved in Collection' : 'Save Cafe to Favorites'}</button>
				<button className="primary-button" onClick={() => onNavigate(cafe)}><Navigation size={16} /> Navigate</button>
			</div>
		</aside>
	</div>;
}

function Info({ icon, value, label }) { return <div className="drawer-info">{icon}<strong>{value}</strong><small>{label}</small></div>; }
function Section({ title, aside, children }) { return <section className="drawer-section"><div className="section-heading"><h3>{title}</h3>{aside && <small>{aside}</small>}</div>{children}</section>; }
