import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { multiflowApi } from '@/services/multiflowApi';
import { CircleX, Save, AlertCircle, Bot } from 'lucide-react';
import { toast } from 'sonner';

export default function IAConfigPanel({ debugMode = false }) {
  const { userProfile } = useAuthContext();
  
  const [formData, setFormData] = useState({
    instrucoesBase: "",
    nomeIA: "Assistente Virtual",
    configuracaoAvancada: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await multiflowApi.getConfigIA(userProfile?.id);
      
      if (response.success && response.data) {
        setFormData({
          instrucoesBase: response.data.instrucoesBase || "",
          nomeIA: response.data.nomeIA || "Assistente Virtual",
          configuracaoAvancada: response.data.configuracaoAvancada || ""
        });
        
        if (debugMode) {
          console.log("Configuração carregada:", response.data);
        }
      } else {
        setError("Não foi possível carregar a configuração da IA");
      }
    } catch (err) {
      console.error("Erro ao buscar configuração:", err);
      setError(err.message || "Erro ao carregar a configuração da IA");
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };
  
  useEffect(() => {
    if (userProfile?.id) {
      fetchConfig();
    }
  }, [userProfile]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    setHasChanges(true);
  };
  
  const handleReset = () => {
    fetchConfig();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        instrucoesBase: formData.instrucoesBase,
        nomeIA: formData.nomeIA,
        configuracaoAvancada: formData.configuracaoAvancada
      };
      
      if (debugMode) {
        console.log("Enviando configuração:", payload);
      }
      
      const response = await multiflowApi.updateConfigIA(payload, userProfile?.id);
      
      if (response.success) {
        toast.success("Configuração da IA salva com sucesso!");
        setHasChanges(false);
      } else {
        toast.error("Erro ao salvar configuração", {
          description: response.error || "Verifique os dados e tente novamente"
        });
      }
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      toast.error("Erro ao salvar", {
        description: err.message || "Ocorreu um erro durante o salvamento"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF8F00]"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto p-4 bg-[#0f1621] rounded-lg border border-[#1f2937]/40">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Bot className="h-5 w-5 mr-2 text-[#FF8F00]" />
              Configuração da Inteligência Artificial
            </h2>
            <p className="text-slate-400 mt-1">
              Personalize como a IA se comporta e responde aos usuários
            </p>
          </div>
          
          <div className="flex gap-2">
            {hasChanges && (
              <Button 
                variant="outline" 
                className="bg-[#101820] text-slate-300 border-[#1f2937]/40 hover:bg-[#1f2937]/50"
                onClick={handleReset}
                disabled={loading || saving}
              >
                <CircleX className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            
            <Button 
              className="bg-[#FF8F00] hover:bg-[#FF6F00] text-black"
              onClick={handleSubmit}
              disabled={!hasChanges || loading || saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/20 text-red-400 p-4 rounded-md mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nomeIA" className="text-slate-300">Nome da IA</Label>
              <Input
                id="nomeIA"
                value={formData.nomeIA}
                onChange={(e) => handleChange('nomeIA', e.target.value)}
                placeholder="Ex: Assistente Virtual"
                className="bg-[#101820] border border-[#1f2937]/40 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Nome que será exibido para o cliente</p>
            </div>
            
            <div>
              <Label htmlFor="instrucoesBase" className="text-slate-300">Instruções Base</Label>
              <Textarea
                id="instrucoesBase"
                value={formData.instrucoesBase}
                onChange={(e) => handleChange('instrucoesBase', e.target.value)}
                placeholder="Você é uma assistente virtual educada e prestativa. Seu objetivo é identificar as necessidades do cliente e encaminhar para o atendimento especializado. Seja cordial e profissional, sempre perguntando as informações necessárias antes de transferir."
                className="bg-[#101820] border border-[#1f2937]/40 text-white"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Instruções gerais para a IA sobre como deve se comportar e responder
              </p>
            </div>
            
            <div>
              <Label htmlFor="configuracaoAvancada" className="text-slate-300">Configuração Avançada (JSON)</Label>
              <Textarea
                id="configuracaoAvancada"
                value={formData.configuracaoAvancada}
                onChange={(e) => handleChange('configuracaoAvancada', e.target.value)}
                placeholder="{}"
                className="bg-[#101820] border border-[#1f2937]/40 text-white font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Configurações avançadas em formato JSON (opcional)
              </p>
            </div>
          </div>
        </form>
        
        <div className="mt-8 bg-[#101820] rounded-md p-4 border border-[#1f2937]/40">
          <h3 className="text-white font-medium mb-2">Como funciona</h3>
          <p className="text-sm text-slate-400">
            A IA usará estas configurações para entender como deve interagir com os clientes. As instruções base 
            definem o comportamento geral, enquanto os setores e empresas configurados no fluxo determinam 
            o direcionamento específico das conversas.
          </p>
        </div>
      </div>
    </div>
  );
}