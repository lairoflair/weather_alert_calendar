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

const getWeather = async (givenCity: string) => {
  const city = givenCity || 'Toronto';
  try {
    const data = await getWeatherForCity(city);
    return data;
  } catch (err) {
    throw new Error('Failed to fetch weather');
  }
};


app.post('/auth/token', async (req, res) => {
  const { code } = req.body;
  console.log('clientID', process.env.GOOGLE_CLIENT_ID);
  console.log('clientSecret', process.env.GOOGLE_CLIENT_SECRET);
  console.log('redirectURI', process.env.GOOGLE_REDIRECT_URI);
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
    type CalendarEvent = { location?: string; weather?: any };
    const data = response.data as { items: CalendarEvent[] };
    const example = { lat: 43.7760345, lng: -79.2575755 }
    const weatherData = await getWeatherForCity(example);
    console.log('Weather data:', weatherData);
    // for (const event of data.items) {
    //   console.log('Location:', event.location);
    //   if (event.location) {
    //     try {
    //       const geocodeData = await getGeocodeFromAddress(event.location);
    //       console.log('Geocode data:', geocodeData);
    //       const weatherData = await getWeatherForCity(geocodeData);
    //       // event.weather = weatherData;
    //       // console.log('Weather data:', weatherData);
    //     } catch (err) {
    //       // console.error(`Failed to fetch weather for ${event.location}:`, err);
    //       // event.weather = { error: 'Weather data not available' };
    //     }
    //   } else {
    //     event.weather = { error: 'No location provided' };
    //   }
    // }
    res.json(data);
    
  } catch (error) {
    console.error('Calendar fetch failed', error);
    res.status(500).json({ error: 'Calendar fetch failed' });
  }
});

app.post('/userEmail', async (req, res) => {
  const { access_token } = req.body;
  try{
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
  const { to, subject} = req.body;
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

// app.get('/api/weather', async (req, res) => {
//   const city = req.query.city || 'London';

//   try {
//     const data = await getWeatherForCity(city);
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch weather' });
//   }
// });

app.get('/', (req, res) => {
  res.send('Weather Calendar backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
