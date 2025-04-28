import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle2, Clock, CheckCircle, MessageCircle, Check, CheckCheck } from 'lucide-react';

/**
 * Componente de item de conversa para a lista de conversas
 */
const ConversationItem = ({ 
  conversation, 
  onClick, 
  formatLastMessageTime, 
  isUserSector = false,
  isCompleted = false 
}) => {
  if (!conversation) return null;
  
  // Extrair dados da conversa
  const {
    _id,
    nomeCliente = 'Cliente',
    telefoneCliente = '',
    ultimaMensagem = '',
    ultimaAtividade,
    status = '',
    setorId,
    mensagens = [],
    unreadCount = 0,
    lastMessageRead = true
  } = conversation;
  
  // Formatar o nome do cliente
  const formattedName = nomeCliente || conversation.cliente?.nome || 'Cliente';
  
  // Formatar o telefone
  const formattedPhone = telefoneCliente || conversation.cliente?.telefone || '';
  
  // Determinar o texto de status
  const getStatusBadge = () => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('aguardando')) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
          <Clock className="h-3 w-3" />
          <span>Aguardando</span>
        </span>
      );
    } else if (statusLower.includes('andamento')) {
      return (
        <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
          <MessageCircle className="h-3 w-3" />
          <span>Em atendimento</span>
        </span>
      );
    } else if (statusLower.includes('finalizada') || isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 text-blue-400 text-xs font-medium">
          <CheckCircle className="h-3 w-3" />
          <span>Finalizada</span>
        </span>
      );
    }
    
    return null;
  };
  
  // Determinar nome do setor
  const getSectorName = () => {
    if (typeof setorId === 'object' && setorId) {
      return setorId.nome || 'Setor';
    }
    return 'Setor';
  };
  
  // Preparar dados para animação
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // Verificar se há mensagens não lidas
  const hasUnreadMessages = unreadCount > 0 || !lastMessageRead;
  
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      layout
      onClick={() => onClick(_id)}
      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-[#101820] relative ${
        hasUnreadMessages ? 'bg-[#0a2038] border border-[#10b981]/30' : 
        isUserSector ? 'bg-[#0f1621] border border-[#10b981]/30' : 'bg-[#0f1621] border border-[#1f2937]/40'
      }`}
    >
      {/* Indicador de mensagens não lidas */}
      {hasUnreadMessages && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-[#10b981] rounded-full"></span>
      )}
      
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
          hasUnreadMessages ? 'bg-[#10b981]/20 text-[#10b981]' :
          isUserSector ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#0c1118] text-slate-400'
        }`}>
          <UserCircle2 className="h-6 w-6" />
        </div>
        
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            {/* Nome do cliente */}
            <h3 className={`font-medium truncate ${hasUnreadMessages ? 'text-[#10b981]' : 'text-white'}`}>
              {formattedName}
            </h3>
            
            {/* Timestamp */}
            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
              {formatLastMessageTime(ultimaAtividade)}
            </span>
          </div>
          
          {/* Telefone */}
          {formattedPhone && (
            <div className="text-xs text-slate-500 mb-1">{formattedPhone}</div>
          )}
          
          {/* Última mensagem */}
          <p className={`text-sm truncate mb-1 ${hasUnreadMessages ? 'text-white font-medium' : 'text-slate-300'}`}>
            {ultimaMensagem}
          </p>
          
          {/* Badges */}
          <div className="flex justify-between items-center">
            {getStatusBadge()}
            
            {/* Setor */}
            <div className="flex items-center gap-2">
              {/* Status de leitura */}
              {!isCompleted && (
                <span className="text-xs">
                  {lastMessageRead ? (
                    <CheckCheck className="h-3 w-3 text-blue-400" />
                  ) : (
                    <Check className="h-3 w-3 text-slate-400" />
                  )}
                </span>
              )}
              
              {/* Contador de mensagens não lidas */}
              {unreadCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#10b981] text-white">
                  {unreadCount}
                </span>
              )}
              
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300">
                {getSectorName()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationItem;