import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, LogOut, LogIn, ShieldCheck, Lock, CheckCircle, XCircle, 
  EyeOff, Eye, Download, ChevronRight, RefreshCw, 
  Store, Cloud, Database, Phone, MapPin, Clock, Sun, Moon, Bell, Save,
  Monitor, Smartphone, Check, Minimize2, Type, Maximize2, X, Sparkles
} from 'lucide-react';
import { AndroidIcon, AppleIcon } from './DeviceIcons';
import { currentDevice, DeviceInfo } from '../utils/device';
import { auth, loginWithGoogle } from '../firebase';
import { EmailAuthProvider, linkWithCredential, updatePassword } from 'firebase/auth';
import { playFeedbackEvent } from '../services/soundFeedbackService';
import { cleanAndValidateText } from '../services/languageEngine';
import { CloudSyncService } from '../services/cloudSyncService';
import { cn, formatPhoneNumber } from '../lib/utils';
import { AppState, AppSettings } from '../types';

export function PasswordLinkManager({ user, settings }: { user: any; settings: any }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  if (!user) return null;

  const isLinked = user.providerData?.some((p: any) => p.providerId === 'password');

  const getStrength = (pwd: string) => {
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

  const strength = getStrength(password);

  const handleLinkCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in all fields / कृपया सभी विवरण भरें।");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match / पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long / पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
      return;
    }
    if (strength.score < 3) {
      setError("Password is too weak. Please use a stronger password / पासवर्ड बहुत कमजोर है। कृपया एक मजबूत पासवर्ड का उपयोग करें।");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential);
      setSuccess("Direct password login linked successfully! You can now sign in using this email & password. / पासवर्ड लॉगिन सफलतापूर्वक जुड़ गया है!");
      setPassword('');
      setConfirmPassword('');
      setIsExpanding(false);
      playFeedbackEvent('notification', settings);
    } catch (err: any) {
      console.error("Linking failed:", err);
      let msg = err.message;
      if (err.code === 'auth/credential-already-in-use') {
        msg = "This credential is already linked to another account / यह क्रेडेंशियल पहले से ही किसी अन्य खाते से जुड़ा हुआ है।";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already in use by another account / यह ईमेल पहले से ही उपयोग में है।";
      } else if (err.code === 'auth/requires-recent-login') {
        msg = "Please refresh your session by logging in with Google again before linking a password / पासवर्ड लिंक करने से पहले कृपया एक बार फिर Google से लॉगिन करें।";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is currently disabled in your Firebase Console. Action required: Go to Firebase Console > Authentication > Sign-in Method > Enable 'Email/Password' & save / फ़ायरबेस कंसोल में 'ईमेल/पासवर्ड' लॉगिन प्रदाता को सक्षम करें।";
      }
      setError(msg);
      playFeedbackEvent('notification', settings);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in all fields / कृपया सभी विवरण भरें।");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match / पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long / पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
      return;
    }
    if (strength.score < 3) {
      setError("Password is too weak / पासवर्ड बहुत कमजोर है।");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePassword(user, password);
      setSuccess("Password updated successfully! / पासवर्ड सफलतापूर्वक अपडेट हो गया है!");
      setPassword('');
      setConfirmPassword('');
      setIsExpanding(false);
      playFeedbackEvent('notification', settings);
    } catch (err: any) {
      console.error("Password update failed:", err);
      let msg = err.message;
      if (err.code === 'auth/requires-recent-login') {
        msg = "Security constraint: Please refresh your session by logging in with Google again / सुरक्षा कारणों से, कृपया एक बार फिर Google से लॉगिन करें।";
      }
      setError(msg);
      playFeedbackEvent('notification', settings);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-emerald-600 text-xs font-bold leading-relaxed">
          <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
          <p className="text-[10px] font-extrabold">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-rose-500 text-xs font-bold leading-relaxed animate-shake">
          <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[10px] font-extrabold">{error}</p>
        </div>
      )}

      {!isExpanding ? (
        <button
          type="button"
          onClick={() => {
            setIsExpanding(true);
            setError(null);
            setSuccess(null);
          }}
          className="w-full py-2 px-4 rounded-xl border border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {isLinked ? 'Change Password / पासवर्ड बदलें' : 'Add Password Login / पासवर्ड लॉगिन जोड़ें'}
        </button>
      ) : (
        <form onSubmit={isLinked ? handleUpdatePassword : handleLinkCredential} className="space-y-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/80">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
              {isLinked ? 'Update Account Password' : 'Link Password Account'}
            </h4>
            <button
              type="button"
              onClick={() => setIsExpanding(false)}
              className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 outline-none"
            >
              Cancel
            </button>
          </div>

          {/* New Password */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Lock size={11} className="text-[var(--primary)]" />
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:opacity-30"
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
                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Lock size={11} className="text-[var(--primary)]" />
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:opacity-30"
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
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isLinked ? 'Update Password' : 'Link Password Account'}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export function parseTo12Hour(
  timeStr?: string, 
  defaultHour = 8, 
  defaultPeriod: 'AM' | 'PM' = 'AM'
): { hours: number; minutes: number; period: 'AM' | 'PM' } {
  if (!timeStr) {
    return { hours: defaultHour, minutes: 0, period: defaultPeriod };
  }
  const isPM = /pm/i.test(timeStr);
  const isAM = /am/i.test(timeStr);
  const clean = timeStr.replace(/[^\d:]/g, '');
  const parts = clean.split(':').map(Number);
  let h = !isNaN(parts[0]) ? parts[0] : defaultHour;
  const m = !isNaN(parts[1]) ? parts[1] : 0;

  if (isPM || isAM) {
    const period: 'AM' | 'PM' = isPM ? 'PM' : 'AM';
    let hours12 = h % 12;
    if (hours12 === 0) hours12 = 12;
    return { hours: hours12, minutes: m, period };
  } else {
    // 24-hour fallback
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let hours12 = h % 12;
    if (hours12 === 0) hours12 = 12;
    return { hours: hours12, minutes: m, period };
  }
}

export function formatTo12Hour(hours: number, minutes: number, period: 'AM' | 'PM'): string {
  const padH = String(hours).padStart(2, '0');
  const padM = String(minutes).padStart(2, '0');
  return `${padH}:${padM} ${period}`;
}

export function Modern12HourTimePickerModal({
  isOpen,
  onClose,
  type,
  currentTimeStr,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  type: 'opening' | 'closing';
  currentTimeStr: string;
  onConfirm: (val: string) => void;
}) {
  const isOpening = type === 'opening';
  const parsed = parseTo12Hour(currentTimeStr, isOpening ? 8 : 9, isOpening ? 'AM' : 'PM');
  const [hours, setHours] = useState(parsed.hours);
  const [minutes, setMinutes] = useState(parsed.minutes);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const p = parseTo12Hour(currentTimeStr, isOpening ? 8 : 9, isOpening ? 'AM' : 'PM');
      setHours(p.hours);
      setMinutes(p.minutes);
      setPeriod(p.period);
      setMode('hour');
      setIsDragging(false);
    }
  }, [isOpen, currentTimeStr, isOpening]);

  if (!isOpen) return null;

  const currentFormatted = formatTo12Hour(hours, minutes, period);

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle clockwise from 12 o'clock in degrees
    const deg = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;

    if (mode === 'hour') {
      let rawHour = Math.round(deg / 30) % 12;
      if (rawHour === 0) rawHour = 12;
      if (rawHour !== hours) {
        setHours(rawHour);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(8);
        }
      }
    } else {
      const rawMin = Math.round(deg / 6) % 60;
      if (rawMin !== minutes) {
        setMinutes(rawMin);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(6);
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (mode === 'hour') {
        setTimeout(() => {
          setMode('minute');
        }, 220);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(currentFormatted);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onClose();
  };

  // Dial geometry
  const dialRadius = 92;
  const dialCenter = 125;

  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const currentAngleRad = mode === 'hour'
    ? (hours * 30) * (Math.PI / 180)
    : (minutes * 6) * (Math.PI / 180);

  const nodeX = dialCenter + dialRadius * Math.sin(currentAngleRad);
  const nodeY = dialCenter - dialRadius * Math.cos(currentAngleRad);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Material Style Circular Clock Dialog */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[310px] bg-[#f4f5f1] dark:bg-[#181d19] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 z-10 select-none"
        >
          {/* Top Label */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-slate-500/80 dark:text-slate-400 uppercase">
              SELECT TIME
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              {isOpening ? 'Store Opening' : 'Store Closing'}
            </span>
          </div>

          {/* Digital Time Display Header (matching attachment) */}
          <div className="flex items-center justify-center pt-1 pb-1">
            <div className="flex items-center">
              {/* Hour Box */}
              <button
                type="button"
                onClick={() => setMode('hour')}
                className={cn(
                  "w-[76px] h-[68px] rounded-2xl flex items-center justify-center cursor-pointer transition-all",
                  mode === 'hour'
                    ? "bg-[#bbf7d0] dark:bg-emerald-950 text-[#14532d] dark:text-emerald-300 ring-2 ring-emerald-500/30"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/90"
                )}
              >
                <span className="text-4xl sm:text-5xl font-mono font-medium tracking-tight">
                  {String(hours).padStart(2, '0')}
                </span>
              </button>

              {/* Colon */}
              <span className="text-3xl sm:text-4xl font-bold text-slate-700 dark:text-slate-300 mx-1.5 font-mono">
                :
              </span>

              {/* Minute Box */}
              <button
                type="button"
                onClick={() => setMode('minute')}
                className={cn(
                  "w-[76px] h-[68px] rounded-2xl flex items-center justify-center cursor-pointer transition-all",
                  mode === 'minute'
                    ? "bg-[#bbf7d0] dark:bg-emerald-950 text-[#14532d] dark:text-emerald-300 ring-2 ring-emerald-500/30"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/90"
                )}
              >
                <span className="text-4xl sm:text-5xl font-mono font-medium tracking-tight">
                  {String(minutes).padStart(2, '0')}
                </span>
              </button>

              {/* AM / PM Toggle Box */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col ml-3 shadow-2xs bg-slate-100/60 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setPeriod('AM');
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  }}
                  className={cn(
                    "px-3 py-2 text-xs transition-all cursor-pointer",
                    period === 'AM'
                      ? "bg-[#cffafe] dark:bg-cyan-950 text-[#0e7490] dark:text-cyan-300 font-black shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200/50"
                  )}
                >
                  AM
                </button>
                <div className="h-[1px] bg-slate-300 dark:bg-slate-700 w-full" />
                <button
                  type="button"
                  onClick={() => {
                    setPeriod('PM');
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  }}
                  className={cn(
                    "px-3 py-2 text-xs transition-all cursor-pointer",
                    period === 'PM'
                      ? "bg-[#cffafe] dark:bg-cyan-950 text-[#0e7490] dark:text-cyan-300 font-black shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200/50"
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Mode Sub-indicator */}
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {mode === 'hour' ? 'Tap or drag to select hour' : 'Tap or drag to select minute'}
            </span>
          </div>

          {/* Circular Clock Dial Face */}
          <div className="flex justify-center py-1">
            <div
              ref={dialRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ width: '250px', height: '250px' }}
              className="rounded-full relative select-none touch-none bg-[#e2e8f0]/80 dark:bg-slate-800/80 shadow-inner cursor-pointer"
            >
              {/* SVG Hand & Nodes */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full" width="250" height="250">
                {/* Pointer Hand Line */}
                <line
                  x1={dialCenter}
                  y1={dialCenter}
                  x2={nodeX}
                  y2={nodeY}
                  stroke="#15803d"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Center Pivot Dot */}
                <circle cx={dialCenter} cy={dialCenter} r="4" fill="#15803d" />
                {/* Selected Node Solid Circle */}
                <circle cx={nodeX} cy={nodeY} r="18" fill="#15803d" />
              </svg>

              {/* Dial Numbers */}
              {mode === 'hour' ? (
                hourNumbers.map((num) => {
                  const angle = (num * 30) * (Math.PI / 180);
                  const nx = dialCenter + dialRadius * Math.sin(angle);
                  const ny = dialCenter - dialRadius * Math.cos(angle);
                  const isSelected = hours === num;

                  return (
                    <div
                      key={num}
                      style={{
                        left: `${nx}px`,
                        top: `${ny}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={cn(
                        "absolute w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm pointer-events-none transition-colors",
                        isSelected
                          ? "text-white z-10 font-black"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {num}
                    </div>
                  );
                })
              ) : (
                <>
                  {minuteNumbers.map((num) => {
                    const angle = (num * 6) * (Math.PI / 180);
                    const nx = dialCenter + dialRadius * Math.sin(angle);
                    const ny = dialCenter - dialRadius * Math.cos(angle);
                    const isSelected = minutes === num;

                    return (
                      <div
                        key={num}
                        style={{
                          left: `${nx}px`,
                          top: `${ny}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={cn(
                          "absolute w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs pointer-events-none transition-colors",
                          isSelected
                            ? "text-white z-10 font-black"
                            : "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {String(num).padStart(2, '0')}
                      </div>
                    );
                  })}

                  {/* If custom minute not exactly on 5-min step, render value inside node */}
                  {minutes % 5 !== 0 && (
                    <div
                      style={{
                        left: `${nodeX}px`,
                        top: `${nodeY}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute w-8 h-8 rounded-full flex items-center justify-center font-black text-xs pointer-events-none text-white z-10"
                    >
                      {String(minutes).padStart(2, '0')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bottom Action Row (matching attachment with CANCEL & OK) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#15803d] dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#15803d] dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all cursor-pointer"
            >
              OK
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function StoreCredentialsSection({ 
  state, 
  onUpdate 
}: { 
  state: AppState; 
  onUpdate: (updates: Partial<AppSettings>) => void; 
}) {
  const [storeName, setStoreName] = useState(state.settings.storeName || "");
  const [storeOwnerName, setStoreOwnerName] = useState(state.settings.storeOwnerName || "");
  const [storePhone, setStorePhone] = useState(formatPhoneNumber(state.settings.storePhone || ""));
  const [storeAddress, setStoreAddress] = useState(state.settings.storeAddress || "");

  // Initialize with 12-hour format
  const [storeOpeningTime, setStoreOpeningTime] = useState(() => {
    const p = parseTo12Hour(state.settings.storeOpeningTime, 8, 'AM');
    return formatTo12Hour(p.hours, p.minutes, p.period);
  });
  const [storeClosingTime, setStoreClosingTime] = useState(() => {
    const p = parseTo12Hour(state.settings.storeClosingTime, 9, 'PM');
    return formatTo12Hour(p.hours, p.minutes, p.period);
  });
  const [activeTimePicker, setActiveTimePicker] = useState<'opening' | 'closing' | null>(null);

  const [reminderTimeBeforeMinutes, setReminderTimeBeforeMinutes] = useState(
    state.settings.reminderTimeBeforeMinutes !== undefined ? state.settings.reminderTimeBeforeMinutes : 15
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setStoreName(state.settings.storeName || "");
    setStoreOwnerName(state.settings.storeOwnerName || "");
    setStorePhone(formatPhoneNumber(state.settings.storePhone || ""));
    setStoreAddress(state.settings.storeAddress || "");
    
    const pOpen = parseTo12Hour(state.settings.storeOpeningTime, 8, 'AM');
    setStoreOpeningTime(formatTo12Hour(pOpen.hours, pOpen.minutes, pOpen.period));

    const pClose = parseTo12Hour(state.settings.storeClosingTime, 9, 'PM');
    setStoreClosingTime(formatTo12Hour(pClose.hours, pClose.minutes, pClose.period));

    if (state.settings.reminderTimeBeforeMinutes !== undefined) {
      setReminderTimeBeforeMinutes(state.settings.reminderTimeBeforeMinutes);
    }
  }, [
    state.settings.storeName,
    state.settings.storeOwnerName,
    state.settings.storePhone,
    state.settings.storeAddress,
    state.settings.storeOpeningTime,
    state.settings.storeClosingTime,
    state.settings.reminderTimeBeforeMinutes
  ]);

  const handleSaveStoreCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({
        storeName: storeName.trim(),
        storeOwnerName: storeOwnerName.trim(),
        storePhone: formatPhoneNumber(storePhone).trim() || storePhone.trim(),
        storeAddress: storeAddress.trim(),
        storeOpeningTime,
        storeClosingTime,
        reminderTimeBeforeMinutes
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err) {
      console.error("Save store credentials error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormComplete = Boolean(
    storeName.trim() &&
    storeOwnerName.trim() &&
    storeAddress.trim() &&
    storePhone.replace(/\D/g, "").length >= 10
  );

  const initialOpening = formatTo12Hour(
    parseTo12Hour(state.settings.storeOpeningTime, 8, 'AM').hours,
    parseTo12Hour(state.settings.storeOpeningTime, 8, 'AM').minutes,
    parseTo12Hour(state.settings.storeOpeningTime, 8, 'AM').period
  );
  const initialClosing = formatTo12Hour(
    parseTo12Hour(state.settings.storeClosingTime, 9, 'PM').hours,
    parseTo12Hour(state.settings.storeClosingTime, 9, 'PM').minutes,
    parseTo12Hour(state.settings.storeClosingTime, 9, 'PM').period
  );

  const hasUnsavedChanges = 
    storeName.trim() !== (state.settings.storeName || "").trim() ||
    storeOwnerName.trim() !== (state.settings.storeOwnerName || "").trim() ||
    formatPhoneNumber(storePhone).trim() !== formatPhoneNumber(state.settings.storePhone || "").trim() ||
    storeAddress.trim() !== (state.settings.storeAddress || "").trim() ||
    storeOpeningTime !== initialOpening ||
    storeClosingTime !== initialClosing ||
    reminderTimeBeforeMinutes !== (state.settings.reminderTimeBeforeMinutes !== undefined ? state.settings.reminderTimeBeforeMinutes : 15);

  const isButtonDim = !saveSuccess && (!isFormComplete || !hasUnsavedChanges || isSaving);

  const isCloudActive = !!(state.user && state.user.uid !== 'guest_user' && state.settings.autoCloudSync !== false);

  const openingParsed = parseTo12Hour(storeOpeningTime, 8, 'AM');
  const closingParsed = parseTo12Hour(storeClosingTime, 9, 'PM');

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs select-none">
      {/* Mobile-first Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <Store size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)] leading-tight truncate">
              Store Info
            </h3>
            <p className="text-[9px] font-bold opacity-45 uppercase tracking-wider truncate">
              Identity & Timing
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--background)] border border-[var(--border)]">
          <div className={`h-1.5 w-1.5 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[8.5px] font-black uppercase tracking-wider opacity-75">
            {isCloudActive ? 'Cloud Synced' : 'Local Only'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-2.5 text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle size={15} className="text-emerald-500" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-tight truncate">
                Store Credentials Saved!
              </p>
            </div>
            <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/20 shrink-0">
              Saved
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSaveStoreCredentials} className="space-y-4">
        <div className="space-y-3">
          {/* Store Name & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <Store size={11} className="text-[var(--primary)] shrink-0" /> 
                <span>Store Name</span>
              </label>
              <input 
                type="text" 
                value={storeName} 
                onChange={e => setStoreName(e.target.value)}
                className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all shadow-2xs"
                placeholder="e.g. Ramesh General Store"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <User size={11} className="text-[var(--primary)] shrink-0" /> 
                <span>Owner Name</span>
              </label>
              <input 
                type="text" 
                value={storeOwnerName} 
                onChange={e => setStoreOwnerName(e.target.value)}
                className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all shadow-2xs"
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
          </div>

          {/* Phone & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <Phone size={11} className="text-[var(--primary)] shrink-0" /> 
                <span>Phone Number</span>
              </label>
              <input 
                type="text" 
                value={storePhone} 
                onChange={e => setStorePhone(formatPhoneNumber(e.target.value))}
                className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all tracking-wide shadow-2xs"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <MapPin size={11} className="text-[var(--primary)] shrink-0" /> 
                <span>Address</span>
              </label>
              <input 
                type="text" 
                value={storeAddress} 
                onChange={e => setStoreAddress(e.target.value)}
                className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all shadow-2xs"
                placeholder="e.g. Main Chowk, Sector 5"
              />
            </div>
          </div>

          {/* Store Timing Header */}
          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
              <Clock size={12} className="shrink-0" />
              <span>Store Timing:</span>
            </span>
          </div>

          {/* Opening & Closing side-by-side interactive 12-Hour cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Opening Card */}
            <button
              type="button"
              onClick={() => setActiveTimePicker('opening')}
              className="group text-left p-2.5 bg-[var(--background)] hover:bg-[var(--foreground)]/5 border border-[var(--border)] hover:border-amber-500/50 focus:border-amber-500 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-[0.98] outline-none"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
                  <Sun size={12} className="text-amber-500 shrink-0" />
                  <span>Opening</span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-sm font-black font-mono tracking-tight text-[var(--foreground)]">
                    {String(openingParsed.hours).padStart(2, '0')}:{String(openingParsed.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {openingParsed.period}
                  </span>
                </div>
                <span className="text-[var(--primary)] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight size={12} />
                </span>
              </div>
            </button>

            {/* Closing Card */}
            <button
              type="button"
              onClick={() => setActiveTimePicker('closing')}
              className="group text-left p-2.5 bg-[var(--background)] hover:bg-[var(--foreground)]/5 border border-[var(--border)] hover:border-indigo-500/50 focus:border-indigo-500 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-[0.98] outline-none"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                  <Moon size={12} className="text-indigo-400 shrink-0" />
                  <span>Closing</span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-sm font-black font-mono tracking-tight text-[var(--foreground)]">
                    {String(closingParsed.hours).padStart(2, '0')}:{String(closingParsed.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    {closingParsed.period}
                  </span>
                </div>
                <span className="text-[var(--primary)] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight size={12} />
                </span>
              </div>
            </button>
          </div>

          {/* Closing Reminder Alert */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <Bell size={11} className="text-[var(--primary)] shrink-0" /> 
                <span>Closing Reminder</span>
              </label>
              <span className="text-[9px] font-bold text-[var(--primary)] font-mono">
                {reminderTimeBeforeMinutes === 0
                  ? 'At closing time'
                  : reminderTimeBeforeMinutes === 60
                  ? '1 hr before'
                  : `${reminderTimeBeforeMinutes}m before`}
              </span>
            </div>

            {/* Minimalist 1-Tap Segmented Control */}
            <div className="grid grid-cols-6 gap-1 p-1 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              {[
                { label: '0m', val: 0 },
                { label: '5m', val: 5 },
                { label: '10m', val: 10 },
                { label: '15m', val: 15 },
                { label: '30m', val: 30 },
                { label: '1h', val: 60 }
              ].map((opt) => {
                const isSelected = reminderTimeBeforeMinutes === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      setReminderTimeBeforeMinutes(opt.val);
                      if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate(8);
                      }
                    }}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer",
                      isSelected
                        ? "bg-[var(--primary)] text-white shadow-2xs font-black scale-102"
                        : "text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--card)]"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Save Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isButtonDim}
            className={cn(
              "w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98]",
              saveSuccess
                ? "bg-emerald-600 text-white shadow-emerald-500/20 cursor-default"
                : isButtonDim
                ? "opacity-35 bg-[var(--foreground)]/10 text-[var(--foreground)]/40 border border-[var(--border)] cursor-not-allowed shadow-none"
                : "bg-[var(--primary)] hover:opacity-95 text-white shadow-sm shadow-[var(--primary)]/20 cursor-pointer"
            )}
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={14} />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Store Info</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modern 12-Hour Time Picker Modal */}
      {activeTimePicker && (
        <Modern12HourTimePickerModal
          isOpen={!!activeTimePicker}
          onClose={() => setActiveTimePicker(null)}
          type={activeTimePicker}
          currentTimeStr={activeTimePicker === 'opening' ? storeOpeningTime : storeClosingTime}
          onConfirm={(newTime) => {
            if (activeTimePicker === 'opening') {
              setStoreOpeningTime(newTime);
            } else {
              setStoreClosingTime(newTime);
            }
          }}
        />
      )}
    </div>
  );
}

export function ProfileScreen({ 
  state, 
  t, 
  deferredPrompt, 
  onInstall, 
  onShareProductList, 
  isSharing, 
  onUpdate, 
  onLogout,
  isDesktopSize,
  onToggleDesktopSize
}: { 
  state: AppState; 
  t: any; 
  deferredPrompt: any; 
  onInstall: () => void;
  onShareProductList?: () => void;
  isSharing?: boolean;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onLogout: () => Promise<void>;
  isDesktopSize?: boolean;
  onToggleDesktopSize?: () => void;
}) {
  const [localDesktopSize, setLocalDesktopSize] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ts_desktop_size_mode') === 'true';
    }
    return false;
  });

  const currentDesktopSize = isDesktopSize !== undefined ? isDesktopSize : localDesktopSize;

  const handleToggleDesktop = () => {
    if (onToggleDesktopSize) {
      onToggleDesktopSize();
    } else {
      const next = !localDesktopSize;
      setLocalDesktopSize(next);
      localStorage.setItem('ts_desktop_size_mode', next ? 'true' : 'false');
      if (next) {
        document.documentElement.classList.add('desktop-size-mode');
        document.body.classList.add('desktop-size-mode');
      } else {
        document.documentElement.classList.remove('desktop-size-mode');
        document.body.classList.remove('desktop-size-mode');
      }
    }
    try {
      playFeedbackEvent('notification', state.settings);
    } catch (e) {
      // silent fallback
    }
  };

  const handleAuth = async () => {
    if (state.user) {
      await onLogout();
    } else {
      try {
        await loginWithGoogle();
      } catch (error: any) {
        if (error?.code === 'auth/popup-closed-by-user') {
          alert('Sign-in cancelled. The login popup was closed before completing. Please try again.');
        } else if (error?.code === 'auth/popup-blocked') {
          alert('Login popup was blocked by your browser. Please allow popups for this site or open in a new tab.');
        } else {
          alert(`Sign-in failed: ${error?.message || error}`);
        }
      }
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-2xl mx-auto px-4 sm:px-0">
      <div className="relative overflow-hidden rounded-[3rem] bg-[var(--primary)] p-10 text-white shadow-2xl shadow-[var(--primary)]/20 min-h-[250px] flex flex-col justify-end group">
         <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0 duration-700">
            <User size={200} />
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
         
         <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-5">
               <div className="h-20 w-20 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
                  <User size={40} className="text-white" />
               </div>
               <div>
                  <h2 className="text-4xl font-black uppercase tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">
                    {state.settings.storeOwnerName || (state.user ? (state.user.email?.split('@')[0] || 'Merchant') : 'SYSTEM ADMIN')}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
                       {state.settings.storeName || (state.user ? t.liveNode : t.localSandbox)}
                     </p>
                  </div>
                  {state.user && state.user.email && (
                     <div className="mt-1.5 flex items-center gap-1.5 opacity-90 text-[10.5px] font-mono tracking-tight bg-black/15 border border-white/10 rounded-lg px-2.5 py-1 w-fit select-text">
                        <Mail size={11} className="text-indigo-200 shrink-0" />
                        <span>{state.user.email}</span>
                     </div>
                  )}
               </div>
            </div>
            
            <div className="flex gap-8 pt-4">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{t.authorization}</p>
                  <button 
                    onClick={handleAuth}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full transition-all text-white hover:text-[var(--primary)] shadow-lg active:scale-95 cursor-pointer"
                  >
                     {state.user ? <LogOut size={14} /> : <LogIn size={14} />}
                     {state.user ? (t.terminateSession || 'LOG OUT') : t.cloudEntry}
                  </button>
               </div>
               <div className="h-10 w-px bg-white/20" />
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{t.architecture}</p>
                  <p className="text-xs font-black uppercase">v3.5.0 Enterprise</p>
               </div>
            </div>
         </div>
      </div>

      <StoreCredentialsSection state={state} onUpdate={onUpdate} />

      {state.user && (
         <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs text-left">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-500" />
                  {cleanAndValidateText("Account Synchronization", state.settings.language, state.settings)}
               </h3>
               <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                  Secured
               </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
               <div className="p-3 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                     <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center shrink-0">
                        G
                     </div>
                     <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">Google Account</p>
                        <p className="text-[8.5px] text-[var(--foreground)]/60 font-mono tracking-tight truncate">{state.user.email}</p>
                     </div>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                     <CheckCircle size={9} /> Connected
                  </span>
               </div>

               <div className="p-3 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                     <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                        <Lock size={12} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">Password Login</p>
                        <p className="text-[8.5px] text-[var(--foreground)]/60 font-mono tracking-tight truncate">
                           {auth.currentUser?.providerData?.some(p => p.providerId === 'password') 
                              ? 'Active' 
                              : 'Not Linked'}
                        </p>
                     </div>
                  </div>
                  {auth.currentUser?.providerData?.some(p => p.providerId === 'password') ? (
                     <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                        <CheckCircle size={9} /> Active
                     </span>
                  ) : (
                     <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-amber-500/10 flex items-center gap-1 shrink-0">
                        Pending
                     </span>
                  )}
               </div>
            </div>

            <PasswordLinkManager user={auth.currentUser} settings={state.settings} />
         </div>
      )}

      <div className="space-y-4">
         <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Core</h4>
            <div className="h-px flex-1 bg-[var(--border)] mx-4 opacity-10" />
         </div>

         {/* PWA Install Button - only shown if not already installed in standalone mode */}
         {typeof window !== 'undefined' && !(
           window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           localStorage.getItem('ts_app_installed') === 'true'
         ) && (
           <button 
             onClick={onInstall}
             className="w-full flex items-center justify-between p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-[2.5rem] shadow-2xl shadow-amber-500/30 active:scale-[0.98] transition-all group overflow-hidden relative cursor-pointer"
           >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="flex items-center gap-5 relative z-10">
                 <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                    <Download size={28} />
                 </div>
                 <div className="text-left">
                    <p className="text-xl font-black uppercase tracking-tight">{t.deployNode || "Download App"}</p>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t.pwaInstallHint || "Install on Home Screen"}</p>
                 </div>
              </div>
              <ChevronRight size={24} className="relative z-10 opacity-60 group-hover:translate-x-1 transition-transform" />
           </button>
         )}



         {/* ========================================================================= */}
         {/* DEVICE PLATFORM: ANDROID & IOS BUTTONS                                    */}
         {/* Positioned below share section                                            */}
         {/* Detects actual device & supports device-specific capability handling      */}
         {/* ========================================================================= */}
         <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
               <span className="text-[9.5px] font-black uppercase tracking-wider text-[var(--foreground)]/60 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-[var(--primary)]" />
                  <span>Device Platform</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--foreground)]/5 text-[8px] font-bold opacity-70">
                     Active: {currentDevice().deviceName}
                  </span>
               </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
               {/* Android Button */}
               <button
                  type="button"
                  id="btn-platform-android"
                  onClick={() => {
                     try {
                        playFeedbackEvent('notification', state.settings);
                     } catch {}
                     const active = currentDevice().isAndroid;
                     alert(`Android Platform\n\n• Detected: ${active ? 'Active on your Android Device' : 'Standard Web Environment'}\n• Features: Web Bluetooth thermal printing, hardware haptic vibrations, and standard continuous speech.`);
                  }}
                  className={cn(
                     "p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer text-left active:scale-[0.98]",
                     currentDevice().isAndroid
                        ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
                  )}
               >
                  <div className="flex items-center gap-3 min-w-0">
                     <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        currentDevice().isAndroid
                           ? "bg-emerald-500 text-white shadow-xs"
                           : "bg-emerald-500/15 text-emerald-500"
                     )}>
                        <AndroidIcon size={20} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-[var(--foreground)] tracking-tight truncate group-hover:text-emerald-500 transition-colors">
                           Android
                        </p>
                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest truncate">
                           {currentDevice().isAndroid ? "Current Device" : "Ready"}
                        </p>
                     </div>
                  </div>
                  {currentDevice().isAndroid && (
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1 shadow-xs" />
                  )}
               </button>

               {/* iOS Button */}
               <button
                  type="button"
                  id="btn-platform-ios"
                  onClick={async () => {
                     try {
                        playFeedbackEvent('notification', state.settings);
                     } catch {}
                     const active = currentDevice().isIOS;
                     const promptText = `Apple iOS / Safari & Home-Screen PWA Platform\n\n• Detected: ${active ? 'Active on your iPhone / iPad' : 'Ready'}\n\n• Exclusive iOS Features:\n1. Pull-to-Refresh: Swipe down from top of any page to trigger manual Firestore sync & receive latest app updates (active even in Add-to-Home-Screen standalone mode).\n2. Speech Assistant Burst Engine: Optimized speech reconnection for WebKit.\n3. Native iOS Safe-Area Notch Ergonomics.\n\nPress OK to run a manual Cloud Database Sync & check for app updates now.`;
                     if (window.confirm(promptText)) {
                        try {
                           const res = await CloudSyncService.forceSyncWithFirestore(state);
                           if (res.hasAppUpdate) {
                              if (window.confirm("✨ New App Update Detected!\n\nWould you like to reload now to apply the new features?")) {
                                 CloudSyncService.reloadApp();
                              }
                           } else {
                              alert(`✓ Firestore Cloud Sync Complete!\n\n• Items verified: ${res.itemsSynced}\n• Bills verified: ${res.billsSynced}\n• Notes verified: ${res.notesSynced}\n• Status: Up-to-date with cloud.`);
                           }
                        } catch (e: any) {
                           alert(`Sync error: ${e?.message || 'Using local database cache'}`);
                        }
                     }
                  }}
                  className={cn(
                     "p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer text-left active:scale-[0.98]",
                     currentDevice().isIOS
                        ? "bg-sky-500/10 border-sky-500/40 shadow-xs ring-1 ring-sky-500/20"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-sky-500/30 hover:bg-sky-500/[0.04]"
                  )}
               >
                  <div className="flex items-center gap-3 min-w-0">
                     <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        currentDevice().isIOS
                           ? "bg-sky-500 text-white shadow-xs"
                           : "bg-sky-500/15 text-sky-500 dark:text-sky-400"
                     )}>
                        <AppleIcon size={20} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-[var(--foreground)] tracking-tight truncate group-hover:text-sky-500 transition-colors">
                           iOS
                        </p>
                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest truncate">
                           {currentDevice().isIOS ? "Current Device" : "Ready"}
                        </p>
                     </div>
                  </div>
                  {currentDevice().isIOS && (
                     <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 ml-1 shadow-xs" />
                  )}
               </button>
            </div>
         </div>

         {/* ========================================================================= */}
         {/* DESKTOP SIZE BUTTON (Shorter & Minimalist Interface)                       */}
         {/* Stored strictly in local device storage, NEVER in Firebase/Firestore       */}
         {/* ========================================================================= */}
         <div 
           id="desktop-size-section"
           className="p-3.5 sm:p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl transition-all shadow-xs flex items-center justify-between gap-3"
         >
            <div className="flex items-center gap-3 min-w-0">
               <div className={cn(
                 "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                 currentDesktopSize
                   ? "bg-amber-500 text-black font-black shadow-xs"
                   : "bg-[var(--primary)]/10 text-[var(--primary)]"
               )}>
                  <Monitor size={17} />
               </div>
               <div className="min-w-0">
                  <div className="flex items-center gap-2">
                     <h3 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] truncate">
                        Desktop Size
                     </h3>
                     <span className={cn(
                       "px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider",
                       currentDesktopSize
                         ? "bg-amber-500/20 text-amber-500 font-black"
                         : "bg-[var(--foreground)]/5 text-[var(--foreground)]/50"
                     )}>
                        {currentDesktopSize ? "ON" : "OFF"}
                     </span>
                  </div>
                  <p className="text-[10px] text-[var(--foreground)]/60 font-medium truncate">
                     Large buttons & widescreen mode
                  </p>
               </div>
            </div>

            {/* Minimalist Action Toggle Button */}
            <button
               id="btn-desktop-size-toggle"
               type="button"
               onClick={handleToggleDesktop}
               className={cn(
                 "px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0",
                 currentDesktopSize
                   ? "bg-amber-500 text-black hover:bg-amber-400"
                   : "bg-[var(--primary)] text-white hover:opacity-90 shadow-sm"
               )}
            >
               <Monitor size={13} />
               <span>{currentDesktopSize ? "Active" : "Enable"}</span>
            </button>
         </div>

         {/* ========================================================================= */}
         {/* SYSTEM INFRASTRUCTURE: METRIC PRECISION & TYPOGRAPHY DECK                 */}
         {/* Positioned directly below the Desktop Size button as requested            */}
         {/* ========================================================================= */}
         <div 
           id="system-infra-section"
           className="p-4 sm:p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl transition-all shadow-xs space-y-3.5"
         >
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="h-1 w-5 bg-blue-500 opacity-60 rounded-full" />
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">
                     {t?.systemInfra || "System Infrastructure"}
                  </label>
               </div>
               <span className="text-[8.5px] font-bold text-[var(--foreground)]/40 uppercase tracking-wider">
                  Precision & Layout
               </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
               {/* Typography Deck */}
               <div className="p-3 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                     <h4 className="font-black uppercase tracking-tight text-[11px] text-[var(--foreground)]/70">
                        {t?.typographyDeck || "Typography Deck"}
                     </h4>
                     <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground)]/50">
                        {state.settings.fontSize || 'standard'}
                     </span>
                  </div>
                  <div className="flex gap-1.5">
                     {[
                        { id: 'compact', label: 'Compact', icon: <Minimize2 size={11} /> },
                        { id: 'standard', label: 'Standard', icon: <Type size={11} /> },
                        { id: 'comfortable', label: 'Spaced', icon: <Maximize2 size={11} /> },
                     ].map(opt => {
                        const isActive = (state.settings.fontSize || 'standard') === opt.id;
                        return (
                           <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                 onUpdate({ fontSize: opt.id as any });
                                 try { playFeedbackEvent('notification', state.settings); } catch {}
                              }}
                              className={cn(
                                 "flex-1 h-8 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer active:scale-95",
                                 isActive 
                                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm font-black" 
                                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                              )}
                           >
                              {opt.icon}
                              <span>{opt.label}</span>
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* Metric Precision */}
               <div className="p-3 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                     <h4 className="font-black uppercase tracking-tight text-[11px] text-[var(--foreground)]/70">
                        {t?.metricPrecision || "Metric Precision"}
                     </h4>
                     <span className="text-[9px] font-mono font-bold text-[var(--foreground)]/50">
                        {(state.settings.pricePrecision ?? 2)} decimals
                     </span>
                  </div>
                  <div className="flex gap-1.5">
                     {[0, 1, 2].map(p => {
                        const isActive = (state.settings.pricePrecision ?? 2) === p;
                        return (
                           <button
                              key={p}
                              type="button"
                              onClick={() => {
                                 onUpdate({ pricePrecision: p });
                                 try { playFeedbackEvent('notification', state.settings); } catch {}
                              }}
                              className={cn(
                                 "flex-1 h-8 rounded-lg text-xs font-black transition-all border flex items-center justify-center gap-1 cursor-pointer active:scale-95",
                                 isActive 
                                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm font-black" 
                                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                              )}
                           >
                              <span>{p}</span>
                              <span className="text-[8.5px] opacity-60 font-mono">
                                 {p === 0 ? "(.0)" : p === 1 ? "(.1)" : "(.00)"}
                              </span>
                           </button>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="text-center pt-8 opacity-20">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Precision Inventory Systems</p>
      </div>
    </div>
  );
}
export default ProfileScreen;
