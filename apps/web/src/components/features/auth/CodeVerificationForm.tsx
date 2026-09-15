import React, { useState } from 'react';
import { api } from '../../../services/api';
import { TextField } from '../../ui/TextField';
import { Button } from '../../ui/Button';

interface CodeVerificationFormProps {
  email: string;
  onBack: () => void;
}

export const CodeVerificationForm: React.FC<CodeVerificationFormProps> = ({ email, onBack }) => {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/verificar-email', { email, codigo: Number(codigo) });
      setSuccessMsg('E-mail verificado com sucesso! Redirecionando...');
      
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api.post('/reenviar-codigo', { email });
      setSuccessMsg('Um novo código foi enviado para o seu e-mail.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao reenviar código.');
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-slate-400">
          Enviamos um código de 6 dígitos para o e-mail:
        </p>
        <span className="text-sm font-semibold text-teal-400">{email}</span>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      <TextField
        id="codigo"
        label="Código de Verificação"
        type="text"
        required
        placeholder="123456"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />

      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? 'Verificando...' : 'Confirmar Código'}
      </Button>

      <div className="flex justify-between items-center text-sm mt-4">
        <button
          type="button"
          onClick={handleResend}
          className="text-slate-400 hover:text-white transition-colors"
        >
          Reenviar código
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-teal-400 hover:underline"
        >
          Voltar
        </button>
      </div>
    </form>
  );
};