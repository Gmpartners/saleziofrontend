import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { useAuthContext } from "./useAuthContext";

export const useLogout = () => {
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const { dispatch, user } = useAuthContext();

  const clearAllAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userDisplayName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userSectorId');
    localStorage.removeItem('userSectorName');
    localStorage.removeItem('apiToken');
    sessionStorage.clear();
  };

  const logout = async () => {
    setError(null);
    setIsPending(true);

    try {
      if (user) {
        try {
          const { uid } = user;
          const userRef = doc(db, "users", uid);
          await updateDoc(userRef, { online: false });
        } catch (updateError) {
          console.log("Não foi possível atualizar o status online:", updateError.message);
        }
      }

      await signOut(auth);
      
      clearAllAuthData();
      
      dispatch({ type: "LOGOUT" });

      if (!isCancelled) {
        setIsPending(false);
        setError(null);
      }
    } catch (err) {
      console.log("Erro durante o logout:", err.message);
      
      clearAllAuthData();
      
      if (!isCancelled) {
        setError(err.message);
        setIsPending(false);
      }
      
      dispatch({ type: "LOGOUT" });
    }
  };

  useEffect(() => () => setIsCancelled(true), []);

  return { logout, error, isPending };
};