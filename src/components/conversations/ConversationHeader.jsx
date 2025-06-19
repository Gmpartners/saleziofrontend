import React from 'react';
import { 
  ArrowLeft, 
  User, 
  MoreVertical, 
  Phone,
  Video,
  CheckCircle,
  Share,
  Archive
} from 'lucide-react';
import { cn } from '../../lib/utils';

import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const ConversationHeader = ({ 
  conversation, 
  isConnected, 
  isProcessing, 
  onShowFinishModal, 
  onShowTransferModal, 
  onShowArchiveModal,
  onBack
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || '';
  const setorNome = conversation.setorId?.nome || conversation.setorInfo?.nome;
  
  const initials = nomeCliente
    .split(' ')
    .slice(0, 2)
    .map(name => name && name[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  
  let statusBadge = null;
  if (conversation.status) {
    const statusLower = conversation.status.toLowerCase();
    
    if (statusLower === STATUS.AGUARDANDO) {
      statusBadge = (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
          Aguardando
        </Badge>
      );
    } else if (statusLower === STATUS.EM_ANDAMENTO) {
      statusBadge = (
        <Badge variant="outline" className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">
          Em atendimento
        </Badge>
      );
    } else if (statusLower === STATUS.FINALIZADA) {
      statusBadge = (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          Finalizada
        </Badge>
      );
    }
  }
  
  const isConversationFinished = conversation.status && conversation.status.toLowerCase() === STATUS.FINALIZADA;
  
  return (
    <div className="flex flex-col border-b border-[#1f2937]/40 bg-[#070b11] shadow-md p-3 sticky top-0 z-30">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              onClick={onBack}
              size="icon" 
              variant="ghost" 
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-full bg-[#101820]/80"
              aria-label="Voltar para lista"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10 border-2 border-[#10b981]/30">
            <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
              {initials || <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="text-white font-medium">{nomeCliente}</h3>
            <div className="text-xs flex items-center gap-2">
              <span className="text-slate-400">{telefoneCliente}</span>
              {statusBadge}
              
              {setorNome && (
                <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50 hidden sm:inline-flex">
                  {setorNome}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#10b981]">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981]' : 'bg-red-500'}`}></span>
            <span className="hidden sm:inline">{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          
          <Button 
            size="icon"
            variant="ghost"
            className="rounded-full h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#101820] hidden sm:flex"
            title="Chamada de vídeo"
            disabled={isConversationFinished}
          >
            <Video className="h-4 w-4" />
          </Button>
          
          <Button 
            size="icon"
            variant="ghost"
            className="rounded-full h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#101820] hidden sm:flex"
            title="Chamada de voz"
            disabled={isConversationFinished}
          >
            <Phone className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="icon"
                variant="ghost"
                className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
                aria-label="Mais opções"
                disabled={isProcessing}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#070b11] border border-[#1f2937]/40 shadow-md z-40">
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820]"
                onClick={onShowFinishModal}
                disabled={isProcessing || isConversationFinished}
              >
                <CheckCircle className="h-4 w-4 text-[#10b981] mr-2" />
                <span>Finalizar Conversa</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820]"
                onClick={onShowTransferModal}
                disabled={isProcessing || isConversationFinished}
              >
                <Share className="h-4 w-4 text-blue-400 mr-2" />
                <span>Transferir</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820] sm:hidden"
                disabled={isProcessing || isConversationFinished}
              >
                <Video className="h-4 w-4 text-purple-400 mr-2" />
                <span>Chamada de vídeo</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820] sm:hidden"
                disabled={isProcessing || isConversationFinished}
              >
                <Phone className="h-4 w-4 text-blue-400 mr-2" />
                <span>Chamada de voz</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#1f2937]/40" />
              
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-red-400 hover:bg-[#101820] focus:bg-[#101820]"
                onClick={onShowArchiveModal}
                disabled={isProcessing}
              >
                <Archive className="h-4 w-4 mr-2" />
                <span>Arquivar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ConversationHeader);