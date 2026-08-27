import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  BarChart3, 
  BookOpen, 
  ShieldCheck, 
  User, 
  Globe, 
  Lock,
  ArrowRight,
  Mail,
  CheckCircle2,
  LockKeyhole,
  Laptop,
  Eye,
  EyeOff,
  ChevronLeft,
  UserPlus,
  Info,
  XCircle,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { AppSettings } from '../types';
import logoTSPM from '../logoTSPM.png';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../firebase';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  onGuestLogin: () => void;
  settings: AppSettings;
}

export function LoginScreen({ onGoogleLogin, onGuestLogin, settings }: LoginScreenProps) {
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [isLoggingInGuest, setIsLoggingInGuest] = useState(false);

  // Advanced Auth System states
  const [authMode, setAuthMode] = useState<'options' | 'login' | 'register' | 'forgot'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Weak / कमजोर', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { score, label: 'Medium / ठीक है', color: 'bg-amber-500', width: '66%' };
    return { score, label: 'Strong / मजबूत', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength(password);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password / कृपया ईमेल और पासवर्ड दोनों दर्ज करें।");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      localStorage.setItem('ts_last_logged_in_email', email.trim());
      setSuccessMessage("Authenticated successfully! Welcome back... / लॉगिन सफल!");
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      let msg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = "Invalid email or password / अमान्य ईमेल या पासवर्ड।";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Invalid email format / अमान्य ईमेल प्रारूप।";
      } else if (err.code === 'auth/user-disabled') {
        msg = "This account has been disabled / यह खाता निष्क्रिय कर दिया गया है।";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is currently disabled in your Firebase Console. Action required: Go to Firebase Console > Authentication > Sign-in Method > Enable 'Email/Password' & save / फ़ायरबेस कंसोल में 'ईमेल/पासवर्ड' लॉगिन प्रदाता को सक्षम करें।";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage("Please enter your name / कृपया अपना नाम दर्ज करें।");
      return;
    }
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage("Please fill in all fields / कृपया सभी विवरण भरें।");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match / पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long / पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
      return;
    }

    const strengthCheck = getPasswordStrength(password);
    if (strengthCheck.score < 3) {
      setErrorMessage("Password is too weak. Please use a stronger password / पासवर्ड बहुत कमजोर है। कृपया एक मजबूत पासवर्ड का उपयोग करें।");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: fullName.trim() });
      localStorage.setItem('ts_last_logged_in_email', email.trim());
      setSuccessMessage("Account created successfully! Welcome... / खाता सफलतापूर्वक बनाया गया!");
    } catch (err: any) {
      console.error("Registration failed:", err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered / यह ईमेल पहले से ही पंजीकृत है।";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Invalid email format / अमान्य ईमेल प्रारूप।";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password is too weak / पासवर्ड बहुत कमजोर है।";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is currently disabled in your Firebase Console. Action required: Go to Firebase Console > Authentication > Sign-in Method > Enable 'Email/Password' & save / फ़ायरबेस कंसोल में 'ईमेल/पासवर्ड' लॉगिन प्रदाता को सक्षम करें।";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email / कृपया अपना ईमेल दर्ज करें।");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage("Password reset email sent! Check your inbox / पासवर्ड रीसेट लिंक भेज दिया गया है! अपना इनबॉक्स जांचें।");
    } catch (err: any) {
      console.error("Reset email failed:", err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found') {
        msg = "No account found with this email / इस ईमेल के साथ कोई खाता नहीं मिला।";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Invalid email format / अमान्य ईमेल प्रारूप।";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retrieve previously logged-in email, defaulting to the custom user email for high-end preview look
  const previousEmail = localStorage.getItem('ts_last_logged_in_email') || 'stalha2110@gmail.com';

  const handleGoogleClick = async () => {
    setIsLoggingInGoogle(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGuestClick = () => {
    setIsLoggingInGuest(true);
    setTimeout(() => {
      onGuestLogin();
      setIsLoggingInGuest(false);
    }, 800);
  };

  const benefits = [
    {
      icon: <Zap size={18} className="text-amber-500 animate-pulse" />,
      title: "Lightning POS Billing",
      desc: "Fast real-time billing, automatic tax calculations, and dynamic thermal receipts with custom branding."
    },
    {
      icon: <BarChart3 size={18} className="text-emerald-500" />,
      title: "Smart Stock & Inventory",
      desc: "Track stock thresholds, margins, automatic low-stock triggers, and granular profit summaries."
    },
    {
      icon: <BookOpen size={18} className="text-indigo-500" />,
      title: "Digital Udhar Ledger (Bahi Khata)",
      desc: "Manage customer outstanding credits, record repayments, and view dynamic merchant books."
    },
    {
      icon: <ShieldCheck size={18} className="text-cyan-500" />,
      title: "Secure Cloud Synchronization",
      desc: "Automatic secure database backups with offline integrity, powered by Google Firebase."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-850 flex flex-col justify-between overflow-hidden font-sans select-none">
      
      {/* 🌌 High-End Advanced Ambient Moving Orbs (Futuristic Ambient Fluid Design) */}
      <motion.div 
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -80, 50, 0],
          scale: [1, 1.12, 0.92, 1]
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[15%] w-[750px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-200/30 via-purple-100/25 to-teal-100/20 blur-[130px] pointer-events-none select-none" 
      />

      <motion.div 
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 70, -60, 0],
          scale: [1, 0.88, 1.12, 1]
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] right-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-100/20 via-indigo-100/25 to-purple-150/15 blur-[120px] pointer-events-none select-none" 
      />

      <motion.div 
        animate={{
          x: [0, 40, -40, 0],
          y: [0, 35, -45, 0],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[30%] left-[35%] w-[400px] h-[400px] rounded-full bg-indigo-300/15 blur-[100px] pointer-events-none select-none" 
      />
      
      {/* 🌐 Subtle Tech-Grid Matrix Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,#000_80%,transparent_100%)] opacity-[0.16] pointer-events-none" />

      {/* ✨ Ambient Moving Glowing Cyber Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 1200, 
              y: Math.random() * 800, 
              opacity: Math.random() * 0.3 + 0.1,
              scale: Math.random() * 0.7 + 0.3
            }}
            animate={{
              y: ["100vh", "-10vh"],
              x: ["0px", `${(Math.random() - 0.5) * 160}px`],
              opacity: [0, 0.5, 0.5, 0]
            }}
            transition={{
              duration: Math.random() * 18 + 18,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * -18
            }}
            className="absolute w-2.5 h-2.5 rounded-full bg-indigo-400/30 blur-[1px]"
          />
        ))}
      </div>

      {/* 🚀 Header Bar - Floating Crisp Glassmorphism styled to perfectly separate from page body */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_4px_30px_rgba(15,23,42,0.02)]"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Unconstrained logo with premium shadowless render */}
            <img 
              src={logoTSPM} 
              alt="TS Price Manager Logo" 
              className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 hover:scale-110" 
              referrerPolicy="no-referrer"
            />
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-900 leading-none">
              TS Price Manager
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-full px-3.5 py-1 text-[9px] font-mono font-extrabold border border-slate-200/60">
              SECURE SESSION
            </span>
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 text-[10px] font-mono font-bold text-indigo-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
              <span>v3.5.0</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* 🏛️ Main Interactive SaaS Showcase */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        
        {/* Left Grid: High Status Commercial Description */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="lg:col-span-7 space-y-8 text-left max-w-2xl"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-full px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">
              <Sparkles size={11} className="text-indigo-600 animate-pulse" />
              Elite Shop Management Solution
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 uppercase">
              Operate your retail<br />
              business with{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                absolute precision.
              </span>
            </h2>
            
            <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
              An enterprise-grade, offline-first checkout counter, smart inventory vault, and digital bahi khata ledger custom tailored for modern Indian retail. 
            </p>
          </div>

          {/* Clean Interactive Grid of Key Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-2">
            {benefits.map((benefit, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-5 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.035)] hover:translate-y-[-2px] transition-all duration-300 group"
              >
                <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center mb-3.5 border border-slate-100/80 transition-transform duration-300 group-hover:scale-110">
                  {benefit.icon}
                </div>
                <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wide">{benefit.title}</h4>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Grid: Elite Minimalist Portal Login Card with subtle dynamic float animation */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md shrink-0"
          >
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.04)] rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden"
            >
              {/* Modern Top Horizontal Subtle Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400" />
              
              <div className="space-y-7">
                
                {/* App Logo & Corporate Identity - Perfect display, unconstrained and with label below */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <motion.img 
                    src={logoTSPM} 
                    alt="TS Price Manager Logo" 
                    className="h-24 w-auto object-contain select-none"
                    referrerPolicy="no-referrer"
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  
                  {/* Brand Identifier */}
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 mt-4.5 leading-none">
                    TS Price Manager
                  </h2>
                  <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mt-2">
                    Enterprise Suite
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {authMode === 'options' && (
                    <motion.div
                      key="options"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Single English (Ind) Language Badge */}
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">
                          <Globe size={11} className="text-indigo-600 animate-pulse" />
                          <span>English (Ind)</span>
                        </div>
                      </div>

                      {/* Portal Call To Actions */}
                      <div className="space-y-4">
                        {/* Advanced Google Auth Button with Integrated Session Email Display */}
                        <button
                          id="google-login-btn"
                          onClick={handleGoogleClick}
                          disabled={isLoggingInGoogle || isLoggingInGuest}
                          className="w-full relative flex flex-col items-center justify-center bg-slate-950 hover:bg-slate-900 text-white transition-all py-4 px-6 rounded-2xl cursor-pointer active:scale-95 shadow-[0_10px_25px_rgba(15,23,42,0.15)] disabled:opacity-50 disabled:pointer-events-none group"
                        >
                          <div className="flex items-center justify-center gap-3 w-full">
                            {isLoggingInGoogle ? (
                              <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                                <path
                                  fill="#FFFFFF"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="#FFFFFF"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  className="opacity-90"
                                />
                                <path
                                  fill="#FFFFFF"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                  className="opacity-80"
                                />
                                <path
                                  fill="#FFFFFF"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                              </svg>
                            )}
                            
                            <span className="font-black text-xs uppercase tracking-widest">
                              {isLoggingInGoogle ? "Syncing Identity..." : "Continue with Google"}
                            </span>
                          </div>

                          {!isLoggingInGoogle && previousEmail && (
                            <div className="mt-2 w-full bg-slate-900 border border-slate-800/80 rounded-lg py-1.5 px-3 flex items-center justify-center gap-2 text-[9.5px] text-indigo-300 font-medium tracking-normal hover:text-white transition-colors">
                              <Mail size={10.5} className="text-indigo-400 shrink-0" />
                              <span className="truncate">Sign in as: {previousEmail}</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            </div>
                          )}
                        </button>

                        {/* Sign In with Email option */}
                        <button
                          id="email-signin-option-btn"
                          onClick={() => {
                            setAuthMode('login');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          disabled={isLoggingInGoogle || isLoggingInGuest}
                          className="w-full relative flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm group"
                        >
                          <Mail size={13} className="text-indigo-600 group-hover:scale-110 transition-all" />
                          <span>Sign In with Email</span>
                        </button>

                        {/* Aesthetic Section Line Divider */}
                        <div className="flex items-center justify-between text-slate-300 text-[9px] font-bold uppercase tracking-widest px-1 py-1">
                          <div className="h-px bg-slate-200 flex-1" />
                          <span className="px-3.5 text-slate-400 font-extrabold">OR CHOOSE LOCAL MODE</span>
                          <div className="h-px bg-slate-200 flex-1" />
                        </div>

                        {/* Secondary Option: Guest Login Button */}
                        <button
                          id="guest-login-btn"
                          onClick={handleGuestClick}
                          disabled={isLoggingInGoogle || isLoggingInGuest}
                          className="w-full relative flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                        >
                          {isLoggingInGuest ? (
                            <div className="h-4 w-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <User size={13} className="text-teal-600" />
                          )}
                          <span>Access Local Guest Mode</span>
                        </button>
                      </div>

                      {/* Secure Trust Info Panel */}
                      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-[10.5px] text-slate-500 leading-relaxed text-left">
                        <Lock size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-slate-800 uppercase text-[9px] tracking-wide mb-0.5">Automated Cloud backups</p>
                          <p className="text-slate-500 text-[10px] leading-relaxed">
                            Connecting your account protects your shop metrics, records, and client bahi khata instantly against any cache clearing.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {authMode === 'login' && (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 text-left"
                    >
                      <button
                        onClick={() => setAuthMode('options')}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <ChevronLeft size={13} />
                        Back to choices
                      </button>

                      <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                          Sign In
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Enter your credentials to synchronize your store metrics securely.
                        </p>
                      </div>

                      {/* Status messages */}
                      {errorMessage && (
                        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-rose-800 text-xs font-bold leading-relaxed">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                          <p className="text-[10px] font-extrabold text-rose-800">{errorMessage}</p>
                        </div>
                      )}

                      {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-emerald-800 text-xs font-bold leading-relaxed">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-extrabold text-emerald-800">{successMessage}</p>
                        </div>
                      )}

                      <form onSubmit={handleEmailSignIn} className="space-y-4">
                        {/* Email Address */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Mail size={11} className="text-indigo-500" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="merchant@example.com"
                            className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                              <LockKeyhole size={11} className="text-indigo-500" />
                              Password *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode('forgot');
                                setErrorMessage(null);
                                setSuccessMessage(null);
                              }}
                              className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-700 outline-none"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-4 pr-10 py-3 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                            >
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                        >
                          {isSubmitting ? (
                            <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Sign In Securely</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </form>

                      <div className="text-center pt-2">
                        <p className="text-[10px] font-bold text-slate-500">
                          New to Enterprise Suite?{" "}
                          <button
                            onClick={() => {
                              setAuthMode('register');
                              setErrorMessage(null);
                              setSuccessMessage(null);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-extrabold uppercase tracking-wide underline decoration-dotted"
                          >
                            Create Store Account
                          </button>
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {authMode === 'register' && (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 text-left"
                    >
                      <button
                        onClick={() => setAuthMode('options')}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <ChevronLeft size={13} />
                        Back to choices
                      </button>

                      <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                          Create Account
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Setup a professional store account to sync POS, bills & ledgers.
                        </p>
                      </div>

                      {/* Status messages */}
                      {errorMessage && (
                        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-rose-800 text-xs font-bold leading-relaxed">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                          <p className="text-[10px] font-extrabold text-rose-800">{errorMessage}</p>
                        </div>
                      )}

                      {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-emerald-800 text-xs font-bold leading-relaxed">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-extrabold text-emerald-800">{successMessage}</p>
                        </div>
                      )}

                      <form onSubmit={handleEmailSignUp} className="space-y-3.5">
                        {/* Store Owner Name */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <User size={11} className="text-indigo-500" />
                            Store Owner Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ramesh Kumar"
                            className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>

                        {/* Email Address */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Mail size={11} className="text-indigo-500" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="merchant@example.com"
                            className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <LockKeyhole size={11} className="text-indigo-500" />
                            Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min 8 characters"
                              className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                            >
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>

                          {/* Real-time Strength Meter */}
                          {password && (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400">
                                <span>Password Strength:</span>
                                <span className={strength.score <= 2 ? "text-rose-500" : strength.score <= 4 ? "text-amber-500" : "text-emerald-500"}>
                                  {strength.label}
                                </span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <KeyRound size={11} className="text-indigo-500" />
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Match password"
                              className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                            >
                              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                        >
                          {isSubmitting ? (
                            <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Register Account</span>
                              <UserPlus size={13} />
                            </>
                          )}
                        </button>
                      </form>

                      <div className="text-center pt-1">
                        <p className="text-[10px] font-bold text-slate-500">
                          Already have an account?{" "}
                          <button
                            onClick={() => {
                              setAuthMode('login');
                              setErrorMessage(null);
                              setSuccessMessage(null);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-extrabold uppercase tracking-wide underline decoration-dotted"
                          >
                            Sign In
                          </button>
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {authMode === 'forgot' && (
                    <motion.div
                      key="forgot"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 text-left"
                    >
                      <button
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <ChevronLeft size={13} />
                        Back to Sign In
                      </button>

                      <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                          Reset Password
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Enter your email below to receive a secure link to reset your account credentials.
                        </p>
                      </div>

                      {/* Status messages */}
                      {errorMessage && (
                        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-rose-800 text-xs font-bold leading-relaxed">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                          <p className="text-[10px] font-extrabold text-rose-800">{errorMessage}</p>
                        </div>
                      )}

                      {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2 text-emerald-800 text-xs font-bold leading-relaxed">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-extrabold text-emerald-800">{successMessage}</p>
                        </div>
                      )}

                      <form onSubmit={handlePasswordReset} className="space-y-4">
                        {/* Email Address */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Mail size={11} className="text-indigo-500" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="merchant@example.com"
                            className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                        >
                          {isSubmitting ? (
                            <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Send Reset Link</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          </motion.div>
        </div>

      </main>

      {/* 🧾 Corporate Footer Navigation Bar */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-200/80 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold"
      >
        <p>© 2026 TS Price Manager. Built for Professional Merchants.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck size={11.5} className="text-teal-600" /> Secure Cloud Guard</span>
          <span className="flex items-center gap-1.5">Offline-Capable SQL</span>
        </div>
      </motion.footer>

    </div>
  );
}
