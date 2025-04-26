import React, { useState, useEffect } from 'react';
import { User, Briefcase, Mail, Shield, CheckCircle, UserCheck, UserX } from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuthContext';
import apiService from '../../services/api';

const UserProfile = () => {
  const { userProfile, isAdmin } = useAuthContext();
  const [sectors, setSectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carregar setores na montagem
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getSetores();
        if (response.success) {
          setSectors(response.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Encontrar o setor atual do usuário
  const userSector = sectors.find(s => s._id === userProfile?.sector);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Perfil do Usuário</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Básicas */}
          <div className="bg-[#1e1d2b] rounded-xl p-6 shadow-md lg:col-span-1">
            <div className="flex items-center mb-6">
              <div className="h-20 w-20 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-medium mr-4">
                {userProfile?.displayName
                  ? userProfile.displayName.substring(0, 2).toUpperCase()
                  : <User className="h-10 w-10" />
                }
              </div>
              <div>
                <h2 className="text-xl font-medium text-white">
                  {userProfile?.displayName || 'Usuário'}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  <Mail className="h-4 w-4 mr-1" />
                  {userProfile?.email}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#25243a]">
                <div className="text-sm text-gray-400 mb-1">Função</div>
                <div className="flex items-center">
                  {isAdmin ? (
                    <>
                      <Shield className="h-5 w-5 text-purple-400 mr-2" />
                      <span className="text-white font-medium">Administrador</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-5 w-5 text-blue-400 mr-2" />
                      <span className="text-white font-medium">Atendente</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-[#25243a]">
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div className="flex items-center">
                  {userProfile?.isActive !== false ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <span className="text-white font-medium">Ativo</span>
                    </>
                  ) : (
                    <>
                      <UserX className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-white font-medium">Inativo</span>
                    </>
                  )}
                </div>
              </div>
              
              {!isAdmin && (
                <div className="p-3 rounded-lg bg-[#25243a]">
                  <div className="text-sm text-gray-400 mb-1">Setor</div>
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 text-blue-400 mr-2" />
                    <span className="text-white font-medium">
                      {userSector ? userSector.nome : 'Sem setor atribuído'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Detalhes do Setor (se não for admin) */}
          {!isAdmin && userSector && (
            <div className="bg-[#1e1d2b] rounded-xl p-6 shadow-md lg:col-span-2">
              <h2 className="text-xl font-medium text-white mb-4 flex items-center">
                <Briefcase className="h-6 w-6 text-blue-400 mr-2" />
                Detalhes do Setor
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Nome do Setor</div>
                  <div className="text-white font-medium text-lg">{userSector.nome}</div>
                </div>
                
                {userSector.descricao && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Descrição</div>
                    <div className="text-white">{userSector.descricao}</div>
                  </div>
                )}
                
                {userSector.responsavel && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Responsável</div>
                    <div className="text-white">{userSector.responsavel}</div>
                  </div>
                )}
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-4">
                  <p className="text-blue-400">
                    Como atendente deste setor, você tem acesso às conversas e mensagens
                    direcionadas especificamente para {userSector.nome}.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Informações para Administrador */}
          {isAdmin && (
            <div className="bg-[#1e1d2b] rounded-xl p-6 shadow-md lg:col-span-2">
              <h2 className="text-xl font-medium text-white mb-4 flex items-center">
                <Shield className="h-6 w-6 text-purple-400 mr-2" />
                Privilégios de Administrador
              </h2>
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                <p className="text-purple-400">
                  Como administrador, você tem acesso a todas as conversas e funcionalidades do sistema,
                  incluindo gerenciamento de usuários e setores.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#25243a] p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Gerenciamento de Usuários</h3>
                  <p className="text-gray-400 text-sm">
                    Adicionar, editar ou remover usuários do sistema. Atribuir papéis e setores.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/admin/users'}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Gerenciar Usuários
                  </button>
                </div>
                
                <div className="bg-[#25243a] p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Gerenciamento de Setores</h3>
                  <p className="text-gray-400 text-sm">
                    Criar, editar ou remover setores do sistema. Definir responsáveis.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/admin/sectors'}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Gerenciar Setores
                  </button>
                </div>
                
                <div className="bg-[#25243a] p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Painel Administrativo</h3>
                  <p className="text-gray-400 text-sm">
                    Visualizar estatísticas gerais e monitorar o sistema como um todo.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Acessar Painel
                  </button>
                </div>
                
                <div className="bg-[#25243a] p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Relatórios Avançados</h3>
                  <p className="text-gray-400 text-sm">
                    Acessar estatísticas detalhadas e relatórios de performance.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/admin/analytics'}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Ver Relatórios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;