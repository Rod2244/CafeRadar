import { Bell, Check, ChevronRight, Compass, Eye, Globe2, LockKeyhole, MapPin, Moon, Palette, Save, ShieldCheck, SlidersHorizontal, Sun, UserRound, X } from 'lucide-react';
import { useState } from 'react';

export default function SettingsView() {
  const [preferences, setPreferences] = useState({ nearbyAlerts: true, weeklyDigest: true, quietHours: false, reducedMotion: false });
  const [profile, setProfile] = useState({ name: 'Jane Doe', email: 'jane.doe@example.com', role: 'Digital Nomad' });
  const [draftProfile, setDraftProfile] = useState(profile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const togglePreference = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const openProfileModal = () => { setDraftProfile(profile); setIsProfileModalOpen(true); };
  const closeProfileModal = () => setIsProfileModalOpen(false);
  const saveProfile = (event) => { event.preventDefault(); setProfile({ name: draftProfile.name.trim() || profile.name, email: draftProfile.email.trim() || profile.email, role: draftProfile.role.trim() || profile.role }); closeProfileModal(); };

  return <section className="settings-page">
    <div className="settings-heading"><div><span className="eyebrow">Workspace control center</span><h1>Settings</h1><p>Shape how CafeRadar finds and recommends your next workday spot.</p></div><div className="settings-status"><ShieldCheck size={15} /> Profile synced</div></div>
    <div className="settings-layout">
      <div className="settings-main">
        <SettingsGroup title="Your account" icon={<UserRound size={16} />}>
          <div className="settings-account"><div className="settings-avatar">JD</div><div><strong>{profile.name}</strong><span>{profile.email}</span></div><button className="settings-action" onClick={openProfileModal}>Edit profile <ChevronRight size={15} /></button></div>
        </SettingsGroup>
        <SettingsGroup title="Discovery preferences" icon={<Compass size={16} />}>
          <SettingsRow icon={<MapPin size={16} />} title="Default search area" description="Where CafeRadar starts each scan"><strong>Downtown · 2 mi</strong><ChevronRight size={16} /></SettingsRow>
          <SettingsRow icon={<SlidersHorizontal size={16} />} title="Workday priorities" description="Your preferred cafe signals"><strong>Fast WiFi, outlets, quiet</strong><ChevronRight size={16} /></SettingsRow>
          <SettingsRow icon={<Globe2 size={16} />} title="Distance units" description="How distances appear across the app"><strong>Kilometers</strong><ChevronRight size={16} /></SettingsRow>
        </SettingsGroup>
        <SettingsGroup title="Notifications" icon={<Bell size={16} />}>
          <ToggleRow title="Nearby cafe alerts" description="Get notified when a new work-ready cafe appears" checked={preferences.nearbyAlerts} onChange={() => togglePreference('nearbyAlerts')} />
          <ToggleRow title="Weekly discoveries" description="A curated roundup every Monday morning" checked={preferences.weeklyDigest} onChange={() => togglePreference('weeklyDigest')} />
          <ToggleRow title="Quiet hours" description="Pause all alerts between 9:00 PM and 7:00 AM" checked={preferences.quietHours} onChange={() => togglePreference('quietHours')} />
        </SettingsGroup>
      </div>
      <aside className="settings-side">
        <SettingsGroup title="Appearance" icon={<Palette size={16} />}>
          <div className="appearance-choice"><span className="appearance-icon dark"><Moon size={15} /></span><span><strong>Night radar</strong><small>Best for late work sessions</small></span><span className="selected-dot" /></div>
          <div className="appearance-choice muted-choice"><span className="appearance-icon light"><Sun size={15} /></span><span><strong>Daylight mode</strong><small>Coming soon</small></span></div>
          <ToggleRow title="Reduced motion" description="Use gentler transitions" checked={preferences.reducedMotion} onChange={() => togglePreference('reducedMotion')} />
        </SettingsGroup>
        <SettingsGroup title="Privacy & safety" icon={<LockKeyhole size={16} />}>
          <SettingsRow icon={<Eye size={16} />} title="Location sharing" description="Only used while finding nearby cafes"><strong>While using app</strong><ChevronRight size={16} /></SettingsRow>
          <SettingsRow icon={<ShieldCheck size={16} />} title="Account privacy" description="Review your data and permissions"><ChevronRight size={16} /></SettingsRow>
        </SettingsGroup>
        <div className="settings-help"><strong>Need a hand?</strong><p>Manage your CafeRadar experience whenever your workday changes.</p><button className="text-button">Open help center <ChevronRight size={14} /></button></div>
      </aside>
    </div>
    {isProfileModalOpen && <EditProfileModal profile={draftProfile} setProfile={setDraftProfile} onClose={closeProfileModal} onSave={saveProfile} />}
  </section>;
}

function SettingsGroup({ title, icon, children }) { return <section className="settings-group"><div className="settings-group-heading"><span>{icon}</span><h2>{title}</h2></div>{children}</section>; }
function SettingsRow({ icon, title, description, children }) { return <button className="settings-row"><span className="settings-row-icon">{icon}</span><span className="settings-row-copy"><strong>{title}</strong><small>{description}</small></span><span className="settings-row-value">{children}</span></button>; }
function ToggleRow({ title, description, checked, onChange }) { return <label className="settings-toggle"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={onChange} /><i /></label>; }
function EditProfileModal({ profile, setProfile, onClose, onSave }) { return <div className="edit-profile-backdrop" onClick={onClose}><form className="edit-profile-modal" onSubmit={onSave} onClick={(event) => event.stopPropagation()}><div className="edit-profile-heading"><div><span className="eyebrow">Account details</span><h2>Edit profile</h2><p>Keep your CafeRadar identity up to date.</p></div><button type="button" className="icon-button profile-close" onClick={onClose} aria-label="Close edit profile"><X size={18} /></button></div><div className="edit-profile-avatar">JD</div><label className="profile-field">Full name<input autoFocus value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label><label className="profile-field">Email address<input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} /></label><label className="profile-field">Work identity<input value={profile.role} onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))} /></label><div className="edit-profile-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Save size={15} /> Save changes</button></div><p className="profile-saved-note"><Check size={13} /> Changes apply to this session</p></form></div>; }