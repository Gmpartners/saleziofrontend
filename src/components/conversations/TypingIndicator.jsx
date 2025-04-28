import React from 'react';

const TypingIndicator = ({ user }) => {
  if (!user) return null;

  const displayName = user.nome || user.userName || 'Cliente';

  return (
    <div className="flex mb-3">
      <div className="bg-slate-700 text-gray-300 px-3 py-2 rounded-lg max-w-[75%] shadow-sm">
        <div className="flex items-center">
          <div className="text-xs opacity-70 mr-2">{displayName} está digitando</div>
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;