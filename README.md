# Weather Calendar

This is a React + TypeScript web app created with Vite.  
Users sign in with their Gmail account, the app reads Google Calendar events, and sends email notifications if there is a high chance of rain or snow on event days.

## Features

- Google Sign-In (OAuth 2.0)
- Reads your Google Calendar events
- Checks weather forecasts for event days
- Sends email notifications

## Getting Started

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up your `.env` file** in the project root:
   ```
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
   ```
4. **Run the app**
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (from Google Cloud Console)

## Project Structure

- `/src` — React + TypeScript frontend code
- `/public` — Static assets

## Notes

- Never commit your `.env` file or client secret to version control.
- This project does **not** require your Google client secret in the frontend.

## License

MIT
