// import { useState, useEffect } from 'react'
// import { useGoogleLogin } from '@react-oauth/google'
// import './App.css'

// function App() {
//   const [accessToken, setAccessToken] = useState<string | null>(null)
//   const [events, setEvents] = useState<any[]>([])

//   const login = useGoogleLogin({
//     scope: 'https://www.googleapis.com/auth/calendar.readonly',
//     onSuccess: tokenResponse => setAccessToken(tokenResponse.access_token),
//     onError: () => alert('Google Login Failed'),
//     flow: 'implicit', // required for frontend-only apps
//   })

//   useEffect(() => {
//   if (!accessToken) return
//   const now = new Date().toISOString()
//   const nextMonth = new Date()
//   nextMonth.setMonth(nextMonth.getMonth() + 1)
//   const nextMonthISO = nextMonth.toISOString()

//   // fetch('api/calendar', accessToken)
//   //   `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}&timeMax=${nextMonthISO}`,
//   //   {
//   //     headers: {
//   //       Authorization: `Bearer ${accessToken}`,
//   //     },
//   //   }
//   // )
//   fetch('/api/calendar', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify({ accessToken }),
//   })
//     .then(res => res.json())
//     .then(data => {
//       setEvents(data.items || [])
//     })
//     console.log('Events:', events)
// }, [accessToken])

//   if (!accessToken) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: '#f5f5f5'
//       }}>
//         <div style={{
//           background: '#fff',
//           padding: '2rem',
//           borderRadius: '8px',
//           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//           display: 'flex',
//           flexDirection: 'column',
//           gap: '1rem',
//           minWidth: '300px',
//           alignItems: 'center'
//         }}>
//           <h2 style={{ textAlign: 'center' }}>Login</h2>
//           <button onClick={() => login()}>Sign in with Google</button>
//         </div>
//       </div>
//     )
//   }

//   return (
//   <>
//         <div style={{
//       width: '100%',
//       position: 'fixed',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 100,
//       background: '#f5f5f5',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'right',
//       padding: '1rem 0',
//       boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
//     }}>
//       <div style={{
//         background: '#f5f5f5',
//         padding: '1rem 2rem',
//         borderRadius: '8px',
//         display: 'flex',

//         flexDirection: 'row', // Change to row
//         gap: '1rem',          // Increase gap for spacing
//         minWidth: '300px',
//         alignItems: 'center'
//       }}>
//         <h2 style={{ textAlign: 'center', margin: 0 }}>Logged in</h2>
//         <button onClick={() => setAccessToken(null)}>Logout</button>
//       </div>
//     </div>
//     {/* Add marginTop so content is not hidden behind the fixed bar */}
//     <div style={{ marginTop: '-300px' }}>
//       <h1 style={{ textAlign: 'center' }}>Your Google Calendar Events:</h1>
//       <ul>
//         {events.map(event => (
//           <li key={event.id}>
//             {event.summary} (
//             {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start?.date}
//             {" - "}
//             {event.end?.dateTime ? new Date(event.end.dateTime).toLocaleString() : event.end?.date}
//             )
//           </li>
//         ))}
//       </ul>
//     </div>
//   </>
// )
// }

// export default App

import React, { useEffect, useState } from 'react';
import pkceChallenge from 'pkce-challenge';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = 'http://localhost:5173/auth/callback';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly email profile';

