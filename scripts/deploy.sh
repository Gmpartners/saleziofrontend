#!/bin/bash

# Script para deploy no ambiente de desenvolvimento ou produção
# Uso: ./scripts/deploy.sh [dev|main]

ENV=${1:-dev}  # Se nenhum ambiente for especificado, usa "dev"

echo "Iniciando deploy no ambiente: $ENV"

# Configurações baseadas no ambiente
if [ "$ENV" == "dev" ]; then
  APP_NAME="wpp-multiatendimento-dev"
  BRANCH="dev"
  APP_PATH="/root/wpp-multiatendimento/dev"
elif [ "$ENV" == "main" ]; then
  APP_NAME="wpp-multiatendimento-main"
  BRANCH="main"
  APP_PATH="/root/wpp-multiatendimento/main"
else
  echo "Ambiente inválido. Use 'dev' ou 'main'."
  exit 1
fi

# Atualizar código do repositório
cd $APP_PATH
git checkout $BRANCH
git pull origin $BRANCH

# Instalar dependências
npm install

# Reiniciar aplicação com o PM2 usando o arquivo de configuração
pm2 startOrRestart ecosystem/ecosystem.config.js --only $APP_NAME

echo "Deploy concluído para o ambiente $ENV!"
