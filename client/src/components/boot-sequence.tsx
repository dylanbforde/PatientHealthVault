import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface TypewriterTextProps {
  text: string;
  delay?: number;
  onComplete?: () => void;
}

function TypewriterText({ text, delay = 50, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(prev => prev + text[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(timer);
        onComplete?.();
      }
    }, delay);
    
    return () => clearInterval(timer);
  }, [text, delay, onComplete]);

  return <span className="font-mono">{displayedText}</span>;
}

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  const bootMessages = [
    "HEALTHVAULT OS v2.0.25",
    "Copyright (c) 2025 HealthVault Corp.",
    "Initializing secure health record system...",
    "Checking system integrity...",
    "Loading encryption modules...",
    "Establishing secure connection...",
    "Mounting health record database..."
  ];

  useEffect(() => {
    if (showProgress) {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              onComplete();
            }, 500);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [showProgress, onComplete]);

  useEffect(() => {
    if (step < bootMessages.length) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (step === bootMessages.length) {
      setShowProgress(true);
    }
  }, [step]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-background flex items-center justify-center z-50"
      >
        <div className="max-w-2xl w-full mx-4 space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 border border-primary/20 bg-background/95 rounded-none space-y-4"
          >
            {bootMessages.slice(0, step).map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-primary font-mono"
              >
                <TypewriterText text={`> ${message}`} />
              </motion.div>
            ))}
            
            {showProgress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="w-full bg-muted rounded-none overflow-hidden">
                  <motion.div
                    className="h-2 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-sm font-mono text-primary">
                  <span>Loading system...</span>
                  <span>{progress}%</span>
                </div>
              </motion.div>
            )}
            
            {progress < 100 && (
              <div className="flex items-center justify-center pt-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
