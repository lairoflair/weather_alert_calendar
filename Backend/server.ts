import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { Db } from 'mongodb';
import jwt from 'jsonwebtoken';
import { client, connectDB } from './db'
import cookieParser from 'cookie-parser';
import cron from 'node-cron';

const { getWeatherForCity } = require('./Weather');
const { getGeocodeFromAddress } = require('./Geocode');


dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;


app.use(cookieParser());
app.use(cors({
  origin: process.env.origin || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

let db: Db;

type CalendarEvent = {
  summary?: string; // e.g., "Meeting with Bob"
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
}

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

const tokenExpired = async (expiresIn: number) => {
  const currentTime = Date.now();
  const expirationTime = new Date(expiresIn).getTime();
  console.log('Current time:', new Date(currentTime).toLocaleString());
  console.log('Expiration time:', new Date(expirationTime).toLocaleString());
  return currentTime >= expirationTime;
}

const access_token_refresh = async (email: string) => {
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    console.log('User not found');
    return;
  }
  const refreshToken = user.refresh_token;
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  type TokenResponse = {
    access_token: string;
    expires_in: number; // seconds
    scope?: string;
    token_type?: string;
    id_token: string;
    refresh_token_expires_in: number; // seconds
  }
  if (!response.data) {
    console.error('Failed to refresh access token:', response.data);
    return;
  }

  const { access_token, expires_in, refresh_token_expires_in } = response.data as TokenResponse;
  let accessTokenExpireDate = Date.now() + expires_in * 1000; // Convert seconds to milliseconds
  let refreshTokenExpireDate = Date.now() + refresh_token_expires_in * 1000;
  await db.collection('users').updateOne(
    { email }, // Use optional chaining to avoid errors if decoded is null
    {
      $set: {
        access_token: access_token,
        expires_in: accessTokenExpireDate,
        refresh_expires_in: refreshTokenExpireDate,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return access_token;
  console.log('Response from token refresh:', response.data);
}

// const accessTokenCheck = async (token: string, email: string) => {
//   if (!token) {
//     console.log('No access token provided');
//     return false;
//   }
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
//     console.log('Decoded token:', decoded);
//     return true;
//   } catch (error) {
//     console.error('Token verification failed:', error);
//     return false;
//   }
// }

const fetchWeatherForEvents = async (events: CalendarEvent[]) => {
  for (const event of events) {
    let dateTime = event.start?.dateTime || event.start?.date
    if (event.location && dateTime) {
      try {
        let geocodeData = await getGeocodeFromAddress(event.location);
        let geoInfo = {
          lat: geocodeData.lat,
          lng: geocodeData.lng,
          time: formatDateToYYYYMMDDHHMMSS(roundUpToNearest3Hours(new Date(dateTime))),
        };
        const weatherData = await getWeatherForCity(geoInfo);
        event.weather = weatherData;
      } catch (err) {
        console.error(`Failed to fetch weather for ${event.location}:`, err);
        event.weather = { error: 'Weather data not available' };
      }
    } else {
      event.weather = { error: 'No location provided' };
    }
  }
  console.log('Done looping through events');
  return events;
}

const sendEmail = async (email: string, access_token: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

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
    let data = response.data as { items: CalendarEvent[] };
    data.items = await fetchWeatherForEvents(data.items);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Weather Calendar',
      text: `${data.items.length} events found in your calendar.

        ${data.items.map(event =>

        `Event: ${event.summary || 'No Title'}
          Date: ${event.start?.dateTime
          ? new Date(event.start.dateTime).toLocaleString()
          : event.start?.date
            ? new Date(event.start.date).toLocaleDateString()
            : 'No Date'
        }
          Location: ${event.location || 'No Location'}
          Weather: ${event.weather?.description || 'No Weather Data'}
          Temperature: ${event.weather?.temperature || 'No Temperature Data'}
          Probability of Precipitation: ${event.weather?.pop || 'No Data'}
          Time Left: ${event.weather?.timeLeft ? `${event.weather.timeLeft.days} days, ${event.weather.timeLeft.hours} hours, ${event.weather.timeLeft.minutes} minutes, ${event.weather.timeLeft.seconds} seconds` : 'No Time Left Data'}`
      ).join('\n\n')}`
    });
  }

  catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error);
  }
}

