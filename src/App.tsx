import { useEffect, useState } from 'react';
import pkceChallenge from 'pkce-challenge';
import './App.css'; // Add custom styles here

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly email profile';
const API_BASE_URL = import.meta.env.VITE.REACT_APP_API_URL || 'http://localhost:4000';


function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const startLogin = async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();
    localStorage.setItem('pkce_code_verifier', code_verifier);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      code_challenge_method: 'S256',
      code_challenge,
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setAuthCode(code);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    if (!authCode) return;
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) return alert('PKCE code verifier not found.');
    fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode, code_verifier: codeVerifier }),
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data) setAuthenticated(true);
        else alert('Failed to get access token');
      })
      .catch(() => alert('Token exchange failed'));
  }, [authCode]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/check-auth`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchCalendarEvents();
      fetchUserEmail();
    }
  }, [authenticated]);

  useEffect(() => {
    if (userEmail) fetchPreferences();
  }, [userEmail]);

  const fetchCalendarEvents = async () => {
    await fetch(`${API_BASE_URL}/api/calendar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => setEvents(data.items || []))
      .catch(() => alert('Failed to fetch calendar events'));
  };

  const fetchUserEmail = async () => {
    await fetch(`${API_BASE_URL}/userEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => data.email && setUserEmail(data.email))
      .catch(() => alert('Failed to fetch user email'));
  };

  const fetchPreferences = async () => {
    await fetch(`${API_BASE_URL}/api/getPreferences?email=${userEmail}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setWeatherAlerts(data.weatherAlerts || false))
      .catch(() => console.log('No preferences found'));
  };

  const savePreferences = async (weatherAlerts: boolean) => {
    await fetch(`${API_BASE_URL}/api/savePreferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: userEmail, preferences: { weatherAlerts } }),
    })
      // .then(res => res.json())
      // .then(data => data.success ? alert('Preferences saved') : alert('Failed to save preferences'))
      .catch(() => alert('Failed to save preferences'));
  };

  // const sendEmail = () => {
  //   fetch(`${API_BASE_URL}/send-email`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ to: userEmail, subject: 'Weather Alert' }),
  //   })
  //     .then(res => res.json())
  //     .then(data => alert(data.success ? 'Email sent!' : 'Failed to send email'));
  // };

  const logout = () => {
    localStorage.clear();
    setEvents([]);
    setAuthCode(null);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="login-container">
        <button className="google-login" onClick={startLogin}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="top-controls">
          <div className="settings-dropdown">
            <button onClick={() => setShowSettings(prev => !prev)}>⚙️ Settings</button>
            {showSettings && (
              <div className="dropdown-content">
                <label>
                  <input
                    type="checkbox"
                    checked={weatherAlerts}
                    onChange={(e) => {
                      setWeatherAlerts(e.target.checked);
                      savePreferences(e.target.checked);
                    }}
                  />
                  Weather Alerts
                </label>
              </div>
            )}
          </div>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
        <h1>Your Google Calendar Events</h1>
        <p>Logged in as: <strong>{userEmail}</strong></p>
      </header>

      <main className="events-container">
        {events.map(event => (
          <div className="event-card flex justify-between items-start gap-4" key={event.id}>
            {/* Left Side: Event Info */}
            <div className="event-details">
              <h2>{event.summary}</h2>
              <p>
                {event.start?.dateTime
                  ? new Date(event.start.dateTime).toLocaleString()
                  : new Date(new Date(event.start.date).getTime() + 86400000).toLocaleDateString()}
                –
                {event.end?.dateTime
                  ? new Date(event.end.dateTime).toLocaleString()
                  : new Date(new Date(event.end.date).getTime() + 86400000).toLocaleDateString()}
              </p>
              {event.location && <p><strong>Location:</strong> {event.location}</p>}
            </div>

            {/* Right Side: Weather Info */}
            {event.weather && (
              <div className="weather-info text-right min-w-[180px]">
                {event.weather.description && <div>{event.weather.description}</div>}
                {event.weather.temperature != null && (
                  <div>{event.weather.temperature}°C</div>
                )}
                {event.weather.pop != null && (
                  <div>POP: {event.weather.pop}%</div>
                )}
                {event.weather.timeLeft && (
                  <div>
                    Time Left: {event.weather.timeLeft.days}d {event.weather.timeLeft.hours}h {event.weather.timeLeft.minutes}m
                  </div>
                )}
                {event.weather.error && (
                  <div className="weather-error">{event.weather.error}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
