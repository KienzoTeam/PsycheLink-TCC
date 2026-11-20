export type AcaoDeContato = {
  chave: 'ligar' | 'whatsapp' | 'email';
  rotulo: string;
  icone: 'phone' | 'message-circle' | 'mail';
  /** Texto lido pelo leitor de tela; leva o contato para o botão não ficar solto. */
  descricao: string;
  url: string;
};

// Sem "?" nem "#": o endereço não pode carregar parâmetros extras no mailto.
const EMAIL = /^[\w.+'-]+@[\w-]+(\.[\w-]+)+$/;
// O campo é texto livre. Só vira ação quando o contato inteiro é um telefone ou um e-mail.
const TELEFONE = /^\+?[\d\s().-]+$/;

/** Ações do contato do psicólogo; vazio quando o texto não é só telefone nem só e-mail. */
export function acoesDoContato(contato: string): AcaoDeContato[] {
  const valor = contato.trim();

  if (EMAIL.test(valor)) {
    return [{ chave: 'email', rotulo: 'E-mail', icone: 'mail', descricao: `Enviar e-mail para ${valor}`, url: `mailto:${valor}` }];
  }

  const digitos = valor.replace(/\D/g, '');
  if (!TELEFONE.test(valor) || digitos.length < 10 || digitos.length > 13) return [];

  // wa.me exige o código do país; sem "+" e com DDD + número, assume Brasil (como no SOS).
  const comPais = !valor.startsWith('+') && digitos.length <= 11 ? `55${digitos}` : digitos;
  return [
    { chave: 'ligar', rotulo: 'Ligar', icone: 'phone', descricao: `Ligar para ${valor}`, url: `tel:${valor.startsWith('+') ? '+' : ''}${digitos}` },
    { chave: 'whatsapp', rotulo: 'WhatsApp', icone: 'message-circle', descricao: `Abrir conversa no WhatsApp com ${valor}`, url: `https://wa.me/${comPais}` },
  ];
}
