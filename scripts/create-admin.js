// Script para criar ou verificar uma conta de administrador no Firebase

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurar readline para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verificar se o arquivo de credenciais existe
const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error(`
  ERRO: Arquivo de credenciais não encontrado: ${credentialsPath}
  
  Por favor, siga estes passos:
  1. Acesse o console do Firebase (https://console.firebase.google.com/)
  2. Vá para o projeto Salezio
  3. Em Configurações > Contas de serviço, clique em "Gerar nova chave privada"
  4. Salve o arquivo JSON gerado como "firebase-credentials.json" na pasta "scripts"
  `);
  process.exit(1);
}

// Inicializar Firebase Admin SDK
const serviceAccount = require('./firebase-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const auth = admin.auth();

// Função para verificar se um usuário existe e seu status
async function checkUserExists(email) {
  try {
    // Verificar na autenticação
    const userRecord = await auth.getUserByEmail(email);
    console.log(`\nUsuário encontrado na autenticação do Firebase:`);
    console.log(`- UID: ${userRecord.uid}`);
    console.log(`- Email: ${userRecord.email}`);
    console.log(`- Email verificado: ${userRecord.emailVerified}`);
    console.log(`- Desativado: ${userRecord.disabled}`);
    
    // Verificar no Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`\nDados do usuário no Firestore:`);
      console.log(`- Nome: ${userData.displayName || userData.name || 'N/A'}`);
      console.log(`- Papel: ${userData.role || 'N/A'}`);
      console.log(`- Ativo: ${userData.isActive !== false ? 'Sim' : 'Não'}`);
      
      return {
        exists: true,
        auth: userRecord,
        firestore: userData,
        docRef: db.collection('users').doc(userRecord.uid)
      };
    } else {
      console.log(`\nUsuário existe na autenticação, mas não tem dados no Firestore.`);
      return {
        exists: true,
        auth: userRecord,
        firestore: null,
        docRef: db.collection('users').doc(userRecord.uid)
      };
    }
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`\nUsuário não encontrado com o email ${email}`);
      return { exists: false };
    }
    throw error;
  }
}

// Função para promover um usuário a administrador
async function promoteToAdmin(userRef) {
  try {
    await userRef.update({
      role: 'admin',
      isAdmin: true,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`\nUsuário promovido a administrador com sucesso!`);
  } catch (error) {
    console.error(`\nErro ao promover usuário a administrador:`, error);
  }
}

// Função para criar um novo usuário administrador
async function createAdminUser(email, password, displayName) {
  try {
    // Criar o usuário na autenticação
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
    
    console.log(`\nNovo usuário criado no Firebase Auth:`);
    console.log(`- UID: ${userRecord.uid}`);
    console.log(`- Email: ${userRecord.email}`);
    
    // Criar documento do usuário no Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      email,
      displayName,
      name: displayName,
      role: 'admin',
      isAdmin: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`\nConta de administrador criada com sucesso!`);
    
    return userRecord;
  } catch (error) {
    console.error(`\nErro ao criar usuário administrador:`, error);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log(`
=================================================
   FERRAMENTA DE ADMINISTRAÇÃO DO SALEZIO
=================================================
`);
    
    const mode = await new Promise(resolve => {
      rl.question(`O que você deseja fazer?\n
1. Verificar se um usuário existe
2. Promover um usuário existente a administrador
3. Criar um novo usuário administrador

Escolha uma opção (1-3): `, answer => {
        const option = parseInt(answer.trim());
        if (option >= 1 && option <= 3) {
          resolve(option);
        } else {
          console.log(`\nOpção inválida. Por favor, escolha entre 1 e 3.`);
          process.exit(1);
        }
      });
    });
    
    if (mode === 1 || mode === 2) {
      // Verificar usuário existente
      const email = await new Promise(resolve => {
        rl.question(`\nDigite o email do usuário que deseja verificar: `, answer => {
          resolve(answer.trim());
        });
      });
      
      const userInfo = await checkUserExists(email);
      
      if (userInfo.exists && mode === 2) {
        const confirm = await new Promise(resolve => {
          rl.question(`\nDeseja promover este usuário a administrador? (s/n): `, answer => {
            resolve(answer.trim().toLowerCase() === 's');
          });
        });
        
        if (confirm) {
          await promoteToAdmin(userInfo.docRef);
        } else {
          console.log(`\nOperação cancelada.`);
        }
      }
    } else if (mode === 3) {
      // Criar novo usuário administrador
      const email = await new Promise(resolve => {
        rl.question(`\nDigite o email para o novo administrador: `, answer => {
          resolve(answer.trim());
        });
      });
      
      const displayName = await new Promise(resolve => {
        rl.question(`\nDigite o nome para o novo administrador: `, answer => {
          resolve(answer.trim());
        });
      });
      
      const password = await new Promise(resolve => {
        rl.question(`\nDigite a senha para o novo administrador: `, answer => {
          resolve(answer.trim());
        });
      });
      
      const confirm = await new Promise(resolve => {
        rl.question(`\nCriar novo administrador com email ${email}? (s/n): `, answer => {
          resolve(answer.trim().toLowerCase() === 's');
        });
      });
      
      if (confirm) {
        await createAdminUser(email, password, displayName);
      } else {
        console.log(`\nOperação cancelada.`);
      }
    }
    
    console.log(`\nOperação concluída.`);
  } catch (error) {
    console.error(`\nErro inesperado:`, error);
  } finally {
    rl.close();
    // Encerrar o processo explicitamente após finalizar
    process.exit(0);
  }
}

main();