import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useFormatDate = () => {
  const formatDate = (date) => {
    if (!date) return 'Data não disponível';
    try {
      return format(
        date instanceof Date ? date : new Date(date),
        "d 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  return { formatDate };
};