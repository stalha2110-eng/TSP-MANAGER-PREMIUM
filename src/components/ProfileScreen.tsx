import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, LogOut, LogIn, ShieldCheck, Lock, CheckCircle, XCircle, 
  EyeOff, Eye, Download, ChevronRight, MessageSquare, Share2, RefreshCw, 
  Store, Cloud, Database, Phone, MapPin, Clock, Sun, Moon, Bell, Save,
  Monitor, Smartphone, Check
} from 'lucide-react';
import { AndroidIcon, AppleIcon } from './DeviceIcons';
import { currentDevice, DeviceInfo } from '../utils/device';
import { auth, loginWithGoogle } from '../firebase';
import { EmailAuthProvider, linkWithCredential, updatePassword } from 'firebase/auth';
import { playFeedbackEvent } from '../services/soundFeedbackService';
import { cleanAndValidateText } from '../services/languageEngine';
import { CloudSyncService } from '../services/cloudSyncService';
import { cn } from '../lib/utils';
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
          className="w-full py-3.5 px-6 rounded-2xl border border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {isLinked ? 'Change Password / पासवर्ड बदलें' : 'Add Password Login / पासवर्ड लॉगिन जोड़ें'}
        </button>
      ) : (
        <form onSubmit={isLinked ? handleUpdatePassword : handleLinkCredential} className="space-y-4 p-5 rounded-[2rem] border border-[var(--border)] bg-[var(--background)]">
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

export function StoreCredentialsSection({ 
  state, 
  onUpdate 
}: { 
  state: AppState; 
  onUpdate: (updates: Partial<AppSettings>) => void; 
}) {
  const [storeName, setStoreName] = useState(state.settings.storeName || "");
  const [storeOwnerName, setStoreOwnerName] = useState(state.settings.storeOwnerName || "");
  const [storePhone, setStorePhone] = useState(state.settings.storePhone || "");
  const [storeAddress, setStoreAddress] = useState(state.settings.storeAddress || "");
  const [storeOpeningTime, setStoreOpeningTime] = useState(state.settings.storeOpeningTime || "08:00");
  const [storeClosingTime, setStoreClosingTime] = useState(state.settings.storeClosingTime || "21:00");
  const [reminderTimeBeforeMinutes, setReminderTimeBeforeMinutes] = useState(
    state.settings.reminderTimeBeforeMinutes !== undefined ? state.settings.reminderTimeBeforeMinutes : 15
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setStoreName(state.settings.storeName || "");
    setStoreOwnerName(state.settings.storeOwnerName || "");
    setStorePhone(state.settings.storePhone || "");
    setStoreAddress(state.settings.storeAddress || "");
    setStoreOpeningTime(state.settings.storeOpeningTime || "08:00");
    setStoreClosingTime(state.settings.storeClosingTime || "21:00");
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
        storePhone: storePhone.trim(),
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

  const isCloudActive = !!(state.user && state.user.uid !== 'guest_user' && state.settings.autoCloudSync !== false);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <Store size={22} className="text-[var(--primary)] shrink-0" /> 
            {cleanAndValidateText("Store Credentials / दुकान की जानकारी", state.settings.language, state.settings)}
          </h3>
          <p className="text-[10px] opacity-60 uppercase font-bold tracking-wider mt-1">
            Configure official shop details for receipts, invoices, SMS billing, and cloud synchronization.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--background)] border border-[var(--border)] w-fit">
          <div className={`h-2 w-2 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[9.5px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1">
            {isCloudActive ? (
              <>
                <Cloud size={11} className="text-emerald-500" />
                <span>Cloud & Local Sync Active</span>
              </>
            ) : (
              <>
                <Database size={11} className="text-amber-500" />
                <span>Local Storage Persistence</span>
              </>
            )}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle size={18} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  Store Credentials Saved Successfully!
                </p>
                <p className="text-[10px] opacity-80 font-medium">
                  {isCloudActive 
                    ? "Updated and synced in real-time to your Firestore Cloud Database and Local Storage."
                    : "Saved securely to Local Device Storage."}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/20">
              Verified
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSaveStoreCredentials} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Store size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Shop / Store Name (दुकान का नाम)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Ramesh General Store"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <User size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Store Owner Name (मालिक का नाम)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeOwnerName} 
              onChange={e => setStoreOwnerName(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Phone size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Phone Number (फोन नंबर)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storePhone} 
              onChange={e => setStorePhone(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <MapPin size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Shop Address (दुकान का पता)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeAddress} 
              onChange={e => setStoreAddress(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Main Chowk, Sector 5, New Delhi"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 pt-4 border-t border-[var(--border)] mt-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-2">
              <Clock size={14} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Store Hours & Operational Cycle (दुकान का समय और दैनिक चक्र)", state.settings.language, state.settings)}
            </h4>
            <p className="text-[9px] opacity-50 uppercase font-bold tracking-wider">
              Define opening and closing times. Daily prompts will assist you in saving end-of-day reports and shift registers.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Sun size={13} className="text-amber-500 shrink-0" /> 
              {cleanAndValidateText("Store Opening Time (दुकान खुलने का समय)", state.settings.language, state.settings)}
            </label>
            <input 
              type="time" 
              value={storeOpeningTime} 
              onChange={e => setStoreOpeningTime(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Moon size={13} className="text-indigo-400 shrink-0" /> 
              {cleanAndValidateText("Store Closing Time (दुकान बंद होने का समय)", state.settings.language, state.settings)}
            </label>
            <input 
              type="time" 
              value={storeClosingTime} 
              onChange={e => setStoreClosingTime(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Bell size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Closing Reminder Alert (दुकान बंद होने से कितने पहले अलर्ट दें?)", state.settings.language, state.settings)}
            </label>
            <select 
              value={String(reminderTimeBeforeMinutes)} 
              onChange={e => setReminderTimeBeforeMinutes(parseInt(e.target.value) || 0)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all cursor-pointer"
            >
              <option value="0">{cleanAndValidateText("Exactly at Closing Time (बिल्कुल बंद होने के समय)", state.settings.language, state.settings)}</option>
              <option value="5">{cleanAndValidateText("5 Minutes Before Closing (बंद होने से 5 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="10">{cleanAndValidateText("10 Minutes Before Closing (बंद होने से 10 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="15">{cleanAndValidateText("15 Minutes Before Closing (बंद होने से 15 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="30">{cleanAndValidateText("30 Minutes Before Closing (बंद होने से 30 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="60">{cleanAndValidateText("1 Hour Before Closing (बंद होने से 1 घंटा पहले)", state.settings.language, state.settings)}</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] opacity-60 uppercase font-bold">
            Press save to write credentials directly to Cloud Database & Local Storage.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer ${
              saveSuccess 
                ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400' 
                : 'bg-[var(--primary)] hover:opacity-95 text-white shadow-[var(--primary)]/25'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={16} className="animate-bounce" />
                <span>✓ Credentials Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Store Credentials / सेव करें</span>
              </>
            )}
          </button>
        </div>
      </form>
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
  onShareProductList: () => void;
  isSharing: boolean;
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
         <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm text-left">
            <div>
               <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-indigo-500 animate-pulse" />
                  {cleanAndValidateText("Account Synchronization / मल्टी-डिवाइस सिंक सुरक्षा", state.settings.language, state.settings)}
               </h3>
               <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
                  Manage your credentials. Link a password to use the same email on devices where Google sign-in is not convenient.
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-sm flex items-center justify-center">
                        G
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]">Google Authentication</p>
                        <p className="text-[9px] text-[var(--foreground)]/60 font-mono tracking-tight truncate max-w-[120px] sm:max-w-none">{state.user.email}</p>
                     </div>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                     <CheckCircle size={10} /> Connected
                  </span>
               </div>

               <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <Lock size={14} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]">Email & Password Sign-in</p>
                        <p className="text-[9px] text-[var(--foreground)]/60 font-mono tracking-tight">
                           {auth.currentUser?.providerData?.some(p => p.providerId === 'password') 
                              ? 'Active / पासवर्ड लिंक है' 
                              : 'Not Linked / लिंक नहीं है'}
                        </p>
                     </div>
                  </div>
                  {auth.currentUser?.providerData?.some(p => p.providerId === 'password') ? (
                     <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                        <CheckCircle size={10} /> Active
                     </span>
                  ) : (
                     <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-amber-500/10 flex items-center gap-1 shrink-0">
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

         {deferredPrompt && (
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
                    <p className="text-xl font-black uppercase tracking-tight">{t.deployNode}</p>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t.pwaInstallHint}</p>
                 </div>
              </div>
              <ChevronRight size={24} className="relative z-10 opacity-60 group-hover:translate-x-1 transition-transform" />
           </button>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              disabled={isSharing}
              onClick={onShareProductList}
              className="flex items-center justify-between p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] hover:border-green-500/30 hover:bg-green-500/5 transition-all group disabled:opacity-50 cursor-pointer"
            >
               <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-green-500 group-hover:text-white",
                    isSharing ? "bg-green-500 text-white" : "bg-green-500/10 text-green-500"
                  )}>
                     {isSharing ? <RefreshCw size={22} className="animate-spin" /> : <MessageSquare size={22} />}
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-black uppercase group-hover:text-green-500 transition-colors">Share Product List</p>
                     <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{t.whatsappBroadcast || "WhatsApp Broadcast"}</p>
                  </div>
               </div>
               <ChevronRight size={16} className="opacity-20 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => {
                  const message = encodeURIComponent(`Check out TS PRICE MANAGER: ${window.location.host}`);
                  window.open(`https://wa.me/?text=${message}`, '_blank');
              }}
              className="flex items-center justify-between p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group cursor-pointer"
            >
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white">
                     <Share2 size={22} />
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-black uppercase group-hover:text-blue-500 transition-colors">{t.clientShare}</p>
                     <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{t.appShareHint || "Invite other merchants"}</p>
                  </div>
               </div>
               <ChevronRight size={16} className="opacity-20 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>

         {/* ========================================================================= */}
         {/* DEVICE PLATFORM: ANDROID & IOS BUTTONS                                    */}
         {/* Positioned directly below "Share with Customer" as requested              */}
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
         {/* DESKTOP SIZE BUTTON (Large Interface & Large Buttons for Desktop Screens) */}
         {/* Positioned directly below "Share with Customer" button as requested       */}
         {/* Stored strictly in local device storage, NEVER in Firebase/Firestore       */}
         {/* ========================================================================= */}
         <div 
           id="desktop-size-section"
           className="p-6 bg-[var(--card)] border-2 border-[var(--border)] rounded-[2rem] transition-all hover:border-[var(--primary)]/40 shadow-sm relative overflow-hidden"
         >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
               <div className="flex items-start sm:items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-md",
                    currentDesktopSize
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-black"
                      : "bg-[var(--primary)]/10 text-[var(--primary)]"
                  )}>
                     <Monitor size={28} className={currentDesktopSize ? "animate-pulse" : ""} />
                  </div>
                  <div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black uppercase tracking-tight text-[var(--foreground)]">
                           Desktop Size
                        </h3>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors",
                          currentDesktopSize
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                            : "bg-[var(--border)] text-[var(--foreground)]/60"
                        )}>
                           {currentDesktopSize ? "Large Format Active (ON)" : "Standard Format (OFF)"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                           Local Storage Only 🔒
                        </span>
                     </div>
                     <p className="text-xs text-[var(--foreground)]/70 mt-1 max-w-xl font-medium leading-relaxed">
                        Large buttons and screen formats
                     </p>
                  </div>
               </div>

               {/* The "Desktop Size" Interactive Action Button */}
               <button
                  id="btn-desktop-size-toggle"
                  type="button"
                  onClick={handleToggleDesktop}
                  className={cn(
                    "w-full sm:w-auto px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 cursor-pointer shrink-0",
                    currentDesktopSize
                      ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-black shadow-amber-500/20 hover:scale-[1.02] ring-2 ring-amber-400/40"
                      : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-[var(--primary)]/20 hover:scale-[1.02]"
                  )}
               >
                  <Monitor size={20} />
                  <span>{currentDesktopSize ? "Desktop Size: Active (ON)" : "Desktop Size: Enable (OFF)"}</span>
               </button>
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
