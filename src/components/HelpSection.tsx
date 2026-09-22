import React, { useState } from 'react';
import { 
  HelpCircle, BookOpen, Sparkles, PlusCircle, Receipt, 
  ArrowLeft, ChevronRight, Play, LayoutGrid
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
  // 'landing': Only shows 1. Tutorials & 2. Help buttons (NO tutorial details shown initially)
  // 'tutorials_page': Opened strictly when user clicks "1. Tutorials"
  // 'help_content': Opened when user clicks "2. Help"
  const [activeView, setActiveView] = useState<'landing' | 'tutorials_page' | 'help_content'>('landing');

  // Inside tutorials page:
  // 'main': Shows 2 primary buttons: "1. Products ki entry kaise kare" & "2. Bill kaise banaye"
  // 'bill_submethods': Shows the elements/methods inside "Bill kaise banaye" ("Search Bar se" & "View All Items se")
  const [tutorialSubView, setTutorialSubView] = useState<'main' | 'bill_submethods'>('main');

  return (
    <div className="space-y-4 pt-2">
      {/* Top Header Banner */}
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

      {/* VIEW 1: LANDING VIEW (Initial state before clicking "Tutorials") */}
      {activeView === 'landing' && (
        <div className="grid grid-cols-2 gap-2.5">
          {/* Main Button 1: "Tutorials" */}
          <button
            type="button"
            onClick={() => {
              setActiveView('tutorials_page');
              setTutorialSubView('main');
            }}
            className="p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs bg-[var(--card)] hover:bg-amber-500/[0.08] hover:border-amber-500/40 border-[var(--border)] text-[var(--foreground)] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500 group-hover:scale-105 transition-transform">
                <BookOpen size={18} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                Guide
              </span>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight group-hover:text-amber-500 transition-colors">
                1. Tutorials
              </h4>
              <p className="text-[10px] mt-0.5 leading-snug opacity-60">
                ट्यूटोरियल देखने और लाइव सीखने के लिए यहाँ क्लिक करें
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <span>खोलें (Open)</span>
              <ChevronRight size={13} />
            </div>
          </button>

          {/* Main Button 2: "Help" */}
          <button
            type="button"
            onClick={() => setActiveView('help_content')}
            className="p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs bg-[var(--card)] hover:bg-blue-500/[0.08] hover:border-blue-500/40 border-[var(--border)] text-[var(--foreground)] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-500 group-hover:scale-105 transition-transform">
                <HelpCircle size={18} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300">
                Support
              </span>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                2. Help
              </h4>
              <p className="text-[10px] mt-0.5 leading-snug opacity-60">
                हेल्प डेस्क एवं सामान्य प्रश्नोत्तर
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <span>सहायता (Help)</span>
              <ChevronRight size={13} />
            </div>
          </button>
        </div>
      )}

      {/* VIEW 2: SECOND PAGE (Opened strictly when user clicks "1. Tutorials") */}
      {activeView === 'tutorials_page' && (
        <div className="space-y-3 animate-fadeIn text-left">
          {/* Top navigation row to return back to main Help/Tutorials options */}
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                if (tutorialSubView === 'bill_submethods') {
                  setTutorialSubView('main');
                } else {
                  setActiveView('landing');
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer py-1"
            >
              <ArrowLeft size={14} />
              <span>{tutorialSubView === 'bill_submethods' ? 'ट्यूटोरियल्स मेनू पर वापस' : 'वापस (Back)'}</span>
            </button>

            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Sparkles size={11} /> 100% लाइव गाइड
            </span>
          </div>

          {/* SECOND PAGE - LEVEL 1: Two buttons: "Products ki entry kaise kare" and "Bill kaise banaye" */}
          {tutorialSubView === 'main' && (
            <div className="space-y-3 pt-1">
              <span className="text-[10.5px] font-black uppercase tracking-wider opacity-60 px-1 block">
                ट्यूटोरियल विषय चुनें (Choose Tutorial Topic):
              </span>

              {/* Button 1: "Products ki entry kaise kare" */}
              <button
                type="button"
                onClick={() => {
                  onNavigateDashboard();
                  onStartTutorial('add_product');
                }}
                className="w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-amber-500/[0.07] border-2 border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-amber-500 transition-colors">
                        Products ki entry kaise kare?
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

              {/* Button 2: "Bill kaise banaye" */}
              <button
                type="button"
                onClick={() => {
                  setTutorialSubView('bill_submethods');
                }}
                className="w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-indigo-500/[0.07] border-2 border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-indigo-500 transition-colors">
                        Bill kaise banaye
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-500 text-[8px] font-black uppercase">
                        2 तरीके उपलब्ध
                      </span>
                    </div>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      सर्च बार से या कैटलॉग से बिल बनाने के तरीके देखें
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                  <span>तरीके देखें</span>
                  <ChevronRight size={15} />
                </div>
              </button>
            </div>
          )}

          {/* SECOND PAGE - LEVEL 2 (Inside "Bill kaise banaye"): Shows its elements (Search Bar se & View All Items se) */}
          {tutorialSubView === 'bill_submethods' && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-indigo-500 uppercase">
                    Bill kaise banaye (बिल बनाने के तरीके)
                  </h4>
                  <p className="text-[10px] opacity-70">
                    नीचे दिए गए दोनों तरीकों में से कोई एक चुनें:
                  </p>
                </div>
                <Receipt size={20} className="text-indigo-500 opacity-60" />
              </div>

              {/* Element 1: "Bill kaise banaye (Search Bar se)" */}
              <button
                type="button"
                onClick={() => {
                  onNavigateDashboard();
                  onStartTutorial('make_bill_search', { 
                    type: 'make_bill_all_items', 
                    title: 'तरीका 3 (View All Items)' 
                  });
                }}
                className="w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-indigo-500/[0.07] border-2 border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-indigo-500 transition-colors">
                        Bill kaise banaye (Search Bar se)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-500 text-[8px] font-black uppercase">
                        तरीका 1
                      </span>
                    </div>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      सर्च बार में नाम या कोड टाइप करके सुपर-फास्ट बिल बनाना सीखें
                    </p>
                  </div>
                </div>

                <div className="h-8 w-8 rounded-full bg-[var(--foreground)]/5 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-[var(--foreground)]">
                  <Play size={13} className="ml-0.5" />
                </div>
              </button>

              {/* Element 2: "Bill kaise banaye (View All Items se)" */}
              <button
                type="button"
                onClick={() => {
                  onNavigateDashboard();
                  onStartTutorial('make_bill_all_items');
                }}
                className="w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-emerald-500/[0.07] border-2 border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <LayoutGrid size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-[var(--foreground)] group-hover:text-emerald-500 transition-colors">
                        Bill kaise banaye (View All Items se)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase">
                        तरीका 2
                      </span>
                    </div>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      पूरा कैटलॉग विंडो खोलकर एक साथ कई सामान टिक करके बिल बनाएं
                    </p>
                  </div>
                </div>

                <div className="h-8 w-8 rounded-full bg-[var(--foreground)]/5 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-[var(--foreground)]">
                  <Play size={13} className="ml-0.5" />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: When "Help" is selected */}
      {activeView === 'help_content' && (
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4 animate-fadeIn">
          <div className="flex items-center justify-start pb-1 border-b border-[var(--border)]">
            <button
              type="button"
              onClick={() => setActiveView('landing')}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer py-1"
            >
              <ArrowLeft size={14} />
              <span>वापस (Back)</span>
            </button>
          </div>

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
