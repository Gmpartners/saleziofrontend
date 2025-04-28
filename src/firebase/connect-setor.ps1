# Script de Conexão do Setor - Salezio MultiAtendimento
# Este script configura a conexão entre o setor do Firebase e o backend

# Diretório de trabalho
$WORK_DIR = "C:\Users\Gabriel\Desktop\Salezio dash\salezio"

# Navegar para o diretório de trabalho
Set-Location $WORK_DIR
Write-Host "Navegando para $WORK_DIR" -ForegroundColor Cyan

# Função para verificar e atualizar a configuração do Firebase
function ConfigurarFirebaseSetor {
    Write-Host "Configurando conexão do setor Financeiro com o Firebase..." -ForegroundColor Yellow
    
    # Verificar arquivo .env
    if (-not (Test-Path ".env")) {
        Write-Host "Arquivo .env não encontrado. Criando..." -ForegroundColor Red
        
        # Criar arquivo .env com configurações básicas
        $envContent = @"
VITE_API_URL=https://multi.compracomsegurancaeconfianca.com/api
VITE_SOCKET_URL=https://multi.compracomsegurancaeconfianca.com
VITE_API_TOKEN=netwydZWjrJpA

# Firebase Configuration
VITE_FIREBASE_API_KEY=sua-chave-api
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
VITE_FIREBASE_MEASUREMENT_ID=seu-measurement-id

# Configuração específica do setor
VITE_DEFAULT_SETOR=Financeiro
VITE_ALLOW_MULTI_SETOR=true
"@
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Arquivo .env criado. Por favor, preencha as configurações do Firebase." -ForegroundColor Green
        return
    }
    
    # Verificar se o setor está configurado no .env
    $envContent = Get-Content -Path ".env" -Raw
    if ($envContent -notmatch "VITE_DEFAULT_SETOR=") {
        Write-Host "Configuração de setor não encontrada. Adicionando..." -ForegroundColor Yellow
        
        # Adicionar configuração de setor
        $envContent += "`n# Configuração específica do setor`nVITE_DEFAULT_SETOR=Financeiro`nVITE_ALLOW_MULTI_SETOR=true`n"
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Configuração de setor adicionada ao arquivo .env" -ForegroundColor Green
    } else {
        # Atualizar para o setor Financeiro
        $envContent = $envContent -replace "VITE_DEFAULT_SETOR=.*", "VITE_DEFAULT_SETOR=Financeiro"
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Setor padrão atualizado para Financeiro" -ForegroundColor Green
    }
}

# Função para atualizar regras do Firestore para o setor Financeiro
function AtualizarRegrasFirestore {
    Write-Host "Atualizando regras do Firestore para o setor Financeiro..." -ForegroundColor Yellow
    
    # Verificar regras atuais
    if (-not (Test-Path "firestore.rules")) {
        Write-Host "Arquivo firestore.rules não encontrado. Criando..." -ForegroundColor Red
        
        # Criar regras específicas para o setor Financeiro
        $newRules = @'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Função para verificar se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função para verificar se o usuário é administrador
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Função para verificar se o usuário tem acesso ao setor Financeiro
    function hasFinanceiroAccess() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.setor == 'Financeiro' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Regras para usuários
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }
    
    // Regras para setores - permissão especial para Financeiro
    match /setores/Financeiro {
      allow read: if isAuthenticated();
      allow write: if hasFinanceiroAccess() || isAdmin();
    }
    
    match /setores/{setorId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Regras para conversas do setor Financeiro
    match /conversas/{conversaId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
      
      // Mensagens das conversas
      match /mensagens/{mensagemId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if isAdmin();
      }
    }
    
    // TEMPORÁRIO PARA DESENVOLVIMENTO: permissão para acessar todos os dados
    match /{document=**} {
      allow read: if true;
      allow write: if isAuthenticated();
    }
  }
}
'@
        Set-Content -Path "firestore.rules" -Value $newRules
        Write-Host "Regras do Firestore criadas com configurações específicas para o setor Financeiro" -ForegroundColor Green
    } else {
        # Backup das regras atuais
        Copy-Item -Path "firestore.rules" -Destination "firestore.rules.bak" -Force
        
        # Atualizar as regras para incluir acesso ao setor Financeiro
        $currentRules = Get-Content -Path "firestore.rules" -Raw
        
        if ($currentRules -notmatch "hasFinanceiroAccess") {
            # Adicionar função de verificação para acesso ao setor Financeiro
            $matchPoint = "function isAdmin\(\)"
            $newFunction = @'

    // Função para verificar se o usuário tem acesso ao setor Financeiro
    function hasFinanceiroAccess() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.setor == 'Financeiro' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
'@
            $currentRules = $currentRules -replace "($matchPoint[^}]+})", "$1$newFunction"
            
            # Adicionar regra específica para o setor Financeiro
            $matchPoint = "match /setores/{setorId}"
            $newRule = @'
    // Regras para setores - permissão especial para Financeiro
    match /setores/Financeiro {
      allow read: if isAuthenticated();
      allow write: if hasFinanceiroAccess() || isAdmin();
    }
    
'@
            $currentRules = $currentRules -replace "($matchPoint)", "$newRule$1"
            
            Set-Content -Path "firestore.rules" -Value $currentRules
            Write-Host "Regras do Firestore atualizadas com configurações específicas para o setor Financeiro" -ForegroundColor Green
        } else {
            Write-Host "Regras para o setor Financeiro já estão configuradas" -ForegroundColor Green
        }
    }
}

