#!/bin/bash

# Criar diretórios de aplicação
mkdir -p /root/gitaction-test/main
mkdir -p /root/gitaction-test/dev
mkdir -p /root/gitaction-test/backup

# Instalar PM2 globalmente se ainda não estiver instalado
npm list -g pm2 || npm install -g pm2

# Configurar PM2 para iniciar automaticamente
pm2 startup

echo "Servidor configurado com sucesso!"
