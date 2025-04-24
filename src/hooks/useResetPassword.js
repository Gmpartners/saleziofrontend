import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config"; // Ajuste o caminho para o seu config do Firebase

export const useResetPassword = () => {
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState(null);

  const resetPassword = async (email) => {
    setError(null);
    setMessage(null);
    setIsPending(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("E-mail de recuperação enviado com sucesso.");
      setIsPending(false);
    } catch (err) {
      setError("Erro ao enviar e-mail de recuperação. Verifique o endereço de e-mail.");
      setIsPending(false);
    }
  };

  return { resetPassword, error, message, isPending };
};
