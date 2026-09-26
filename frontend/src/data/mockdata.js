const MAPPED_CAFES = [
	{ osmType: 'node', osmId: '9773250038', name: 'Cafe Corner', address: '466 Mayor M.S. Jaldon Street, Armor Village, Santa Maria, Zamboanga City', lat: 6.9157960, lng: 122.0719364 },
	{ osmType: 'node', osmId: '4916163222', name: 'Villagio Cafe', address: 'La Purisima Street, Santa Catalina, Zamboanga City', lat: 6.9066352, lng: 122.0762909 },
	{ osmType: 'node', osmId: '14056402891', name: 'Wakahers Cafe', address: 'Governor Camins Avenue, Santa Maria, Zamboanga City', lat: 6.9201660, lng: 122.0684410 },
	{ osmType: 'way', osmId: '1528157745', name: "Lorain's Café", address: 'Governor Camins Avenue, Santa Maria, Zamboanga City', lat: 6.9211287, lng: 122.0755422 },
	{ osmType: 'node', osmId: '13227091364', name: 'Dwntwn Café', address: 'N.S. Valderosa Street, Santa Catalina, Zamboanga City', lat: 6.9027396, lng: 122.0785779 },
	{ osmType: 'node', osmId: '13926659545', name: 'HAYA Café', address: 'Veterans Avenue, Santa Catalina, Zamboanga City', lat: 6.9150392, lng: 122.0793581 },
	{ osmType: 'node', osmId: '13974830026', name: 'Starbucks', address: 'Mayor Vitaliano D. Agan Avenue, Santa Maria, Zamboanga City', lat: 6.9178122, lng: 122.0758447 },
];

const CAFE_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85';

export const INITIAL_CAFES = MAPPED_CAFES.map((cafe) => ({
	id: `osm-${cafe.osmType}-${cafe.osmId}`,
	name: cafe.name,
	tagline: 'Hours, ratings, and work amenities are not listed in OpenStreetMap.',
	address: cafe.address,
	distance: '—',
	isOpen: null,
	rating: null,
	reviewCount: 0,
	wifiSpeed: 'Not listed',
	wifiCategory: 'unknown',
	outlets: 'Not listed',
	noiseLevel: 'Not listed',
	coffeeStyles: [],
	image: CAFE_IMAGE,
	amenities: [],
	coordinates: { lat: cafe.lat, lng: cafe.lng },
	peakHours: [],
	reviews: [],
	osmUrl: `https://www.openstreetmap.org/${cafe.osmType}/${cafe.osmId}`,
}));

export const COFFEE_STYLES = ['All', 'Espresso', 'Cold Brew', 'Matcha'];
