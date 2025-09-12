import React from 'react';
import { motion } from 'framer-motion';
import { getNow } from '../services/clock';
import { partOfDay, formatDateIT, formatTimeIT, getLocalTZ } from '../services/time';

interface WelcomeMessageProps {
  user?: {
    name?: string;
  } | null;
  appClock?: {now: string, tz: string} | null;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ user, appClock }) => {
  const userName = user?.name || '';
  
  // Usa appClock se disponibile, altrimenti calcola ora
  const now = appClock || getNow();
  const tz = getLocalTZ();
  const dayPartText = partOfDay(now.now, tz);
  const greeting = `Buon${dayPartText === 'mattina' ? 'giorno' : dayPartText === 'pomeriggio' ? ' pomeriggio' : 'asera'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center w-full mt-24 max-w-xl mx-auto text-center text-zinc-100"
    >
      <h1 className="text-3xl md:text-4xl font-light mb-4">
        {greeting},{' '}
        <span className="font-semibold">{userName}</span>
      </h1>
      <p className="text-lg text-zinc-400 mb-4">
        Oggi è {formatDateIT(now.now, tz)} e sono le {formatTimeIT(now.now, tz)} ({tz}).
      </p>
      <p className="text-base text-zinc-500">
        Dimmi pure cosa ti serve — posso creare eventi, promemoria o aiutarti con ricerche e file.
      </p>
    </motion.div>
  );
};

export default WelcomeMessage; 