import React, { useState, useEffect } from "react";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { 
  Lock, 
  Mail, 
  User, 
  Briefcase, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Loader, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (uid: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [occupation, setOccupation] = useState("Student");
  const [gender, setGender] = useState("Prefer not to say");
  const [showPassword, setShowPassword] = useState(false);

  // Password Strength State
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    numberOrSpecial: false,
  });
  const [strengthScore, setStrengthScore] = useState(0);

  // Real-time password requirement check
  useEffect(() => {
    if (isLogin) return;
    const reqs = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numberOrSpecial: /[\d!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordRequirements(reqs);

    const score = Object.values(reqs).filter(Boolean).length;
    setStrengthScore(score);
  }, [password, isLogin]);

  // Handle standard registration
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (strengthScore < 4) {
      setError("Please choose a stronger password matching all 4 safety criteria.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create authentication user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional profile details to Firestore database
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || email,
        displayName: name.trim(),
        occupation,
        gender,
        description: `Studying as a dedicated ${occupation}.`,
        createdAt: new Date().toISOString(),
      });

      onAuthSuccess(user.uid);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || "Sign Up failed. Please check your inputs.";
      if (e.code === "auth/email-already-in-use") {
        errMsg = "This email is already in use. Please log in instead.";
      } else if (e.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (e.code === "auth/weak-password") {
        errMsg = "The password is too weak.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle standard login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onAuthSuccess(userCredential.user.uid);
    } catch (e: any) {
      console.error(e);
      let errMsg = "Incorrect email or password.";
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        errMsg = "Invalid login credentials. Please verify and try again.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user record exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create initial record
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Google Scholar",
          occupation: "Student",
          gender: "Prefer not to say",
          description: "Focus.AI Scholar",
          createdAt: new Date().toISOString(),
        });
      }

      onAuthSuccess(user.uid);
    } catch (e: any) {
      console.error(e);
      let errMsg = "Google Login failed or was cancelled.";
      if (e.code === "auth/popup-blocked") {
        errMsg = "Google pop-up was blocked. Please enable pop-ups for this site.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30 selection:text-white">
      {/* Dynamic Cosmic Background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full filter blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl p-8 shadow-2xl z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-600/20 mb-3">
            F
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            {isLogin ? "Welcome to Focus.AI" : "Create your Scholar Profile"}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            {isLogin 
              ? "Access your proactive strategic study companion" 
              : "Set up a database-backed profile to unlock AI assessments"}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-850 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isLogin 
                ? "bg-slate-800 text-slate-100 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isLogin 
                ? "bg-slate-800 text-slate-100 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-5 bg-red-950/40 border border-red-900/60 text-red-300 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Core Auth Forms */}
        <form onSubmit={isLogin ? handleEmailLogin : handleEmailSignUp} className="space-y-4">
          
          {/* User Fields for Sign Up Only */}
          {!isLogin && (
            <>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="signup_name"
                    type="text"
                    required
                    placeholder="Alex Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Occupation and Gender Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Occupation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <select
                      id="signup_occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Researcher">Researcher</option>
                      <option value="Professional">Professional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Gender
                  </label>
                  <div className="relative">
                    <HelpCircle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <select
                      id="signup_gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email (Always) */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="auth_email"
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Password (Always) */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="auth_password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Strong Password Requirements & Progress Indicator (Sign Up Only) */}
          {!isLogin && password.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-semibold uppercase">Password Strength</span>
                <span className={`font-bold uppercase ${
                  strengthScore <= 1 ? "text-red-400" :
                  strengthScore <= 3 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {strengthScore <= 1 ? "Weak" :
                   strengthScore <= 3 ? "Moderate" : "Strong"}
                </span>
              </div>
              
              {/* Strength Visual Meter */}
              <div className="grid grid-cols-4 gap-1.5 h-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-all duration-300 ${
                      strengthScore >= step
                        ? strengthScore <= 1 ? "bg-red-500" :
                          strengthScore <= 3 ? "bg-amber-500" : "bg-emerald-500"
                        : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordRequirements.length ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={passwordRequirements.length ? "text-slate-300" : "text-slate-500"}>Min 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordRequirements.uppercase ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={passwordRequirements.uppercase ? "text-slate-300" : "text-slate-500"}>1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordRequirements.lowercase ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={passwordRequirements.lowercase ? "text-slate-300" : "text-slate-500"}>1 lowercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordRequirements.numberOrSpecial ? "text-emerald-400" : "text-slate-600"}`} />
                  <span className={passwordRequirements.numberOrSpecial ? "text-slate-300" : "text-slate-500"}>1 number/special</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            id="auth_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign In to Focus" : "Register Database Account"}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider separator */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-full border-t border-slate-800" />
          <span className="relative px-3 bg-slate-900 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          id="google_auth_btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-850 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {/* Sleek Google SVG vector icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Login with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
