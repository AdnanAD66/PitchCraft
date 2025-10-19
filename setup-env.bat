@echo off
echo Creating .env file for PitchCraft...
echo.

echo # Firebase Configuration > .env
echo VITE_FIREBASE_API_KEY=AIzaSyCk9k7F32SVanJrk58yrllogHqY7x5JHXo >> .env
echo VITE_FIREBASE_AUTH_DOMAIN=pitchcraft-44ece.firebaseapp.com >> .env
echo VITE_FIREBASE_PROJECT_ID=pitchcraft-44ece >> .env
echo VITE_FIREBASE_STORAGE_BUCKET=pitchcraft-44ece.firebasestorage.app >> .env
echo VITE_FIREBASE_MESSAGING_SENDER_ID=1035176254737 >> .env
echo VITE_FIREBASE_APP_ID=1:1035176254737:web:d97517d6faf54ef52880b0 >> .env
echo VITE_FIREBASE_MEASUREMENT_ID=G-JZX1D3T6XW >> .env
echo. >> .env
echo # Google Gemini AI API Key - GET YOUR KEY FROM: https://makersuite.google.com/app/apikey >> .env
echo VITE_GEMINI_API_KEY=your_gemini_api_key_here >> .env

echo.
echo .env file created successfully!
echo.
echo IMPORTANT: You need to get your Gemini API key:
echo 1. Go to https://makersuite.google.com/app/apikey
echo 2. Create a new API key
echo 3. Replace "your_gemini_api_key_here" in the .env file with your actual key
echo 4. Restart the development server
echo.
pause
