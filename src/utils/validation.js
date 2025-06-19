import UserModel from '../models/user';
import { toast } from 'sonner';

/**
 * Script de validação para testar as modificações de múltiplas empresas
 */
class ValidationScript {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Executa todos os testes de validação
   */
  async runAllTests() {
    console.log('🧪 Iniciando testes de validação...');
    console.log('=======================================');
    
    try {
      // Testes do modelo de usuário
      await this.testUserModel();
      
      // Testes de migração
      await this.testDataMigration();
      
      // Testes de validação
      await this.testValidations();
      
      // Testes de compatibilidade
      await this.testBackwardCompatibility();
      
      // Resumo dos testes
      this.printTestSummary();
      
      return {
        success: this.failedTests === 0,
        totalTests: this.totalTests,
        passedTests: this.passedTests,
        failedTests: this.failedTests,
        results: this.testResults
      };
      
    } catch (error) {
      console.error('💥 Erro fatal nos testes:', error);
      return {
        success: false,
        error: error.message,
        results: this.testResults
      };
    }
  }

  /**
   * Registra resultado de um teste
   */
  recordTest(testName, passed, details = null, error = null) {
    this.totalTests++;
    
    if (passed) {
      this.passedTests++;
      console.log(`✅ ${testName}`);
    } else {
      this.failedTests++;
      console.log(`❌ ${testName}`);
      if (error) {
        console.log(`   Erro: ${error.message}`);
      }
    }
    
    this.testResults.push({
      name: testName,
      passed,
      details,
      error: error?.message
    });
  }

  /**
   * Testes do modelo de usuário
   */
  async testUserModel() {
    console.log('\n📋 Testando Modelo de Usuário');
    console.log('------------------------------');
    
    try {
      // Teste 1: Criação básica de usuário
      const user1 = new UserModel({
        id: 'test1',
        displayName: 'Usuário Teste',
        email: 'teste@email.com',
        role: 'agent'
      });
      
      this.recordTest(
        'Criação básica de usuário',
        user1.id === 'test1' && user1.displayName === 'Usuário Teste'
      );
      
      // Teste 2: Adicionar empresa
      const empresa1 = {
        id: 'emp1',
        empresaId: 'emp1',
        nome: 'Empresa Teste 1',
        descricao: 'Primeira empresa de teste'
      };
      
      const empresaAdicionada = user1.addEmpresa(empresa1, true);
      
      this.recordTest(
        'Adicionar empresa principal',
        empresaAdicionada.isPrimary === true && user1.empresas.length === 1
      );
      
      // Teste 3: Adicionar segunda empresa
      const empresa2 = {
        id: 'emp2',
        empresaId: 'emp2', 
        nome: 'Empresa Teste 2',
        descricao: 'Segunda empresa de teste'
      };
      
      const empresa2Adicionada = user1.addEmpresa(empresa2, false);
      
      this.recordTest(
        'Adicionar segunda empresa',
        empresa2Adicionada.isPrimary === false && user1.empresas.length === 2
      );
      
      // Teste 4: Verificar empresa principal
      const empresaPrincipal = user1.getPrimaryEmpresa();
      
      this.recordTest(
        'Obter empresa principal',
        empresaPrincipal.id === 'emp1' && empresaPrincipal.isPrimary === true
      );
      
      // Teste 5: Alterar empresa principal
      user1.setPrimaryEmpresa('emp2');
      const novaEmpresaPrincipal = user1.getPrimaryEmpresa();
      
      this.recordTest(
        'Alterar empresa principal',
        novaEmpresaPrincipal.id === 'emp2' && novaEmpresaPrincipal.isPrimary === true
      );
      
      // Teste 6: Adicionar setor
      const setor1 = {
        id: 'set1',
        setorId: 'set1',
        nome: 'Vendas',
        empresaId: 'emp1',
        empresaNome: 'Empresa Teste 1'
      };
      
      const setorAdicionado = user1.addSetor(setor1);
      
      this.recordTest(
        'Adicionar setor',
        setorAdicionado.id === 'set1' && user1.setores.length === 1
      );
      
      // Teste 7: Verificar acesso a empresa
      const temAcesso = user1.hasAccessToEmpresa('emp1');
      const naoTemAcesso = user1.hasAccessToEmpresa('emp999');
      
      this.recordTest(
        'Verificar acesso a empresa',
        temAcesso === true && naoTemAcesso === false
      );
      
      // Teste 8: Obter setores por empresa
      const setoresDaEmpresa = user1.getSetoresByEmpresa('emp1');
      
      this.recordTest(
        'Obter setores por empresa',
        setoresDaEmpresa.length === 1 && setoresDaEmpresa[0].id === 'set1'
      );
      
      // Teste 9: Serialização JSON
      const userJson = user1.toJSON();
      
      this.recordTest(
        'Serialização para JSON',
        userJson.empresas.length === 2 && userJson.setores.length === 1
      );
      
      // Teste 10: Campos de compatibilidade
      this.recordTest(
        'Campos de compatibilidade',
        user1.empresa.id === 'emp2' && user1.setor.id === 'set1'
      );
      
    } catch (error) {
      this.recordTest('Testes do modelo de usuário', false, null, error);
    }
  }

  /**
   * Testes de migração de dados
   */
  async testDataMigration() {
    console.log('\n🔄 Testando Migração de Dados');
    console.log('------------------------------');
    
    try {
      // Teste 1: Migração de formato antigo
      const dadosAntigos = {
        id: 'user-old',
        displayName: 'Usuário Antigo',
        email: 'antigo@email.com',
        role: 'agent',
        empresa: {
          id: 'emp-old',
          empresaId: 'emp-old',
          nome: 'Empresa Antiga'
        },
        setor: {
          id: 'set-old',
          setorId: 'set-old',
          nome: 'Setor Antigo',
          empresaId: 'emp-old'
        }
      };
      
      const usuarioMigrado = UserModel.migrateFromLegacyFormat(dadosAntigos);
      
      this.recordTest(
        'Migração de formato antigo',
        usuarioMigrado.empresas.length === 1 && 
        usuarioMigrado.setores.length === 1 &&
        usuarioMigrado.empresas[0].isPrimary === true
      );
      
      // Teste 2: Migração preserva dados
      this.recordTest(
        'Migração preserva dados',
        usuarioMigrado.displayName === 'Usuário Antigo' &&
        usuarioMigrado.empresas[0].nome === 'Empresa Antiga' &&
        usuarioMigrado.setores[0].nome === 'Setor Antigo'
      );
      
      // Teste 3: Compatibilidade após migração
      this.recordTest(
        'Compatibilidade após migração',
        usuarioMigrado.empresa.nome === 'Empresa Antiga' &&
        usuarioMigrado.setor.nome === 'Setor Antigo'
      );
      
      // Teste 4: Formato Firestore
      const firestoreData = usuarioMigrado.toFirestoreFormat();
      
      this.recordTest(
        'Formato Firestore válido',
        firestoreData.empresas && firestoreData.setores &&
        firestoreData.empresa && firestoreData.setor
      );
      
      // Teste 5: Formato API
      const apiData = usuarioMigrado.toApiFormat();
      
      this.recordTest(
        'Formato API válido',
        apiData._id === 'user-old' && apiData.empresas && apiData.setores
      );
      
    } catch (error) {
      this.recordTest('Testes de migração de dados', false, null, error);
    }
  }

