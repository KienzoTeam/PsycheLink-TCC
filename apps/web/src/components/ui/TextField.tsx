const SMOOTH_EASE = "ease-in-out-expo";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

/**
 * Input de formulário reutilizável com label, estado de erro acessível
 * (aria-invalid + aria-describedby) e o estilo visual padrão do PsycheLink.
 */
export function TextField({ id, label, error, className, ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-subtext">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-xl bg-surface px-4 py-2.5 text-text outline-none transition-all duration-500 ${SMOOTH_EASE} placeholder:text-subtext/50 focus:ring-2 focus:ring-primary/40 ${
          error ? "ring-2 ring-mocha-red/40" : ""
        } ${className ?? ""}`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-mocha-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
