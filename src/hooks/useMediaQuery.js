import { useState, useEffect } from 'react';

export const useMediaQuery = (query) => {
  // Verificar se window está disponível (para SSR)
  const getMatches = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Definir correspondência inicial
    setMatches(mediaQuery.matches);
    
    // Criar um listener
    const handler = (event) => setMatches(event.matches);
    
    // Adicionar o listener
    mediaQuery.addEventListener('change', handler);
    
    // Remover o listener ao desmontar
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};