  /**
   * Testes de validações
   */
  async testValidations() {
    console.log('\n🔍 Testando Validações');
    console.log('----------------------');
    
    try {
      // Teste 1: Validação de empresa obrigatória
      const userSemEmpresa = new UserModel({
        id: 'test-validation',
        displayName: 'Teste Validação',
        email: 'validacao@teste.com',
        role: 'agent'
      });
      
      let erroEsperado = false;
      try {
        userSemEmpresa.removeEmpresa('inexistente');
      } catch (error) {
        erroEsperado = error.message.includes('não encontrada');
      }
      
      this.recordTest(
        'Validação de empresa não encontrada',
        erroEsperado
      );
      
      // Teste 2: Empresa principal obrigatória
      userSemEmpresa.addEmpresa({
        id: 'emp-test',
        nome: 'Empresa Teste'
      }, true);
      
      userSemEmpresa.addEmpresa({
        id: 'emp-test2', 
        nome: 'Empresa Teste 2'
      }, false);
      
      let erroMinimo = false;
      try {
        userSemEmpresa.removeEmpresa('emp-test');
        userSemEmpresa.removeEmpresa('emp-test2'); // Deve falhar
      } catch (error) {
        erroMinimo = error.message.includes('pelo menos uma empresa');
      }
      
      this.recordTest(
        'Validação mínimo uma empresa',
        erroMinimo
      );
      
      // Teste 3: Setor deve ter empresa associada
      const userParaSetor = new UserModel({
        id: 'test-setor',
        displayName: 'Teste Setor'
      });
      
      userParaSetor.addEmpresa({
        id: 'emp-setor',
        nome: 'Empresa para Setor'
      }, true);
      
      let erroEmpresaSetor = false;
      try {
        userParaSetor.addSetor({
          id: 'set-test',
          nome: 'Setor Teste',
          empresaId: 'emp-inexistente'
        });
      } catch (error) {
        erroEmpresaSetor = error.message.includes('não está associada');
      }
      
      this.recordTest(
        'Validação empresa-setor',
        erroEmpresaSetor
      );
      
      // Teste 4: Empresa duplicada
      let erroDuplicada = false;
      try {
        userParaSetor.addEmpresa({
          id: 'emp-setor', // Mesmo ID
          nome: 'Empresa Duplicada'
        });
      } catch (error) {
        erroDuplicada = error.message.includes('já está associada');
      }
      
      this.recordTest(
        'Validação empresa duplicada',
        erroDuplicada
      );
      
      // Teste 5: Setor duplicado
      userParaSetor.addSetor({
        id: 'set-unico',
        nome: 'Setor Único',
        empresaId: 'emp-setor'
      });
      
      let erroSetorDuplicado = false;
      try {
        userParaSetor.addSetor({
          id: 'set-unico', // Mesmo ID
          nome: 'Setor Duplicado',
          empresaId: 'emp-setor'
        });
      } catch (error) {
        erroSetorDuplicado = error.message.includes('já está associado');
      }
      
      this.recordTest(
        'Validação setor duplicado',
        erroSetorDuplicado
      );
      
    } catch (error) {
      this.recordTest('Testes de validações', false, null, error);
    }
  }

