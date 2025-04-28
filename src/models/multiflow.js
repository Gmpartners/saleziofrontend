/**
 * Modelos de dados para a API MultiFlow
 */

/**
 * Modelo para Setor
 * @typedef {Object} Setor
 * @property {string} _id - ID único do setor
 * @property {string} userId - ID do usuário proprietário
 * @property {string} nome - Nome do setor
 * @property {string} descricao - Descrição detalhada do setor
 * @property {string} responsavel - Nome do responsável pelo setor
 * @property {boolean} ativo - Estado do setor (ativo/inativo)
 * @property {string} created - Data de criação
 * @property {string} updated - Data da última atualização
 */

/**
 * Modelo para Mensagem
 * @typedef {Object} Mensagem
 * @property {string} _id - ID único da mensagem
 * @property {string} remetente - Tipo de remetente ('cliente', 'atendente', 'bot')
 * @property {string} conteudo - Conteúdo da mensagem
 * @property {string} timestamp - Data e hora de envio
 * @property {boolean} lida - Status de leitura
 * @property {boolean} midia - Indica se é uma mídia
 * @property {string} tipo - Tipo de mensagem ('texto', 'imagem', etc.)
 */

/**
 * Modelo para Conversa
 * @typedef {Object} Conversa
 * @property {string} _id - ID único da conversa
 * @property {string} userId - ID do usuário proprietário
 * @property {string} telefoneCliente - Telefone do cliente
 * @property {string} nomeCliente - Nome do cliente
 * @property {Object} setorId - Dados do setor ou ID do setor
 * @property {string} status - Status da conversa ('aguardando', 'em_andamento', 'finalizada')
 * @property {string|null} atendenteId - ID do atendente ou null
 * @property {Array<Mensagem>} mensagens - Lista de mensagens
 * @property {boolean} arquivada - Se a conversa está arquivada
 * @property {Object} metadados - Metadados adicionais
 * @property {string} ultimaAtividade - Data da última atividade
 * @property {string} created - Data de criação
 */

/**
 * @typedef {Object} PaginacaoResponse
 * @property {number} total - Total de itens
 * @property {number} pagina - Página atual
 * @property {number} totalPaginas - Total de páginas
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicador de sucesso
 * @property {string} [message] - Mensagem da API
 * @property {any} [data] - Dados retornados pela API
 * @property {PaginacaoResponse} [paginacao] - Informações de paginação
 */

export const MultiFlowStatusMap = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

export const MultiFlowRemetenteMap = {
  CLIENTE: 'cliente',
  ATENDENTE: 'atendente',
  BOT: 'bot'
};

export const MultiFlowTipoMensagemMap = {
  TEXTO: 'texto',
  IMAGEM: 'imagem',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENTO: 'documento',
  LOCALIZACAO: 'localizacao'
};

export const MultiFlowEventosMap = {
  NOVA_MENSAGEM: 'nova_mensagem',
  NOVA_CONVERSA: 'nova_conversa',
  CONVERSA_ATUALIZADA: 'conversa_atualizada'
};