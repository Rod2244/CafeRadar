import { Bell, ChevronRight, Compass, Eye, Globe2, LockKeyhole, MapPin, Moon, Palette, Save, ShieldCheck, SlidersHorizontal, Sun, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { updateProfile } from '../services/auth';

function profileFromUser(user) {
  const metadata = user?.user_metadata || {};
  const nameParts = (metadata.full_name || 'Jane Doe').trim().split(/\s+/).filter(Boolean);
  const firstName = metadata.first_name || nameParts.shift() || 'Jane';
  const lastName = metadata.last_name || nameParts.pop() || 'Doe';
  return {
    firstName,
    middleName: metadata.middle_name || metadata.middle_initial || nameParts.join(' '),
    lastName,
    email: user?.email || 'jane.doe@example.com',
  };
}

function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
}

function initialsFromName(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'JD';
}

export default function SettingsView({ user, onProfileUpdated }) {
  const [preferences, setPreferences] = useState({ nearbyAlerts: true, weeklyDigest: true, quietHours: false, reducedMotion: false });
  const [profile, setProfile] = useState(() => profileFromUser(user));
  const [draftProfile, setDraftProfile] = useState(profile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const togglePreference = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const openProfileModal = () => { setDraftProfile(profile); setProfileError(''); setProfileMessage(''); setIsProfileModalOpen(true); };
  const closeProfileModal = () => setIsProfileModalOpen(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const result = await updateProfile({
        firstName: draftProfile.firstName.trim(),
        middleName: draftProfile.middleName.trim(),
        lastName: draftProfile.lastName.trim(),
        email: draftProfile.email.trim(),
      });
      const savedProfile = { ...draftProfile, email: result.user.email };
      setProfile(savedProfile);
      setDraftProfile(savedProfile);
      onProfileUpdated?.(result);
      if (result.emailChangePending) {
        setProfileMessage(`Name updated. Confirm the link sent to ${draftProfile.email} to change your email. Your current email stays active until then.`);
      } else {
        setProfileMessage('Profile updated.');
      }
      closeProfileModal();
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return <section className="settings-page">
    <div className="settings-heading"><div><span className="eyebrow">Workspace control center</span><h1>Settings</h1><p>Shape how CafeRadar finds and recommends your next workday spot.</p></div><div className="settings-status"><ShieldCheck size={15} /> Profile synced</div></div>
    <div className="settings-layout">
      <div className="settings-main">
        <SettingsGroup title="Your account" icon={<UserRound size={16} />}>
          <div className="settings-account"><div className="settings-avatar">{initialsFromName(fullName(profile))}</div><div><strong>{fullName(profile)}</strong><span>{profile.email}</span></div><button className="settings-action" onClick={openProfileModal}>Edit profile <ChevronRight size={15} /></button></div>
        </SettingsGroup>
        {profileMessage && <p className="edit-profile-feedback" role="status">{profileMessage}</p>}
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
    {isProfileModalOpen && <EditProfileModal profile={draftProfile} setProfile={setDraftProfile} onClose={closeProfileModal} onSave={saveProfile} isSaving={isSavingProfile} error={profileError} message={profileMessage} />}
  </section>;
}

function SettingsGroup({ title, icon, children }) { return <section className="settings-group"><div className="settings-group-heading"><span>{icon}</span><h2>{title}</h2></div>{children}</section>; }
function SettingsRow({ icon, title, description, children }) { return <button className="settings-row"><span className="settings-row-icon">{icon}</span><span className="settings-row-copy"><strong>{title}</strong><small>{description}</small></span><span className="settings-row-value">{children}</span></button>; }
function ToggleRow({ title, description, checked, onChange }) { return <label className="settings-toggle"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={onChange} /><i /></label>; }
function EditProfileModal({ profile, setProfile, onClose, onSave, isSaving, error }) { return <div className="edit-profile-backdrop" onClick={onClose}><form className="edit-profile-modal" onSubmit={onSave} onClick={(event) => event.stopPropagation()}><div className="edit-profile-heading"><div><span className="eyebrow">Account details</span><h2>Edit profile</h2><p>Update your name and account email.</p></div><button type="button" className="icon-button profile-close" onClick={onClose} aria-label="Close edit profile"><X size={18} /></button></div><div className="edit-profile-avatar">{initialsFromName(fullName(profile))}</div><div className="edit-profile-name-fields"><label className="profile-field">First name<input autoFocus required value={profile.firstName} onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))} /></label><label className="profile-field">Middle name<input value={profile.middleName} onChange={(event) => setProfile((current) => ({ ...current, middleName: event.target.value }))} /></label><label className="profile-field">Last name<input required value={profile.lastName} onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))} /></label></div><label className="profile-field">Email address<input type="email" required value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} /></label>{error && <p className="edit-profile-feedback error" role="alert">{error}</p>}<div className="edit-profile-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" className="primary-button" disabled={isSaving}><Save size={15} /> {isSaving ? 'Saving...' : 'Save changes'}</button></div></form></div>; }