import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = React.memo(({ user }) => {
  const userName = user?.nome || 'Alguém';

  return (
    <div className="flex justify-start mb-2">
      <div className="max-w-[75%]">
        <div className="bg-[#111a30]/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2 shadow-[0_2px_10px_rgba(0,0,0,0.15)]">
          <div className="flex space-x-1">
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={dot}
                className="w-1.5 h-1.5 bg-[#3cefb1] rounded-full shadow-[0_0_5px_rgba(60,239,177,0.5)]"
                initial={{ y: 0 }}
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: dot * 0.2
                }}
              />
            ))}
          </div>
          <span className="text-xs text-[#8294b8]" aria-live="polite">
            {userName} está digitando...
          </span>
        </div>
      </div>
    </div>
  );
});

export default TypingIndicator;