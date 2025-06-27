// Arquivo de teste para verificar funcionamento das notificações
// Para usar: copie e cole no console do browser

console.log('🔧 Testando Sistema de Notificações...');

// 1. Verificar suporte do navegador
const support = notificationService.checkBrowserSupport();
console.log('📱 Suporte do navegador:', support);

// 2. Verificar configurações atuais
const settings = notificationService.getSettings();
console.log('⚙️ Configurações atuais:', settings);

// 3. Testar som de notificação
console.log('🔊 Testando som...');
notificationService.playNotificationSound().then(() => {
  console.log('✅ Som funcionando');
}).catch(error => {
  console.log('❌ Erro no som:', error);
});

// 4. Testar notificação desktop (se permitida)
if (settings.permission === 'granted') {
  console.log('🔔 Testando notificação desktop...');
  notificationService.showNotification('Teste', {
    body: 'Esta é uma notificação de teste',
    tag: 'teste'
  }).then(() => {
    console.log('✅ Notificação enviada');
  }).catch(error => {
    console.log('❌ Erro na notificação:', error);
  });
} else {
  console.log('⚠️ Permissões de notificação não concedidas');
}

// 5. Verificar localStorage
const unreadMap = localStorage.getItem('unreadMessagesMap');
console.log('💾 Mapa de não lidas:', unreadMap ? JSON.parse(unreadMap) : 'vazio');

// 6. Verificar título da página
console.log('📄 Título atual:', document.title);

console.log('✅ Teste concluído!');

// Função para testar contagem
window.testNotificationCount = function(conversationId = 'test-123') {
  console.log('🧪 Testando contagem de notificações...');
  
  // Simular nova mensagem
  const mockData = {
    conversaId: conversationId,
    mensagem: {
      conteudo: 'Mensagem de teste',
      timestamp: new Date().toISOString(),
      remetente: 'cliente'
    }
  };
  
  // Disparar evento como se viesse do socket
  const event = new CustomEvent('nova_mensagem', { detail: mockData });
  window.dispatchEvent(event);
  
  console.log('📨 Evento de nova mensagem disparado');
  
  // Verificar se contador foi incrementado
  setTimeout(() => {
    const newUnreadMap = localStorage.getItem('unreadMessagesMap');
    console.log('📊 Novo mapa:', newUnreadMap ? JSON.parse(newUnreadMap) : 'vazio');
    console.log('📄 Novo título:', document.title);
  }, 1000);
};

console.log('💡 Use testNotificationCount() para testar contagem');
