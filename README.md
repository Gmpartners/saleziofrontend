# GitAction Test

Um projeto simples para testar o GitHub Actions com deploy automático em uma VPS usando PM2.

## Estrutura
- Branch `main`: Produção
- Branch `dev`: Desenvolvimento
- Backup automático: A versão anterior do `main` é armazenada em uma pasta de backup antes de cada novo deploy