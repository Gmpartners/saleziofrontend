#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');
const socketClient = require('socket.io-client');
require('dotenv').config();

// Configuração
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || '9TKSUsh2PAV';

// Configuração axios
axios.defaults.headers.common['x-api-token'] = API_TOKEN;

// Criação da interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Estado da aplicação
let currentSetor = null;
let currentAtendente = null;
let currentConversa = null;
let conversas = [];
let atualizacaoAutomatica = false;
let atualizacaoInterval = null;

// Conexão WebSocket
const socket = socketClient(SOCKET_URL);

// Login do atendente
async function login() {
  console.clear();
  console.log(chalk.green('=== WhatsApp CRM - CLI de Atendimento ==='));
  
  rl.question(chalk.yellow('Nome do atendente: '), (nome) => {
    currentAtendente = nome;
    
    listarSetores().then(setores => {
      if (setores.length === 0) {
        console.log(chalk.red('Não há setores cadastrados. Crie pelo menos um setor no painel administrativo.'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\nSetores disponíveis:'));
      setores.forEach((setor, index) => {
        console.log(`${index + 1}. ${setor.nome} - ${setor.descricao}`);
      });
      
      rl.question(chalk.yellow('\nSelecione o número do setor: '), (opcao) => {
        const index = parseInt(opcao) - 1;
        
        if (isNaN(index) || index < 0 || index >= setores.length) {
          console.log(chalk.red('Opção inválida'));
          login();
          return;
        }
        
        currentSetor = setores[index].nome;
        
        // Registrar no WebSocket
        socket.emit('atendente:login', { nome: currentAtendente, setor: currentSetor });
        
        console.log(chalk.green(`\nConectado como ${currentAtendente} no setor ${currentSetor}`));
        showMainMenu();
      });
    }).catch(error => {
      console.error(chalk.red('Erro ao buscar setores:', error.message));
      process.exit(1);
    });
  });
}

// Obter lista de setores
async function listarSetores() {
  try {
    const response = await axios.get(`${API_URL}/setores`);
    return response.data;
  } catch (error) {
    throw new Error(`Falha ao buscar setores: ${error.message}`);
  }
}

// Listar conversas do setor atual
async function listarConversas() {
  try {
    const response = await axios.get(`${API_URL}/conversas?setor=${currentSetor}&status=em_andamento,aguardando`);
    conversas = response.data.conversas;
    
    console.log(chalk.cyan('\n--- Conversas em Andamento ---'));
    
    if (conversas.length === 0) {
      console.log(chalk.gray('Não há conversas em andamento para este setor.'));
      return;
    }
    
    conversas.forEach((conversa, index) => {
      const status = conversa.status === 'em_andamento' ? 
        chalk.yellow('Em Andamento') : 
        chalk.blue('Aguardando');
      
      const ultimaMensagem = conversa.mensagens[conversa.mensagens.length - 1];
      const mensagemPreview = ultimaMensagem ? 
        (ultimaMensagem.texto.length > 30 ? `${ultimaMensagem.texto.substring(0, 30)}...` : ultimaMensagem.texto) : 
        '(sem mensagens)';
      
      console.log(`${index + 1}. ${chalk.green(conversa.cliente.nome)} - ${status} - ${chalk.gray(mensagemPreview)}`);
    });
    
    console.log('');
  } catch (error) {
    console.error(chalk.red('Erro ao buscar conversas:', error.message));
  }
}

// Ver detalhes de uma conversa
async function verConversa(index) {
  if (index < 1 || index > conversas.length) {
    console.log(chalk.red('Número de conversa inválido'));
    return;
  }
  
  currentConversa = conversas[index - 1];
  
  // Registrar no socket que está visualizando esta conversa
  socket.emit('conversa:selecionar', currentConversa._id);
  
  console.clear();
  console.log(chalk.cyan(`=== Conversa com ${currentConversa.cliente.nome} ===`));
  console.log(chalk.gray(`Telefone: ${currentConversa.cliente.telefone}`));
  console.log(chalk.gray(`Status: ${currentConversa.status === 'em_andamento' ? 'Em Andamento' : 'Aguardando'}`));
  console.log(chalk.gray(`Assunto: ${currentConversa.assunto}`));
  console.log(chalk.gray('================================================='));
  
  // Mostrar histórico de mensagens
  currentConversa.mensagens.forEach(msg => {
    const data = new Date(msg.criadoEm).toLocaleTimeString();
    
    if (msg.tipo === 'cliente') {
      console.log(chalk.yellow(`[${data}] ${currentConversa.cliente.nome}: ${msg.texto}`));
    } else if (msg.tipo === 'ia') {
      console.log(chalk.blue(`[${data}] IA: ${msg.texto}`));
    } else {
      console.log(chalk.green(`[${data}] ${msg.atendente}: ${msg.texto}`));
    }
  });
  
  console.log(chalk.gray('================================================='));
  console.log(chalk.gray('Comandos disponíveis:'));
  console.log(chalk.gray('/menu - Voltar ao menu principal'));
  console.log(chalk.gray('/finalizar - Finalizar esta conversa'));
  console.log(chalk.gray('/transferir - Transferir para outro setor'));
  console.log(chalk.gray('Digite sua resposta e pressione Enter para enviar'));
  
  // Modo de resposta
  function setupResponseMode() {
    rl.question('> ', async (input) => {
      if (input.trim() === '/menu') {
        showMainMenu();
        return;
      }
      
      if (input.trim() === '/finalizar') {
        await finalizarConversa();
        return;
      }
      
      if (input.trim() === '/transferir') {
        await prepararTransferencia();
        return;
      }
      
      if (input.trim() === '') {
        setupResponseMode();
        return;
      }
      
      // Enviar resposta
      try {
        await enviarResposta(input);
        setupResponseMode();
      } catch (error) {
        console.error(chalk.red('Erro ao enviar mensagem:', error.message));
        setupResponseMode();
      }
    });
  }
  
  setupResponseMode();
}

// Enviar resposta para o cliente
async function enviarResposta(texto) {
  try {
    // Via API REST
    await axios.post(`${API_URL}/conversas/${currentConversa._id}/mensagens`, {
      texto,
      atendente: currentAtendente
    });
    
    // Via WebSocket para tempo real
    socket.emit('mensagem:enviar', {
      conversaId: currentConversa._id,
      texto
    });
    
    console.log(chalk.green('Mensagem enviada.'));
    
    // Atualizar a conversa atual
    const response = await axios.get(`${API_URL}/conversas/${currentConversa._id}`);
    currentConversa = response.data;
    
    // Mostrar a conversa atualizada
    await verConversa(conversas.findIndex(c => c._id === currentConversa._id) + 1);
  } catch (error) {
    throw new Error(`Falha ao enviar mensagem: ${error.message}`);
  }
}

// Finalizar conversa
async function finalizarConversa() {
  try {
    // Via API REST
    await axios.put(`${API_URL}/conversas/${currentConversa._id}`, {
      status: 'resolvido'
    });
    
    // Via WebSocket para tempo real
    socket.emit('conversa:finalizar', currentConversa._id);
    
    console.log(chalk.green('Conversa finalizada com sucesso!'));
    
    // Voltar ao menu principal
    showMainMenu();
  } catch (error) {
    console.error(chalk.red('Erro ao finalizar conversa:', error.message));
    showMainMenu();
  }
}

// Preparar transferência para outro setor
async function prepararTransferencia() {
  try {
    const setores = await listarSetores();
    
    console.log(chalk.yellow('\nSetores disponíveis para transferência:'));
    const setoresFiltrados = setores.filter(s => s.nome !== currentSetor);
    
    if (setoresFiltrados.length === 0) {
      console.log(chalk.red('Não há outros setores disponíveis para transferência.'));
      await verConversa(conversas.findIndex(c => c._id === currentConversa._id) + 1);
      return;
    }
    
    setoresFiltrados.forEach((setor, index) => {
      console.log(`${index + 1}. ${setor.nome}`);
    });
    
    rl.question(chalk.yellow('\nSelecione o número do setor para transferência: '), async (opcao) => {
      const index = parseInt(opcao) - 1;
      
      if (isNaN(index) || index < 0 || index >= setoresFiltrados.length) {
        console.log(chalk.red('Opção inválida'));
        await verConversa(conversas.findIndex(c => c._id === currentConversa._id) + 1);
        return;
      }
      
      const novoSetor = setoresFiltrados[index].nome;
      
      // Via API REST
      await axios.put(`${API_URL}/conversas/${currentConversa._id}`, {
        setor: novoSetor
      });
      
      // Via WebSocket para tempo real
      socket.emit('conversa:transferir', {
        conversaId: currentConversa._id,
        novoSetor
      });
      
      console.log(chalk.green(`Conversa transferida para o setor ${novoSetor}`));
      
      // Voltar ao menu principal
      showMainMenu();
    });
  } catch (error) {
    console.error(chalk.red('Erro ao transferir conversa:', error.message));
    await verConversa(conversas.findIndex(c => c._id === currentConversa._id) + 1);
  }
}

// Ativar/desativar atualização automática
function toggleAtualizacaoAutomatica() {
  atualizacaoAutomatica = !atualizacaoAutomatica;
  
  if (atualizacaoAutomatica) {
    console.log(chalk.green('Atualização automática ativada (a cada 10 segundos)'));
    atualizacaoInterval = setInterval(async () => {
      await listarConversas();
      showMainMenu();
    }, 10000);
  } else {
    console.log(chalk.yellow('Atualização automática desativada'));
    clearInterval(atualizacaoInterval);
  }
}

// Menu principal
function showMainMenu() {
  console.clear();
  console.log(chalk.cyan(`=== Menu Principal - ${currentAtendente} (${currentSetor}) ===`));
  console.log('1. Listar conversas');
  console.log('2. Ver conversa específica');
  console.log(`3. ${atualizacaoAutomatica ? 'Desativar' : 'Ativar'} atualização automática`);
  console.log('4. Sair');
  
  rl.question('\nEscolha uma opção: ', async (opcao) => {
    switch (opcao) {
      case '1':
        await listarConversas();
        showMainMenu();
        break;
      case '2':
        await listarConversas();
        rl.question('\nNúmero da conversa: ', async (num) => {
          await verConversa(parseInt(num));
        });
        break;
      case '3':
        toggleAtualizacaoAutomatica();
        showMainMenu();
        break;
      case '4':
        console.log(chalk.green('Saindo...'));
        if (atualizacaoInterval) clearInterval(atualizacaoInterval);
        process.exit(0);
        break;
      default:
        console.log(chalk.red('Opção inválida'));
        showMainMenu();
    }
  });
}

// Tratamento de eventos do WebSocket
socket.on('connect', () => {
  console.log(chalk.green('Conectado ao servidor!'));
});

socket.on('disconnect', () => {
  console.log(chalk.red('Conexão com o servidor perdida. Tentando reconectar...'));
});

socket.on('error', (data) => {
  console.error(chalk.red(`Erro: ${data.message}`));
});

socket.on('conversas:lista', (novasConversas) => {
  conversas = novasConversas;
  console.log(chalk.green(`${conversas.length} conversas carregadas do servidor.`));
});

socket.on('nova_mensagem', (data) => {
  if (data.setor === currentSetor) {
    // Se não estiver na conversa específica
    if (!currentConversa || currentConversa._id !== data.conversaId) {
      console.log('\n');
      console.log(chalk.bgYellow.black(` Nova mensagem de ${data.cliente.nome} `));
      console.log(chalk.yellow(`Mensagem: ${data.texto}`));
      console.log('\nPressione Enter para continuar...');
    }
    // Atualizar conversas se estiver no menu principal
    if (!currentConversa) {
      listarConversas().then(() => {
        console.log('Pressione Enter para continuar...');
      });
    }
  }
});

socket.on('nova_conversa', (data) => {
  if (data.setor === currentSetor) {
    console.log('\n');
    console.log(chalk.bgGreen.black(` Nova conversa iniciada por ${data.cliente.nome} `));
    console.log(chalk.green(`Assunto: ${data.assunto}`));
    console.log('\nPressione Enter para continuar...');
    
    // Atualizar conversas se estiver no menu principal
    if (!currentConversa) {
      listarConversas().then(() => {
        console.log('Pressione Enter para continuar...');
      });
    }
  }
});

// Lidar com CTRL+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nSaindo...'));
  if (atualizacaoInterval) clearInterval(atualizacaoInterval);
  process.exit(0);
});

// Iniciar CLI
login();
