# PitchCraft - AI Startup Pitch Generator

**PitchCraft** is an AI-powered app that helps students and aspiring founders quickly generate professional startup pitches, names, taglines, and content in minutes using AI (React + Gemini/OpenAI + Firebase).

## Features

- **AI-Generated Outputs**: Startup names, taglines, elevator pitches, audience profiles, landing page content
- **User Authentication**: Secure login and registration with Firebase Auth
- **Pitch Management**: Save, view, and manage your generated pitches
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Bilingual Support**: English + Roman Urdu (coming soon)

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **AI**: Google Gemini API
- **Routing**: React Router DOM

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy your Firebase config values to the `.env` file

### 4. Gemini API Setup

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file as `VITE_GEMINI_API_KEY`

### 5. Run the Application

```bash
npm run dev
```

## How It Works

1. **User Input**: Describe your startup idea
2. **AI Generation**: Gemini AI generates a comprehensive pitch including name, tagline, elevator pitch, target audience, features, and value proposition
3. **Save & Manage**: Save pitches to your dashboard for future reference
4. **Export**: Copy pitches to clipboard for presentations

## Project Structure

```
src/
├── components/
│   ├── navbar/
│   └── footer/
├── pages/
│   ├── CreatePitch.jsx
│   ├── Dashboard.jsx
│   └── Login.jsx
├── firebase.js
└── App.jsx
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
