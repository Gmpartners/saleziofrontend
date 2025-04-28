// Utilitário para atribuir um usuário ao setor Financeiro
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Atribui um usuário específico ao setor Financeiro
 * @param {string} userId - ID do usuário a ser atribuído ao setor
 * @returns {Promise<boolean>} - Resultado da operação
 */
export async function atribuirUsuarioAoSetorFinanceiro(userId) {
  try {
    console.log(Atribuindo usuário  ao setor Financeiro...);
    
    // 1. Verificar se o usuário existe
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error(Usuário  não encontrado);
      return false;
    }
    
    // 2. Verificar se o setor Financeiro existe
    const setorRef = doc(db, "setores", "financeiro");
    const setorDoc = await getDoc(setorRef);
    
    // Criar o setor se não existir
    if (!setorDoc.exists()) {
      console.log("Criando setor Financeiro...");
      await setDoc(setorRef, {
        _id: "financeiro",
        nome: "Financeiro",
        descricao: "Setor responsável por questões financeiras",
        responsavel: "Administrador",
        ativo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // 3. Atualizar o usuário com o setor Financeiro
    await updateDoc(userRef, {
      setor: "Financeiro",
      setorId: "financeiro",
      updatedAt: serverTimestamp()
    });
    
    console.log(Usuário  atribuído ao setor Financeiro com sucesso!);
    return true;
  } catch (error) {
    console.error("Erro ao atribuir usuário ao setor:", error);
    return false;
  }
}

/**
 * Verifica se um usuário está atribuído ao setor Financeiro
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<object>} - Resultado da verificação
 */
export async function verificarUsuarioNoSetor(userId) {
  try {
    // Obter dados do usuário
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, message: Usuário  não encontrado };
    }
    
    const userData = userDoc.data();
    
    // Verificar atribuição ao setor
    const atribuido = userData.setor === "Financeiro" || userData.setorId === "financeiro";
    
    return {
      success: true,
      atribuido: atribuido,
      userData: userData
    };
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return { success: false, message: error.message };
  }
}
