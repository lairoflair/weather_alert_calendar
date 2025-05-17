import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import reactLogo from './assets/react.svg'
import './App.css'

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: tokenResponse => setAccessToken(tokenResponse.access_token),
    onError: () => alert('Google Login Failed'),
    flow: 'implicit', // required for frontend-only apps
  })

  useEffect(() => {
  if (!accessToken) return
  const now = new Date().toISOString()
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthISO = nextMonth.toISOString()

  fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}&timeMax=${nextMonthISO}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
    .then(res => res.json())
    .then(data => {
      setEvents(data.items || [])
    })
    console.log('Events:', events)
}, [accessToken])

  if (!accessToken) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minWidth: '300px',
          alignItems: 'center'
        }}>
          <h2 style={{ textAlign: 'center' }}>Login</h2>
          <button onClick={() => login()}>Sign in with Google</button>
        </div>
      </div>
    )
  }

  return (
  <>
        <div style={{
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'right',
      padding: '1rem 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        background: '#f5f5f5',
        padding: '1rem 2rem',
        borderRadius: '8px',
        display: 'flex',
        
        flexDirection: 'row', // Change to row
        gap: '1rem',          // Increase gap for spacing
        minWidth: '300px',
        alignItems: 'center'
      }}>
        <h2 style={{ textAlign: 'center', margin: 0 }}>Logged in</h2>
        <button onClick={() => setAccessToken(null)}>Logout</button>
      </div>
    </div>
    {/* Add marginTop so content is not hidden behind the fixed bar */}
    <div style={{ marginTop: '-300px' }}>
      <h1 style={{ textAlign: 'center' }}>Your Google Calendar Events:</h1>
      <ul>
        {events.map(event => (
          <li key={event.id}>
            {event.summary} (
            {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start?.date}
            {" - "}
            {event.end?.dateTime ? new Date(event.end.dateTime).toLocaleString() : event.end?.date}
            )
          </li>
        ))}
      </ul>
    </div>
  </>
)
}

export default App