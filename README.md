# 💍 Wedding - Wedding Planning System

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

## 📝 Description

This is a comprehensive wedding planning web application built with React, TypeScript, Vite, and Firebase. The application allows you to manage venues, professionals, favorites, and events in a calendar, all integrated with Firebase for authentication and data storage.

## ✨ Features

- 🔐 **Authentication system** with login and password recovery
- 📍 **Organization by cities** to register venues and professionals
- 🏨 **Event venue management** with price details, formats, and payment plans
- 👨‍🍳 **Professional registration** by type (photographer, DJ, catering, etc.)
- 💖 **Favorites system** to mark and compare preferred venues
- 📅 **Event calendar** to organize visits and appointments
- 📄 **Upload and management of PDF documents**
- 🌙 **Light/dark theme** for better user experience
- 📱 **Responsive design** adapted for mobile devices

## 🔧 Technologies Used

- **Frontend**:
  - React 19
  - TypeScript
  - React Router 7
  - CSS with variables for light/dark theme

- **Backend/Infrastructure**:
  - Firebase Authentication
  - Firebase Firestore (NoSQL database)
  - Firebase Storage (file storage)
  - Firebase Hosting

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
    userEmail: string
  }
  ```

## 📁 Folder Structure

```
/
├── public/                  # Static public files
├── src/
│   ├── assets/              # Images, fonts and other resources
│   ├── components/
│   │   ├── Calendar/        # Calendar-related components
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
├── eslint.config.js         # ESLint configuration
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

### Firebase Configuration

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Activate Authentication, Firestore, and Storage services
3. In Authentication, enable the email/password provider
4. In Firestore, create a database and configure security rules
5. In Storage, configure security rules to allow file uploads

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
   
7. Making a user an admin (safely):
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

## 📱 Using the Application

1. Log in with an admin user
2. On the main page, you will see three main sections:
   - **Planning**: Manage cities, venues, and professionals
   - **Favorites**: View and compare favorited venues
   - **Calendar**: Create and manage events

3. In the Planning module:
   - First register cities
   - Then select a city to register venues or professional types
   - For each venue, you can add PDF documents and mark as favorite
   - For professionals, you can organize them by type and associate them with venues

4. In the Calendar, click on a date to add events such as visits, meetings, etc.

## 🔒 Security

The application employs the following security measures:

- Authentication with Firebase Authentication
- Protected routes that verify user authentication
- Role-based permission system
- Security rules in Firestore and Storage

## 🛠️ Development

This project was developed with ❤️ by Pedro Bolson.

## 📄 License

This project is for personal use and does not have a specific license.
```
