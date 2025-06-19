import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Loader2,
  User, 
  Filter, 
  X,
  Bell,
  BellOff,
  CheckCircle,
  Share,
  Archive,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Menu,
  Filter as FilterIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { cn } from "../../lib/utils";
import { useAuthContext } from '../../hooks/useAuthContext';
import { useSocket } from '../../contexts/SocketContext';

import ConversationItem from '../../components/conversations/ConversationItem';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../../components/ui/tabs";
import { Calendar } from "../../components/ui/calendar";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "../../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from "../../components/ui/sheet";

const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

class LogService {
  constructor(componentName) {
    this.componentName = componentName;
    this.logQueue = [];
    this.isProcessingQueue = false;
    this.flushInterval = null;
    this.startFlushInterval();
    this.sessionId = this.generateSessionId();
    this.perfMarks = {};
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 10000);
  }
  
  stopFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
  
  markPerformance(name) {
    this.perfMarks[name] = performance.now();
    return this.perfMarks[name];
  }
  
  measurePerformance(end, start) {
    const startTime = typeof start === 'string' ? this.perfMarks[start] : start;
    const endTime = typeof end === 'string' ? this.perfMarks[end] : end || performance.now();
    
    if (!startTime) {
      this.warn(`Não foi possível medir performance: marca inicial "${start}" não encontrada.`);
      return 0;
    }
    
    return endTime - startTime;
  }
  
  logWithLevel(level, message, data = {}, tags = []) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: this.componentName,
      message,
      data: { ...data, sessionId: this.sessionId },
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean)
    };
    
    try {
      const userProfile = JSON.parse(localStorage.getItem('userProfile'));
      if (userProfile) {
        logEntry.data.userId = userProfile.id || userProfile._id;
        logEntry.data.userName = userProfile.nome;
        logEntry.data.userEmail = userProfile.email;
      }
    } catch (e) {}
    
    const consoleMethod = level === LogLevel.DEBUG ? 'debug' : 
                          level === LogLevel.INFO ? 'info' : 
                          level === LogLevel.WARN ? 'warn' : 'error';
    
    const styles = {
      debug: 'color: #9ca3af',
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      fatal: 'color: #7f1d1d; font-weight: bold'
    };
    
    console[consoleMethod](
      `%c[${level.toUpperCase()}][${this.componentName}]`,
      styles[level],
      message,
      data
    );
    
    this.logQueue.push(logEntry);
    
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.flushLogs(true);
    }
    
    return logEntry;
  }
  
  debug(message, data = {}, tags = []) {
    return this.logWithLevel(LogLevel.DEBUG, message, data, tags);
  }
  
  info(message, data = {}, tags = []) {
    return this.logWithLevel(LogLevel.INFO, message, data, tags);
  }
  
  warn(message, data = {}, tags = []) {
    return this.logWithLevel(LogLevel.WARN, message, data, tags);
  }
  
  error(message, error = null, data = {}, tags = []) {
    let errorDetails = {};
    if (error instanceof Error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
    } else if (error) {
      errorDetails = { details: error };
    }
    
    return this.logWithLevel(
      LogLevel.ERROR, 
      message, 
      { ...data, error: errorDetails }, 
      tags
    );
  }
  
  fatal(message, error = null, data = {}, tags = []) {
    const logEntry = this.error(message, error, { ...data, isFatal: true }, [...tags, 'fatal']);
    logEntry.level = LogLevel.FATAL;
    return logEntry;
  }
  
  handleGlobalError(event) {
    this.fatal(
      'Erro global não capturado', 
      event.error, 
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, 
      ['uncaught', 'global', 'error']
    );
    
    return false;
  }
  
  handlePromiseRejection(event) {
    this.error(
      'Promessa rejeitada não tratada', 
      event.reason, 
      { promise: event.promise }, 
      ['uncaught', 'promise', 'rejection']
    );
  }
  
  logApiCall(method, endpoint, params, duration, success, responseData, error = null) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success 
      ? `API ${method.toUpperCase()} ${endpoint} completada em ${duration}ms` 
      : `Falha em API ${method.toUpperCase()} ${endpoint}`;
    
    this.logWithLevel(
      level,
      message,
      {
        method,
        endpoint,
        params,
        duration,
        success,
        responseData: success ? responseData : undefined,
        error: !success ? error : undefined
      },
      ['api', method.toLowerCase(), success ? 'success' : 'failure']
    );
  }
  
  async flushLogs(immediate = false) {
    if (this.logQueue.length === 0 || this.isProcessingQueue && !immediate) {
      return;
    }
    
    this.isProcessingQueue = true;
    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    
    try {
      const existingLogs = JSON.parse(localStorage.getItem('applicationLogs') || '[]');
      const updatedLogs = [...existingLogs, ...logsToSend].slice(-1000);
      localStorage.setItem('applicationLogs', JSON.stringify(updatedLogs));
      
      this.isProcessingQueue = false;
    } catch (error) {
      this.logQueue = [...logsToSend, ...this.logQueue];
      this.isProcessingQueue = false;
      
      console.error('Falha ao enviar logs:', error);
    }
  }
  
  dispose() {
    this.flushLogs(true);
    this.stopFlushInterval();
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }
}

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const debounce = (func, delay) => {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

const getSetorNome = (conversation) => {
  if (conversation?.setorInfo?.nome) return conversation.setorInfo.nome;
  if (typeof conversation?.setorId === 'object' && conversation.setorId?.nome) return conversation.setorId.nome;
  if (conversation?.setor?.nome) return conversation.setor.nome;
  
  const setorId = typeof conversation?.setorId === 'string' ? conversation.setorId : 
                 (conversation?.setorId?._id || conversation?.setorId?.id || 'Não disponível');
  
  if (typeof setorId === 'string' && setorId.startsWith('SET')) {
    return `Setor ${setorId.substring(3)}`;
  }
  
  return setorId ? `Setor ${setorId}` : 'Não definido';
};

const VirtualizedConversationList = React.memo(({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation,
  logger
}) => {
  const itemSize = 80;
  
  const Row = useCallback(({ index, style }) => {
    const conversation = conversations[index];
    return (
      <div style={style} key={conversation.conversaId || conversation._id}>
        <ConversationItem
          conversation={conversation}
          isSelected={selectedConversationId === (conversation.conversaId || conversation._id)}
          onClick={() => {
            logger.debug('Conversa selecionada', { 
              conversationId: conversation.conversaId || conversation._id,
              index 
            });
            onSelectConversation(conversation.conversaId || conversation._id);
          }}
          isTyping={conversation.isTyping}
        />
      </div>
    );
  }, [conversations, selectedConversationId, onSelectConversation, logger]);
  
  if (conversations.length === 0) {
    return null;
  }
  
  return (
    <div className="flex-1 h-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={conversations.length}
            itemSize={itemSize}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

const TabWithUnreadCount = React.memo(({ value, label, count, logger }) => {
  useEffect(() => {
    if (count > 0) {
      logger.debug(`Contador de não lidas atualizado na aba ${value}`, { count });
    }
  }, [count, value, logger]);

  return (
    <TabsTrigger 
      value={value} 
      className={`
        rounded-none data-[state=active]:border-b-2 text-xs xs:text-sm
        ${value === 'ongoing' 
          ? 'data-[state=active]:border-[#10b981] data-[state=active]:text-[#10b981] data-[state=active]:bg-[#10b981]/10' 
          : value === 'waiting'
            ? 'data-[state=active]:border-orange-500 data-[state=active]:text-orange-400 data-[state=active]:bg-orange-500/10'
            : value === 'completed'
              ? 'data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10'
              : 'data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10'
        }
        data-[state=inactive]:text-slate-400 transition-all relative
      `}
      onClick={() => {
        logger.info(`Aba ${value} clicada`, { label, count });
      }}
    >
      {label}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </TabsTrigger>
  );
});

const Pagination = React.memo(({ 
  pagination, 
  onPageChange,
  logger
}) => {
  if (!pagination || pagination.pages <= 1) return null;
  
  const { page, pages } = pagination;
  
  const handlePageChange = (newPage) => {
    const startTime = performance.now();
    logger.info('Mudança de página solicitada', { fromPage: page, toPage: newPage });
    
    onPageChange(newPage);
    
    const duration = performance.now() - startTime;
    logger.debug('Renderização de nova página', { duration: `${duration.toFixed(2)}ms` });
  };
  
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 3;
    
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(pages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={i === page ? "default" : "outline"}
          size="sm"
          className={i === page 
            ? "bg-[#10b981] hover:bg-[#10b981]/90 text-white h-8 w-8 px-0" 
            : "bg-[#101820] border-[#1f2937]/40 text-slate-400 hover:text-white hover:bg-[#101820] h-8 w-8 px-0"
          }
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    return pageNumbers;
  };
  
  return (
    <div className="flex items-center justify-center gap-1 py-3 border-t border-[#1f2937]/40">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => handlePageChange(page - 1)}
        className="bg-[#101820] border-[#1f2937]/40 text-slate-400 hover:text-white hover:bg-[#101820] h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {renderPageNumbers()}
      
      <Button
        variant="outline"
        size="sm"
        disabled={page === pages}
        onClick={() => handlePageChange(page + 1)}
        className="bg-[#101820] border-[#1f2937]/40 text-slate-400 hover:text-white hover:bg-[#101820] h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
});

const EmptyConversationList = React.memo(({ 
  activeTab, 
  onRefresh,
  logger
}) => {
  useEffect(() => {
    logger.info('Lista de conversas vazia exibida', { activeTab });
  }, [activeTab, logger]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm py-8"
    >
      <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
        <User className="h-8 w-8 text-slate-400/70" />
      </div>
      <p>Nenhuma conversa {activeTab === 'completed' ? 'finalizada' : activeTab === 'waiting' ? 'aguardando' : activeTab === 'ongoing' ? 'em andamento' : ''} no seu setor.</p>
      <Button
        onClick={() => {
          logger.info('Botão de atualização clicado na lista vazia', { activeTab });
          onRefresh();
        }}
        variant="outline"
        size="sm"
        className="mt-4 text-xs bg-[#101820] border-[#1f2937]/40 text-[#10b981] hover:bg-[#101820] hover:text-[#10b981] transition-all duration-300"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-2" />
        Atualizar conversas
      </Button>
    </motion.div>
  );
});

const ErrorDisplay = React.memo(({ 
  error, 
  onRefresh,
  logger
}) => {
  useEffect(() => {
    logger.error('Exibindo mensagem de erro para o usuário', null, { 
      displayedError: error 
    });
  }, [error, logger]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col items-center justify-center p-6"
    >
      <Alert variant="destructive" className="max-w-md bg-red-900/20 border-red-900/30">
        <AlertTitle>Erro ao carregar conversas</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            onClick={() => {
              logger.info('Tentativa de recuperação de erro', { error });
              onRefresh();
            }} 
            variant="outline" 
            size="sm" 
            className="mt-2 w-full bg-[#101820] text-white border-[#1f2937]/40"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
});

const LoadingIndicator = React.memo(({ logger }) => {
  useEffect(() => {
    logger.debug('Indicador de carregamento exibido');
  }, [logger]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-16 text-slate-400 text-sm py-8"
    >
      <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#10b981]" />
      <span>Carregando conversas...</span>
    </motion.div>
  );
});

const ConversationListHeader = React.memo(({ 
  currentSectorName, 
  unreadCount,
  isArquivada,
  isConnected,
  notificationsEnabled,
  onToggleNotifications,
  onRefresh,
  isRefreshing,
  conversationsCount,
  logger,
  onOpenFilterSheet,
  isMobile
}) => {
  useEffect(() => {
    logger.debug('Cabeçalho renderizado', { 
      currentSectorName, 
      unreadCount, 
      isArquivada, 
      isConnected, 
      notificationsEnabled,
      conversationsCount
    });
  }, [currentSectorName, unreadCount, isArquivada, isConnected, notificationsEnabled, conversationsCount, logger]);

  return (
    <div className="p-3 sm:p-4 bg-[#070b11] border-b border-[#1f2937]/40 flex justify-between items-center rounded-t-xl sticky top-0 z-30">
      <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 truncate">
        <MessageSquare className="h-5 w-5 text-[#10b981] flex-shrink-0" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669] truncate">
          Conversas: {currentSectorName} {isArquivada && '(Arquivadas)'}
        </span>
        {unreadCount > 0 && (
          <Badge className="bg-[#10b981] text-white text-xs ml-1 px-1.5">
            {unreadCount}
          </Badge>
        )}
      </h2>
      
      <div className="flex items-center gap-1 sm:gap-2">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenFilterSheet}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
            title="Filtros"
          >
            <FilterIcon className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            logger.info('Botão de notificações clicado', { 
              novoEstado: !notificationsEnabled 
            });
            onToggleNotifications();
          }}
          className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
          title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
        >
          {notificationsEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            logger.info('Botão de atualização clicado');
            onRefresh();
          }}
          disabled={isRefreshing}
          className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
          title="Atualizar conversas"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        

        
        <Badge variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-xs font-medium text-[#10b981] px-2 hidden xs:inline-flex">
          {conversationsCount} conversas
        </Badge>
      </div>
    </div>
  );
});

const SearchAndFilterBar = React.memo(({ 
  searchTerm, 
  onSearchChange,
  filters,
  onFilterChange,
  dateRange,
  setDateRange,
  availableSectors,
  logger,
  isMobile
}) => {
  const handleFilterChange = (name, value) => {
    logger.info('Filtro alterado', { 
      filtro: name, 
      valorAnterior: filters[name], 
      novoValor: value 
    });
    onFilterChange(name, value);
  };

  const handleDateRangeChange = (range) => {
    logger.info('Período de datas alterado', { 
      de: range.from ? format(range.from, 'yyyy-MM-dd') : null,
      ate: range.to ? format(range.to, 'yyyy-MM-dd') : null
    });
    setDateRange(range);
  };

  const handleSearch = (event) => {
    const term = event.target.value;
    logger.debug('Termo de busca digitado', { termo: term });
    onSearchChange(event);
  };

  return (
    <div className="px-3 sm:px-4 py-3 border-b border-[#1f2937]/40 bg-[#070b11] sticky top-[60px] z-20">
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 bg-[#101820] border-[#1f2937]/40 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 rounded-lg text-white placeholder:text-slate-400/70"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        
        {!isMobile && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-[#101820] border border-[#1f2937]/40 text-slate-400 hover:text-white hover:bg-[#101820]"
                onClick={() => logger.debug('Popover de filtros aberto')}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[#070b11] border border-[#1f2937]/40 p-4 shadow-lg">
              <div className="space-y-4">
                <h3 className="font-medium text-white">Filtrar Conversas</h3>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Visualização</label>
                    <Select 
                      value={filters.arquivada.toString()} 
                      onValueChange={(value) => handleFilterChange('arquivada', value === 'true')}
                    >
                      <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                        <SelectValue placeholder="Tipo de visualização" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                        <SelectItem value="false">Conversas Ativas</SelectItem>
                        <SelectItem value="true">Conversas Arquivadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Setor</label>
                    <Select
                      value={filters.sectorFilter}
                      onValueChange={(value) => handleFilterChange('sectorFilter', value)}
                    >
                      <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                        {availableSectors.map(sector => (
                          <SelectItem key={sector.value} value={sector.value} className="hover:bg-[#1f2937]">
                            {sector.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Período</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal bg-[#101820] border-[#1f2937]/40"
                        >
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, 'dd/MM/yyyy')} -&nbsp;
                                {format(dateRange.to, 'dd/MM/yyyy')}
                              </>
                            ) : (
                              format(dateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            "Selecione as datas"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#101820] border-[#1f2937]/40" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeChange}
                          className="bg-[#101820]"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {(filters.sectorFilter !== 'all' || (dateRange.from && dateRange.to)) && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-slate-400">Filtros ativos</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          logger.info('Limpeza de todos os filtros solicitada');
                          handleFilterChange('sectorFilter', 'all');
                          handleDateRangeChange({ from: undefined, to: undefined });
                        }}
                        className="h-8 text-xs text-slate-300 hover:text-white hover:bg-[#1f2937]/40"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {filters.sectorFilter !== 'all' && (
        <div className="flex items-center mt-2">
          <Badge className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
            Setor: {filters.sectorFilter}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 ml-2 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => handleFilterChange('sectorFilter', 'all')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
});

const ConversationModals = React.memo(({
  showTransferModal,
  setShowTransferModal,
  showFinishModal,
  setShowFinishModal,
  showArchiveModal,
  setShowArchiveModal,
  transferModalContent,
  selectedSector,
  isProcessing,
  processingAction,
  handleConfirmTransfer,
  handleConfirmFinish,
  handleConfirmArchive,
  logger
}) => {
  useEffect(() => {
    if (showTransferModal) {
      logger.info('Modal de transferência aberto');
    }
  }, [showTransferModal, logger]);

  useEffect(() => {
    if (showFinishModal) {
      logger.info('Modal de finalização aberto');
    }
  }, [showFinishModal, logger]);

  useEffect(() => {
    if (showArchiveModal) {
      logger.info('Modal de arquivamento aberto');
    }
  }, [showArchiveModal, logger]);

  const loggedHandleConfirmTransfer = () => {
    logger.info('Transferência confirmada', { 
      setorSelecionado: selectedSector 
    });
    handleConfirmTransfer();
  };

  const loggedHandleConfirmFinish = () => {
    logger.info('Finalização confirmada');
    handleConfirmFinish();
  };

  const loggedHandleConfirmArchive = () => {
    logger.info('Arquivamento confirmado');
    handleConfirmArchive();
  };

  return (
    <>
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o setor para o qual deseja transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {transferModalContent}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                logger.info('Transferência cancelada');
                setShowTransferModal(false);
              }}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white w-full sm:w-auto"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={loggedHandleConfirmTransfer}
              disabled={!selectedSector || isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90 w-full sm:w-auto"
            >
              {isProcessing && processingAction === 'transferir' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'transferir' ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja finalizar esta conversa?
              A conversa será movida para a lista de conversas concluídas.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                logger.info('Finalização cancelada');
                setShowFinishModal(false);
              }}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white w-full sm:w-auto"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={loggedHandleConfirmFinish}
              disabled={isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90 w-full sm:w-auto"
            >
              {isProcessing && processingAction === 'finalizar' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'finalizar' ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arquivar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja arquivar esta conversa?
              Conversas arquivadas não serão mais exibidas em nenhuma lista.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                logger.info('Arquivamento cancelado');
                setShowArchiveModal(false);
              }}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white w-full sm:w-auto"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={loggedHandleConfirmArchive}
              variant="destructive"
              disabled={isProcessing}
              className="hover:opacity-90 w-full sm:w-auto"
            >
              {isProcessing && processingAction === 'arquivar' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'arquivar' ? 'Arquivando...' : 'Arquivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

const FilterSheet = React.memo(({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  dateRange,
  setDateRange,
  availableSectors,
  logger
}) => {
  const handleFilterChange = (name, value) => {
    logger.info('Filtro alterado (Mobile)', {
      filtro: name,
      valorAnterior: filters[name],
      novoValor: value
    });
    onFilterChange(name, value);
  };

  const handleDateRangeChange = (range) => {
    logger.info('Período de datas alterado (Mobile)', {
      de: range.from ? format(range.from, 'yyyy-MM-dd') : null,
      ate: range.to ? format(range.to, 'yyyy-MM-dd') : null
    });
    setDateRange(range);
  };

  const handleClearFilters = () => {
    logger.info('Limpeza de todos os filtros solicitada (Mobile)');
    handleFilterChange('sectorFilter', 'all');
    handleDateRangeChange({ from: undefined, to: undefined });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#070b11] border-t border-[#1f2937]/40 text-white">
        <SheetHeader>
          <SheetTitle className="text-white">Filtros</SheetTitle>
          <SheetDescription className="text-slate-400">
            Ajuste os filtros para encontrar conversas específicas
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Visualização</label>
            <Select 
              value={filters.arquivada.toString()} 
              onValueChange={(value) => handleFilterChange('arquivada', value === 'true')}
            >
              <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                <SelectValue placeholder="Tipo de visualização" />
              </SelectTrigger>
              <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                <SelectItem value="false">Conversas Ativas</SelectItem>
                <SelectItem value="true">Conversas Arquivadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Setor</label>
            <Select
              value={filters.sectorFilter}
              onValueChange={(value) => handleFilterChange('sectorFilter', value)}
            >
              <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                <SelectValue placeholder="Selecione um setor" />
              </SelectTrigger>
              <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                {availableSectors.map(sector => (
                  <SelectItem key={sector.value} value={sector.value} className="hover:bg-[#1f2937]">
                    {sector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Período</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal bg-[#101820] border-[#1f2937]/40"
                >
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yyyy')} -&nbsp;
                        {format(dateRange.to, 'dd/MM/yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy')
                    )
                  ) : (
                    "Selecione as datas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#101820] border-[#1f2937]/40" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  className="bg-[#101820]"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <SheetFooter className="flex flex-col gap-2 sm:flex-row">
          {(filters.sectorFilter !== 'all' || (dateRange.from && dateRange.to)) && (
            <Button
              variant="outline"
              className="text-slate-300 bg-[#101820] border-[#1f2937]/40 hover:bg-[#1f2937]/40"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
          <SheetClose asChild>
            <Button className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90">
              Aplicar filtros
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});

const instrumentedMultiflowApi = {
  ...multiflowApi,
  apiCallWithLogs: async (logger, methodName, ...args) => {
    logger.debug(`Chamada API - ${methodName} iniciada`, { args });
    
    const startTime = performance.now();
    try {
      const result = await multiflowApi[methodName](...args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info(`API ${methodName} completada`, { 
        success: true, 
        duration: `${duration.toFixed(2)}ms`,
        resultStatus: result.success ? 'success' : 'error'
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.error(`Falha na API ${methodName}`, error, { 
        duration: `${duration.toFixed(2)}ms`,
        args 
      });
      
      throw error;
    }
  }
};

const EmployeeConversationsView = () => {
  const loggerRef = useRef(null);
  if (!loggerRef.current) {
    loggerRef.current = new LogService('EmployeeConversationsView');
  }
  const logger = loggerRef.current;
  
  useEffect(() => {
    const mountTimestamp = logger.markPerformance('componentMount');
    logger.info('Componente montado', { timestamp: mountTimestamp });
    
    return () => {
      const unmountDuration = logger.measurePerformance(null, 'componentMount');
      logger.info('Componente desmontado', { 
        duracaoTotal: `${unmountDuration.toFixed(2)}ms` 
      });
      logger.dispose();
    };
  }, []);
  
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuthContext();
  
  const { 
    isConnected, 
    conversations, 
    completedConversations, 
    refreshConversations, 
    refreshCompletedConversations,
    selectConversation,
    transferConversation,
    finishConversation,
    archiveConversation,
    isLoading,
    clearUnreadMessages,
    toastNotification,
    closeToast,
    handleToastClick,
    pagination,
    onNewMessage,
    typingUsers
  } = useSocket();
  
  // Força re-renderização
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Auto-refresh interval
  const autoRefreshRef = useRef(null);
  const lastRefreshTimeRef = useRef(Date.now());
  
  // Configuração para auto-refresh
  const AUTO_REFRESH_INTERVAL = 15000; // 15 segundos
  
  useEffect(() => {
    logger.debug('Estado do contexto Socket', { 
      isConnected, 
      conversationCount: conversations?.length || 0,
      completedCount: completedConversations?.length || 0,
      isLoading,
      pagination
    });
  }, [isConnected, conversations, completedConversations, isLoading, pagination]);
  
  const [activeTab, setActiveTab] = useState('ongoing');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('employeeNotifications') !== 'false'
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    arquivada: false,
    sectorFilter: 'all'
  });
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [sectors, setSectors] = useState([]);
  
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  
  // Configurar auto-refresh para obter novas mensagens
  useEffect(() => {
    // Iniciar auto-refresh
    autoRefreshRef.current = setInterval(() => {
      // Apenas atualizar se o último refresh foi há mais de AUTO_REFRESH_INTERVAL
      if (Date.now() - lastRefreshTimeRef.current > AUTO_REFRESH_INTERVAL) {
        // Não mostrar indicador de carregamento para refresh de fundo
        handleSilentRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);
    
    // Parar refresh ao desmontar
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);
  
  // Função para refresh silencioso (sem UI loading)
  const handleSilentRefresh = useCallback(async () => {
    logger.debug('Executando refresh silencioso');
    
    try {
      if (activeTab === 'completed') {
        await refreshCompletedConversations({
          status: STATUS.FINALIZADA,
          arquivada: filters.arquivada,
          forceRefresh: true,
          silent: true
        });
      } else {
        const statusFilters = [];
        
        if (activeTab === 'all') {
          statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
        } else if (activeTab === 'waiting') {
          statusFilters.push(STATUS.AGUARDANDO);
        } else if (activeTab === 'ongoing') {
          statusFilters.push(STATUS.EM_ANDAMENTO);
        }
        
        await refreshConversations({
          status: statusFilters,
          arquivada: filters.arquivada,
          forceRefresh: true,
          silent: true
        });
      }
      
      // Atualizar timestamp de último refresh
      lastRefreshTimeRef.current = Date.now();
      
      // Forçar re-renderização se algo mudou
      setForceUpdate(prev => prev + 1);
      
    } catch (error) {
      logger.error('Erro no refresh silencioso', error);
    }
  }, [activeTab, filters.arquivada, refreshConversations, refreshCompletedConversations, logger]);
  
  // Adicionar listener para novas mensagens (usando onNewMessage do SocketContext)
  useEffect(() => {
    if (onNewMessage) {
      const handleNewMessage = () => {
        // Ao receber nova mensagem, atualizar em até 2 segundos
        setTimeout(() => {
          handleSilentRefresh();
        }, 1000);
      };
      
      // Adicionar handler
      onNewMessage(handleNewMessage);
      
      // Cleanup
      return () => {
        if (onNewMessage.off) {
          onNewMessage.off(handleNewMessage);
        }
      };
    }
  }, [onNewMessage, handleSilentRefresh]);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const currentSectorName = useMemo(() => {
    if (userProfile?.setor) {
      return getSetorNome(userProfile);
    }
    return 'Seu setor';
  }, [userProfile]);
  
  const availableSectors = useMemo(() => {
    logger.debug('Recalculando setores disponíveis', { 
      setoresCount: sectors?.length || 0,
      isAdmin,
      currentUserSector: userProfile?.setor ? getSetorNome(userProfile) : 'Não definido'
    });
    
    const sectorSet = new Set();
    sectorSet.add('all');
    
    if (!isAdmin) {
      sectorSet.add('atual');
    }
    
    if (sectors && sectors.length > 0) {
      sectors.forEach(sector => {
        if (sector.nome) {
          sectorSet.add(sector.nome);
        }
      });
    }
    
    if (userProfile?.setor) {
      const setorNome = getSetorNome(userProfile);
      if (setorNome) {
        sectorSet.add(setorNome);
      }
    }
    
    return Array.from(sectorSet).map(sector => ({
      value: sector,
      label: sector === 'all' ? 'Todos os Setores' : 
             sector === 'atual' ? `Setor Atual (${getSetorNome(userProfile) || localStorage.getItem('userSectorName') || 'Não definido'})` : 
             sector
    }));
  }, [sectors, userProfile, isAdmin, logger]);
  
  const unreadCounts = useMemo(() => {
    if (!conversations) return { all: 0, awaiting: 0, ongoing: 0 };
    
    return conversations.reduce((counts, conv) => {
      const unreadCount = conv.unreadCount || 0;
      counts.all += unreadCount;
      
      const status = conv.status?.toLowerCase() || '';
      if (status === STATUS.AGUARDANDO) {
        counts.awaiting += unreadCount;
      } else if (status === STATUS.EM_ANDAMENTO) {
        counts.ongoing += unreadCount;
      }
      
      return counts;
    }, { all: 0, awaiting: 0, ongoing: 0 });
  }, [conversations]);
  
  useEffect(() => {
    if (unreadCounts.all > 0) {
      logger.info('Novas mensagens não lidas detectadas', unreadCounts);
    }
  }, [unreadCounts, logger]);
  
  const filteredConversations = useMemo(() => {
    const result = activeTab === 'completed' ? completedConversations : conversations;
    logger.debug('Lista de conversas filtrada', { 
      activeTab, 
      count: result?.length || 0
    });
    return result;
  }, [activeTab, conversations, completedConversations, logger, forceUpdate]);
  
  useEffect(() => {
    fetchSectors();
  }, []);
  
  useEffect(() => {
    localStorage.setItem('employeeNotifications', notificationsEnabled);
    logger.debug('Configuração de notificações atualizada', { notificationsEnabled });
  }, [notificationsEnabled, logger]);
  
  useEffect(() => {
    if (toastNotification.show) {
      logger.info('Notificação exibida para o usuário', {
        sender: toastNotification.sender,
        messagePreview: toastNotification.message?.substring(0, 50) + (toastNotification.message?.length > 50 ? '...' : '')
      });
      
      toast(
        <div className="flex flex-col">
          <span className="font-bold">{toastNotification.sender}</span>
          <span className="text-sm truncate max-w-xs">{toastNotification.message}</span>
        </div>,
        {
          action: {
            label: "Ver",
            onClick: () => {
              logger.info('Notificação clicada pelo usuário');
              handleToastClick();
            }
          },
          duration: 5000
        }
      );
      
      const timer = setTimeout(() => {
        logger.debug('Notificação fechada automaticamente');
        closeToast();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toastNotification, closeToast, handleToastClick, logger]);
  
  const fetchSectors = async () => {
    logger.info('Buscando setores', { isAdmin });
    const fetchStartTime = logger.markPerformance('fetchSectors');
    
    try {
      const response = await instrumentedMultiflowApi.apiCallWithLogs(
        logger, 
        'getSetores', 
        multiflowApi.ADMIN_ID, 
        isAdmin
      );
      
      if (response.success) {
        logger.info('Setores obtidos com sucesso', { 
          count: response.data.length,
          duration: `${logger.measurePerformance(null, 'fetchSectors').toFixed(2)}ms`
        });
        setSectors(response.data);
      } else {
        logger.warn('Resposta de busca de setores sem sucesso', { response });
      }
    } catch (err) {
      const duration = logger.measurePerformance(null, 'fetchSectors');
      logger.error('Erro ao buscar setores', err, { 
        isAdmin, 
        duration: `${duration.toFixed(2)}ms` 
      });
    }
  };
  
  const handleTabChange = useCallback(async (value) => {
    const tabChangeStart = logger.markPerformance('tabChange');
    logger.info('Mudança de aba solicitada', { deAba: activeTab, paraAba: value });
    
    setActiveTab(value);
    clearUnreadMessages();
    setError(null);
    setIsRefreshing(true);
    
    try {
      if (value === 'completed') {
        await refreshCompletedConversations({
          status: STATUS.FINALIZADA,
          arquivada: filters.arquivada,
          forceRefresh: true,
          page: 1
        });
      } else {
        const statusFilters = [];
        
        if (value === 'all') {
          statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
        } else if (value === 'waiting') {
          statusFilters.push(STATUS.AGUARDANDO);
        } else if (value === 'ongoing') {
          statusFilters.push(STATUS.EM_ANDAMENTO);
        }
        
        await refreshConversations({
          status: statusFilters,
          arquivada: filters.arquivada,
          forceRefresh: true,
          page: 1
        });
      }
      
      const duration = logger.measurePerformance(null, 'tabChange');
      logger.info('Mudança de aba concluída', { 
        aba: value, 
        duration: `${duration.toFixed(2)}ms`
      });
    } catch (error) {
      const duration = logger.measurePerformance(null, 'tabChange');
      logger.error('Erro ao mudar tab', error, { 
        aba: value, 
        duration: `${duration.toFixed(2)}ms`
      });
      setError(error.message || 'Erro ao carregar conversas');
    } finally {
      setIsRefreshing(false);
    }
  }, [filters.arquivada, clearUnreadMessages, refreshCompletedConversations, refreshConversations, activeTab, logger]);
  
  const handleSearch = useMemo(() => debounce(async (term) => {
    const searchStart = logger.markPerformance('search');
    logger.info('Pesquisa iniciada', { termo: term });
    
    setIsRefreshing(true);
    
    try {
      const statusFilters = [];
      if (activeTab === 'completed') {
        await refreshCompletedConversations({
          status: STATUS.FINALIZADA,
          arquivada: filters.arquivada,
          search: term,
          forceRefresh: true,
          page: 1
        });
      } else {
        if (activeTab === 'all') {
          statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
        } else if (activeTab === 'waiting') {
          statusFilters.push(STATUS.AGUARDANDO);
        } else if (activeTab === 'ongoing') {
          statusFilters.push(STATUS.EM_ANDAMENTO);
        }
        
        await refreshConversations({
          status: statusFilters,
          arquivada: filters.arquivada,
          search: term,
          forceRefresh: true,
          page: 1
        });
      }
      
      const duration = logger.measurePerformance(null, 'search');
      logger.info('Pesquisa concluída', { 
        termo: term, 
        aba: activeTab, 
        duration: `${duration.toFixed(2)}ms`
      });
    } catch (error) {
      const duration = logger.measurePerformance(null, 'search');
      logger.error('Erro na busca', error, { 
        termo: term, 
        aba: activeTab, 
        duration: `${duration.toFixed(2)}ms` 
      });
    } finally {
      setIsRefreshing(false);
    }
  }, 300), [activeTab, filters.arquivada, refreshConversations, refreshCompletedConversations, logger]);
  
  const handleSearchChange = useCallback((e) => {
    const term = e.target.value;
    setSearchTerm(term);
    handleSearch(term);
  }, [handleSearch]);
  
  const handlePageChange = useCallback(async (page) => {
    const pageChangeStart = logger.markPerformance('pageChange');
    logger.info('Mudança de página solicitada', { dePagina: pagination?.page, paraPagina: page });
    
    setIsRefreshing(true);
    
    try {
      const statusFilters = [];
      if (activeTab === 'completed') {
        await refreshCompletedConversations({
          status: STATUS.FINALIZADA,
          arquivada: filters.arquivada,
          search: searchTerm,
          forceRefresh: true,
          page
        });
      } else {
        if (activeTab === 'all') {
          statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
        } else if (activeTab === 'waiting') {
          statusFilters.push(STATUS.AGUARDANDO);
        } else if (activeTab === 'ongoing') {
          statusFilters.push(STATUS.EM_ANDAMENTO);
        }
        
        await refreshConversations({
          status: statusFilters,
          arquivada: filters.arquivada,
          search: searchTerm,
          forceRefresh: true,
          page
        });
      }
      
      const duration = logger.measurePerformance(null, 'pageChange');
      logger.info('Mudança de página concluída', { 
        pagina: page, 
        duration: `${duration.toFixed(2)}ms`
      });
    } catch (error) {
      const duration = logger.measurePerformance(null, 'pageChange');
      logger.error('Erro ao mudar página', error, { 
        pagina: page, 
        duration: `${duration.toFixed(2)}ms`
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, filters.arquivada, searchTerm, refreshCompletedConversations, refreshConversations, pagination, logger]);
  
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    const refreshStart = logger.markPerformance('refresh');
    logger.info('Atualização manual iniciada', { 
      aba: activeTab, 
      filtros: filters, 
      termoBusca: searchTerm
    });
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      if (activeTab === 'completed') {
        await refreshCompletedConversations({
          status: STATUS.FINALIZADA,
          arquivada: filters.arquivada,
          search: searchTerm,
          forceRefresh: true
        });
      } else {
        const statusFilters = [];
        
        if (activeTab === 'all') {
          statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
        } else if (activeTab === 'waiting') {
          statusFilters.push(STATUS.AGUARDANDO);
        } else if (activeTab === 'ongoing') {
          statusFilters.push(STATUS.EM_ANDAMENTO);
        }
        
        await refreshConversations({
          status: statusFilters,
          arquivada: filters.arquivada,
          search: searchTerm,
          forceRefresh: true
        });
      }
      
      // Atualizar timestamp de último refresh
      lastRefreshTimeRef.current = Date.now();
      
      const duration = logger.measurePerformance(null, 'refresh');
      logger.info('Atualização concluída com sucesso', { 
        aba: activeTab, 
        duration: `${duration.toFixed(2)}ms`
      });
      
      toast.success('Conversas atualizadas com sucesso', { duration: 2000 });
    } catch (error) {
      const duration = logger.measurePerformance(null, 'refresh');
      logger.error('Erro ao atualizar conversas', error, { 
        aba: activeTab, 
        duration: `${duration.toFixed(2)}ms`
      });
      
      setError(error.message || 'Erro ao atualizar conversas');
      toast.error('Erro ao atualizar conversas');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, filters.arquivada, searchTerm, refreshCompletedConversations, refreshConversations, isRefreshing, logger]);
  
  const handleToggleNotifications = useCallback(() => {
    const newState = !notificationsEnabled;
    logger.info('Notificações alteradas', { estadoAnterior: notificationsEnabled, novoEstado: newState });
    
    setNotificationsEnabled(newState);
    toast.success(!notificationsEnabled ? 'Notificações ativadas' : 'Notificações desativadas');
  }, [notificationsEnabled, logger]);
  
  const handleSelectConversation = useCallback((conversationId) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    logger.info('Conversa selecionada', { conversationId: normalizedId });
    
    setSelectedConversationId(normalizedId);
    navigate(`/conversations/${normalizedId}`);
  }, [navigate, logger]);
  
  const handleFilterChange = useCallback(async (name, value) => {
    const filterChangeStart = logger.markPerformance('filterChange');
    logger.info('Alteração de filtro iniciada', { 
      filtro: name, 
      valorAnterior: filters[name], 
      novoValor: value 
    });
    
    setFilters(prev => ({ ...prev, [name]: value }));
    
    if (name === 'arquivada' || name === 'sectorFilter') {
      try {
        setIsRefreshing(true);
        setError(null);
        
        if (activeTab === 'completed') {
          await refreshCompletedConversations({
            status: STATUS.FINALIZADA,
            arquivada: name === 'arquivada' ? value : filters.arquivada,
            search: searchTerm,
            forceRefresh: true,
            page: 1
          });
        } else {
          const statusFilters = [];
          
          if (activeTab === 'all') {
            statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
          } else if (activeTab === 'waiting') {
            statusFilters.push(STATUS.AGUARDANDO);
          } else if (activeTab === 'ongoing') {
            statusFilters.push(STATUS.EM_ANDAMENTO);
          }
          
          await refreshConversations({
            status: statusFilters,
            arquivada: name === 'arquivada' ? value : filters.arquivada,
            search: searchTerm,
            forceRefresh: true,
            page: 1
          });
        }
        
        const duration = logger.measurePerformance(null, 'filterChange');
        logger.info('Alteração de filtro concluída', { 
          filtro: name, 
          valor: value, 
          duration: `${duration.toFixed(2)}ms`
        });
      } catch (error) {
        const duration = logger.measurePerformance(null, 'filterChange');
        logger.error('Erro ao aplicar filtro', error, { 
          filtro: name, 
          valor: value, 
          duration: `${duration.toFixed(2)}ms`
        });
        
        setError(error.message || 'Erro ao aplicar filtro');
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [activeTab, filters.arquivada, searchTerm, refreshCompletedConversations, refreshConversations, logger]);
  
  const handleShowTransferModal = useCallback(() => {
    if (!selectedConversationId || !sectors || sectors.length === 0) {
      logger.warn('Tentativa de abrir modal de transferência sem setores disponíveis', {
        contemSelectedConversation: !!selectedConversationId,
        contaSetores: sectors?.length || 0
      });
      
      toast.error('Não há setores disponíveis para transferência');
      return;
    }
    
    logger.info('Abrindo modal de transferência', { 
      conversationId: selectedConversationId,
      setoresDisponíveis: sectors.length
    });
    
    setSelectedSector(null);
    setShowTransferModal(true);
  }, [selectedConversationId, sectors, logger]);
  
  const handleShowFinishModal = useCallback(() => {
    if (!selectedConversationId) {
      logger.warn('Tentativa de abrir modal de finalização sem conversa selecionada');
      return;
    }
    
    logger.info('Abrindo modal de finalização', { 
      conversationId: selectedConversationId 
    });
    
    setShowFinishModal(true);
  }, [selectedConversationId, logger]);
  
  const handleShowArchiveModal = useCallback(() => {
    if (!selectedConversationId) {
      logger.warn('Tentativa de abrir modal de arquivamento sem conversa selecionada');
      return;
    }
    
    logger.info('Abrindo modal de arquivamento', { 
      conversationId: selectedConversationId 
    });
    
    setShowArchiveModal(true);
  }, [selectedConversationId, logger]);
  
  const handleConfirmTransfer = useCallback(async () => {
    if (!selectedConversationId || !selectedSector || isProcessing) {
      logger.warn('Tentativa de confirmar transferência sem dados completos', {
        temSelectedConversation: !!selectedConversationId,
        temSelectedSector: !!selectedSector,
        isProcessing
      });
      return;
    }
    
    const transferStart = logger.markPerformance('transfer');
    logger.info('Transferência de conversa iniciada', { 
      conversationId: selectedConversationId,
      targetSector: selectedSector
    });
    
    setIsProcessing(true);
    setProcessingAction('transferir');
    
    try {
      const normalizedId = multiflowApi.normalizeId(selectedConversationId, 'conversa');
      const success = await transferConversation(normalizedId, selectedSector, '');
      
      if (success) {
        const duration = logger.measurePerformance(null, 'transfer');
        logger.info('Conversa transferida com sucesso', { 
          conversationId: normalizedId,
          targetSector: selectedSector,
          duration: `${duration.toFixed(2)}ms`
        });
        
        toast.success('Conversa transferida com sucesso');
        setSelectedSector(null);
        setShowTransferModal(false);
        handleRefresh();
      } else {
        const duration = logger.measurePerformance(null, 'transfer');
        logger.warn('Falha na resposta de transferência', { 
          conversationId: normalizedId,
          targetSector: selectedSector,
          duration: `${duration.toFixed(2)}ms`
        });
        
        throw new Error('Falha ao transferir conversa');
      }
    } catch (error) {
      const duration = logger.measurePerformance(null, 'transfer');
      logger.error('Erro ao transferir conversa', error, { 
        conversationId: selectedConversationId,
        targetSector: selectedSector,
        duration: `${duration.toFixed(2)}ms`
      });
      
      toast.error('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, selectedSector, isProcessing, transferConversation, handleRefresh, logger]);
  
  const handleConfirmFinish = useCallback(async () => {
    if (!selectedConversationId || isProcessing) {
      logger.warn('Tentativa de confirmar finalização sem dados completos', {
        temSelectedConversation: !!selectedConversationId,
        isProcessing
      });
      return;
    }
    
    const finishStart = logger.markPerformance('finish');
    logger.info('Finalização de conversa iniciada', { 
      conversationId: selectedConversationId 
    });
    
    setIsProcessing(true);
    setProcessingAction('finalizar');
    
    try {
      const normalizedId = multiflowApi.normalizeId(selectedConversationId, 'conversa');
      const success = await finishConversation(normalizedId);
      
      if (success) {
        const duration = logger.measurePerformance(null, 'finish');
        logger.info('Conversa finalizada com sucesso', { 
          conversationId: normalizedId,
          duration: `${duration.toFixed(2)}ms`
        });
        
        toast.success('Conversa finalizada com sucesso');
        setShowFinishModal(false);
        handleRefresh();
      } else {
        const duration = logger.measurePerformance(null, 'finish');
        logger.warn('Falha na resposta de finalização', { 
          conversationId: normalizedId,
          duration: `${duration.toFixed(2)}ms`
        });
        
        throw new Error('Falha ao finalizar conversa');
      }
    } catch (error) {
      const duration = logger.measurePerformance(null, 'finish');
      logger.error('Erro ao finalizar conversa', error, { 
        conversationId: selectedConversationId,
        duration: `${duration.toFixed(2)}ms`
      });
      
      toast.error('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, isProcessing, finishConversation, handleRefresh, logger]);
  
  const handleConfirmArchive = useCallback(async () => {
    if (!selectedConversationId || isProcessing) {
      logger.warn('Tentativa de confirmar arquivamento sem dados completos', {
        temSelectedConversation: !!selectedConversationId,
        isProcessing
      });
      return;
    }
    
    const archiveStart = logger.markPerformance('archive');
    logger.info('Arquivamento de conversa iniciado', { 
      conversationId: selectedConversationId 
    });
    
    setIsProcessing(true);
    setProcessingAction('arquivar');
    
    try {
      const normalizedId = multiflowApi.normalizeId(selectedConversationId, 'conversa');
      const success = await archiveConversation(normalizedId);
      
      if (success) {
        const duration = logger.measurePerformance(null, 'archive');
        logger.info('Conversa arquivada com sucesso', { 
          conversationId: normalizedId,
          duration: `${duration.toFixed(2)}ms`
        });
        
        toast.success('Conversa arquivada com sucesso');
        setShowArchiveModal(false);
        handleRefresh();
      } else {
        const duration = logger.measurePerformance(null, 'archive');
        logger.warn('Falha na resposta de arquivamento', { 
          conversationId: normalizedId,
          duration: `${duration.toFixed(2)}ms`
        });
        
        throw new Error('Falha ao arquivar conversa');
      }
    } catch (error) {
      const duration = logger.measurePerformance(null, 'archive');
      logger.error('Erro ao arquivar conversa', error, { 
        conversationId: selectedConversationId,
        duration: `${duration.toFixed(2)}ms`
      });
      
      toast.error('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, isProcessing, archiveConversation, handleRefresh, logger]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      const initialLoadStart = logger.markPerformance('initialLoad');
      logger.info('Carregamento inicial de dados iniciado', { activeTab, filters });
      
      setIsRefreshing(true);
      setError(null);
      
      try {
        if (activeTab === 'completed') {
          await refreshCompletedConversations({
            status: STATUS.FINALIZADA,
            arquivada: filters.arquivada,
            forceRefresh: true
          });
        } else {
          const statusFilters = [];
          
          if (activeTab === 'all') {
            statusFilters.push(STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO);
          } else if (activeTab === 'waiting') {
            statusFilters.push(STATUS.AGUARDANDO);
          } else if (activeTab === 'ongoing') {
            statusFilters.push(STATUS.EM_ANDAMENTO);
          }
          
          await refreshConversations({
            status: statusFilters,
            arquivada: filters.arquivada,
            forceRefresh: true
          });
        }
        
        const duration = logger.measurePerformance(null, 'initialLoad');
        logger.info('Carregamento inicial de dados concluído', { 
          activeTab, 
          duration: `${duration.toFixed(2)}ms` 
        });
      } catch (error) {
        const duration = logger.measurePerformance(null, 'initialLoad');
        logger.error('Erro ao carregar dados iniciais', error, { 
          activeTab, 
          duration: `${duration.toFixed(2)}ms` 
        });
        
        setError(error.message || 'Erro ao carregar conversas');
      } finally {
        setIsRefreshing(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  const transferModalContent = useMemo(() => (
    <RadioGroup value={selectedSector} onValueChange={(value) => {
      logger.debug('Setor selecionado para transferência', { sectorId: value });
      setSelectedSector(value);
    }}>
      <div className="space-y-3 max-h-[300px] overflow-auto">
        {sectors && sectors.map(sector => (
          <div key={sector._id || sector.id || sector.setorId} className="flex items-start space-x-2">
            <RadioGroupItem 
              value={sector._id || sector.id || sector.setorId} 
              id={`sector-${sector._id || sector.id || sector.setorId}`}
              className="mt-1 text-[#10b981] border-[#1f2937]/40"
            />
            <Label 
              htmlFor={`sector-${sector._id || sector.id || sector.setorId}`}
              className="flex-1 cursor-pointer text-white"
            >
              <div className="font-medium">{sector.nome}</div>
              {sector.responsavel && (
                <div className="text-sm text-slate-400">
                  Responsável: {sector.responsavel}
                </div>
              )}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  ), [sectors, selectedSector, logger]);
  
  const renderConversationList = useCallback(() => {
    if (isRefreshing) {
      return <LoadingIndicator logger={logger} />;
    }
    
    if (error) {
      return <ErrorDisplay error={error} onRefresh={handleRefresh} logger={logger} />;
    }
    
    if (!filteredConversations || filteredConversations.length === 0) {
      return <EmptyConversationList activeTab={activeTab} onRefresh={handleRefresh} logger={logger} />;
    }
    
    return (
      <div className="h-full">
        <VirtualizedConversationList
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          logger={logger}
        />
      </div>
    );
  }, [
    isRefreshing, 
    error,
    filteredConversations, 
    activeTab, 
    handleRefresh, 
    selectedConversationId, 
    handleSelectConversation,
    logger,
    forceUpdate
  ]);
  
  return (
    <div className="h-full w-full flex flex-col bg-[#070b11] relative">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      <div className="p-2 sm:p-4 flex-1 h-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col bg-[#070b11] rounded-xl border border-[#1f2937]/40 overflow-hidden shadow-md"
        >
          <ConversationListHeader 
            currentSectorName={currentSectorName}
            unreadCount={unreadCounts.all}
            isArquivada={filters.arquivada}
            isConnected={isConnected}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            conversationsCount={filteredConversations?.length || 0}
            logger={logger}
            onOpenFilterSheet={() => setShowFilterSheet(true)}
            isMobile={isMobile}
          />

          <SearchAndFilterBar 
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            dateRange={dateRange}
            setDateRange={setDateRange}
            availableSectors={availableSectors}
            logger={logger}
            isMobile={isMobile}
          />

          <Tabs 
            defaultValue="ongoing" 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full flex-1 flex flex-col"
          >
            <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-[#1f2937]/40 h-12 rounded-none p-0 sticky top-[124px] z-10">
              <TabWithUnreadCount value="ongoing" label="Em Andamento" count={unreadCounts.ongoing} logger={logger} />
              <TabWithUnreadCount value="waiting" label="Aguardando" count={unreadCounts.awaiting} logger={logger} />
              <TabWithUnreadCount value="completed" label="Finalizadas" count={0} logger={logger} />
            </TabsList>

            <div className="flex-1 overflow-hidden bg-[#070b11] flex flex-col">
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {renderConversationList()}
                </AnimatePresence>
              </div>
              
              {pagination && pagination.pages > 1 && (
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  logger={logger}
                />
              )}
            </div>
          </Tabs>
        </motion.div>
      </div>
      
      <ConversationModals 
        showTransferModal={showTransferModal}
        setShowTransferModal={setShowTransferModal}
        showFinishModal={showFinishModal}
        setShowFinishModal={setShowFinishModal}
        showArchiveModal={showArchiveModal}
        setShowArchiveModal={setShowArchiveModal}
        transferModalContent={transferModalContent}
        selectedSector={selectedSector}
        isProcessing={isProcessing}
        processingAction={processingAction}
        handleConfirmTransfer={handleConfirmTransfer}
        handleConfirmFinish={handleConfirmFinish}
        handleConfirmArchive={handleConfirmArchive}
        logger={logger}
      />
      
      <FilterSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        filters={filters}
        onFilterChange={handleFilterChange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        availableSectors={availableSectors}
        logger={logger}
      />
    </div>
  );
};

export default EmployeeConversationsView;