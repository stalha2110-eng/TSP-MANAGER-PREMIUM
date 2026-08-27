import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Unlock, Delete as Backspace } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

interface PINScreenProps {
  onSuccess: () => void;
  correctPIN?: string | null;
  mode: 'unlock' | 'create' | 'confirm';
  onPINCreated?: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function PINScreen({ 
  onSuccess, 
  correctPIN, 
  mode, 
  onPINCreated, 
  onCancel,
  title,
  description 
}: PINScreenProps) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const [step, setStep] = React.useState<'first' | 'confirm'>(mode === 'create' ? 'first' : 'first');
  const [tempPin, setTempPin] = React.useState('');

  const handlePress = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  React.useEffect(() => {
    if (pin.length === 6) {
      if (mode === 'unlock') {
        if (pin === correctPIN) {
          onSuccess();
        } else {
          setError(true);
          setPin('');
          setTimeout(() => setError(false), 500);
        }
      } else if (mode === 'create') {
        if (step === 'first') {
          setTempPin(pin);
          setPin('');
          setStep('confirm');
        } else {
          if (pin === tempPin) {
            onPINCreated?.(pin);
            onSuccess();
          } else {
            setError(true);
            setPin('');
            setStep('first');
            setTimeout(() => setError(false), 500);
          }
        }
      }
    }
  }, [pin, mode, correctPIN, onSuccess, step, tempPin, onPINCreated]);

  const displayTitle = title || (mode === 'unlock' ? 'Enter PIN to Unlock' : step === 'first' ? 'Create Your PIN' : 'Confirm Your PIN');
  const displayDescription = description || (mode === 'unlock' ? 'Enter your 6-digit PIN to access buying prices' : step === 'first' ? 'Set a 6-digit PIN to secure your data' : 'Re-enter your PIN to confirm');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--background)] p-6"
    >
      <motion.div 
        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <div className="mb-6 rounded-full bg-[var(--primary)] p-4 text-[var(--primary-foreground)] shadow-lg">
          {mode === 'unlock' ? <Lock size={32} /> : <Unlock size={32} />}
        </div>
        
        <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">{displayTitle}</h2>
        <p className="mb-8 text-center text-sm text-[var(--foreground)] opacity-60">{displayDescription}</p>

        <div className="mb-12 flex space-x-4">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className={cn(
                "h-4 w-4 rounded-full border-2 border-[var(--primary)] transition-all duration-200",
                pin.length > i ? "bg-[var(--primary)] scale-110" : "bg-transparent"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <Button
              key={num}
              variant="ghost"
              className="h-16 w-16 text-2xl font-bold rounded-full border border-[var(--border)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
              onClick={() => handlePress(num)}
            >
              {num}
            </Button>
          ))}
          <div />
          <Button
            variant="ghost"
            className="h-16 w-16 text-2xl font-bold rounded-full border border-[var(--border)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
            onClick={() => handlePress('0')}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-16 w-16 rounded-full hover:text-red-500"
            onClick={handleBackspace}
          >
            <Backspace size={24} />
          </Button>
        </div>

        {onCancel && (
          <Button variant="ghost" className="mt-8 text-[var(--primary)]" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
