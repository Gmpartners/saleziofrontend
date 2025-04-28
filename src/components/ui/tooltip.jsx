import * as React from "react";
import { createPortal } from "react-dom";

// Context para gerenciar estado do tooltip
const TooltipContext = React.createContext(null);

export const TooltipProvider = ({ children }) => {
  // Estado para controlar qual tooltip está aberto
  const [activeTooltip, setActiveTooltip] = React.useState(null);
  
  return (
    <TooltipContext.Provider value={{ activeTooltip, setActiveTooltip }}>
      {children}
    </TooltipContext.Provider>
  );
};

export const Tooltip = ({ children }) => {
  // ID único para este tooltip
  const id = React.useId();
  
  return (
    <div className="inline-block relative">
      {React.Children.map(children, child => {
        // Verificar se o elemento filho é um elemento React válido
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { tooltipId: id });
        }
        // Retornar o child como está se não for um elemento React válido
        return child;
      })}
    </div>
  );
};

export const TooltipTrigger = ({ children, tooltipId, asChild }) => {
  const { setActiveTooltip } = React.useContext(TooltipContext);
  
  const handleMouseEnter = () => {
    setActiveTooltip(tooltipId);
  };
  
  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };
  
  const childProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, childProps);
  }
  
  return (
    <span {...childProps}>
      {children}
    </span>
  );
};

export const TooltipContent = ({ children, side = "top", tooltipId }) => {
  const { activeTooltip } = React.useContext(TooltipContext);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const contentRef = React.useRef(null);
  const triggerRef = React.useRef(document.querySelector(`[data-tooltip-id="${tooltipId}"]`));
  
  // Posicionar o tooltip de acordo com o lado escolhido
  React.useEffect(() => {
    if (activeTooltip === tooltipId && contentRef.current) {
      const trigger = triggerRef.current || document.querySelector(`[data-tooltip-id="${tooltipId}"]`);
      if (!trigger) return;
      
      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      
      let top, left;
      
      switch (side) {
        case "top":
          top = triggerRect.top - contentRect.height - 5;
          left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
          break;
        case "bottom":
          top = triggerRect.bottom + 5;
          left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
          break;
        case "left":
          top = triggerRect.top + (triggerRect.height / 2) - (contentRect.height / 2);
          left = triggerRect.left - contentRect.width - 5;
          break;
        case "right":
          top = triggerRect.top + (triggerRect.height / 2) - (contentRect.height / 2);
          left = triggerRect.right + 5;
          break;
        default:
          top = triggerRect.top - contentRect.height - 5;
          left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
      }
      
      // Ajustar para não sair da tela
      top = Math.max(5, top);
      left = Math.max(5, left);
      
      if (top + contentRect.height > window.innerHeight) {
        top = window.innerHeight - contentRect.height - 5;
      }
      
      if (left + contentRect.width > window.innerWidth) {
        left = window.innerWidth - contentRect.width - 5;
      }
      
      setPosition({ top, left });
    }
  }, [activeTooltip, tooltipId, side]);
  
  if (activeTooltip !== tooltipId) return null;
  
  // Criar portal para renderizar o tooltip fora da hierarquia DOM
  return createPortal(
    <div
      ref={contentRef}
      className="absolute z-50 px-3 py-1.5 bg-[#0f1621] text-white text-sm rounded-md border border-[#1f2937]/50 shadow-md animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    >
      {children}
    </div>,
    document.body
  );
};