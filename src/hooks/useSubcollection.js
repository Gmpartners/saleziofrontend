import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";  // O caminho pode variar de acordo com seu projeto

export const useSubcollection = () => {
  // Função para buscar documentos de uma subcoleção específica
  const fetchDocumentsFromSubcollection = async (userId, subcollection) => {
    try {
      const subColRef = collection(db, `users/${userId}/${subcollection}`);
      const snapshot = await getDocs(subColRef);
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return docs;
    } catch (err) {
      throw new Error("Erro ao buscar documentos: " + err.message);
    }
  };

  return { fetchDocumentsFromSubcollection };
};
