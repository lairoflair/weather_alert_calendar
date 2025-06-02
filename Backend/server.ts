// import express from 'express'
// import cors from 'cors'
// import dotenv from 'dotenv'
// import { google } from 'googleapis'
// import { OAuth2Client } from 'google-auth-library'
// dotenv.config()

// const app = express()
// const PORT = process.env.PORT || 5000

// const oauth2Client = new OAuth2Client(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// )

// app.use(cors())
// app.use(express.json())

// // Example route
// app.get('/', (req, res) => {
//   res.send('Weather Calendar backend is running!')
// })
// // app.get('/api/calendar', (req, res) => {})
// // Add your API routes here (e.g., for Google OAuth, weather, email notifications)
// app.post('/api/calendar', async (req, res) => {
//   const { accessToken } = req.body
//   const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

//   try {
//     const response = await calendar.events.list({
//       calendarId: 'primary',
//       timeMin: new Date().toISOString(),
//       maxResults: 10,
//       singleEvents: true,
//       orderBy: 'startTime',
//     })
//     res.json(response.data.items)
//   } catch (error) {
//     console.error('Error fetching events:', error)
//     res.status(500).send('Error fetching events')
//   }
// })

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`)
// })

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
const { getWeatherForCity } = require('./weather');
const { getGeocodeFromAddress } = require('./Geocode');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function roundUpToNearest3Hours(date: Date): Date {
  const roundedDate = new Date(date);
  const hours = date.getHours();
  const nearestHour = Math.round(hours / 3) * 3;
  roundedDate.setHours(nearestHour, 0, 0, 0);
  return roundedDate;
}

function formatDateToYYYYMMDDHHMMSS(date: Date): string {
  const pad = (num: number): string => num.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.post('/auth/token', async (req, res) => {
  const { code } = req.body;
  // console.log('clientID', process.env.GOOGLE_CLIENT_ID);
  // console.log('redirectURI', process.env.GOOGLE_REDIRECT_URI);
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: req.body.code_verifier,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Token exchange failed', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.post('/calendar', async (req, res) => {
  const { access_token } = req.body;
  const now = new Date().toISOString();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthISO = nextMonth.toISOString();

  try {
    const response = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}&timeMax=${nextMonthISO}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    // console.log('Calendar events:', response.data);

    type CalendarEvent = {
      location?: string;
      weather?: {
        timeLeft?: {
          days: number;
          hours: number;
          minutes: number;
          seconds: number;
        },
        temperature?: number; // e.g., 22.5
        description?: string; // e.g., "Clear sky"
        pop?: number; // Probability of precipitation (0-100)
        error?: string; // Error message if any
      }; // Weather data will be added later
      start?: {
        dateTime?: string; // e.g., "2022-08-30T15:00:00Z"
        date?: string;     // e.g., "2022-08-30"
      };
      
    };
    const data = response.data as { items: CalendarEvent[] };
    
    // let dateTime = data.items[2].start?.dateTime || data.items[2].start?.date;
    // // const targetDateTime = new Date(dateTime).toISOString().replace('T', ' ').substring(0, 19);
    // if (!dateTime) {
    //   console.error('No dateTime found in the first event');
    // }
    // else {
    //   const date = new Date(dateTime);
    //   const roundedDate = roundUpToNearest3Hours(date);
    //   const formattedDate = formatDateToYYYYMMDDHHMMSS(roundedDate);
    //   console.log('formattedDate:', formattedDate); //"2025-05-27 03:00:00"
    // }

    // const example = { lat: 43.7760345, lng: -79.2575755, dateTime:  }
    // const weatherData = await getWeatherForCity(example);
    // console.log('Weather data:', weatherData);
    for (const event of data.items) {
      // console.log('Processing event:', event);
      // console.log('Location:', event.location);
      let dateTime = event.start?.dateTime || event.start?.date
      if (event.location && dateTime) {
        console.log('Event location:', event.location);
        try {
          // let dateTime = event.start?.date
          // console.log('Event dateTime:', dateTime);
          
          
          let geocodeData = await getGeocodeFromAddress(event.location);
          // console.log('Geocode data:', geocodeData);
          let geoInfo = {
            lat: geocodeData.lat,
            lng: geocodeData.lng,
            time: formatDateToYYYYMMDDHHMMSS(roundUpToNearest3Hours(new Date(dateTime))),
          };
          // console.log('Geo info:', geoInfo);
          const weatherData = await getWeatherForCity(geoInfo);
          event.weather = weatherData;
          // console.log('Weather data:', weatherData);
          // console.log('Event Weather data:', event.weather);
        } catch (err) {
          console.error(`Failed to fetch weather for ${event.location}:`, err);
          event.weather = { error: 'Weather data not available' };
        }
      } else {
        event.weather = { error: 'No location provided' };
      }
    }
    console.log('Done looping through events');
    res.json(data);

  } catch (error) {
    console.error('Calendar fetch failed', error);
    res.status(500).json({ error: 'Calendar fetch failed' });
  }
});

app.post('/userEmail', async (req, res) => {
  const { access_token } = req.body;
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
    );
    res.json(response.data);
  } catch (error) {
    console.error('User email fetch failed', error);
    res.status(500).json({ error: 'User email fetch failed' });
  }
});

app.post('/send-email', async (req, res) => {
  const { to, subject } = req.body;
  const text = 'This is a test email from your Weather Calendar app!';
  // Configure your email transport (example uses Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,      // Your Gmail address
      pass: process.env.EMAIL_PASSWORD,  // Your Gmail app password
    },
  });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Email send failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.get('/', (req, res) => {
  res.send('Weather Calendar backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
