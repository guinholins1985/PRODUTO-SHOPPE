
import React, { useState, useEffect } from 'react';
import LockIcon from './icons/LockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import CheckIcon from './icons/CheckIcon';
import { ApiKeySet, SupportedAIService } from '../types';

interface AdminPanelProps {
  onBackToApp: () => void;
}

// Configuration for supported AI services
const SUPPORTED_SERVICES: { id: SupportedAIService; name: string }[] = [
  { id: 'gemini', name: 'Google Gemini' },
  // Future services can be added here, e.g.:
  // { id: 'openai', name: 'OpenAI' },
  // { id: 'anthropic', name: 'Anthropic' },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<ApiKeySet>({});
  const [selectedService, setSelectedService] = useState<SupportedAIService>(SUPPORTED_SERVICES[0].id);
  const [currentKeyValue, setCurrentKeyValue] = useState('');
  
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadKeysFromStorage = () => {
    try {
      const storedKeys = localStorage.getItem('ai_api_keys');
      return storedKeys ? JSON.parse(storedKeys) : {};
    } catch (e) {
      console.error("Could not parse API keys from storage:", e);
      return {};
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
      setIsLoggedIn(true);
      const allKeys = loadKeysFromStorage();
      setApiKeys(allKeys);
      setCurrentKeyValue(allKeys[selectedService] || '');
    }
  }, []);

  useEffect(() => {
    // Update the textarea when the selected service changes
    setCurrentKeyValue(apiKeys[selectedService] || '');
  }, [selectedService, apiKeys]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username === 'ad' && password === 'a12') {
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      setIsLoggedIn(true);
      const allKeys = loadKeysFromStorage();
      setApiKeys(allKeys);
      setCurrentKeyValue(allKeys[selectedService] || '');
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const handleSaveKeys = () => {
    setError('');
    setSaveStatus('saving');
    try {
      const trimmedKey = currentKeyValue.trim();
      if (!trimmedKey) {
        throw new Error(`A chave de API para ${SUPPORTED_SERVICES.find(s => s.id === selectedService)?.name} não pode estar vazia.`);
      }
      
      const updatedKeys = {
        ...apiKeys,
        [selectedService]: trimmedKey,
      };

      localStorage.setItem('ai_api_keys', JSON.stringify(updatedKeys));
      setApiKeys(updatedKeys);
      setCurrentKeyValue(trimmedKey);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);

    } catch (err) {
      console.error("Failed to save API key:", err);
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a chave. O armazenamento local pode estar desativado ou cheio.';
      setError(message);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getButtonClass = () => {
    switch (saveStatus) {
        case 'saving': return 'bg-indigo-400 cursor-not-allowed';
        case 'saved': return 'bg-green-600';
        case 'error': return 'bg-red-600 hover:bg-red-700';
        case 'idle': default: return 'bg-indigo-600 hover:bg-indigo-700';
    }
  };
  
  const getButtonContent = () => {
    switch(saveStatus) {
        case 'saving':
            return ( <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Salvando...</> );
        case 'saved':
            return ( <> <CheckIcon className="w-5 h-5" /> Chave Implantada! </> );
        case 'error':
            return 'Tente Novamente';
        case 'idle':
        default:
            return 'Salvar e Implantar Chave';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in-up">
        <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 backdrop-blur-sm">
          <div className="text-center mb-6">
            <LockIcon className="w-12 h-12 mx-auto text-indigo-400" />
            <h2 className="text-2xl font-bold mt-4">Acesso Restrito</h2>
            <p className="text-gray-400">Painel de Administração</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-2">Usuário</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" required />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-300" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-300">Entrar</button>
          </form>
          <div className="text-center mt-6">
            <button onClick={onBackToApp} className="text-sm text-indigo-400 hover:underline">Voltar para a aplicação</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Painel de Admin</h2>
            <button onClick={handleLogout} className="text-sm font-medium text-gray-400 hover:text-white transition">Sair</button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="apiService" className="block text-sm font-medium text-gray-400 mb-2">
              Selecione o Serviço de IA
            </label>
            <select
              id="apiService"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as SupportedAIService)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            >
              {SUPPORTED_SERVICES.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-400 mb-2">
              API Key para {SUPPORTED_SERVICES.find(s => s.id === selectedService)?.name}
            </label>
            <textarea
              id="apiKey"
              value={currentKeyValue}
              onChange={(e) => setCurrentKeyValue(e.target.value)}
              placeholder={`Cole sua chave de API do ${SUPPORTED_SERVICES.find(s => s.id === selectedService)?.name} aqui`}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-ne transition font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">As chaves são salvas no armazenamento local do seu navegador.</p>
          </div>
           {error && saveStatus === 'error' && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleSaveKeys}
            disabled={saveStatus === 'saving'}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-colors duration-300 ${getButtonClass()}`}
          >
            {getButtonContent()}
          </button>
        </div>
         <div className="text-center mt-6">
            <button onClick={onBackToApp} className="text-sm text-indigo-400 hover:underline">
              Voltar para a aplicação
            </button>
          </div>
      </div>
    </div>
  );
};

export default AdminPanel;
