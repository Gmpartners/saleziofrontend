import React from 'react';

const ProfilePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Perfil</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-300 mr-6"></div>
          <div>
            <h2 className="text-xl font-medium">Usuário</h2>
            <p className="text-gray-600">usuario@email.com</p>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Informações pessoais</h3>
          {/* Conteúdo do perfil */}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;