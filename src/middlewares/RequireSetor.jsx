import { Navigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";

/**
 * Middleware para verificar se o usuário pertence a um setor específico
 * 
 * @param {object} props - Propriedades do componente
 * @param {React.ReactNode} props.children - Componentes filhos a serem renderizados se a verificação passar
 * @param {string} props.setor - ID do setor requerido (opcional)
 * @param {boolean} props.allowAdmin - Se admin tem acesso mesmo sem pertencer ao setor
 * @param {string} props.redirectTo - Caminho para redirecionamento se falhar (default: "/")
 * @returns {React.ReactNode}
 */
const RequireSetor = ({ 
  children, 
  setor = null, 
  allowAdmin = true,
  redirectTo = "/"
}) => {
  const { userProfile, isAdmin, userSector, isAuthenticated } = useAuthContext();
  
  // Verificar se o usuário está autenticado
  if (!isAuthenticated || !userProfile) {
    return <Navigate to="/login" />;
  }
  
  // Se setor não for especificado, verificar se o usuário tem qualquer setor
  if (!setor) {
    // Admin sempre tem acesso se allowAdmin=true
    if (isAdmin && allowAdmin) {
      return children;
    }
    
    // Verificar se o usuário tem algum setor atribuído
    if (!userSector) {
      console.warn("Usuário não possui setor atribuído");
      return <Navigate to={redirectTo} />;
    }
    
    return children;
  }
  
  // Verificar se o usuário pertence ao setor especificado
  if (userSector === setor) {
    return children;
  }
  
  // Admin tem acesso a todos os setores se allowAdmin=true
  if (isAdmin && allowAdmin) {
    return children;
  }
  
  console.warn(`Acesso negado: usuário não pertence ao setor ${setor}`);
  return <Navigate to={redirectTo} />;
};

export default RequireSetor;