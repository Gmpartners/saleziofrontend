import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

const MessageStatus = ({ status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'enviada':
        return <Check className="h-3 w-3 text-white/80" />;
      case 'entregue':
        return <CheckCheck className="h-3 w-3 text-white/80" />;
      case 'lida':
        return <CheckCheck className="h-3 w-3 text-[#10b981]" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      case 'enviando':
      default:
        return ;
    }
  };

  return (
    <div className="flex items-center justify-center">
      {getStatusIcon()}
    </div>
  );
};

export default React.memo(MessageStatus);