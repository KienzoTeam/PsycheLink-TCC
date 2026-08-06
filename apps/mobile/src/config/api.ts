const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

function removeTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

export function getApiBaseUrl(): string {
  if (!rawApiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL não foi configurada. Informe a URL HTTPS pública da API.');
  }

  try {
    const parsed = new URL(rawApiBaseUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Protocolo inválido.');
    }
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL precisa ser uma URL absoluta válida.');
  }

  return removeTrailingSlashes(rawApiBaseUrl);
}
