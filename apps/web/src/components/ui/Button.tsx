import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
}

const BASE_CLASSES =
  "w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-mocha-base transition-all duration-500 ease-in-out-expo hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Botão de ação principal reutilizável, com estado de carregamento acessível
 * (aria-busy + spinner) já embutido.
 */
export function Button({
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      aria-busy={loading}
      disabled={disabled || loading}
      className={`${BASE_CLASSES} ${className ?? ""}`}
      {...buttonProps}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {loadingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
