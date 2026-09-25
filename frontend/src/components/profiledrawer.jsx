import { Bell, BriefcaseBusiness, Check, ChevronRight, Clock3, Coffee, MapPin, Moon, Settings2, ShieldCheck, X } from 'lucide-react';

export default function ProfileDrawer({ isOpen, onClose, savedCount, reviewCount = 0 }) {
  if (!isOpen) return null;

  return <div className="profile-backdrop" onClick={onClose}>
    <aside className="profile-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="profile-drawer-header">
        <div><span className="eyebrow">Your CafeRadar</span><h2>Profile & preferences</h2></div>
        <button className="icon-button profile-close" onClick={onClose} aria-label="Close profile"><X size={18} /></button>
      </div>
      <div className="profile-drawer-content">
        <section className="profile-identity"><div className="profile-avatar-large">JD</div><div><h3>Jane Doe</h3><p>Digital Nomad <span><ShieldCheck size={13} /> Verified member</span></p></div><button className="profile-edit-button" aria-label="Edit profile"><Settings2 size={15} /></button></section>
        <div className="profile-stats"><Stat value={savedCount} label="Saved cafes" /><Stat value={reviewCount} label="Reviews shared" /><Stat value="14" label="Workdays tracked" /></div>
        <ProfileSection title="Your workday"><Preference icon={<BriefcaseBusiness size={15} />} label="Work style" value="Deep focus" /><Preference icon={<Clock3 size={15} />} label="Best cafe hours" value="8:00 AM - 2:00 PM" /><Preference icon={<MapPin size={15} />} label="Search area" value="Downtown · 2 mi" /></ProfileSection>
        <ProfileSection title="Radar preferences"><Toggle icon={<Bell size={15} />} label="Cafe alerts" description="New work-ready spots nearby" checked /><Toggle icon={<Coffee size={15} />} label="Weekly discoveries" description="A short list of fresh recommendations" checked /><Toggle icon={<Moon size={15} />} label="Quiet hours" description="Pause notifications after 9:00 PM" /></ProfileSection>
        <button className="account-link"><span><ShieldCheck size={16} /> Account & privacy</span><ChevronRight size={16} /></button>
      </div>
      <div className="profile-drawer-footer"><span>Member since April 2024</span><button className="text-button">Sign out</button></div>
    </aside>
  </div>;
}

function Stat({ value, label }) { return <div className="profile-stat"><strong>{value}</strong><small>{label}</small></div>; }
function Preference({ icon, label, value }) { return <button className="preference-row"><span className="preference-icon">{icon}</span><span><strong>{label}</strong><small>{value}</small></span><ChevronRight size={15} /></button>; }
function Toggle({ icon, label, description, checked = false }) { return <label className="profile-toggle-row"><span className="preference-icon">{icon}</span><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" defaultChecked={checked} /><i><Check size={11} /></i></label>; }
function ProfileSection({ title, children }) { return <section className="profile-section"><div className="profile-section-heading"><h3>{title}</h3><button className="text-button">Edit</button></div>{children}</section>; }