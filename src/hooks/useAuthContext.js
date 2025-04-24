import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw Error("useAuthContext must be inside an AuthContextProvider.");
  }

  return context;
};

// Alias para manter compatibilidade com os novos componentes
export const useAuth = useAuthContext;