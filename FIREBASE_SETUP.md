# Firebase Setup Guide for PitchCraft

## 🔥 Firebase Configuration Steps

### 1. **Firebase Console Setup**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pitchcraft-44ece`
3. Navigate to **Firestore Database**

### 2. **Create Firestore Database**
1. Click **"Create database"**
2. Choose **"Start in test mode"** (for development)
3. Select a location (choose closest to your users)

### 3. **Configure Firestore Rules**
Go to **Firestore Database** → **Rules** and replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own pitches
    match /pitches/{pitchId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
    
    // Allow authenticated users to read and write their own user data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. **Enable Authentication**
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Save changes

### 5. **Test the Setup**
1. Run your app: `npm run dev`
2. Try to register/login
3. Generate a pitch
4. Try to save it

## 🚨 Common Issues & Solutions

### **Issue: "Permission Denied"**
- **Solution**: Update Firestore rules (step 3 above)
- **Check**: Make sure you're logged in properly

### **Issue: "Service Unavailable"**
- **Solution**: Check Firebase service status
- **Check**: Verify your internet connection

### **Issue: "Collection doesn't exist"**
- **Solution**: Firestore will create collections automatically
- **Check**: Make sure Firestore database is created

## 📋 Verification Checklist

- [ ] Firestore database created
- [ ] Firestore rules updated
- [ ] Authentication enabled
- [ ] User can register/login
- [ ] User can generate pitches
- [ ] User can save pitches
- [ ] User can view saved pitches in dashboard

## 🔧 Debug Steps

1. **Check Browser Console** (F12) for error messages
2. **Check Firebase Console** → **Authentication** for user status
3. **Check Firebase Console** → **Firestore** for data
4. **Verify Environment Variables** in `.env` file

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your Firebase project configuration
3. Make sure all environment variables are set correctly
4. Restart the development server after making changes
