import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { useWindowSize } from '../../hooks/useWindowSize';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const STATUS_STYLES = {
  [STATUS.AGUARDANDO]: {
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    indicator: "bg-amber-500"
  },
  [STATUS.EM_ANDAMENTO]: {
    badge: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/25",
    indicator: "bg-[#10b981]"
  },
  [STATUS.FINALIZADA]: {
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    indicator: "bg-blue-500"
  }
};

const STATUS_LABELS = {
  [STATUS.AGUARDANDO]: "Aguardando",
  [STATUS.EM_ANDAMENTO]: "Em atendimento",
  [STATUS.FINALIZADA]: "Finalizada",
  [STATUS.ARQUIVADA]: "Arquivada"
};

const COLOR_PALETTE = [
  { hue: 210, name: 'azure' },
  { hue: 340, name: 'crimson' },
  { hue: 160, name: 'emerald' },
  { hue: 270, name: 'purple' },
  { hue: 30, name: 'amber' },
  { hue: 180, name: 'teal' },
  { hue: 330, name: 'pink' },
  { hue: 240, name: 'indigo' },
  { hue: 15, name: 'orange' },
  { hue: 200, name: 'cyan' },
  { hue: 290, name: 'violet' }
];

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  } catch (error) {
    return '';
  }
};

const getInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n && n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
};

// Função aprimorada para obter o nome do setor de forma segura
const getSetorNome = (conversation) => {
  if (conversation?.setorInfo?.nome) return conversation.setorInfo.nome;
  if (typeof conversation?.setorId === 'object' && conversation.setorId?.nome) return conversation.setorId.nome;
  if (conversation?.setor?.nome) return conversation.setor.nome;
  
  const setorId = typeof conversation?.setorId === 'string' ? conversation.setorId : 
                 (conversation?.setorId?._id || conversation?.setorId?.id || 'Não disponível');
  
  if (typeof setorId === 'string' && setorId.startsWith('SET')) {
    return `S-${setorId.substring(3)}`;
  }
  
  return setorId ? `S-${setorId}` : 'Não definido';
};

const getSetorColor = (setorName) => {
  if (!setorName) return null;
  
  const hash = setorName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
  const { hue, name } = COLOR_PALETTE[colorIndex];
  
  const saturation = 75;
  const lightness = 55;
  const lightSaturation = 85;
  const lightLightness = 88;
  
  return {
    hue,
    name,
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    lightColor: `hsl(${hue}, ${lightSaturation}%, ${lightLightness}%)`,
    textColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    bgClass: `bg-${name}-500`,
    textClass: `text-${name}-500`,
    classes: {
      badge: `bg-${name}-500/10 text-${name}-500 border-${name}-500/25`,
      icon: `text-${name}-500`,
      indicator: `bg-${name}-500`
    }
  };
};

const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  
  if (!conversation) return null;
  
  const {
    nomeCliente,
    ultimaMensagem,
    ultimaAtividade,
    status,
    unreadCount = 0,
    hasNewMessage
  } = conversation;
  
  const initials = getInitials(nomeCliente || 'Cliente');
  const timestamp = formatTimestamp(ultimaAtividade);
  const statusLower = status?.toLowerCase() || '';
  const statusStyle = STATUS_STYLES[statusLower] || STATUS_STYLES[STATUS.ARQUIVADA];
  const statusLabel = STATUS_LABELS[statusLower] || "Desconhecido";
  
  // Usar a função aprimorada para obter o nome do setor
  const setorName = getSetorNome(conversation);
  const setorColor = getSetorColor(setorName);
  
  return (
    <div
      className={cn(
        "flex p-3 md:p-3.5 cursor-pointer transition-colors",
        isSelected 
          ? "bg-[#10b981]/5 border-l-4 border-l-[#10b981]" 
          : "hover:bg-[#101820]/60 border-l-4 border-l-transparent",
        "border-b border-b-[#1f2937]/40"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick()}
    >
      <div className="relative mr-3 md:mr-4 flex-shrink-0">
        <Avatar className="h-10 w-10 md:h-11 md:w-11 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-[#0f1621] to-[#111827] text-white text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {setorName && (
          <div 
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: setorColor?.color }}
            title={`Setor: ${setorName}`}
          />
        )}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2 max-w-[70%]">
            <h3 className={cn(
              "font-medium truncate text-sm md:text-base",
              isSelected ? "text-white" : "text-slate-200",
              hasNewMessage && "font-semibold"
            )}>
              {nomeCliente || 'Cliente'}
            </h3>
            
            {setorName && !isMobile && (
              <div 
                className="px-1.5 py-0.5 text-[10px] rounded-sm font-medium truncate max-w-[80px]"
                style={{ 
                  backgroundColor: `${setorColor?.color}20`, 
                  color: setorColor?.color,
                  borderLeft: `2px solid ${setorColor?.color}`
                }}
                title={`Setor: ${setorName}`}
              >
                {setorName}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {timestamp}
            </span>
            
            {unreadCount > 0 && (
              <span 
                className="flex items-center justify-center h-5 min-w-5 rounded-full bg-[#10b981] text-white text-xs font-bold px-1.5 mt-0.5 shadow-sm"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 max-w-[65%]">
            <p className={cn(
              "text-xs md:text-sm truncate",
              isSelected ? "text-slate-300" : "text-slate-400",
              hasNewMessage && "text-white font-medium"
            )}>
              {ultimaMensagem || 'Nenhuma mensagem'}
            </p>
            
            {/* Display setor badge em telas móveis */}
            {setorName && isMobile && (
              <Badge
                variant="outline"
                className="ml-1 text-[10px] py-0 h-5 px-1 truncate"
                style={{ 
                  backgroundColor: `${setorColor?.color}20`, 
                  color: setorColor?.color,
                  borderColor: `${setorColor?.color}35`
                }}
                title={`Setor: ${setorName}`}
              >
                {setorName}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Sempre mostrar o setor em uma badge dedicada */}
            {setorName && !isMobile && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-5 px-1.5 truncate shadow-sm"
                style={{ 
                  backgroundColor: `${setorColor?.color}20`, 
                  color: setorColor?.color,
                  borderColor: `${setorColor?.color}35`
                }}
                title={`Setor: ${setorName}`}
              >
                {setorName}
              </Badge>
            )}
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] py-0 h-5 px-1.5 md:px-2 truncate shadow-sm",
                statusStyle.badge
              )}
            >
              {isMobile ? statusLabel.slice(0, 3) + '.' : statusLabel}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ConversationItem);