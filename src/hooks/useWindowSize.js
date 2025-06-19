import { useState, useEffect } from 'react';

export function useWindowSize() {
  // Inicialize com um valor padrão para evitar erros durante a renderização do servidor
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });
  
  useEffect(() => {
    // Só execute no navegador
    if (typeof window === 'undefined') return;
    
    // Handler para atualizar o estado
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Adicione event listener
    window.addEventListener("resize", handleResize);
    
    // Chame o handler imediatamente para que o estado reflita o tamanho inicial da janela
    handleResize();
    
    // Limpe o event listener na limpeza
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return windowSize;
}

export default useWindowSize;