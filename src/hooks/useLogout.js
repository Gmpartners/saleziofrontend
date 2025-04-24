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

  const logout = async () => {
    setError(null);
    setIsPending(true);

    try {
      // Se temos um usuário, tente atualizar o status online
      if (user) {
        try {
          const { uid } = user;
          const userRef = doc(db, "users", uid);
          await updateDoc(userRef, { online: false });
        } catch (updateError) {
          // Se falhar ao atualizar o documento (por questões de permissão), 
          // apenas registre o erro mas continue com o logout
          console.log("Não foi possível atualizar o status online:", updateError.message);
          // Não defina setError aqui, pois queremos continuar com o logout
        }
      }

      // Sempre tente fazer logout, mesmo se a atualização do doc falhar
      await signOut(auth);

      // Dispatch logout action
      dispatch({ type: "LOGOUT" });

      // Update state
      if (!isCancelled) {
        setIsPending(false);
        setError(null);
      }
    } catch (err) {
      // Este é um erro real do processo de logout
      if (!isCancelled) {
        console.log("Erro durante o logout:", err.message);
        setError(err.message);
        setIsPending(false);
      }
    }
  };

  useEffect(() => () => setIsCancelled(true), []);

  return { logout, error, isPending };
};