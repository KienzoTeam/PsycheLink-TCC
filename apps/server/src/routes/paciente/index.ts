import { Router } from 'express';
import { verificarToken } from '../auth';
import { consentimento } from './consentimento';
import { vinculo } from './vinculo';

/** Rotas do aplicativo mobile do paciente (Bearer). */
export const paciente = Router();

paciente.use(verificarToken);
paciente.use('/vinculo', vinculo);
paciente.use('/consentimento', consentimento);
