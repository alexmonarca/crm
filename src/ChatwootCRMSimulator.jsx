// --- CRM MONARCA v1.2 ---
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// --- Imports Lucide Icons ---
import { PlusCircle, User, Mail, Phone, MessageSquare, Loader, Zap, Award, Briefcase, UserCheck, X, Search } from 'lucide-react';

// =================================================================
// === CONFIGURAÇÃO SUPABASE =======================================
// =================================================================

// 1. Defina suas chaves (já preenchidas com as que você forneceu)
const SUPABASE_URL = "https://wjyrinydwrazuzjczhbw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeXJpbnlkd3JhenV6amN6aGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTA3MTAsImV4cCI6MjA3OTA2NjcxMH0.lx5gKNPJLBfBouwH99MFFYHtjvxDZeohwoJr9JlSblg";

// =================================================================
// === CLIENTE SUPABASE (FIX PARA COMPILAÇÃO NO CANVAS) ============
// =================================================================

// **IMPORTANTE:** Para que este código compile no ambiente Canvas, 
// o import do módulo '@supabase/supabase-js' foi substituído por uma função mock.
// EM PRODUÇÃO (VERCEL), você DEVE garantir que o import real seja usado.

// import { createClient } from '@supabase/supabase-js'; // Linha removida para compilar no Canvas

let realSupabaseClient = null;

// Tenta carregar o cliente real se o ambiente permitir (Vercel/Produção)
// Caso contrário, define uma função mock para evitar o erro de compilação.
try {
  // Apenas para fins de tipo/referência. No Canvas, esta tentativa falha na compilação.
  // Em ambientes com NPM, o import funcionaria.
  const { createClient } = require('@supabase/supabase-js');
  realSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  // Se a importação do módulo falhar (como no Canvas), usamos o mock.
  console.warn("AVISO: O módulo '@supabase/supabase-js' não foi resolvido. Usando mock.");
  
  // Função mock simples que simula a interface do createClient
  const mockCreateClient = (url, key) => ({
      from: (table) => ({
          // Mock para o .select() usado em fetchLeads()
          select: () => ({ 
              data: [
                  // Mantendo um dado simulado de erro para mostrar que a chamada falhou no preview
                  { id: 9999, name: 'MOCK: Preview Falhou', stage: 'Visitante', source: 'Canvas', responsible_name: 'Sistema', created_at: new Date().toISOString() }
              ], 
              error: { message: "MOCK: Falha na resolução do módulo Supabase." } 
          }),
          // Mock para o .insert()
          insert: (data) => ({ select: () => ({ single: () => ({ data: { id: Date.now(), ...data }, error: null }) }) }),
          // Mock para o .update()
          update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }) }) }),
      }),
  });
  realSupabaseClient = mockCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const supabase = realSupabaseClient;

// =================================================================
// === CONFIGURAÇÕES E CONSTANTES ==================================
// =================================================================

const STAGES = {
  Visitante: { id: 'visitante', name: 'Visitante', color: 'bg-gray-600', text: 'text-gray-100', icon: User, headerBg: 'bg-gray-700' },
  Lead: { id: 'lead', name: 'Lead (SDR AI)', color: 'bg-yellow-600', text: 'text-yellow-100', icon: Zap, headerBg: 'bg-yellow-900/50' },
  Oportunidade: { id: 'oportunidade', name: 'Oportunidade', color: 'bg-orange-600', text: 'text-white', icon: Award, headerBg: 'bg-orange-900/50' },
  Cliente: { id: 'cliente', name: 'Cliente (Onboarding)', color: 'bg-green-600', text: 'text-white', icon: PlusCircle, headerBg: 'bg-green-900/50' },
};

// Funções para log (mantidas como lembrete)
const logN8nFlow = (action, data) => {
  console.log(`--- FLUXO N8N/SUPABASE ---`);
  console.log(`Ação: ${action}`);
  console.log(`Dados enviados ao Supabase:`, data);
  console.log(`* NOTA: Esta é a persistência REAL. Os dados serão salvos no banco.`);
  console.log('---------------------------');
};

