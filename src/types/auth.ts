
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  googleId?: string | null;
  avatar?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: Date;
  password?: string | null; 
}
