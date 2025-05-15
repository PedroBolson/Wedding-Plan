# 💍 Wedding - Wedding Planning System

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Calendar](https://img.shields.io/badge/Google_Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)

## 📝 Description

This is a comprehensive wedding planning web application built with React, TypeScript, Vite, and Firebase. The application allows you to manage venues, professionals, favorites, and events in a calendar, all integrated with Firebase for authentication and data storage. It also features Google Calendar integration for seamless event management.

## ✨ Features

- 🔐 **Authentication system** with login and password recovery
- 📍 **Organization by cities** to register venues and professionals
- 🏨 **Event venue management** with price details, formats, and payment plans
- 👨‍🍳 **Professional registration** by type (photographer, DJ, catering, etc.)
- 💖 **Favorites system** to mark and compare preferred venues
- 💰 **Budget management** for tracking extra expenses with estimated and actual costs
- 📅 **Event calendar** to organize visits and appointments
- 🔄 **Google Calendar integration** to import and export events
- 📄 **Upload and management of PDF documents**
- 🌙 **Light/dark theme** for better user experience
- 📱 **Responsive design** adapted for mobile devices

## 🔧 Technologies Used

- **Frontend**:
  - React 19
  - TypeScript
  - React Router 7
  - CSS with variables for light/dark theme
  - Google OAuth Client Library

- **Backend/Infrastructure**:
  - Firebase Authentication
  - Firebase Firestore (NoSQL database)
  - Firebase Storage (file storage)
  - Firebase Hosting
  - Google Calendar API

- **Development Tools**:
  - Vite (build tool)
  - ESLint
  - TypeScript-ESLint

## 🗄️ Database Structure (Firestore)

The application uses the following collections in Firestore:

- **users**: Stores user information and permissions
  ```typescript
  {
    email: string,
    role: "admin",
    updatedAt: Timestamp
  }
  ```

- **cities**: Registered cities
  ```typescript
  {
    name: string
  }
  ```

- **venues**: Event venues
  ```typescript
  {
    name: string,
    cityId: string,
    venuePrice: number,
    foodPrice: number,
    drinkPrice: number,
    formats: string,
    installmentPlan: string,
    notes: string,
    isFavorite: boolean,
    favoritedAt: Timestamp | null,
    selectedProfessionalIds: string[],
    pdfDocuments: {
      id: string,
      name: string,
      url: string,
      uploadedAt: Timestamp
    }[]
  }
  ```

- **professionalTypes**: Professional types
  ```typescript
  {
    name: string
  }
  ```

- **professionals**: Registered professionals
  ```typescript
  {
    name: string,
    cityId: string,
    typeId: string,
    price: number,
    formats: string,
    installmentPlan: string,
    isFavorite: boolean
  }
  ```

- **events**: Calendar events
  ```typescript
  {
    title: string,
    description: string,
    type: string,
    location: string,
    date: Timestamp,
    endDate: Timestamp | null,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    userId: string,
    userEmail: string,
    googleId?: string,
    importedFromGoogleCalendar?: boolean
  } 
  ```

  - **budgetExtras**: Additional budget items
  ```typescript
  {
    description: string,
    category: string,
    cityId: string,
    estimatedCost: number,
    actualCost: number,
    paid: boolean,
    notes: string,
    isFavorite: boolean,
    userId: string,
    createdAt: Timestamp
  }

## 📁 Folder Structure

```markdown
/
├── src/
│   ├── components/
│   │   ├── Budget/          # Budget management components
│   │   │   ├── Budget.tsx           # Main budget component
│   │   │   └── Budget.css           # Budget styles
│   │   ├── Calendar/        # Calendar-related components
│   │   │   ├── Calendar.tsx           # Main calendar component
│   │   │   ├── Calendar.css           # Calendar styles
│   │   │   ├── GoogleCalendarIntegration.tsx # Google Calendar integration
│   │   │   └── DayEventsModal.tsx     # Day events modal
│   │   ├── Favorites/       # Component to manage favorites
│   │   ├── LoginForm/       # Login form
│   │   ├── Nav/             # Main navigation
│   │   └── Planning/        # Main planning component
│   ├── firebase/              # Firebase configuration (not included in git)
│   ├── pages/
│   │   ├── Login/           # Login page
│   │   └── MainPage/        # Main page with features
│   ├── routes/
│   │   └── PrivateRoute.tsx # Authentication-protected route
│   ├── App.css              # Global styles
│   ├── App.tsx              # Main component
│   ├── index.css            # Base styles
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # Type definitions for Vite
├── .gitignore               # Files ignored by Git
├── firebase.json            # Firebase deployment configuration
├── index.html               # Base HTML file
├── package.json             # Dependencies and scripts
├── tsconfig.app.json        # TypeScript configuration for the app
├── tsconfig.json            # Main TypeScript configuration
├── tsconfig.node.json       # TypeScript configuration for Node.js
└── vite.config.ts           # Vite configuration
```

## 🚀 Setting up and Running the Project

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Firebase account
- Google Cloud account

### Firebase Configuration

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Activate Authentication, Firestore, and Storage services
3. In Authentication, enable the email/password provider
4. In Firestore, create a database and configure security rules
5. In Storage, configure security rules to allow file uploads

### Google Calendar API Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Configure OAuth consent screen:
   - Set application name, support email, and authorized domains
   - Add necessary scopes: `.../auth/calendar` and `.../auth/calendar.events`
5. Create OAuth Client ID credentials:
   - Application type: Web application
   - Add authorized JavaScript origins (your domain and localhost for development)
   - Add authorized redirect URIs
6. Copy the Client ID to use in your application

### Project Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/PedroBolson/Wedding-Plan.git
   cd Casamento
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the project root with the following variables:
   ```
    VITE_FIREBASE_API_KEY=your-api-key
    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your-project-id
    VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-id
    VITE_FIREBASE_APP_ID=your-app-id
    VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
    VITE_FIREBASE_OAUTH_CLIENT_ID=your-client-id
    VITE_FIREBASE_EXPORT_API=your-export-api-link-to-calendar
    VITE_FIREBASE_IMPORT_API=your-import-api-link-to-calendar
   ```

4. Set up Firebase configuration files (not included in git for security reasons):
   - Create a `src/firebase` directory
   - Create a `config.ts` file using the configuration code provided by Firebase:
     - In the Firebase Console, go to your project
     - Click on the web app icon (</>) to create or access your web app
     - Firebase will provide the configuration code snippet
     - Copy this code and modify it to use environment variables:
     
     ```typescript
     // Replace direct values with environment variables
     const firebaseConfig = {
         apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
         ...
     };
     
     // Initialize Firebase
     const app = initializeApp(firebaseConfig);
     export const auth = getAuth(app);
     export const db = getFirestore(app);
     export const storage = getStorage(app);
     ```

5. Create admin user functionality:
   - Create a `createadmin.ts` file in the `src/firebase` directory:
     ```typescript
     // Code to add admin role to an existing user
     import { doc, setDoc } from "firebase/firestore";
     import { db } from "./config";
     
     export const makeUserAdmin = async (userId: string, email: string) => {
         try {
             // Add document to users collection with admin role
             await setDoc(doc(db, "users", userId), {
                 email: email,
                 role: "admin",
                 updatedAt: new Date()
             }, { merge: true }); // merge: true preserves existing data
             
             return { success: true };
         } catch (error) {
             console.error("Error setting user as admin:", error);
             return { success: false, error };
         }
     };
     ```
   
6. Making a user an admin (safely):
   - First, create a regular user through the login interface
   - Use Firebase Console to get the user ID from Authentication section
   - Create a temporary script file (not committed to git) that imports and calls the makeUserAdmin function:
     ```typescript
     import { makeUserAdmin } from './src/firebase/createadmin';
     
     // Replace with actual user ID and email
     makeUserAdmin("user-id-from-firebase-console", "user-email@example.com")
       .then(result => console.log(result));
     ```
   - Execute this script using Node.js
   - Delete the script after use to avoid exposing user IDs

### Execution

To run the project in development mode:
```bash
npm run dev
# or
yarn dev
```

> **Note:** The Firebase configuration files (`config.ts` and `createadmin.ts`) are not included in the repository for security reasons. You need to create them as described above before running the application.

To build the project for production:
```bash
npm run build
# or
yarn build
```

### Deployment to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. Initialize the Firebase project (if not already done):
   ```bash
   firebase init
   ```

4. Deploy:
   ```bash
   firebase deploy
   ```

## 📦 Cloud Functions Setup
1. **Type on bash**
  ```bash
    firebase init functions
  ```

2. **This will create a functions folder with:**
  ```
  /
  functions/
  ├── lib/ 
  ├── node_modules/
  ├── src/
  │   └── index.ts   # Functions to firebase
  ├── .gitignore
  ├── package.json
  ├── package-lock.json
  └── tsconfig.json
  ```

3. **Install dependencies**

   ```bash
   cd functions
   npm install cors node-fetch
   ```

4. **Outline your `index.ts` as follows**

   * **Imports**:

     ```ts
     import * as functions from "firebase-functions";
     import type { Request, Response } from "express";
     import cors from "cors";
     ```
   * **CORS middleware** to allow browser requests:

     ```ts
     const corsHandler = cors({ origin: true });
     ```
   * **Two HTTP functions** wrapped in CORS:

     1. **`exportEventToGoogle`**

        * Accepts a JSON body `{ accessToken, event }`
        * Calls `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`
        * Returns the Google Calendar API response or an error status (`405` for non-POST, `500` for server errors)
     2. **`importEventsFromGoogle`**

        * Accepts a JSON body `{ accessToken }`
        * Builds a URL with `timeMin=now` and `timeMax=now+30 days`
        * Fetches events via `GET` and returns the raw JSON (same error handling)
   * **Dynamic fetch import**:

     ```ts
     const { default: fetch } = await import("node-fetch");
     ```

5. **Compile and deploy**

   ```bash
   npm run build
   firebase deploy --only functions
   ```

---

#### 📝 Example “prompt” to generate this file via an AI assistant

> “I need a `functions/src/index.ts` for Firebase Cloud Functions in TypeScript. It should:
>
> 1. Import `firebase-functions`, Express types, and the `cors` package
> 2. Apply CORS middleware for all origins
> 3. Define two HTTPS functions:
>
>    * `exportEventToGoogle`: accepts `{ accessToken, event }`, posts to the Google Calendar API, and returns JSON
>    * `importEventsFromGoogle`: accepts `{ accessToken }`, queries events for the next 30 days, and returns JSON
> 4. Handle non-POST requests with 405 and internal errors with 500
> 5. Use dynamic `node-fetch` import for HTTP calls
>    Please generate the complete `index.ts` file.”


## 📱 Using the Application

1. Log in with an admin user
2. On the main page, you will see four main sections:
   - **Planning**: Manage cities, venues, and professionals
   - **Budget**: Track and manage extra expenses not included in venues or professionals
   - **Favorites**: View and compare favorited venues and extra budget items
   - **Calendar**: Create and manage events

3. In the Planning module:
   - First register cities
   - Then select a city to register venues or professional types
   - For each venue, you can add PDF documents and mark as favorite
   - For professionals, you can organize them by type and associate them with venues

4. In the Budget module:
   - Add extra expenses categorized by type (decoration, dress, rings, etc.)
   - Track both estimated and actual costs
   - Mark items as favorites to include them in cost calculations
   - Filter items by category and city

5. In the Calendar, click on a date to add events such as visits, meetings, etc.

6. Use the Google Calendar integration to import and export events seamlessly.

## 🔒 Security

The application employs the following security measures:

- Authentication with Firebase Authentication
- Protected routes that verify user authentication
- Role-based permission system
- Security rules in Firestore and Storage
- OAuth 2.0 for Google Calendar integration

## 🛠️ Development

This project was developed with ❤️ by Pedro Bolson.

## 📄 License

This project is for personal use and does not have a specific license.
