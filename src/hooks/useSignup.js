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
  const { dispatch } = useAuthContext();

  const signup = async (email, password, name, phoneNumber, companyName, jobTitle) => {
    setError(null);
    setIsPending(true);

    try {
      // First check if email exists
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      // If methods array has length > 0, email exists
      if (methods.length > 0) {
        setError("Esse e-mail já está em uso. Tente outro.");
        setIsPending(false);
        return;
      }
      
      // Attempt to create the user
      const res = await createUserWithEmailAndPassword(auth, email, password);

      if (!res) {
        throw new Error("Não foi possível realizar o cadastro.");
      }

      // Update user profile with name
      await updateProfile(auth.currentUser, { displayName: name });

      // Check if user document already exists
      const userDocRef = doc(db, "users", res.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // Only create document if it doesn't exist
      if (!userDoc.exists()) {
        // Create user document in Firestore with all fields
        await setDoc(userDocRef, {
          id: res.user.uid,
          online: true,
          createdAt: timestamp,
          email: email,
          
          // Usar displayName em vez de name (padronização)
          displayName: name,
          
          phoneNumber: phoneNumber,
          companyName: companyName,
          jobTitle: jobTitle || "",
          
          // Campos adicionais para setorização
          role: "agent",         // Por padrão, novos usuários são agentes
          sector: "",            // Vazio por padrão, será atribuído pelo admin
          sectorName: "",        // Vazio por padrão
          isActive: true,        // Ativo por padrão
          
          accountStatus: 'active',
          lastLogin: timestamp,
          updatedAt: timestamp   // Adicionar timestamp de atualização
        });
      }

      // Dispatch login action
      dispatch({ type: "LOGIN", payload: res.user });

      // Update state
      if (!isCancelled) {
        setIsPending(false);
        setError(null);
      }
    } catch (err) {
      // More detailed error handling
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