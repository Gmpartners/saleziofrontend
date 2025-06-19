import { useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, timestamp } from "../firebase/config";
import { useAuthContext } from "./useAuthContext";

export const useSignup = () => {
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const context = useAuthContext();
  const dispatch = context?.dispatch;

  const signup = async (email, password, name, phoneNumber) => {
    setError(null);
    setIsPending(true);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      if (methods.length > 0) {
        setError("Esse e-mail já está em uso. Tente outro.");
        setIsPending(false);
        return;
      }
      
      const res = await createUserWithEmailAndPassword(auth, email, password);

      if (!res) {
        throw new Error("Não foi possível realizar o cadastro.");
      }

      await updateProfile(auth.currentUser, { displayName: name });

      const userDocRef = doc(db, "users", res.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          id: res.user.uid,
          online: true,
          createdAt: timestamp,
          email: email,
          displayName: name,
          phoneNumber: phoneNumber,
          role: "agent",
          sector: "",
          sectorName: "",
          isActive: true,
          accountStatus: 'active',
          lastLogin: timestamp,
          updatedAt: timestamp
        });
      }

      // Verificar se o dispatch existe antes de usá-lo
      if (dispatch) {
        dispatch({ type: "LOGIN", payload: res.user });
      } else {
        console.warn("AuthContext dispatch não disponível - o usuário foi criado, mas o login automático pode não funcionar");
        // Usuário foi criado, mas não conseguimos fazer login automaticamente
        // Você pode redirecionar para a página de login se necessário
      }

      if (!isCancelled) {
        setIsPending(false);
        setError(null);
      }
    } catch (err) {
      console.error("Erro durante o signup:", err.code, err.message);
      
      let errorMessage;
      switch(err.code) {
        case "auth/email-already-in-use":
          errorMessage = "Esse e-mail já está em uso. Tente outro.";
          break;
        case "auth/weak-password":
          errorMessage = "A senha deve ter pelo menos 6 caracteres.";
          break;
        case "auth/invalid-email":
          errorMessage = "O e-mail informado é inválido.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "O cadastro com email e senha está desativado.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
          break;
        default:
          errorMessage = "Erro ao tentar criar a conta. Tente novamente mais tarde.";
      }

      if (!isCancelled) {
        setError(errorMessage);
        setIsPending(false);
      }
    }
  };

  useEffect(() => () => setIsCancelled(true), []);

  return { error, isPending, signup };
};