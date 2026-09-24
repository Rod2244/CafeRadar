import { Send, Star, X } from 'lucide-react';

export default function ReviewModal({ cafe, rating, setRating, text, setText, onSubmit, onClose }) {
	if (!cafe) return null;
	return <div className="modal-backdrop" onClick={onClose}><form className="review-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">Community note</span><h2>Review {cafe.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close review form"><X size={18} /></button></div><div className="star-picker">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} onClick={() => setRating(star)} aria-label={`${star} stars`}><Star size={22} fill={star <= rating ? 'currentColor' : 'none'} /></button>)}</div><textarea rows="5" placeholder="How was the wifi, noise, and espresso?" value={text} onChange={(event) => setText(event.target.value)} /><button className="primary-button" type="submit"><Send size={15} /> Post Review</button></form></div>;
}
