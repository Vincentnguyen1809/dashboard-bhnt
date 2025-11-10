# 🚀 Firebase Admin Login - Setup Guide

This guide will walk you through setting up your Firebase project so you can successfully log in as the admin.

**IMPORTANT**: Follow these steps IN ORDER. Each step is critical!

---

## ⚠️ Prerequisites

Before you begin, make sure you have:
- A Firebase account (https://firebase.google.com/)
- Your Firebase project created (project ID: `vincent-nguyen`)
- Access to Firebase Console

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Enable Firebase Authentication

This step allows users to log in with email and password.

1. Go to the **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **vincent-nguyen**
3. Click on **Authentication** in the left sidebar
4. Click on the **Sign-in method** tab
5. Find **Email/Password** in the list of providers
6. Click on **Email/Password**
7. Toggle **Enable** to ON
8. Click **Save**

✅ **Verification**: You should see "Email/Password" listed as "Enabled" in the Sign-in method tab.

---

### Step 2: Set Firestore Database Rules

This is **CRITICAL** to fix the "Missing or insufficient permissions" error.

Your Firestore rules need to allow the `createOwnerAccount()` function to write to the `users` collection without being authenticated (since the admin account doesn't exist yet).

1. In Firebase Console, click on **Firestore Database** in the left sidebar
2. Click on the **Rules** tab
3. **Replace ALL existing rules** with the following:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Allow anyone to CREATE a user document (needed for createOwnerAccount function)
    // This allows the initial admin account creation
    match /users/{userId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    // All other collections are locked down by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click **Publish**

⚠️ **IMPORTANT SECURITY NOTE**:
- The `allow create: if true;` rule allows ANYONE to create a user document
- This is necessary for the initial setup, but you should update the rules after creating your admin account
- See "Step 5: Secure Firestore Rules (After Setup)" below

✅ **Verification**: Your rules should show "Last updated: just now"

---

### Step 3: Deploy and Open the Application

Now that Firebase is configured, you can deploy your application.

1. **Option A - Local Development (Recommended for testing)**:
   - Open `index.html` directly in your browser (double-click the file)
   - OR use a local server: `python3 -m http.server 8000` and go to http://localhost:8000

2. **Option B - Deploy to Firebase Hosting**:
   ```bash
   firebase init hosting
   firebase deploy
   ```

3. **Option C - Use any static hosting** (Netlify, Vercel, GitHub Pages, etc.)

✅ **Verification**: You should see the "Admin Login" page with email and password fields.

---

### Step 4: Create the Admin Account

This is a **ONE-TIME OPERATION**. You only need to do this once.

1. Open the login page in your browser
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Type the following command and press **Enter**:

```javascript
createOwnerAccount()
```

5. Wait for the messages to appear in the console

**Expected Output (Success)**:
```
🚀 Starting admin account creation...
📝 Creating user in Firebase Auth...
✅ User created in Firebase Auth: [some-uid]
📝 Creating user document in Firestore...
✅ User document created in Firestore
🎉 Admin account created successfully!
📧 Email: xuanthuongqtkd@gmail.com
🔑 You can now log in with your credentials
```

**If you see an error**:

| Error | Solution |
|-------|----------|
| `auth/email-already-in-use` | The account already exists! You can skip to Step 5 and log in. |
| `permission-denied` | Go back to Step 2 and verify your Firestore rules are correct. |
| `auth/operation-not-allowed` | Go back to Step 1 and verify Email/Password authentication is enabled. |

✅ **Verification**:
- Check Firebase Console > Authentication > Users - you should see `xuanthuongqtkd@gmail.com`
- Check Firestore Database > users collection - you should see a document with `role: "admin"`

---

### Step 5: Log In

Now you can log in normally!

1. On the login page, enter:
   - **Email**: `xuanthuongqtkd@gmail.com`
   - **Password**: `Vincent1809$$`

2. Click **Login**

3. You should see: **"✅ Đăng nhập thành công!"**

✅ **Success!** You're now logged in as the admin.

---

### Step 6: Secure Firestore Rules (IMPORTANT - Do After Setup)

After you've successfully created your admin account and confirmed you can log in, you should update your Firestore rules to be more secure.

**Updated Secure Rules**:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Only allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Add rules for other collections here as needed
    // Example:
    // match /posts/{postId} {
    //   allow read: if true;
    //   allow write: if request.auth != null;
    // }

    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

This removes the `allow create: if true;` rule, which was only needed for the initial setup.

---

## 🔧 Troubleshooting

### Issue: "Đăng nhập thất bại" (Login Failed)

**Possible Causes**:
1. Wrong email or password
2. Admin account wasn't created successfully
3. Email/Password authentication not enabled

**Solutions**:
1. Check console (F12) for detailed error messages
2. Verify the admin account exists in Firebase Console > Authentication
3. Try running `createOwnerAccount()` again (if email already exists, this is OK)

---

### Issue: "Missing or insufficient permissions"

**Cause**: Firestore rules are not set correctly

**Solution**: Go back to Step 2 and verify your Firestore rules exactly match the provided rules

---

### Issue: "Firebase not defined" or SDK errors

**Cause**: Firebase SDK not loading properly

**Solutions**:
1. Check your internet connection
2. Verify the Firebase SDK script tags are in `index.html`
3. Check browser console for any script loading errors

---

## 📝 Quick Reference

**Admin Credentials**:
- Email: `xuanthuongqtkd@gmail.com`
- Password: `Vincent1809$$`

**Firebase Project**: vincent-nguyen

**Files Created**:
- `index.html` - Login page UI
- `style.css` - Styling
- `script.js` - Firebase logic and authentication

**Key Functions**:
- `createOwnerAccount()` - Creates admin account (run once from console)

---

## ✅ Checklist

Use this checklist to ensure you've completed all steps:

- [ ] Step 1: Enabled Email/Password authentication in Firebase
- [ ] Step 2: Updated Firestore rules to allow user creation
- [ ] Step 3: Deployed/opened the application
- [ ] Step 4: Ran `createOwnerAccount()` from console successfully
- [ ] Step 5: Successfully logged in with admin credentials
- [ ] Step 6: Updated Firestore rules to be more secure

---

## 🎉 Success!

Once you've completed all steps and can log in successfully, you're all set!

You now have a working Firebase authentication system with an admin account.

---

## 📚 Next Steps

After successful login, you might want to:
1. Create a dashboard page (`dashboard.html`)
2. Add user role checking
3. Build admin features
4. Add more user management functionality

---

**Need Help?**

If you encounter any issues not covered in this guide, check:
- Firebase Console for any error messages
- Browser console (F12) for detailed error logs
- Firebase Authentication and Firestore Database tabs to verify data
