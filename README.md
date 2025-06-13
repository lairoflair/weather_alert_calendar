# Weather Calendar

A React + TypeScript web app (built with Vite) that connects to your Google Calendar, reads your events, and sends you email notifications if there is a high chance of rain or snow on your event days.

## Features

- **Google Sign-In:** Secure OAuth2 login with your Gmail account.
- **Calendar Integration:** Reads your Google Calendar events.
- **Weather Alerts:** Fetches weather forecasts for your event locations and dates.
- **Email Notifications:** Sends you an email if rain or snow is likely on your event days.
- **User Preferences:** Toggle weather alerts on or off.
- **Automated Alerts:** Scheduled backend job sends daily weather alert emails.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Atlas)
- **Email:** Nodemailer (Gmail)
- **Weather API:** OpenWeatherMap (or similar)
- **Authentication:** Google OAuth2 (PKCE flow)
- **Scheduling:** node-cron

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- MongoDB Atlas account
- Google Cloud project with OAuth2 credentials

### Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/weather_calendar.git
   cd weather_calendar
   ```

2. **Configure environment variables:**

   Create a `.env` file in both the `Backend` and `src` (frontend) directories.

   **Backend/.env**
   ```
   MONGODB_URI=your_mongodb_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASSWORD=your_gmail_app_password
   WEATHER_API_KEY=your_openweathermap_api_key
   NODE_ENV=development
   ```

   **src/.env**
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_REACT_APP_API_URL=http://localhost:4000
   VITE_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

3. **Install dependencies:**

   ```sh
   cd Backend
   npm install
   cd ../
   npm install
   ```

4. **Run the backend:**

   ```sh
   cd Backend
   npm run dev
   ```

5. **Run the frontend:**

   ```sh
   npm run dev
   ```

6. **Open your browser:**  
   Visit [http://localhost:5173](http://localhost:5173)

## Usage

1. Click "Login with Google" and authorize access to your calendar.
2. View your upcoming events and their weather forecasts.
3. Toggle weather alerts in the settings.
4. Click "Send Weather Alert Email" to test email notifications.
5. The backend will also send daily weather alert emails automatically at 6am (or your configured time).

## Customization

- **Change the weather API:** Update the backend's weather-fetching logic.
- **Change email schedule:** Edit the cron expression in `server.ts`.
- **Add more preferences:** Extend the preferences schema and UI.

## Security Notes

- Never commit your `.env` files or secrets to version control.
- Use Gmail App Passwords for `EMAIL_PASSWORD` if 2FA is enabled.

## License

MIT

---

**Made with ❤️ for your weather-aware productivity!**