# Função para atualizar configuração do WebSocket para o setor
function ConfigurarWebSocketSetor {
    Write-Host "Configurando WebSocket para o setor Financeiro..." -ForegroundColor Yellow
    
    # Verificar se existe o arquivo de contexto do WebSocket
    $wsConfigPath = "src/contexts/WebSocketContext.js"
    if (-not (Test-Path $wsConfigPath)) {
        Write-Host "Arquivo de contexto do WebSocket não encontrado em: $wsConfigPath" -ForegroundColor Red
        Write-Host "Verifique o caminho ou estrutura do projeto" -ForegroundColor Yellow
        return
    }
    
    # Backup do arquivo
    Copy-Item -Path $wsConfigPath -Destination "$wsConfigPath.bak" -Force
    
    # Ler conteúdo atual
    $wsContent = Get-Content -Path $wsConfigPath -Raw
    
    # Verificar se já existe configuração para setor específico
    if ($wsContent -notmatch "subscribeToSetor\(") {
        # Adicionar função de inscrição em setor específico
        $matchPoint = "const WebSocketContext = createContext\("
        $newImport = "import { useEffect } from 'react';\n"
        $wsContent = $wsContent -replace "(import React,.*)", "$1\n$newImport"
        
        $matchPoint = "function WebSocketProvider\(.*\) {"
        $newFunction = @'

  // Função para inscrever em um setor específico
  const subscribeToSetor = (setor) => {
    if (socket && socket.connected) {
      console.log(`Inscrevendo no setor: ${setor}`);
      socket.emit('subscribe', { setor });
    } else {
      console.error('Socket não inicializado ou desconectado');
    }
  };

'@
        $wsContent = $wsContent -replace "($matchPoint[^{]*{)", "$1$newFunction"
        
        # Adicionar à lista de valores do contexto
        $matchPoint = "value={{.*}}"
        $newContextValue = "value={{ socket, isConnected, connect, disconnect, subscribeToSetor }}"
        $wsContent = $wsContent -replace "$matchPoint", "$newContextValue"
        
        # Adicionar uso do setor padrão
        $matchPoint = "useEffect\(\(\) => {"
        $newEffect = @'
  // Efeito para inscrever no setor padrão após conexão
  useEffect(() => {
    if (isConnected) {
      const defaultSetor = process.env.VITE_DEFAULT_SETOR || 'Financeiro';
      subscribeToSetor(defaultSetor);
    }
  }, [isConnected]);

'@
        $wsContent = $wsContent -replace "($matchPoint)", "$newEffect$1"
        
        Set-Content -Path $wsConfigPath -Value $wsContent
        Write-Host "Configuração do WebSocket atualizada para suportar o setor Financeiro" -ForegroundColor Green
    } else {
        Write-Host "Configuração de WebSocket para setor já existe" -ForegroundColor Green
    }
}

