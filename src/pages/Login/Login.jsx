import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLogin } from "../../hooks/useLogin";
import { cn } from "@/lib/utils.js";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// Icons
import { 
  Mail, 
  Lock, 
  ArrowLeft, 
  LogIn, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Power,
  MessageCircle,
  Phone
} from 'lucide-react';

export default function Login() {
  const { login, isPending, error, accountStatus, clearAccountStatus } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    email: "",
    password: "",
    general: ""
  });

  // Verificar status da conta na inicialização
  useEffect(() => {
    if (accountStatus) {
      setStatusDialogOpen(true);
    }
  }, [accountStatus]);

  // Evitar fechamento do diálogo quando accountStatus existe
  const handleOpenChange = (open) => {
    if (!open && accountStatus) {
      return; 
    }
    setStatusDialogOpen(open);
  };

  // Animação na carga da página
  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 300);
  }, []);

  // Validação de email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação do formulário
  const validateForm = () => {
    const errors = {
      email: "",
      password: "",
      general: ""
    };
    let isValid = true;

    // Validação de email
    if (!email) {
      errors.email = "O email é obrigatório";
      isValid = false;
    } else if (!validateEmail(email)) {
      errors.email = "Digite um email válido";
      isValid = false;
    }

    // Validação de senha
    if (!password) {
      errors.password = "A senha é obrigatória";
      isValid = false;
    } else if (password.length < 6) {
      errors.password = "A senha deve ter pelo menos 6 caracteres";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Manipulador de login
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Limpar erros gerais antes de tentar login
      setValidationErrors({
        ...validationErrors,
        general: ""
      });
      
      await login(email, password);
      
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setValidationErrors({
        ...validationErrors,
        general: "Ocorreu um erro ao tentar fazer login. Tente novamente."
      });
    }
  };

  // Fechar diálogo e limpar estado
  const handleCloseDialog = () => {
    clearAccountStatus();
    setStatusDialogOpen(false);
    
    // Limpar campos do formulário
    setEmail("");
    setPassword("");
    setValidationErrors({
      email: "",
      password: "",
      general: ""
    });
  };

  // Contato via email
  const handleContactSupport = () => {
    window.location.href = "mailto:suporte@whatsappcrm.com.br?subject=Reativação%20de%20Conta";
  };
  
  // Contato via WhatsApp
  const handleContactWhatsapp = () => {
    const message = `Olá, gostaria de solicitar a reativação da minha conta na plataforma WhatsApp CRM. Email: ${email}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/+554888069442?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#040406] overflow-auto">
      {/* Background e efeitos */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Partículas */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, index) => (
            <div 
              key={index} 
              className="absolute rounded-full bg-green-500/10"
              style={{
                width: `${Math.random() * 6 + 1}px`,
                height: `${Math.random() * 6 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
                animation: `float ${Math.random() * 50 + 20}s infinite alternate ease-in-out`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>

        {/* Gradientes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full bg-gradient-to-r from-green-500/10 to-green-500/0 blur-[100px] opacity-30 animate-pulse"></div>
          <div className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-r from-green-600/10 to-green-600/0 blur-[100px] opacity-20 animate-pulse" style={{animationDuration: '12s'}}></div>
          <div className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-r from-green-700/10 to-green-700/0 blur-[100px] opacity-20 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>

        {/* Grid background */}
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat opacity-[0.03]"></div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto relative z-10 px-4 py-8 flex flex-col items-center justify-center flex-grow">
        {/* Header com link de retorno */}
        <div className={cn(
          "w-full max-w-md mb-8",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          "transition-all duration-500"
        )}>
          <Link to="/" className="inline-flex items-center text-green-400 hover:text-green-300 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para página inicial
          </Link>
        </div>

        {/* Logo */}
        <div className={cn(
          "mb-8 flex items-center justify-center gap-3",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          "transition-all duration-500 delay-100"
        )}>
          <MessageCircle className="h-10 w-10 text-green-500" />
          <h1 className="text-3xl font-bold text-white">WhatsApp<span className="text-green-500">CRM</span></h1>
        </div>

        {/* Login Card */}
        <Card className={cn(
          "w-full max-w-md bg-[#131524]/90 border-[#262b45] text-white rounded-xl backdrop-blur-sm shadow-xl",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          "transition-all duration-500 delay-200"
        )}>
          {/* Green highlight border */}
          <div className="h-1 w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-700"></div>
          
          <CardHeader className="space-y-1 pt-8 pb-2">
            <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-white to-slate-300 text-transparent bg-clip-text">
              Bem-vindo ao WhatsApp CRM
            </CardTitle>
            <p className="text-center text-base text-gray-400">
              Faça login para gerenciar suas conversas
            </p>
          </CardHeader>
          
          <CardContent className="pt-6 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  "rounded-lg",
                  validationErrors.email ? "ring-2 ring-red-500/50" : ""
                )}>
                  <Mail className={cn(
                    "absolute left-3 top-3 h-5 w-5 text-green-400",
                    validationErrors.email ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 border rounded-lg py-6",
                      "bg-[#1a1f38]/50 border-[#2c3154] text-white placeholder:text-gray-500 focus:border-green-500",
                      validationErrors.email ? "border-red-500/50" : "",
                      "transition-all duration-300"
                    )}
                  />
                </div>
                
                {validationErrors.email && (
                  <p className="text-red-400 text-xs flex items-center ml-2">
                    <span className="w-1 h-1 rounded-full bg-red-500 mr-1.5 inline-block"></span>
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  "rounded-lg",
                  validationErrors.password ? "ring-2 ring-red-500/50" : ""
                )}>
                  <Lock className={cn(
                    "absolute left-3 top-3 h-5 w-5 text-green-400",
                    validationErrors.password ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors({ ...validationErrors, password: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 pr-10 border rounded-lg py-6",
                      "bg-[#1a1f38]/50 border-[#2c3154] text-white placeholder:text-gray-500 focus:border-green-500",
                      validationErrors.password ? "border-red-500/50" : "",
                      "transition-all duration-300"
                    )}
                  />
                  
                  {/* Toggle password visibility */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 transition-all duration-300 text-slate-400 hover:text-green-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {validationErrors.password && (
                  <p className="text-red-400 text-xs flex items-center ml-2">
                    <span className="w-1 h-1 rounded-full bg-red-500 mr-1.5 inline-block"></span>
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className={cn(
                        "w-4 h-4 rounded transition-colors duration-300 focus:ring-2 focus:ring-offset-2 cursor-pointer",
                        "border-2 appearance-none relative",
                        rememberMe ? "bg-green-600 border-green-600" : "bg-[#1a1f38] border-[#2c3154]",
                        "focus:ring-green-500 focus:ring-offset-[#131524]"
                      )}
                    />
                    {rememberMe && (
                      <svg 
                        className="w-2.5 h-2.5 text-white absolute left-[3px] pointer-events-none" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                    <label htmlFor="remember" className="ml-2 text-sm cursor-pointer text-gray-400">
                      Lembrar de mim
                    </label>
                  </div>
                </div>
                
                <Link
                  to="/forgot-password"
                  className="text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              {/* Error message */}
              {validationErrors.general && (
                <div className="rounded-lg p-4 text-center border bg-red-500/10 border-red-500/30 text-red-400">
                  <p className="text-sm font-medium flex items-center justify-center">
                    <Power className="h-4 w-4 mr-2" />
                    {validationErrors.general}
                  </p>
                </div>
              )}

              {/* Login Button */}
              <div className="pt-2">
                <Button 
                  type="submit"
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg",
                    "font-medium text-white py-6",
                    "transition-all duration-300",
                    "bg-green-600 hover:bg-green-700",
                    "shadow-lg shadow-green-600/20",
                    isPending ? "opacity-90 cursor-not-allowed" : ""
                  )}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Entrar na plataforma</span>
                    </>
                  )}
                </Button>
              </div>
              
              {/* Signup link */}
              <div className="text-center pt-3">
                <p className="text-sm text-gray-400">
                  Não tem uma conta?{' '}
                  <Link
                    to="/signup"
                    className="text-green-400 hover:text-green-300 transition-colors font-medium"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className={cn(
          "mt-8 mb-4 text-center text-xs text-slate-600",
          isLoaded ? "opacity-100" : "opacity-0",
          "transition-opacity duration-500 delay-300"
        )}>
          <p>&copy; 2025 WhatsApp CRM. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Account status dialog */}
      <Dialog 
        open={statusDialogOpen} 
        onOpenChange={handleOpenChange}
      >
        <DialogContent 
          className="bg-[#131524] border-[#262b45] text-white sm:max-w-md" 
          onEscapeKeyDown={(e) => accountStatus && e.preventDefault()}
          onInteractOutside={(e) => accountStatus && e.preventDefault()}
          onPointerDownOutside={(e) => accountStatus && e.preventDefault()}
        >
          <DialogHeader>
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              accountStatus?.status === 'suspended' 
                ? 'bg-red-100 dark:bg-red-900/20' 
                : 'bg-orange-100 dark:bg-orange-900/20'
            } mb-4`}>
              <AlertTriangle className={`h-6 w-6 ${
                accountStatus?.status === 'suspended' 
                  ? 'text-red-600 dark:text-red-500' 
                  : 'text-orange-600 dark:text-orange-500'
              }`} />
            </div>
            <DialogTitle className="text-xl text-center">
              {accountStatus?.status === 'suspended' ? 'Conta Suspensa' : 'Conta Inativa'}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              {accountStatus?.message}
            </DialogDescription>
          </DialogHeader>

          <div className={`rounded-lg p-4 my-2 ${
            accountStatus?.status === 'suspended' 
              ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
              : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
          }`}>
            <p className="text-sm">
              {accountStatus?.details}
            </p>
          </div>

          <DialogFooter className="sm:justify-center gap-2 flex-col">
            {/* WhatsApp button */}
            <Button 
              className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 w-full sm:w-auto"
              onClick={handleContactWhatsapp}
            >
              <Phone className="h-4 w-4" />
              Contatar via WhatsApp
            </Button>
            
            {/* Email button */}
            <Button 
              className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
              onClick={handleContactSupport}
            >
              <Mail className="h-4 w-4" />
              Contatar via Email
            </Button>
            
            <Button 
              variant="outline" 
              className="border-[#262b45] text-white hover:bg-[#1a1f38]/50 w-full sm:w-auto"
              onClick={handleCloseDialog}
            >
              Tentar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Animações */}
      <style jsx="true">{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(10px, 10px); }
        }
        
        @keyframes pulse {
          0% { opacity: var(--opacity, 0.3); }
          50% { opacity: calc(var(--opacity, 0.3) * 0.6); }
          100% { opacity: var(--opacity, 0.3); }
        }
      `}</style>
    </div>
  );
}