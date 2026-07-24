export interface RevealProps {
  delay?: string;
  duration?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Aplica a animação de entrada padrão (`fadeSlideIn`) definida em index.css,
 * evitando repetir a mesma string de `style.animation` em cada campo do form.
 */
export function Reveal({ delay = "0s", duration = "0.5s", className, children }: RevealProps) {
  return (
    <div
      className={className}
      style={{ animation: `fadeSlideIn ${duration} var(--ease-in-out-expo) ${delay} both` }}
    >
      {children}
    </div>
  );
}
