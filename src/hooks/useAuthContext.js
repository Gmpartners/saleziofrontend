import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw Error("useAuthContext must be inside an AuthContextProvider.");
  }

  const userProfile = context.userProfile || {};
  const isAdmin = userProfile.role === 'admin' || 
                  userProfile.role === 'administrator' || 
                  userProfile.isAdmin === true;

  return {
    ...context,
    isAdmin,
    isAuthenticated: !!context.user
  };
};

export const useAuth = useAuthContext;