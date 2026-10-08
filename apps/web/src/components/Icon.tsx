type IconName =
  | 'inicio' | 'pacientes' | 'checkins' | 'chats' | 'relatorios'
  | 'escalas' | 'calendario' | 'vinculo' | 'auditoria';

const PATHS: Record<IconName, React.ReactNode> = {
  inicio: (<><path d="M3 12l9-9 9 9" /><path d="M5 10v10h5v-6h4v6h5V10" /></>),
  pacientes: (<><circle cx="9" cy="7" r="3" /><path d="M2 21v-2a5 5 0 015-5h4a5 5 0 015 5v2" /><circle cx="17" cy="8" r="2.5" /></>),
  checkins: (<path d="M5 13l4 4L19 7" />),
  chats: (<path d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.5 0-3-.4-4.2-1L3 20l1.1-5.3A8.5 8.5 0 1121 11.5z" />),
  relatorios: (<><path d="M5 20v-8M11 20V4M17 20v-5" /><path d="M3 20h18" /></>),
  escalas: (<><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /></>),
  calendario: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  vinculo: (<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5" />),
  auditoria: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>),
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
