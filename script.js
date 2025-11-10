// ============================================
// FIREBASE CONFIGURATION
// ============================================

// My correct Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDX-XFXDgziXmsHkWHuUH5zlANYm0dehKY",
  authDomain: "vincent-nguyen.firebaseapp.com",
  projectId: "vincent-nguyen",
  storageBucket: "vincent-nguyen.firebasestorage.app",
  messagingSenderId: "15594526987",
  appId: "1:15594526987:web:50e4ecf8548302d598aa0e",
  measurementId: "G-CV6XDV7WSC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log("✅ Firebase initialized successfully");

// ============================================
// ADMIN ACCOUNT CREATOR (Run once from console)
// ============================================

/**
 * Creates the owner/admin account in Firebase Auth and Firestore
 * This function should be run ONCE from the browser console (F12)
 *
 * Usage: Open console and type: createOwnerAccount()
 */
async function createOwnerAccount() {
  const adminEmail = "xuanthuongqtkd@gmail.com";
  const adminPassword = "Vincent1809$$";

  console.log("🚀 Starting admin account creation...");

  try {
    // Step 1: Create user in Firebase Auth
    console.log("📝 Creating user in Firebase Auth...");
    const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
    const user = userCredential.user;

    console.log("✅ User created in Firebase Auth:", user.uid);

    // Step 2: Create user document in Firestore
    console.log("📝 Creating user document in Firestore...");
    await db.collection("users").doc(user.uid).set({
      email: adminEmail,
      role: "admin",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ User document created in Firestore");
    console.log("🎉 Admin account created successfully!");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 You can now log in with your credentials");

    return { success: true, uid: user.uid };

  } catch (error) {
    console.error("❌ Error creating admin account:", error.code, error.message);

    // Provide helpful error messages
    if (error.code === "auth/email-already-in-use") {
      console.log("ℹ️ This email is already registered. You can log in directly.");
    } else if (error.code === "permission-denied") {
      console.error("⚠️ FIRESTORE PERMISSION DENIED!");
      console.log("📋 Please check your Firestore Rules and ensure:");
      console.log("   match /users/{userId} { allow create: if true; }");
    }

    return { success: false, error: error.message };
  }
}

// Make function available globally (accessible from console)
window.createOwnerAccount = createOwnerAccount;

console.log("💡 To create admin account, open console and run: createOwnerAccount()");

// ============================================
// LOGIN FUNCTIONALITY
// ============================================

// Get form elements
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("toggle-password");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");

// Password toggle functionality
togglePasswordBtn.addEventListener("click", function() {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;

  // Change icon
  togglePasswordBtn.textContent = type === "password" ? "👁️" : "🙈";
});

// Login form submission
loginForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  // Clear previous messages
  errorMessage.textContent = "";
  successMessage.textContent = "";

  // Get input values
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Basic validation
  if (!email || !password) {
    errorMessage.textContent = "Vui lòng nhập đầy đủ thông tin";
    return;
  }

  console.log("🔐 Attempting login for:", email);

  try {
    // Sign in with Firebase Auth
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    console.log("✅ Login successful!");
    console.log("User ID:", user.uid);
    console.log("Email:", user.email);

    // Show success message
    successMessage.textContent = "✅ Đăng nhập thành công!";

    // Optional: Redirect to dashboard or home page
    // window.location.href = "dashboard.html";

    // For now, just log success
    setTimeout(() => {
      alert("Login successful! User: " + user.email);
    }, 500);

  } catch (error) {
    console.error("❌ Login failed:", error.code, error.message);

    // Show user-friendly error message
    errorMessage.textContent = "Đăng nhập thất bại";

    // Log detailed error for debugging
    if (error.code === "auth/user-not-found") {
      console.log("ℹ️ User not found. Have you run createOwnerAccount() yet?");
    } else if (error.code === "auth/wrong-password") {
      console.log("ℹ️ Incorrect password");
    } else if (error.code === "auth/invalid-email") {
      console.log("ℹ️ Invalid email format");
    }
  }
});

// ============================================
// AUTH STATE OBSERVER (Optional)
// ============================================

// Monitor authentication state
auth.onAuthStateChanged(function(user) {
  if (user) {
    console.log("👤 User is signed in:", user.email);
  } else {
    console.log("👤 No user is signed in");
  }
});
