import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de recuperação de senha
    console.log('Recuperação de senha para:', email);
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Recuperar Senha</h1>
      
      {!submitted ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-600 mb-6">
            Digite seu email para receber instruções sobre como redefinir sua senha.
          </p>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Enviar instruções
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              <Link to="/login" className="text-blue-600 hover:underline">
                Voltar para o login
              </Link>
            </p>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-xl font-medium mb-4">Email enviado</h2>
          <p className="text-gray-600 mb-6">
            As instruções para redefinição de senha foram enviadas para {email}.
            Por favor, verifique sua caixa de entrada.
          </p>
          
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Voltar para o login
          </Link>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordPage;