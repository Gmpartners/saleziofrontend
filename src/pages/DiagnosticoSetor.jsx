import React, { useState } from 'react';
import SetorFinanceiro from '../components/SetorFinanceiro';
import TestFinanceiroAPI from '../components/TestFinanceiroAPI';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../hooks/useAuthContext';

const DiagnosticoSetor = () => {
  const { user } = useAuthContext();
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Função para adicionar manualmente o setor Financeiro ao Firestore
  const adicionarSetorFinanceiro = async () => {
    try {
      setAdding(true);
      setResult(null);
      setError(null);
      
      const userId = user?.uid || localStorage.getItem('userId') || 'test-user';
      console.log("Criando setor Financeiro para usuário:", userId);
      
      // 1. Adicionar setor Financeiro
      const setorRef = doc(db, "setores", "financeiro-id");
      await setDoc(setorRef, {
        _id: "financeiro-id",
        userId,
        nome: "Financeiro", 
        descricao: "Setor financeiro e pagamentos",
        responsavel: "Administrador",
        ativo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // 2. Adicionar conversa de exemplo
      const conversaId = `conversa-financeiro-${Date.now()}`;
      const conversaRef = doc(db, "conversas", conversaId);
      await setDoc(conversaRef, {
        _id: conversaId,
        userId,
        setor: "Financeiro",
        setorId: "financeiro-id",
        cliente: {
          nome: "Cliente Teste",
          telefone: "+5511987654321"
        },
        status: "aguardando",
        ultimaMensagem: "Olá, preciso de informações sobre pagamento",
        ultimaAtividade: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // 3. Adicionar mensagem de exemplo
      const mensagensRef = collection(db, "conversas", conversaId, "mensagens");
      await addDoc(mensagensRef, {
        remetente: "cliente",
        conteudo: "Olá, preciso de informações sobre pagamento",
        timestamp: serverTimestamp(),
        lida: false
      });
      
      setResult("✅ Setor Financeiro e conversa de exemplo criados com sucesso!");
      setAdding(false);
    } catch (err) {
      console.error("Erro ao adicionar setor:", err);
      setError(`Erro: ${err.message}`);
      setAdding(false);
    }
  };

  return (
    <div className="diagnostico-container p-5">
      <h1 className="text-2xl font-bold mb-6 text-white">Diagnóstico do Setor Financeiro</h1>
      
      <div className="setup-section p-4 bg-gray-800 rounded-lg mb-6 text-white">
        <h2 className="text-xl font-semibold mb-3">1. Configuração do Setor</h2>
        <p className="mb-4">Se o setor Financeiro não estiver aparecendo nas visualizações, você pode criá-lo manualmente:</p>
        
        <button 
          className={`px-4 py-2 rounded font-medium ${adding ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={adicionarSetorFinanceiro}
          disabled={adding}
        >
          {adding ? 'Adicionando...' : 'Criar Setor Financeiro'}
        </button>
        
        {result && (
          <div className="mt-3 p-3 bg-green-700 rounded">
            {result}
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 bg-red-700 rounded">
            {error}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="test-api-section">
          <h2 className="text-xl font-semibold mb-3 text-white">2. Teste de API e WebSocket</h2>
          <TestFinanceiroAPI />
        </div>
        
        <div className="setor-view-section">
          <h2 className="text-xl font-semibold mb-3 text-white">3. Visualização do Setor</h2>
          <SetorFinanceiro />
        </div>
      </div>
    </div>
  );
};

export default DiagnosticoSetor;