const cronJob = async() => {
  console.log(`📧 Running scheduled task at ${new Date().toLocaleTimeString()}`);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const users = await db.collection('users').find({}).toArray();
  for (const user of users) {
    const { email } = user;
    const { weatherAlerts } = user.preferences || {};
    let access_token = user.access_token;

    if (!email || !access_token) {
      console.log(`❌ Skipping user with missing email or access token: ${user._id}`);
      continue;
    }

    if (!weatherAlerts || weatherAlerts === false) {
      console.log(`❌ Skipping user ${user._id} with preference: weatherAlerts is false`);
      continue;
    }
    if (await tokenExpired(user.refresh_expires_in)) {
      console.log(`❌ Skipping user ${user._id} with expired refresh token`);
      continue;
    }
    if (await tokenExpired(user.expires_in)) {
      console.log(`user ${user._id} with expired access token`);
      access_token = await access_token_refresh(email);
    }

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
      let data = response.data as { items: CalendarEvent[] };
      data.items = await fetchWeatherForEvents(data.items)

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Weather Calendar - Test Email',
        text: `This is your weather alert email sent every minute (for testing).
        ${data.items.length} events found in your calendar.

        ${data.items.map(event =>

          `Event: ${event.summary || 'No Title'}
          Date: ${event.start?.dateTime
            ? new Date(event.start.dateTime).toLocaleString()
            : event.start?.date
              ? new Date(event.start.date).toLocaleDateString()
              : 'No Date'
          }
          Location: ${event.location || 'No Location'}
          Weather: ${event.weather?.description || 'No Weather Data'}
          Temperature: ${event.weather?.temperature || 'No Temperature Data'}
          Probability of Precipitation: ${event.weather?.pop || 'No Data'}
          Time Left: ${event.weather?.timeLeft ? `${event.weather.timeLeft.days} days, ${event.weather.timeLeft.hours} hours, ${event.weather.timeLeft.minutes} minutes, ${event.weather.timeLeft.seconds} seconds` : 'No Time Left Data'}`
        ).join('\n\n')}`
      });

      console.log(`✅ Email sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error);
    }
}} 


app.get('/api/getPreferences', async (req: Request, res: Response) => {
  const email = req.query.email as string;
  const token = req.cookies['access_token'];
  console.log('email from query:', email);
  if (!token) {
    console.log('No access token found in cookies');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('Fetching preferences for email:', email);
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return
    }
    res.json(user.preferences || {});
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/savePreferences', async (req: Request, res: Response) => {
  console.log("TYUIOSAhoiasduoid");
  const { preferences, email } = req.body;
  console.log('Saving preferences for email:', email, 'with preferences:', preferences);
  if (!email || !preferences) {
    console.log('Email or preferences are missing');
    res.status(400).json({ error: 'Email and preferences are required' });
    return;
  }
  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      console.log('User not found');
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await db.collection('users').updateOne(
      { email }, // Use optional chaining to avoid errors if decoded is nul
      {
        $set: {
          preferences: preferences,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
})

app.get('/api/check-auth', (req: Request, res: Response) => {
  const token = req.cookies['access_token'];
  console.log('1Access token from cookie:', token);
  if (token) {
    res.status(200).json({ authenticated: true });
    console.log('User is authenticated');
  } else {
    res.status(401).json({ authenticated: false });
    console.log('User is not authenticated');
  }
});

app.post('/auth/token', async (req: Request, res: Response) => {
  const { code } = req.body;
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: req.body.code_verifier,
    });
    // console.log('Token exchange successful:', response.data);

    type TokenResponse = {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
      token_type?: string;
      id_token: string;
      refresh_token_expires_in: number;
    };
    const { access_token, expires_in, refresh_token, refresh_token_expires_in, id_token } = response.data as TokenResponse;
    let accessTokenExpireDate = Date.now() + expires_in * 1000; // Convert seconds to milliseconds
    let refreshTokenExpireDate = Date.now() + refresh_token_expires_in * 1000; // Convert seconds to milliseconds

    const decoded = jwt.decode(id_token);
    const { email } = decoded as { email: string };
    await db.collection('users').updateOne(
      { email }, // Use optional chaining to avoid errors if decoded is nul
      {
        $set: {
          access_token: access_token,
          expires_in: accessTokenExpireDate,
          refresh_token: refresh_token,
          refresh_expires_in: refreshTokenExpireDate,
          id_token: id_token,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true only in prod
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'lax' or 'strict' in dev
      maxAge: 3600 * 1000, // 1 hour
    });

    console.log('Access token set in cookie');
    console.log('Token exchange successful:', response.data);
    res.json(access_token);
  } catch (error) {
    console.error('Token exchange failed', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.post('/api/calendar', async (req: Request, res: Response) => {
  const access_token = req.cookies.access_token;
  console.log('Access token from cookie (calendar):', access_token);
  if (!access_token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
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
    let data = response.data as { items: CalendarEvent[] };
    data.items = await fetchWeatherForEvents(data.items)
    console.log('Done looping through events');
    res.json(data);

  } catch (error) {
    console.error('Calendar fetch failed', error);
    res.status(500).json({ error: 'Calendar fetch failed' });
  }
});

app.post('/userEmail', async (req: Request, res: Response) => {
  const access_token = req.cookies.access_token;
  console.log('Access token from cookie (userEmail):', access_token);
  if (!access_token) {
    res.status(401).json({ error: 'Missing Access Token' });
    return;
  }
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

app.post('/send-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  const access_token = req.cookies.access_token;
  console.log('Access token from cookie (send-email):', access_token);
  console.log('Email from request body:', email);
  if (!access_token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!email) {
    res.status(400).json({ error: 'Email is required' }); // Ensure email provided
    return;
  }
  try {
    sendEmail(email, access_token);
    console.log(`✅ Email sent to ${email}`);
    res.json({ success: true });
  }
  catch (error) {
    console.error('Email send failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/logout', (_req: Request, res: Response) => {
  console.log('Logging out user');
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true });
});

app.get('/cronjob',(_req: Request, res: Response) => {
  cronJob();
  res.status(200).json({ success: true, message: 'Cron job executed' });
})

// This cron job runs every day at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log(`📧 Running scheduled task at ${new Date().toLocaleTimeString()}`);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const users = await db.collection('users').find({}).toArray();
  for (const user of users) {
    const { email } = user;
    const { weatherAlerts } = user.preferences || {};
    let access_token = user.access_token;

    if (!email || !access_token) {
      console.log(`❌ Skipping user with missing email or access token: ${user._id}`);
      continue;
    }

    if (!weatherAlerts || weatherAlerts === false) {
      console.log(`❌ Skipping user ${user._id} with preference: weatherAlerts is false`);
      continue;
    }
    if (await tokenExpired(user.refresh_expires_in)) {
      console.log(`❌ Skipping user ${user._id} with expired refresh token`);
      continue;
    }
    if (await tokenExpired(user.expires_in)) {
      console.log(`user ${user._id} with expired access token`);
      access_token = await access_token_refresh(email);
    }

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
      let data = response.data as { items: CalendarEvent[] };
      data.items = await fetchWeatherForEvents(data.items)

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Weather Calendar - Test Email',
        text: `This is your weather alert email sent every minute (for testing).
        ${data.items.length} events found in your calendar.

        ${data.items.map(event =>

          `Event: ${event.summary || 'No Title'}
          Date: ${event.start?.dateTime
            ? new Date(event.start.dateTime).toLocaleString()
            : event.start?.date
              ? new Date(event.start.date).toLocaleDateString()
              : 'No Date'
          }
          Location: ${event.location || 'No Location'}
          Weather: ${event.weather?.description || 'No Weather Data'}
          Temperature: ${event.weather?.temperature || 'No Temperature Data'}
          Probability of Precipitation: ${event.weather?.pop || 'No Data'}
          Time Left: ${event.weather?.timeLeft ? `${event.weather.timeLeft.days} days, ${event.weather.timeLeft.hours} hours, ${event.weather.timeLeft.minutes} minutes, ${event.weather.timeLeft.seconds} seconds` : 'No Time Left Data'}`
        ).join('\n\n')}`
      });

      console.log(`✅ Email sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error);
    }
  }
});


app.get('/', (_req: Request, res: Response) => {
  res.send('Weather Calendar backend is running!');
});

const startServer = async () => {
  db = await connectDB(); // wait until DB is connected
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer();



process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});