# Função para criar componente dedicado ao setor Financeiro
function CriarComponenteSetor {
    Write-Host "Criando/atualizando componente para o setor Financeiro..." -ForegroundColor Yellow
    
    # Diretório de componentes
    $componentsDir = "src/components"
    if (-not (Test-Path $componentsDir)) {
        New-Item -Path $componentsDir -ItemType Directory -Force | Out-Null
        Write-Host "Diretório de componentes criado: $componentsDir" -ForegroundColor Green
    }
    
    # Criar componente do setor Financeiro
    $setorComponentPath = "$componentsDir/SetorFinanceiro.jsx"
    $setorComponentContent = @'
import React, { useEffect, useState, useContext } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { WebSocketContext } from '../contexts/WebSocketContext';
import { AuthContext } from '../contexts/AuthContext';

const SetorFinanceiro = () => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected, subscribeToSetor } = useContext(WebSocketContext);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    // Inscrever no setor Financeiro via WebSocket quando conectado
    if (isConnected && socket) {
      subscribeToSetor('Financeiro');
      console.log('Inscrito no setor Financeiro');
    }
    
    // Buscar conversas do setor Financeiro no Firestore
    const fetchConversas = async () => {
      try {
        const q = query(
          collection(db, 'conversas'),
          where('setor', '==', 'Financeiro')
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const conversasData = [];
          querySnapshot.forEach((doc) => {
            conversasData.push({ id: doc.id, ...doc.data() });
          });
          
          setConversas(conversasData);
          setLoading(false);
          console.log('Conversas do setor Financeiro carregadas:', conversasData.length);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        setLoading(false);
      }
    };
    
    fetchConversas();
  }, [isConnected, socket, currentUser]);

  if (loading) {
    return <div>Carregando conversas do setor Financeiro...</div>;
  }

  return (
    <div className="setor-financeiro-container">
      <h2>Setor Financeiro</h2>
      <div className="conversas-list">
        {conversas.length === 0 ? (
          <p>Nenhuma conversa disponível no momento</p>
        ) : (
          conversas.map((conversa) => (
            <div key={conversa.id} className="conversa-item">
              <h3>{conversa.cliente?.nome || 'Cliente'}</h3>
              <p>Última atualização: {conversa.updatedAt?.toDate().toLocaleString() || 'N/A'}</p>
              <p>Status: {conversa.status || 'Em andamento'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SetorFinanceiro;
'@
    Set-Content -Path $setorComponentPath -Value $setorComponentContent
    Write-Host "Componente do setor Financeiro criado/atualizado: $setorComponentPath" -ForegroundColor Green
}

# Função para verificar e atualizar o index.js/App.jsx para incluir o componente do setor
function AtualizarAppComponent {
    Write-Host "Configurando aplicação para exibir o setor Financeiro..." -ForegroundColor Yellow
    
    # Verificar arquivo App.jsx ou similar
    $appPath = $null
    $possiblePaths = @("src/App.jsx", "src/App.js", "src/app/App.jsx", "src/app/App.js")
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $appPath = $path
            break
        }
    }
    
    if (-not $appPath) {
        Write-Host "Arquivo App.jsx/App.js não encontrado. Verifique a estrutura do projeto." -ForegroundColor Red
        return
    }
    
    # Backup do arquivo
    Copy-Item -Path $appPath -Destination "$appPath.bak" -Force
    
    # Ler conteúdo atual
    $appContent = Get-Content -Path $appPath -Raw
    
    # Verificar se o SetorFinanceiro já está importado
    if ($appContent -notmatch "SetorFinanceiro") {
        # Adicionar importação
        $importMatch = "import .* from .*;"
        $lastImport = [regex]::Matches($appContent, $importMatch) | Select-Object -Last 1
        $importStatement = "import SetorFinanceiro from './components/SetorFinanceiro';"
        
        if ($lastImport) {
            $appContent = $appContent -replace "($lastImport)", "$1`n$importStatement"
        } else {
            $appContent = "$importStatement`n$appContent"
        }
        
        # Identificar onde adicionar o componente
        # Aqui, vamos procurar por padrões comuns em componentes React
        $routeMatch = "<Route path=\"/conversas\""
        $divMatch = "<div className=\".*?\">.*?</div>"
        
        if ($appContent -match $routeMatch) {
            # Adicionar como uma nova rota
            $newRoute = "<Route path=\"/financeiro\" element={<SetorFinanceiro />} />"
            $appContent = $appContent -replace "($routeMatch)", "$newRoute`n      $1"
        } elseif ($appContent -match $divMatch) {
            # Adicionar em algum div existente
            $appContent = $appContent -replace "(<div className=\".*?\">)", "$1`n        <SetorFinanceiro />"
        } else {
            Write-Host "Não foi possível determinar onde adicionar o componente. Edite manualmente o arquivo $appPath" -ForegroundColor Yellow
        }
        
        Set-Content -Path $appPath -Value $appContent
        Write-Host "Componente SetorFinanceiro adicionado ao App" -ForegroundColor Green
    } else {
        Write-Host "Componente SetorFinanceiro já está configurado no App" -ForegroundColor Green
    }
}

# Executar verificações e configurações
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO CONFIGURAÇÃO DE SETOR FINANCEIRO" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

ConfigurarFirebaseSetor
AtualizarRegrasFirestore
ConfigurarWebSocketSetor
CriarComponenteSetor
AtualizarAppComponent

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURAÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "`nPróximos passos:" -ForegroundColor Green
Write-Host "1. Verifique as configurações do Firebase no arquivo .env" -ForegroundColor Yellow
Write-Host "2. Execute 'npm run dev' para iniciar o servidor de desenvolvimento" -ForegroundColor Yellow
Write-Host "3. Acesse a aplicação e verifique se o setor Financeiro está conectado" -ForegroundColor Yellow
Write-Host "4. Caso encontre erros, verifique o console do navegador" -ForegroundColor Yellow
