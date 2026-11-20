import { Router } from 'express';
import { verificarToken } from '../auth';
import { consentimento } from './consentimento';
import { consultas } from './consultas';
import { recomendacoes } from './recomendacoes';
import { sos } from './sos';
import { conta } from './conta';
import { diario } from './diario';
import { escalas } from './escalas';
import { push } from './push';
import { vinculo } from './vinculo';

/** Rotas do aplicativo mobile do paciente (Bearer). */
export const paciente = Router();

paciente.use(verificarToken);
paciente.use('/vinculo', vinculo);
paciente.use('/consentimento', consentimento);
paciente.use(escalas);
paciente.use('/consultas', consultas);
paciente.use('/recomendacoes', recomendacoes);
paciente.use('/sos', sos);
paciente.use('/conta', conta);
paciente.use('/diario', diario);
paciente.use('/push', push);