  /**
   * Testes de compatibilidade com código existente
   */
  async testBackwardCompatibility() {
    console.log('\n⬅️ Testando Compatibilidade');
    console.log('----------------------------');
    
    try {
      // Teste 1: Formato antigo ainda funciona
      const userLegacy = {
        id: 'legacy-user',
        displayName: 'Usuário Legacy',
        email: 'legacy@teste.com',
        role: 'agent',
        empresa: {
          id: 'legacy-emp',
          nome: 'Empresa Legacy'
        },
        setor: {
          id: 'legacy-set',
          nome: 'Setor Legacy'
        }
      };
      
      // Simular como o código antigo acessaria os dados
      const empresaAntiga = userLegacy.empresa;
      const setorAntigo = userLegacy.setor;
      
      this.recordTest(
        'Acesso a dados no formato antigo',
        empresaAntiga.nome === 'Empresa Legacy' && 
        setorAntigo.nome === 'Setor Legacy'
      );
      
      // Teste 2: Migração mantém compatibilidade
      const userMigrado = UserModel.migrateFromLegacyFormat(userLegacy);
      
      this.recordTest(
        'Migração mantém campos compatíveis',
        userMigrado.empresa.nome === 'Empresa Legacy' &&
        userMigrado.setor.nome === 'Setor Legacy'
      );
      
      // Teste 3: Novo formato com compatibilidade
      const userNovo = new UserModel({
        id: 'new-user',
        displayName: 'Usuário Novo',
        empresas: [
          { id: 'emp1', nome: 'Empresa 1', isPrimary: true },
          { id: 'emp2', nome: 'Empresa 2', isPrimary: false }
        ],
        setores: [
          { id: 'set1', nome: 'Setor 1', empresaId: 'emp1' }
        ]
      });
      
      // Código antigo ainda deve funcionar
      const empresaCompat = userNovo.empresa;
      const setorCompat = userNovo.setor;
      
      this.recordTest(
        'Novo formato com compatibilidade',
        empresaCompat.nome === 'Empresa 1' &&
        setorCompat.nome === 'Setor 1'
      );
      
      // Teste 4: Métodos getter funcionam
      const primaryEmpresa = userNovo.getPrimaryEmpresa();
      const primarySetor = userNovo.getPrimarySetor();
      
      this.recordTest(
        'Métodos getter de compatibilidade',
        primaryEmpresa.isPrimary === true &&
        primarySetor.id === 'set1'
      );
      
      // Teste 5: Serialização preserva compatibilidade
      const jsonData = userNovo.toJSON();
      
      this.recordTest(
        'Serialização preserva compatibilidade',
        jsonData.empresa && jsonData.setor &&
        jsonData.empresas && jsonData.setores
      );
      
    } catch (error) {
      this.recordTest('Testes de compatibilidade', false, null, error);
    }
  }

  /**
   * Imprime resumo dos testes
   */
  printTestSummary() {
    console.log('\n📊 Resumo dos Testes');
    console.log('====================');
    console.log(`Total de testes: ${this.totalTests}`);
    console.log(`✅ Passou: ${this.passedTests}`);
    console.log(`❌ Falhou: ${this.failedTests}`);
    console.log(`📈 Taxa de sucesso: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);
    
    if (this.failedTests > 0) {
      console.log('\n❌ Testes que falharam:');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   - ${test.name}`);
          if (test.error) {
            console.log(`     Erro: ${test.error}`);
          }
        });
    }
    
    console.log('\n=======================================');
    
    if (this.failedTests === 0) {
      console.log('🎉 Todos os testes passaram! Sistema pronto para uso.');
    } else {
      console.log('⚠️ Alguns testes falharam. Verifique as implementações.');
    }
  }

  /**
   * Teste rápido para usar em componentes
   */
  static async quickTest() {
    const validator = new ValidationScript();
    
    try {
      // Teste básico de funcionamento
      const user = new UserModel({
        id: 'quick-test',
        displayName: 'Teste Rápido',
        empresas: [
          { id: 'emp1', nome: 'Empresa 1', isPrimary: true }
        ]
      });
      
      const empresaPrincipal = user.getPrimaryEmpresa();
      
      if (empresaPrincipal && empresaPrincipal.nome === 'Empresa 1') {
        toast.success('✅ Validação rápida: Sistema funcionando corretamente');
        return { success: true, message: 'Sistema funcionando' };
      } else {
        toast.error('❌ Validação rápida: Problema detectado');
        return { success: false, message: 'Problema no sistema' };
      }
    } catch (error) {
      toast.error(`❌ Erro na validação: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Executa validação completa (para usar no console ou testes)
 */
export const runValidation = async () => {
  const validator = new ValidationScript();
  return await validator.runAllTests();
};

/**
 * Executa validação rápida (para usar em componentes)
 */
export const quickValidation = ValidationScript.quickTest;

export default ValidationScript;