function App() {
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Step 1: Start login by redirecting to Google's OAuth endpoint
  const startLogin = async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();

    // Save verifier to localStorage for later (needed to exchange code)
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

  // Step 2: After redirect, extract 'code' from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setAuthCode(code);
      window.history.replaceState({}, '', '/'); // clean URL
    }
  }, []);

  // Step 3: Exchange code for tokens via backend
  useEffect(() => {
    if (!authCode) return;

    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      alert('PKCE code verifier not found.');
      return;
    }

    fetch('http://localhost:4000/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode, code_verifier: codeVerifier }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          // Save access token and fetch calendar events next
          localStorage.setItem('access_token', data.access_token);
          // fetchCalendarEvents(data.access_token);
          // fetchUserEmail(data.access_token);
        } else {
          alert('Failed to get access token');
        }
      })
      .catch(() => alert('Token exchange failed'));
  }, [authCode]);

  const fetchCalendarEvents = async (accessToken: string) => {
    console.log('Hello')
    await fetch('http://localhost:4000/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
      .then(res => res.json())
      .then(data => setEvents(data.items || []))
      .catch(() => alert('Failed to fetch calendar events'));
    await console.log('Events fetched:', events);
  };

  const fetchUserEmail = (accessToken: string) => {
    fetch('http://localhost:4000/userEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setUserEmail(data.email);

        }
      })
      .catch(() => alert('Failed to fetch user email'));
  };

  const sendEmail = () => {
    fetch('http://localhost:4000/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        subject: 'Weather Alert',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) alert('Email sent!');
        else alert('Failed to send email');
      });
  }
  const logout = () => {
    localStorage.clear();
    setEvents([]);
    setAuthCode(null);
  };

  const accessToken = localStorage.getItem('access_token');

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents(accessToken);
      fetchUserEmail(accessToken);
    }
  }, [accessToken]);

  if (!accessToken) {
    return (
      <div>
        <h2>Login with Google</h2>
        <button onClick={startLogin}>Sign in</button>
      </div>
    );
  }

//   return (
//     <div>
//       <h1>Your Google Calendar Events</h1>
//       <button onClick={logout}>Logout</button>
//       <button onClick={sendEmail}>Send Email</button>
//       <ul>
//         {events.map(event => (
//           <li key={event.id}>
//             {event.summary} (
//             {event.start?.dateTime || event.start?.date} - {event.end?.dateTime || event.end?.date})
//             {event.location && <span> at {event.location}</span>}
//             {event.weather && (
//               <>
//                 <span>
//                   {event.weather.description && <>{event.weather.description}</>}
//                   {event.weather.temperature !== null && event.weather.temperature !== undefined && (
//                     <> {event.weather.temperature}°C</>
//                   )}
//                   {event.weather.pop !== null && event.weather.pop !== undefined && (
//                     <> , POP: {event.weather.pop}%</>
//                   )}
//                 </span>
//                 {event.weather.timeLeft && (
//                   <span>
//                     {' - Time Left: '}
//                     {event.weather.timeLeft.days}d {event.weather.timeLeft.hours}h {event.weather.timeLeft.minutes}m {event.weather.timeLeft.seconds}s
//                   </span>
//                 )}
//               </>
//             )}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );

return (
  <div className="app-container">
    <h1>Your Google Calendar Events</h1>
    <div className="button-row">
      <button onClick={logout}>Logout</button>
      <button onClick={sendEmail}>Send Email</button>
    </div>
    <ul className="event-list">
      {events.map(event => (
        <li className="event-card" key={event.id}>
          <div className="event-title">
            {event.summary}
          </div>
          <div className="event-meta">
            {event.start?.dateTime || event.start?.date}
            {" - "}
            {event.end?.dateTime || event.end?.date}
            {event.location && <span> &middot; <b>{event.location}</b></span>}
          </div>
          {event.weather && (
            <div className="weather-info">
              {event.weather.description && <span>{event.weather.description}</span>}
              {event.weather.temperature !== null && event.weather.temperature !== undefined && (
                <span> &nbsp;|&nbsp; {event.weather.temperature}°C</span>
              )}
              {event.weather.pop !== null && event.weather.pop !== undefined && (
                <span> &nbsp;|&nbsp; POP: {event.weather.pop}%</span>
              )}
              {event.weather.timeLeft && (
                <span>
                  &nbsp;|&nbsp; Time Left: {event.weather.timeLeft.days}d {event.weather.timeLeft.hours}h {event.weather.timeLeft.minutes}m {event.weather.timeLeft.seconds}s
                </span>
              )}
              {event.weather.error && (
                <span style={{ color: "#e53e3e" }}> &nbsp;|&nbsp; {event.weather.error}</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  </div>
);
}
export default App;
