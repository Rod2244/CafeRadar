import { ArrowRight, Coffee, Eye, EyeOff, LockKeyhole, Mail, MapPin, Sparkles, Wifi, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { signIn, signUp } from '../services/auth';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1800&q=88';

export default function LandingPage({ onEnter, onAuthenticated }) {
  const [authMode, setAuthMode] = useState(null);

  return <div className="landing-page" style={{ '--hero-image': `url(${HERO_IMAGE})` }}>
    <header className="landing-header"><a className="landing-brand" href="#top" aria-label="CafeRadar home"><span className="brand-mark"><Coffee size={21} /></span><span><strong>CafeRadar</strong><small>Work-Ready Cafes</small></span></a><nav className="landing-nav"><button className="landing-signin" onClick={() => setAuthMode('signin')}>Sign in</button><button className="landing-signup" onClick={() => setAuthMode('signup')}>Sign up <ArrowRight size={15} /></button></nav></header>
    <main className="landing-main" id="top"><div className="landing-copy"><span className="landing-kicker"><Sparkles size={14} /> The radar for better workdays</span><h1>Find the cafe where your best work <em>happens.</em></h1><p>Search beyond the coffee. CafeRadar matches you with work-ready spaces by WiFi, outlets, noise, distance, and the vibe you need today.</p><div className="landing-actions"><button className="landing-primary" onClick={onEnter}>Explore nearby cafes <ArrowRight size={17} /></button><span className="landing-trust"><span><Wifi size={13} /> Verified WiFi</span><span><Zap size={13} /> Power-ready</span></span></div></div><div className="landing-scene"><div className="scene-photo" /><div className="scene-caption"><MapPin size={14} /><span>Downtown radius</span><strong>2 mi</strong></div><div className="scene-card"><span className="scene-card-dot" /><div><strong>Artisan Roast & Byte</strong><small>Quiet · 180 Mbps · 0.3 mi</small></div><span className="scene-rating">4.8</span></div></div></main><footer className="landing-footer"><span>Made for focused minds, curious people, and good coffee.</span><span>4 work-ready spots nearby</span></footer>{authMode && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthMode(null)} onAuthenticated={onAuthenticated} />}</div>;
}

function AuthModal({ mode, setMode, onClose, onAuthenticated }) {
  const isSignUp = mode === 'signup';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setFeedback('');
    setErrorMessage('');
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = isSignUp
        ? await signUp({
          firstName: formData.get('firstName'),
          middleInitial: formData.get('middleInitial'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          password: formData.get('password'),
        })
        : await signIn({ email: formData.get('email'), password: formData.get('password') });

      if (result.session) onAuthenticated(result);
      else setFeedback(result.message || 'Check your email to confirm your account.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="auth-backdrop" onClick={onClose}><form className="auth-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button type="button" className="icon-button auth-close" onClick={onClose} aria-label="Close authentication"><X size={18} /></button><div className="auth-heading"><span className="auth-symbol"><Coffee size={18} /></span><span className="eyebrow">Welcome to CafeRadar</span><h2>{isSignUp ? 'Create your radar' : 'Welcome back'}</h2><p>{isSignUp ? 'Build a better workday around the right cafe.' : 'Your next focused workday is waiting.'}</p></div>{isSignUp && <div className="auth-name-fields"><label className="auth-field"><span>First name</span><input name="firstName" required autoComplete="given-name" placeholder="Jane" /></label><label className="auth-field middle-initial"><span>Middle initial</span><input name="middleInitial" autoComplete="additional-name" maxLength="1" pattern="[A-Za-z]" title="Enter one letter" placeholder="M" /></label><label className="auth-field"><span>Last name</span><input name="lastName" required autoComplete="family-name" placeholder="Doe" /></label></div>}<label className="auth-field"><span><Mail size={14} /> Email address</span><input name="email" required type="email" autoComplete="email" placeholder="you@example.com" /></label><label className="auth-field"><span><LockKeyhole size={14} /> Password</span><div className="auth-password-control"><input id="auth-password" name="password" required type={showPassword ? 'text' : 'password'} minLength="6" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="6+ characters" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="auth-password" title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{isSignUp && <label className="auth-check"><input type="checkbox" required /><span>I agree to the CafeRadar terms and privacy policy.</span></label>}{errorMessage && <p className="auth-feedback error" role="alert">{errorMessage}</p>}{feedback && <p className="auth-feedback" role="status">{feedback}</p>}<button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button><div className="auth-switch"><span>{isSignUp ? 'Already have an account?' : 'New to CafeRadar?'}</span><button type="button" onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setFeedback(''); setErrorMessage(''); }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></div></form></div>;
}