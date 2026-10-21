-- Baseline do schema public (pg_dump --schema-only --no-owner --no-privileges).
-- Banco existente: o runner marca este arquivo como aplicado sem executá-lo.

--
-- Name: alerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerta (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    tipo character varying(100) NOT NULL,
    descricao text,
    resolvido boolean DEFAULT false,
    gerado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alerta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerta_id_seq OWNED BY public.alerta.id;


--
-- Name: anotacao_clinica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anotacao_clinica (
    id integer NOT NULL,
    psicologo_id integer NOT NULL,
    paciente_id integer NOT NULL,
    conteudo text NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expira_em timestamp without time zone
);


--
-- Name: anotacao_clinica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.anotacao_clinica_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: anotacao_clinica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.anotacao_clinica_id_seq OWNED BY public.anotacao_clinica.id;


--
-- Name: aplicacao_escala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aplicacao_escala (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    psicologo_id integer NOT NULL,
    escala_id integer NOT NULL,
    status character varying(50) DEFAULT 'pendente'::character varying,
    solicitado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    respondido_em timestamp without time zone
);


--
-- Name: aplicacao_escala_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aplicacao_escala_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aplicacao_escala_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aplicacao_escala_id_seq OWNED BY public.aplicacao_escala.id;


--
-- Name: checkin_diario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkin_diario (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    emocao_predominante text,
    intensidade_humor integer,
    intensidade_ansiedade integer,
    horas_sono numeric(4,2),
    qualidade_sono integer,
    contexto_gatilho text,
    diario_livre text,
    diario_compartilhado boolean DEFAULT false,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT checkin_diario_intensidade_ansiedade_check CHECK (((intensidade_ansiedade >= 1) AND (intensidade_ansiedade <= 10))),
    CONSTRAINT checkin_diario_intensidade_humor_check CHECK (((intensidade_humor >= 1) AND (intensidade_humor <= 10))),
    CONSTRAINT checkin_diario_qualidade_sono_check CHECK (((qualidade_sono >= 1) AND (qualidade_sono <= 10)))
);

ALTER TABLE ONLY public.checkin_diario FORCE ROW LEVEL SECURITY;


--
-- Name: checkin_diario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkin_diario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkin_diario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkin_diario_id_seq OWNED BY public.checkin_diario.id;


--
-- Name: consentimento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consentimento (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    compartilha_humor boolean DEFAULT false,
    compartilha_habitos boolean DEFAULT false,
    compartilha_escalas boolean DEFAULT false,
    compartilha_diario boolean DEFAULT false,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: consentimento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consentimento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consentimento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consentimento_id_seq OWNED BY public.consentimento.id;


--
-- Name: escala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escala (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    total_questoes integer NOT NULL,
    validacao_ref text
);


--
-- Name: escala_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.escala_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: escala_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.escala_id_seq OWNED BY public.escala.id;


--
-- Name: habito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habito (
    id integer NOT NULL,
    checkin_id integer NOT NULL,
    exercicio boolean DEFAULT false,
    meditacao boolean DEFAULT false,
    medicacao boolean DEFAULT false
);


--
-- Name: habito_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.habito_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: habito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.habito_id_seq OWNED BY public.habito.id;


--
-- Name: mensagem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensagem (
    id integer NOT NULL,
    vinculo_id integer NOT NULL,
    remetente_id integer NOT NULL,
    conteudo_cifrado text NOT NULL,
    enviado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    lida boolean DEFAULT false
);


--
-- Name: mensagem_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mensagem_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mensagem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mensagem_id_seq OWNED BY public.mensagem.id;


--
-- Name: paciente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paciente (
    id integer NOT NULL,
    user_id integer NOT NULL,
    data_nasc date,
    telefone character varying(20)
);


--
-- Name: paciente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paciente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paciente_id_seq OWNED BY public.paciente.id;


--
-- Name: psicologo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psicologo (
    id integer NOT NULL,
    user_id integer NOT NULL,
    crp character varying(50) NOT NULL,
    especialidade character varying(255),
    marketplace_ativo boolean DEFAULT false
);


--
-- Name: psicologo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.psicologo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: psicologo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.psicologo_id_seq OWNED BY public.psicologo.id;


--
-- Name: resposta_escala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resposta_escala (
    id integer NOT NULL,
    aplicacao_id integer NOT NULL,
    numero_questao integer NOT NULL,
    valor_resposta integer NOT NULL
);


--
-- Name: resposta_escala_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resposta_escala_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resposta_escala_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resposta_escala_id_seq OWNED BY public.resposta_escala.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    data_nascimento date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email_verificado boolean DEFAULT false NOT NULL,
    sessao_invalidada_em timestamp with time zone,
    tentativas_falhas integer DEFAULT 0,
    bloqueio_acesso timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: verificacoes_email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verificacoes_email (
    email text NOT NULL,
    codigo_hash text NOT NULL,
    expira_em timestamp with time zone NOT NULL,
    tentativas integer DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vinculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vinculo (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    psicologo_id integer NOT NULL,
    codigo_unico character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pendente'::character varying,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vinculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vinculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vinculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vinculo_id_seq OWNED BY public.vinculo.id;


--
-- Name: alerta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta ALTER COLUMN id SET DEFAULT nextval('public.alerta_id_seq'::regclass);


--
-- Name: anotacao_clinica id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anotacao_clinica ALTER COLUMN id SET DEFAULT nextval('public.anotacao_clinica_id_seq'::regclass);


--
-- Name: aplicacao_escala id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacao_escala ALTER COLUMN id SET DEFAULT nextval('public.aplicacao_escala_id_seq'::regclass);


--
-- Name: checkin_diario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_diario ALTER COLUMN id SET DEFAULT nextval('public.checkin_diario_id_seq'::regclass);


--
-- Name: consentimento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimento ALTER COLUMN id SET DEFAULT nextval('public.consentimento_id_seq'::regclass);


--
-- Name: escala id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escala ALTER COLUMN id SET DEFAULT nextval('public.escala_id_seq'::regclass);


--
-- Name: habito id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habito ALTER COLUMN id SET DEFAULT nextval('public.habito_id_seq'::regclass);


--
-- Name: mensagem id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagem ALTER COLUMN id SET DEFAULT nextval('public.mensagem_id_seq'::regclass);


--
-- Name: paciente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente ALTER COLUMN id SET DEFAULT nextval('public.paciente_id_seq'::regclass);


--
-- Name: psicologo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psicologo ALTER COLUMN id SET DEFAULT nextval('public.psicologo_id_seq'::regclass);


--
-- Name: resposta_escala id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resposta_escala ALTER COLUMN id SET DEFAULT nextval('public.resposta_escala_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vinculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo ALTER COLUMN id SET DEFAULT nextval('public.vinculo_id_seq'::regclass);


--
-- Name: alerta alerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_pkey PRIMARY KEY (id);


--
-- Name: anotacao_clinica anotacao_clinica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anotacao_clinica
    ADD CONSTRAINT anotacao_clinica_pkey PRIMARY KEY (id);


--
-- Name: aplicacao_escala aplicacao_escala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacao_escala
    ADD CONSTRAINT aplicacao_escala_pkey PRIMARY KEY (id);


--
-- Name: checkin_diario checkin_diario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_diario
    ADD CONSTRAINT checkin_diario_pkey PRIMARY KEY (id);


--
-- Name: consentimento consentimento_paciente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimento
    ADD CONSTRAINT consentimento_paciente_id_key UNIQUE (paciente_id);


--
-- Name: consentimento consentimento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimento
    ADD CONSTRAINT consentimento_pkey PRIMARY KEY (id);


--
-- Name: escala escala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escala
    ADD CONSTRAINT escala_pkey PRIMARY KEY (id);


--
-- Name: habito habito_checkin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habito
    ADD CONSTRAINT habito_checkin_id_key UNIQUE (checkin_id);


--
-- Name: habito habito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habito
    ADD CONSTRAINT habito_pkey PRIMARY KEY (id);


--
-- Name: mensagem mensagem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT mensagem_pkey PRIMARY KEY (id);


--
-- Name: paciente paciente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente
    ADD CONSTRAINT paciente_pkey PRIMARY KEY (id);


--
-- Name: paciente paciente_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente
    ADD CONSTRAINT paciente_user_id_key UNIQUE (user_id);


--
-- Name: psicologo psicologo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psicologo
    ADD CONSTRAINT psicologo_pkey PRIMARY KEY (id);


--
-- Name: psicologo psicologo_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psicologo
    ADD CONSTRAINT psicologo_user_id_key UNIQUE (user_id);


--
-- Name: resposta_escala resposta_escala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resposta_escala
    ADD CONSTRAINT resposta_escala_pkey PRIMARY KEY (id);


--
-- Name: resposta_escala uk_aplicacao_questao; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resposta_escala
    ADD CONSTRAINT uk_aplicacao_questao UNIQUE (aplicacao_id, numero_questao);


--
-- Name: checkin_diario uk_paciente_data; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_diario
    ADD CONSTRAINT uk_paciente_data UNIQUE (paciente_id, data);


--
-- Name: vinculo uk_paciente_psicologo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo
    ADD CONSTRAINT uk_paciente_psicologo UNIQUE (paciente_id, psicologo_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verificacoes_email verificacoes_email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificacoes_email
    ADD CONSTRAINT verificacoes_email_pkey PRIMARY KEY (email);


--
-- Name: vinculo vinculo_codigo_unico_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo
    ADD CONSTRAINT vinculo_codigo_unico_key UNIQUE (codigo_unico);


--
-- Name: vinculo vinculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo
    ADD CONSTRAINT vinculo_pkey PRIMARY KEY (id);


--
-- Name: idx_checkin_paciente_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkin_paciente_data ON public.checkin_diario USING btree (paciente_id, data);


--
-- Name: idx_mensagem_vinculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mensagem_vinculo ON public.mensagem USING btree (vinculo_id);


--
-- Name: idx_paciente_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paciente_user ON public.paciente USING btree (user_id);


--
-- Name: idx_psicologo_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psicologo_user ON public.psicologo USING btree (user_id);


--
-- Name: alerta fk_alerta_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT fk_alerta_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: anotacao_clinica fk_anotacao_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anotacao_clinica
    ADD CONSTRAINT fk_anotacao_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: anotacao_clinica fk_anotacao_psicologo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anotacao_clinica
    ADD CONSTRAINT fk_anotacao_psicologo FOREIGN KEY (psicologo_id) REFERENCES public.psicologo(id) ON DELETE CASCADE;


--
-- Name: aplicacao_escala fk_aplicacao_escala; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacao_escala
    ADD CONSTRAINT fk_aplicacao_escala FOREIGN KEY (escala_id) REFERENCES public.escala(id) ON DELETE CASCADE;


--
-- Name: aplicacao_escala fk_aplicacao_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacao_escala
    ADD CONSTRAINT fk_aplicacao_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: aplicacao_escala fk_aplicacao_psicologo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacao_escala
    ADD CONSTRAINT fk_aplicacao_psicologo FOREIGN KEY (psicologo_id) REFERENCES public.psicologo(id) ON DELETE CASCADE;


--
-- Name: checkin_diario fk_checkin_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_diario
    ADD CONSTRAINT fk_checkin_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: consentimento fk_consentimento_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimento
    ADD CONSTRAINT fk_consentimento_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: habito fk_habito_checkin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habito
    ADD CONSTRAINT fk_habito_checkin FOREIGN KEY (checkin_id) REFERENCES public.checkin_diario(id) ON DELETE CASCADE;


--
-- Name: mensagem fk_mensagem_remetente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT fk_mensagem_remetente FOREIGN KEY (remetente_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mensagem fk_mensagem_vinculo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT fk_mensagem_vinculo FOREIGN KEY (vinculo_id) REFERENCES public.vinculo(id) ON DELETE CASCADE;


--
-- Name: paciente fk_paciente_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente
    ADD CONSTRAINT fk_paciente_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: psicologo fk_psicologo_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psicologo
    ADD CONSTRAINT fk_psicologo_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resposta_escala fk_resposta_aplicacao; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resposta_escala
    ADD CONSTRAINT fk_resposta_aplicacao FOREIGN KEY (aplicacao_id) REFERENCES public.aplicacao_escala(id) ON DELETE CASCADE;


--
-- Name: vinculo fk_vinculo_paciente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo
    ADD CONSTRAINT fk_vinculo_paciente FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;


--
-- Name: vinculo fk_vinculo_psicologo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo
    ADD CONSTRAINT fk_vinculo_psicologo FOREIGN KEY (psicologo_id) REFERENCES public.psicologo(id) ON DELETE CASCADE;


--
-- Name: verificacoes_email verificacoes_email_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificacoes_email
    ADD CONSTRAINT verificacoes_email_email_fkey FOREIGN KEY (email) REFERENCES public.users(email) ON DELETE CASCADE;


--
-- Name: checkin_diario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkin_diario ENABLE ROW LEVEL SECURITY;

--
-- Name: checkin_diario checkin_isolamento_paciente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checkin_isolamento_paciente ON public.checkin_diario USING ((paciente_id = (NULLIF(current_setting('app.paciente_id'::text, true), ''::text))::integer)) WITH CHECK ((paciente_id = (NULLIF(current_setting('app.paciente_id'::text, true), ''::text))::integer));

