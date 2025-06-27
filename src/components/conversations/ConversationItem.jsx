import React from 'react';
import { Check, CheckCheck, Clock, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { useWindowSize } from '../../hooks/useWindowSize';
import { getEmpresaSetorInfo, getEmpresaColor } from '../../utils/empresaHelpers';

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
    if (isNaN(date.getTime())) return '';
    
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
    console.error('Erro ao formatar timestamp:', error);
    return '';
  }
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  
  try {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n && n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase();
  } catch (error) {
    return 'U';
  }
};

const getSetorColor = (setorName) => {
  if (!setorName || typeof setorName !== 'string') return null;
  
  try {
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
  } catch (error) {
    return null;
  }
};

const getLastMessagePreview = (conversation) => {
  if (!conversation || typeof conversation !== 'object') {
    return '';
  }
  
  if (conversation.ultimaMensagem && 
      typeof conversation.ultimaMensagem === 'string' && 
      conversation.ultimaMensagem.trim()) {
    return conversation.ultimaMensagem.trim();
  }
  
  if (conversation.mensagens && 
      Array.isArray(conversation.mensagens) && 
      conversation.mensagens.length > 0) {
    
    for (let i = conversation.mensagens.length - 1; i >= 0; i--) {
      const message = conversation.mensagens[i];
      
      if (message && 
          typeof message === 'object' && 
          message.conteudo && 
          typeof message.conteudo === 'string' && 
          message.conteudo.trim()) {
        return message.conteudo.trim();
      }
    }
  }
  
  return '';
};

const ConversationItem = ({ conversation, isSelected, onClick, empresasComSetores = [] }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  
  if (!conversation || typeof conversation !== 'object') {
    return null;
  }
  
  const {
    nomeCliente = 'Cliente',
    ultimaAtividade,
    status,
    unreadCount = 0,
    hasNewMessage = false
  } = conversation;
  
  const initials = getInitials(nomeCliente);
  const timestamp = formatTimestamp(ultimaAtividade);
  const statusLower = status?.toLowerCase() || '';
  const statusStyle = STATUS_STYLES[statusLower] || STATUS_STYLES[STATUS.ARQUIVADA];
  const statusLabel = STATUS_LABELS[statusLower] || "Desconhecido";
  
  let empresaSetorInfo = { setor: 'Não definido', empresa: '', empresaAbreviada: '' };
  let setorColor = null;
  let empresaColor = null;
  
  try {
    if (typeof getEmpresaSetorInfo === 'function') {
      empresaSetorInfo = getEmpresaSetorInfo(conversation, empresasComSetores) || empresaSetorInfo;
    }
    
    if (typeof getEmpresaColor === 'function' && empresaSetorInfo.empresa) {
      empresaColor = getEmpresaColor(empresaSetorInfo.empresa);
    }
    
    if (empresaSetorInfo.setor) {
      setorColor = getSetorColor(empresaSetorInfo.setor);
    }
  } catch (error) {
    console.error('Erro ao processar dados da empresa/setor:', error);
  }
  
  const { setor: setorName, empresa: empresaNome, empresaAbreviada } = empresaSetorInfo;
  
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
        
        {setorName && setorColor && (
          <div 
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: setorColor.color }}
            title={`Setor: ${setorName}`}
          />
        )}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2 flex-1 overflow-hidden">
            <h3 className={cn(
              "font-medium truncate text-sm md:text-base",
              isSelected ? "text-white" : "text-slate-200",
              hasNewMessage && "font-semibold"
            )}>
              {nomeCliente}
            </h3>
            
            {!isMobile && empresaNome && empresaColor && (
              <div 
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm font-medium"
                style={{ 
                  backgroundColor: `${empresaColor.color}20`, 
                  color: empresaColor.color,
                  borderLeft: `2px solid ${empresaColor.color}`
                }}
                title={empresaNome}
              >
                <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {empresaNome}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end ml-2 flex-shrink-0">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {timestamp}
            </span>
            
            {(hasNewMessage || unreadCount > 0) && (
              <span className="flex h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-[#10b981] mt-1.5 animate-pulse" />
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 max-w-[65%]">
          </div>
          
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {isMobile && empresaNome && empresaColor && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 h-4 px-1 truncate"
                style={{ 
                  backgroundColor: `${empresaColor.color}20`, 
                  color: empresaColor.color,
                  borderColor: `${empresaColor.color}35`
                }}
                title={empresaNome}
              >
                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                {empresaAbreviada || empresaNome}
              </Badge>
            )}
            
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-5 px-1 truncate"
              style={{ 
                backgroundColor: setorName === 'Não delegado' ? '#ff980020' : setorColor?.color ? `${setorColor.color}20` : '#1f293750', 
                color: setorName === 'Não delegado' ? '#ff9800' : setorColor?.color || '#94a3b8',
                borderColor: setorName === 'Não delegado' ? '#ff980035' : setorColor?.color ? `${setorColor.color}35` : '#1f293750'
              }}
              title={`Setor: ${setorName}`}
            >
              {setorName}
            </Badge>
            
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