import React, { useState } from 'react';
import { 
  HelpCircle, BookOpen, Sparkles, PlusCircle, Receipt, 
  ArrowRight, MessageSquare, ChevronRight, Play, ExternalLink,
  LayoutGrid
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TutorialType } from './OnboardingGuide';

interface HelpSectionProps {
  onStartTutorial: (type: TutorialType, next?: { type: TutorialType; title: string }) => void;
  onNavigateDashboard: () => void;
}

export const HelpSection: React.FC<HelpSectionProps> = ({
  onStartTutorial,
  onNavigateDashboard,
}) => {
  const [activeView, setActiveView] = useState<'selection' | 'tutorials' | 'help_content'>('selection');

  return (
    <div className="space-y-4 pt-2">
      {/* Header Banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 via-[var(--primary)]/10 to-indigo-500/10 border border-[var(--border)] text-left">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
            ❓
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
              सहायता एवं ट्यूटोरियल (Help & Tutorials)
            </h3>
            <p className="text-[10px] opacity-60">
              ऐप चलाना सीखें और तुरंत सहायता प्राप्त करें
            </p>
          </div>
        </div>
      </div>

      {/* Main Two Buttons: "Tutorials" & "Help" */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveView('tutorials')}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs",
            activeView === 'tutorials'
              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
              : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 border-[var(--border)] text-[var(--foreground)]"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center",
              activeView === 'tutorials' ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-500"
            )}>
              <BookOpen size={16} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
              activeView === 'tutorials' ? "bg-white/20 text-white" : "bg-[var(--foreground)]/10 opacity-70"
            )}>
              Guide
            </span>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-tight">1. Tutorials</h4>
            <p className={cn(
              "text-[9.5px] mt-0.5 leading-snug",
              activeView === 'tutorials' ? "text-white/80" : "opacity-60"
            )}>
              एनीमेशन व आवाज़ के साथ लाइव सीखें
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('help_content')}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs",
            activeView === 'help_content'
              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
              : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 border-[var(--border)] text-[var(--foreground)]"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center",
              activeView === 'help_content' ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-500"
            )}>
              <HelpCircle size={16} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
              activeView === 'help_content' ? "bg-white/20 text-white" : "bg-[var(--foreground)]/10 opacity-70"
            )}>
              Support
            </span>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-tight">2. Help</h4>
            <p className={cn(
              "text-[9.5px] mt-0.5 leading-snug",
              activeView === 'help_content' ? "text-white/80" : "opacity-60"
            )}>
              हेल्प डेस्क एवं सामान्य प्रश्न
            </p>
          </div>
        </button>
      </div>

      {/* When Tutorials View is Active (Default or selected) */}
      {(activeView === 'tutorials' || activeView === 'selection') && (
        <div className="space-y-2.5 pt-1 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60">
              उपलब्ध ट्यूटोरियल (Choose Interactive Tutorial):
            </span>
            <span className="text-[9px] text-amber-500 font-bold flex items-center gap-1">
              <Sparkles size={11} /> 100% लाइव गाइड
            </span>
          </div>

          {/* Button 1: "product ki entry kaise kare?" */}
          <button
            type="button"
            onClick={() => {
              onNavigateDashboard();
              onStartTutorial('add_product');
            }}
            className="w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-amber-500/[0.06] border-2 border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PlusCircle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-amber-500 transition-colors">
                    Product ki entry kaise kare?
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[8px] font-black uppercase">
                    बोलकर जोड़ें
                  </span>
                </div>
                <p className="text-[10px] opacity-60 mt-0.5">
                  वॉइस असिस्टेंट से केवल 3 सेकंड में बोलकर नया सामान जोड़ना सीखें
                </p>
              </div>
            </div>

            <div className="h-8 w-8 rounded-full bg-[var(--foreground)]/5 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center shrink-0 transition-colors text-[var(--foreground)]">
              <Play size={13} className="ml-0.5" />
            </div>
          </button>

          {/* Button 2: "bill kaise banaye" */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider opacity-50 px-1 block mt-2">
              बिल बनाने के तरीके (Bill Creation Methods):
            </span>

            {/* Option 2.1: Method 2 - Search Bar */}
            <button
              type="button"
              onClick={() => {
                onNavigateDashboard();
                onStartTutorial('make_bill_search', { 
                  type: 'make_bill_all_items', 
                  title: 'तरीका 3 (View All Items)' 
                });
              }}
              className="w-full p-3.5 rounded-2xl bg-[var(--card)] hover:bg-indigo-500/[0.06] border-2 border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-indigo-500 transition-colors">
                      Bill kaise banaye (Search Bar se)
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-500 text-[8px] font-black uppercase">
                      विधि 2
                    </span>
                  </div>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    सर्च बार में नाम या कोड टाइप करके सुपर-फास्ट बिल बनाना
                  </p>
                </div>
              </div>

              <div className="h-7 w-7 rounded-full bg-[var(--foreground)]/5 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-[var(--foreground)]">
                <Play size={12} className="ml-0.5" />
              </div>
            </button>

            {/* Option 2.2: Method 3 - View All Items Catalog */}
            <button
              type="button"
              onClick={() => {
                onNavigateDashboard();
                onStartTutorial('make_bill_all_items');
              }}
              className="w-full p-3.5 rounded-2xl bg-[var(--card)] hover:bg-emerald-500/[0.06] border-2 border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-emerald-500 transition-colors">
                      Bill kaise banaye (View All Items se)
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase">
                      विधि 3
                    </span>
                  </div>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    पूरा कैटलॉग विंडो खोलकर एक साथ कई सामान टिक करके बिल बनाएं
                  </p>
                </div>
              </div>

              <div className="h-7 w-7 rounded-full bg-[var(--foreground)]/5 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-[var(--foreground)]">
                <Play size={12} className="ml-0.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* When "Help" Button is selected (Blank Placeholder section ready for support contacts) */}
      {activeView === 'help_content' && (
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center">
            <HelpCircle size={26} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">
              हेल्प डेस्क (Support Center)
            </h4>
            <p className="text-xs opacity-60 max-w-xs mx-auto mt-1">
              यहाँ आपकी दुकान के लिए त्वरित सहायता और गाइड उपलब्ध हैं।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--foreground)]/5 border border-[var(--border)] text-[11px] opacity-70 leading-relaxed text-left">
            <p className="font-bold text-[var(--foreground)] mb-1">💡 क्विक टिप्स:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>सामान का बिल तुरंत बनाने के लिए नीचे 'Billing' टैब दबाएं।</li>
              <li>बिना कीबोर्ड के नया सामान जोड़ने के लिए माइक बटन पर टैप करें।</li>
              <li>प्रिंटर जोड़ने या पर्ची साइज बदलने के लिए 'Printer' टैब पर जाएं।</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