// =================================================================
// === COMPONENTES UI ==============================================
// =================================================================

const LeadCard = ({ lead, onDragStart, onDragEnd }) => {
  // Ajuste de data: Supabase retorna ISO strings
  const formattedDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'N/A';
  // Note: o campo 'stage' agora é esperado como 'Visitante', 'Lead', etc.
  const currentStage = STAGES[lead.stage] || STAGES.Visitante; 
  const StageIcon = currentStage.icon;
  
  return (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className="bg-gray-800 p-4 rounded-xl shadow-lg hover:shadow-orange-500/50 transition duration-300 border border-gray-700 flex flex-col space-y-3 cursor-grab active:cursor-grabbing"
    >
      
      {/* Header e Estágio */}
      <div className="flex justify-between items-start pb-2 border-b border-gray-700">
        <h3 className="text-xl font-bold text-orange-400 break-words">{lead.name}</h3>
        <div className={`text-xs font-medium px-3 py-1 rounded-full flex items-center ${currentStage.color} ${currentStage.text}`}>
          <StageIcon className="w-4 h-4 mr-1" />
          {currentStage.name.toUpperCase()}
        </div>
      </div>
      
      {/* Detalhes */}
      <div className="space-y-1">
        {/* Usando responsible_name, conforme o script SQL */}
        {lead.responsible_name && (
            <p className="flex items-center text-sm text-gray-300">
              <UserCheck className="w-4 h-4 mr-2 text-orange-500" />
              Resp.: {lead.responsible_name}
            </p>
        )}
        {lead.email && (
          <p className="flex items-center text-sm text-gray-300">
            <Mail className="w-4 h-4 mr-2 text-orange-500" />
            {lead.email}
          </p>
        )}
        
        {lead.phone && (
          <p className="flex items-center text-sm text-gray-300">
            <Phone className="w-4 h-4 mr-2 text-orange-500" />
            {lead.phone}
          </p>
        )}

        <p className="flex items-center text-xs text-gray-400 pt-1">
          <MessageSquare className="w-4 h-4 mr-2 text-orange-500" />
          Chatwoot ID: {lead.chatwoot_id || 'N/A'}
        </p>
        <p className="text-xs text-gray-500">
          Origem: {lead.source} | Cadastro: {formattedDate}
        </p>
      </div>
    </div>
  );
};

