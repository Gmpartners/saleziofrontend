# Instruções de Configuração no GitHub

Para configurar este projeto no GitHub:

1. Crie um novo repositório chamado "gitaction-test" no GitHub
2. Execute os seguintes comandos em seu terminal local:

```bash
cd /Users/mamprim/mcp-servers-temp/gitaction-test
git init
git add .
git commit -m "Configuração inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/gitaction-test.git
git push -u origin main
git checkout -b dev
git push -u origin dev
```

## Considerações de Segurança

**IMPORTANTE**: No ambiente de produção, não armazene senhas diretamente nos arquivos de workflow como fizemos aqui. Use GitHub Secrets para armazenar informações sensíveis.

Para configurar usando GitHub Secrets:

1. No GitHub, vá para seu repositório
2. Clique em Settings > Secrets > New repository secret
3. Adicione um segredo chamado `SSH_PASSWORD` com o valor da senha
4. Substitua a variável de ambiente em nossos workflows por:

```yaml
env:
  SSH_PASS: ${{ secrets.SSH_PASSWORD }}
```
