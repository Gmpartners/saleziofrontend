import React, { useState, useEffect } from 'react';
import { format, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { motion } from 'framer-motion';

const DateRangePicker = ({ dateRange, setDateRange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  
  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Convert dateRange format: from ISO string to Date objects
  const parsedDateRange = {
    from: dateRange.start ? new Date(dateRange.start) : null,
    to: dateRange.end ? new Date(dateRange.end) : null,
  };
  
  // Generate display text
  const displayText = () => {
    if (parsedDateRange.from && parsedDateRange.to) {
      if (differenceInDays(parsedDateRange.to, parsedDateRange.from) < 1) {
        return format(parsedDateRange.from, 'dd/MM/yyyy', { locale: ptBR });
      }
      // Em telas pequenas, exibe um formato mais compacto
      if (windowWidth < 480) {
        return `${format(parsedDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(parsedDateRange.to, 'dd/MM', { locale: ptBR })}`;
      }
      return `${format(parsedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(parsedDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    return 'Selecione um período';
  };

  // Apply preset date range for specific number of days
  const applyPresetDays = (days) => {
    const end = new Date();
    const start = subDays(end, days);
    
    // Format dates as ISO strings to match your format
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };
  
  // Apply month preset
  const applyMonthPreset = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Format dates as ISO strings to match your format
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  };
  
  // Handle calendar selection
  const handleSelect = (range) => {
    if (!range || !range.from) return;
    
    let { from, to } = range;
    // If only one date is selected, use it for both start and end
    if (!to) to = from;
    
    // Format dates as ISO strings to match your format
    setDateRange({
      start: from.toISOString().split('T')[0],
      end: to.toISOString().split('T')[0]
    });
    
    // Close the popover after selection is complete
    if (from && to) {
      setTimeout(() => setIsOpen(false), 300);
    }
  };
  
  // Force re-render calendar when it opens
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (open) {
      setCalendarKey(Date.now());
    }
  };

  // Determine number of months to show based on screen size
  const getNumberOfMonths = () => {
    if (compact) return 1;
    if (windowWidth < 768) return 1;
    return 2;
  };

  // Classes para os botões de presets adaptadas para o tema do projeto
  const presetButtonClass = "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-full hover:bg-[#10b981]/20 hover:border-[#10b981]/40 transition-colors text-[10px] px-2 py-1";

  // Define o alinhamento do popover conforme o tamanho da tela
  const popoverAlign = windowWidth < 768 ? "center" : "start";

  return (
    <div className="px-2 py-1 w-full flex items-center">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger>
          <Button
            variant="outline"
            className="border border-[#1f2937]/40 bg-[#101820] hover:bg-[#0f1621] text-white h-9 px-3 rounded-lg w-full max-w-[260px] flex items-center justify-start shadow-md"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-[#10b981]" />
            <span className="truncate font-medium text-sm">{displayText()}</span>
            <ChevronDown className="ml-auto h-4 w-4 text-[#10b981]" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="p-0 bg-[#0f1621] border border-[#1f2937]/40 shadow-lg rounded-lg overflow-hidden" 
          align={popoverAlign}
          sideOffset={10}
          style={{ 
            maxWidth: windowWidth < 768 ? 'min(calc(100vw - 16px), 370px)' : 'auto',
            width: windowWidth < 768 ? 'min(calc(100vw - 16px), 370px)' : 'auto',
            margin: windowWidth < 768 ? '0 auto' : undefined
          }}
        >
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 border-b border-[#1f2937]/40"
          >
            <h3 className="text-center font-semibold mb-3 text-white text-base">Selecione um período</h3>
            
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              <button
                className={presetButtonClass}
                type="button"
                onClick={() => applyPresetDays(7)}
              >
                Últimos 7d
              </button>
              <button
                className={presetButtonClass}
                type="button"
                onClick={() => applyPresetDays(14)}
              >
                Últimos 14d
              </button>
              <button
                className={presetButtonClass}
                type="button"
                onClick={() => applyPresetDays(30)}
              >
                Últimos 30d
              </button>
              <button
                className={presetButtonClass}
                type="button"
                onClick={() => applyPresetDays(90)}
              >
                Últimos 90d
              </button>
              <button
                className={presetButtonClass}
                type="button"
                onClick={applyMonthPreset}
              >
                Este mês
              </button>
            </div>
          </motion.div>
          
          <div className="p-2 bg-[#0f1621] flex justify-center">
            <div style={{ 
              width: '100%', 
              maxWidth: windowWidth < 768 ? '340px' : '100%'
            }}>
              <Calendar
                key={calendarKey}
                mode="range"
                defaultMonth={parsedDateRange.from}
                selected={parsedDateRange}
                onSelect={handleSelect}
                numberOfMonths={getNumberOfMonths()}
                locale={ptBR}
                className="mx-auto"
                styles={{
                  ...(windowWidth < 768 ? {
                    caption: { 
                      fontSize: '0.875rem',
                      margin: '0 0 4px 0'
                    },
                    day: {
                      margin: '0px',
                      width: '36px',
                      maxWidth: '36px',
                      height: '36px',
                      fontSize: '0.875rem',
                    },
                    head_cell: {
                      width: '36px',
                      maxWidth: '36px',
                      fontSize: '0.75rem',
                      padding: '4px 0',
                    },
                    cell: {
                      width: '36px',
                      maxWidth: '36px',
                    },
                    months: {
                      width: '100%',
                    },
                    month: {
                      width: '100%',
                    },
                    table: {
                      width: '100%',
                      display: 'table',
                      borderSpacing: '0',
                    },
                    head_row: {
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-around',
                    },
                    row: {
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-around',
                      margin: '2px 0',
                    }
                  } : {})
                }}
                classNames={{
                  months: windowWidth < 768 
                    ? "flex flex-col space-y-4 w-full" 
                    : "flex flex-row gap-4 justify-center",
                  month: "space-y-2",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium text-white",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-[#101820] hover:bg-[#070b11] text-white p-0 rounded-md",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-slate-400 rounded-md font-normal text-xs py-2",
                  row: "flex w-full mt-1",
                  cell: "text-center text-sm relative p-0 [&:has([aria-selected])]:bg-[#101820]/80 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal rounded-md text-white hover:bg-[#101820]",
                  day_selected: "bg-[#10b981] text-white hover:bg-[#059669]",
                  day_today: "bg-[#101820]/50 text-[#10b981]",
                  day_outside: "text-slate-500 opacity-50",
                  day_disabled: "text-slate-500 opacity-50",
                  day_range_middle: "bg-[#10b981]/20 text-white",
                  day_range_start: "bg-[#10b981] text-white rounded-l-md",
                  day_range_end: "bg-[#10b981] text-white rounded-r-md",
                  day_hidden: "invisible"
                }}
              />
            </div>
          </div>
          
          <div className="p-3 border-t border-[#1f2937]/40 flex justify-end">
            <Button 
              className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 text-white text-sm h-9 px-4 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangePicker;