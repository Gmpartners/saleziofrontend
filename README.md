# WPP Multiatendimento

Sistema de atendimento múltiplo para WhatsApp.

## Estrutura
- Branch `main`: Produção (porta 3000)
- Branch `dev`: Desenvolvimento (porta 3001)

## Configuração
O projeto está configurado com GitHub Actions para deploy automático:
- Push para `dev` → Deploy automático no ambiente de desenvolvimento
- Push para `main` → Deploy automático no ambiente de produção