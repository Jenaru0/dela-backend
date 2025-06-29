import { Request } from 'express';

export interface PeticionAutenticada extends Request {
  user: {
    id: number;
    email: string;
    tipoUsuario: 'CLIENTE' | 'ADMIN';
    sub?: number;
  };
}
