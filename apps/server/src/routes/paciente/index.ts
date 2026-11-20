import { Router } from 'express';
import { verificarToken } from '../auth';
import { consentimento } from './consentimento';
import { consultas } from './consultas';
import { conta } from './conta';
import { diario } from './diario';
import { escalas } from './escalas';
import { vinculo } from './vinculo';

/** Rotas do aplicativo mobile do paciente (Bearer). */
export const paciente = Router();

paciente.use(verificarToken);
paciente.use('/vinculo', vinculo);
paciente.use('/consentimento', consentimento);
paciente.use(escalas);
paciente.use('/consultas', consultas);
paciente.use('/conta', conta);
paciente.use('/diario', diario);
