// TODO(api): quando o backend existir, este arquivo deve vir de `packages/shared/src/types/user.ts`
// e ser importado como `@psychelink/shared` (ou caminho equivalente do monorepo).

export type UserRole = "paciente" | "psicologo";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