const LeadFormModal = ({ isOpen, onClose, onSave, isSupabaseReady }) => {
  const [newLead, setNewLead] = useState({
    name: '', // companyName agora é 'name' para Supabase
    responsible_name: '',
    email: '',
    phone: '',
    chatwoot_id: '', // chatwootId agora é 'chatwoot_id'
    source: 'Cadastro Manual',
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newLead.name) {
      setFormError("Nome da Empresa é obrigatório.");
      return;
    }
    
    // ATENÇÃO: Se isSupabaseReady for false, a chamada usará o cliente mock.
    if (!isSupabaseReady) {
        setFormError("AVISO: Conexão Supabase não é real (usando mock). O lead será 'salvo' localmente.");
    }


    setLoading(true);
    try {
        // Envia apenas os campos mapeados para a tabela Supabase
        await onSave(newLead); 
        // Limpa o formulário e fecha o modal
        setNewLead({ name: '', responsible_name: '', email: '', phone: '', chatwoot_id: '', source: 'Cadastro Manual' });
        onClose();
    } catch (e) {
        console.error("Erro ao salvar lead:", e);
        // Captura e exibe o erro retornado pelo Supabase (ou pelo mock)
        setFormError(`Falha ao salvar: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Mapeamento de campos do formulário (usando nomes da coluna Supabase)
  const formFields = [
    { field: 'name', label: 'Nome da Empresa', Icon: Briefcase, required: true, type: 'text' },
    { field: 'responsible_name', label: 'Nome do Responsável', Icon: UserCheck, required: false, type: 'text' },
    { field: 'email', label: 'Email', Icon: Mail, required: false, type: 'email' },
    { field: 'phone', label: 'Telefone', Icon: Phone, required: false, type: 'tel' },
    { field: 'chatwoot_id', label: 'ID do Contato Chatwoot', Icon: MessageSquare, required: false, type: 'text' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-orange-500/50">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-orange-400 flex items-center">
            <PlusCircle className="w-6 h-6 mr-3" />
            Cadastrar Novo Lead
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body (Form) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {formFields.map(({ field, label, Icon, required, type }) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium text-gray-300">{label}{required && '*'}</label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-600 bg-gray-700 text-orange-400 sm:text-sm">
                  <Icon className="w-4 h-4" />
                </span>
                <input
                  type={type}
                  id={field}
                  name={field}
                  value={newLead[field]}
                  onChange={handleChange}
                  placeholder={label}
                  required={required}
                  className="flex-1 block w-full rounded-none rounded-r-lg border-gray-600 focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-2.5 bg-gray-700 text-gray-100 placeholder-gray-500"
                />
              </div>
            </div>
          ))}

          {formError && (
            <div className="p-3 bg-red-900 text-red-100 rounded-lg text-sm border border-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150 disabled:bg-gray-600 disabled:text-gray-400"
          >
            {loading ? 'Salvando...' : 'Salvar Lead na Fase "Lead"'}
          </button>
        </form>
      </div>
    </div>
  );
};


// =================================================================
// === COMPONENTE PRINCIPAL APP ====================================
// =================================================================

const App = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // O Supabase não é considerado "pronto" se for o mock (que ocorre no Canvas)
  const [isSupabaseReady, setIsSupabaseReady] = useState(false); 
  const [draggedLeadId, setDraggedLeadId] = useState(null);

  // ID é simulado, mas as operações de banco são reais
  const mockUserId = "supabase-user-id-monarca-12345"; 

  // 1. Inicialização do Supabase Client
  useEffect(() => {
    // Apenas verifica se a variável 'supabase' existe e se NÃO é o mock de erro
    // No ambiente Canvas, o cliente é um mock, então isSupabaseReady será false.
    if (supabase && SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "") {
        // Verifica se o cliente real foi carregado (o que só acontece fora do Canvas)
        if (typeof require === 'undefined') {
             // Estamos no Canvas (ou ambiente sem require), a conexão é apenas o mock, o que é suficiente para compilar.
             // Manter isSupabaseReady como false, mas remover o erro fatal.
             console.info("Status: Cliente Supabase mockado para visualização Canvas.");
        } else {
             // Em um ambiente Vercel/Node, o require funcionaria, definindo como true.
             setIsSupabaseReady(true);
             console.info("Status: Cliente Supabase REAL carregado.");
        }
    } else {
        setError("As chaves do Supabase não estão definidas.");
    }
  }, []);

  // 2. Função para carregar leads
  const fetchLeads = useCallback(async () => {
    // Não precisa mais do 'if (!isSupabaseReady) return;' pois o mock já está no 'supabase'

    setIsLoading(true);
    // Chamada REAL (ou MOCK) ao Supabase
    const { data, error } = await supabase
      .from('crm_monarca_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.message.indexOf("MOCK") === -1) {
      console.error("Erro ao carregar leads do Supabase:", error);
      setError(`Erro ao carregar dados: ${error.message}. Verifique as permissões de RLS.`);
      setLeads([]);
    } else if (error && error.message.indexOf("MOCK") !== -1) {
      // Se for o erro do mock, apenas exibe a mensagem de aviso e limpa leads, 
      // ou mantém o lead de erro (id 9999)
      setError(`AVISO: ${error.message}`);
      setLeads(data); // Deixa o mock de erro (id 9999) na lista
    } else {
      setLeads(data);
      setError('');
    }
    setIsLoading(false);
  }, []);
  
  // 3. Efeito para buscar leads na inicialização
  useEffect(() => {
    fetchLeads();
    // AVISO: Para produção, considere usar o Supabase Realtime para updates automáticos, 
    // em vez de setInterval, ou confie apenas no refetch após ações.
  }, [fetchLeads]); 

  // Agrupamento dos leads por estágio para as colunas Kanban
  const leadsByStage = useMemo(() => {
    const groups = {};
    Object.keys(STAGES).forEach(key => {
        groups[key] = [];
    });
    leads.forEach(lead => {
        // Garante que o estágio é válido, caso contrário, usa 'Visitante'
        const stageKey = lead.stage && STAGES[lead.stage] ? lead.stage : 'Visitante';
        groups[stageKey].push(lead);
    });
    return groups;
  }, [leads]);
  
  // --- Funções de Manipulação de Dados (AGORA COM SUPABASE REAL OU MOCK) ---
  
  const handleCreateLead = useCallback(async (leadData) => {
    // Chamada REAL (ou MOCK)
    const { data, error } = await supabase
        .from('crm_monarca_leads')
        .insert({
            name: leadData.name, 
            responsible_name: leadData.responsible_name, 
            email: leadData.email,
            phone: leadData.phone,
            chatwoot_id: leadData.chatwoot_id, 
            source: leadData.source,
            stage: STAGES.Lead.name, // Novo lead manual já entra como Lead
            // created_at e updated_at são preenchidos por default no Supabase
        })
        .select() 
        .single(); 

    if (error && error.message.indexOf("MOCK") === -1) {
        throw new Error(`Supabase Insert Error: ${error.message}`);
    }
    
    // Se for mock, apenas loga e atualiza localmente (o fetchLeads no final fará isso)
    if (error && error.message.indexOf("MOCK") !== -1) {
        console.warn(error.message);
    }

    logN8nFlow('Criação de Lead - Supabase (ou Mock)', data); 
    fetchLeads(); // Atualiza a lista após a inserção

  }, [fetchLeads]);

  const handleUpdateStage = useCallback(async (leadId, newStage) => {

    // Update no Supabase REAL (ou MOCK)
    const { data, error } = await supabase
        .from('crm_monarca_leads')
        .update({ 
            stage: newStage,
            updated_at: new Date().toISOString() // Atualiza o timestamp
        })
        .eq('id', leadId) // Condição WHERE
        .select() 
        .single(); 

    if (error && error.message.indexOf("MOCK") === -1) {
        console.error("Erro ao atualizar estágio no Supabase:", error);
        setError(`Falha ao atualizar estágio: ${error.message}`);
    } else {
        // Se for mock, apenas loga a operação simulada
        if (error && error.message.indexOf("MOCK") !== -1) {
            console.warn(error.message);
        }
        logN8nFlow(`Estágio Atualizado via Drag-and-Drop (Supabase ou Mock)`, data);
        fetchLeads(); // Atualiza a lista após o update
    }

  }, [fetchLeads]);
  
  // --- Funções de Manipulação Kanban (Drag and Drop) ---
  
  const handleDragStart = (e, leadId) => {
      setDraggedLeadId(leadId);
      e.dataTransfer.setData("leadId", leadId);
      e.currentTarget.classList.add('opacity-50', 'shadow-2xl');
  };

  const handleDragEnd = (e) => {
      e.currentTarget.classList.remove('opacity-50', 'shadow-2xl');
      setDraggedLeadId(null);
  };

  const handleDragOver = (e) => {
      e.preventDefault();
      e.currentTarget.classList.add('border-orange-500', 'border-4');
  };

  const handleDragLeave = (e) => {
      e.currentTarget.classList.remove('border-orange-500', 'border-4');
  };

  const handleDrop = (e, targetStage) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-orange-500', 'border-4');
      
      const leadId = e.dataTransfer.getData("leadId");
      // O ID do lead vem como string do dataTransfer, Supabase aceita string ou number.
      const numericLeadId = parseInt(leadId, 10);
      
      if (numericLeadId) {
          handleUpdateStage(numericLeadId, targetStage);
      }
      setDraggedLeadId(null);
  };
  
  // Exibição de Erro e Loading
  if (error && error.indexOf("MOCK") === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
        <div className="bg-red-900 border border-red-400 text-red-100 px-4 py-3 rounded-xl shadow-lg max-w-lg">
          <strong className="font-bold">Erro Fatal:</strong>
          <span className="block sm:inline"> {error}</span>
          <p className="text-sm mt-2">Verifique a console para detalhes. Para o ambiente Vercel/Produção, a solução é garantir que o `@supabase/supabase-js` esteja no seu `package.json`.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8 font-sans text-gray-100">
      
      <header className="mb-6 border-b border-gray-700 pb-4 flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-extrabold text-orange-400 flex items-center">
              <Briefcase className="w-8 h-8 mr-3 text-orange-500" />
              CRM Monarca
            </h1>
            <p className="text-gray-400 mt-1">Funil de Vendas e Controle de Clientes (Conectado ao Supabase REAL ou Mock).</p>
            <span className='ml-1 text-xs font-mono text-gray-500'>User ID (Simulado): {mockUserId}</span>
        </div>
        
        <button
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="flex items-center py-2.5 px-5 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150 disabled:bg-gray-600 disabled:text-gray-400 whitespace-nowrap"
        >
            <PlusCircle className="w-5 h-5 mr-2" />
            Novo Lead Manual
        </button>
      </header>
      
      {/* ALERTA DE PRODUÇÃO E MOCK */}
      <div className="mb-4 p-4 bg-yellow-900 text-yellow-300 rounded-xl flex items-start space-x-2 border border-yellow-700">
        <Zap className="w-5 h-5 flex-shrink-0 mt-1" />
        <div>
          <strong className="font-bold">MODO PREVIEW:</strong>
          <p className="text-sm">O cliente Supabase está **mockado** para que esta pré-visualização funcione. As chamadas ao banco de dados são simuladas (verifique o console).</p>
          <p className="text-xs mt-1 text-yellow-400">Em produção (Vercel), o código fará chamadas reais ao Supabase, como planejado.</p>
        </div>
      </div>
      {/* FIM DO ALERTA */}


      {/* Indicadores de Status */}
      {isLoading && (
          <div className="mb-4 p-4 bg-orange-900 text-orange-300 rounded-xl flex items-center justify-center space-x-2 border border-orange-700">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Carregando dados...</span>
          </div>
        )}
      
      {error && error.indexOf("MOCK") !== -1 && (
        <div className="mb-4 p-4 bg-red-900 text-red-300 rounded-xl text-sm border border-red-700">
            <strong className="font-bold">Erro de MOCK:</strong> {error}
        </div>
      )}

      
      {/* Colunas Kanban (Funil de Vendas em Tela Cheia) */}
      <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center">
        <Search className="w-5 h-5 mr-2" />
        Funil de Vendas Kanban
      </h2>

      <div className="mt-4 flex space-x-4 overflow-x-auto pb-4">
        
        {Object.keys(STAGES).map(stageKey => {
          const stage = STAGES[stageKey];
          const columnLeads = leadsByStage[stageKey];

          return (
            <div 
              key={stage.id} 
              className={`flex-shrink-0 w-full md:w-[320px] h-full rounded-xl border-2 border-transparent transition-all duration-200 kanban-column`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stageKey)}
              onDragLeave={handleDragLeave}
              style={{ minHeight: '400px' }} 
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3 rounded-t-xl sticky top-0 z-10 ${stage.headerBg} border-b-2 border-orange-500/50`}>
                <h3 className="text-lg font-semibold flex items-center text-white">
                  <stage.icon className="w-5 h-5 mr-2" />
                  {stage.name} <span className="ml-2 text-sm font-normal text-gray-400">({columnLeads.length})</span>
                </h3>
              </div>
              
              {/* Container de Cards */}
              <div className="space-y-4 p-3 bg-gray-900/50 rounded-b-xl h-full min-h-[300px]">
                  {columnLeads.map(lead => (
                      <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          onDragStart={handleDragStart} 
                          onDragEnd={handleDragEnd} 
                      />
                  ))}
                  {/* Placeholder para coluna vazia */}
                  {columnLeads.length === 0 && (
                      <div className="text-gray-500 text-center p-8 border-dashed border-2 border-gray-700 rounded-lg">
                          Arraste leads para {stage.name}
                      </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de Cadastro */}
      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateLead}
        isSupabaseReady={isSupabaseReady} // Sempre false no Canvas, o mock gerencia o salvamento
      />
    </div>
  );
};

export default App;
