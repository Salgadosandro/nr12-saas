--
-- Migration 0001 — schema inicial (baseline)
--
-- Capturado do projeto Supabase "Portfolio NR12" via pg_dump 17.6
-- (schema-only, --schema=public, --no-owner, --no-privileges) em 2026-06-27.
-- Reproduz as 27 tabelas + funções + RLS + políticas. O trigger de signup
-- (em auth.users) está na migration 0002, por morar fora do schema public.
-- Linhas \restrict/\unrestrict do pg_dump (meta-comandos do psql) removidas
-- para permitir replay via `supabase db push`.
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;  -- já existe em todo projeto Supabase (removido p/ replay idempotente)


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: create_account(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_account(account_name text, account_cnpj text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_account_id uuid;
begin
  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'Usuario ja pertence a uma conta';
  end if;

  insert into accounts (name, cnpj) values (account_name, account_cnpj)
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  return v_account_id;
end;
$$;


--
-- Name: current_account_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_account_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select account_id from account_members where user_id = auth.uid() limit 1
$$;


--
-- Name: current_account_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_account_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select account_id from account_members where user_id = auth.uid()
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying DEFAULT 'owner'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_members_role_check CHECK (((role)::text = 'owner'::text))
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying DEFAULT 'engineer'::character varying NOT NULL,
    name character varying NOT NULL,
    data_sharing_consent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cnpj character varying,
    CONSTRAINT accounts_cnpj_check CHECK (((cnpj IS NULL) OR ((cnpj)::text ~ '^\d{14}$'::text))),
    CONSTRAINT accounts_type_check CHECK (((type)::text = ANY ((ARRAY['engineer'::character varying, 'company'::character varying])::text[])))
);


--
-- Name: action_plan_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_plan_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    action_plan_id uuid NOT NULL,
    storage_path character varying NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT action_plan_photos_position_check CHECK (("position" = ANY (ARRAY[1, 2, 3])))
);


--
-- Name: action_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    answer_id uuid NOT NULL,
    description text NOT NULL,
    responsible_name character varying,
    due_date date,
    status character varying DEFAULT 'pendente'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    verified_at timestamp with time zone,
    verified_by uuid,
    CONSTRAINT action_plans_status_check CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'verificado'::character varying])::text[]))),
    CONSTRAINT chk_action_plans_verified CHECK ((((status)::text = 'pendente'::text) OR (((status)::text = 'verificado'::text) AND (verified_at IS NOT NULL) AND (verified_by IS NOT NULL))))
);


--
-- Name: answer_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    answer_id uuid NOT NULL,
    storage_path character varying NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    CONSTRAINT answer_photos_position_check CHECK (("position" = ANY (ARRAY[1, 2, 3])))
);


--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_id uuid NOT NULL,
    checklist_template_item_id uuid NOT NULL,
    status character varying NOT NULL,
    justification text,
    probability character varying,
    severity character varying,
    risk_level character varying,
    measured_value numeric,
    measured_unit character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    CONSTRAINT answers_check CHECK (((((status)::text = 'non_compliant'::text) AND (justification IS NOT NULL) AND (probability IS NOT NULL) AND (severity IS NOT NULL) AND (risk_level IS NOT NULL)) OR ((status)::text <> 'non_compliant'::text))),
    CONSTRAINT answers_probability_check CHECK (((probability)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT answers_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT answers_severity_check CHECK (((severity)::text = ANY ((ARRAY['minor'::character varying, 'moderate'::character varying, 'major'::character varying])::text[]))),
    CONSTRAINT answers_status_check CHECK (((status)::text = ANY ((ARRAY['compliant'::character varying, 'non_compliant'::character varying, 'not_applicable'::character varying])::text[])))
);


--
-- Name: arts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    professional_id uuid NOT NULL,
    number character varying NOT NULL,
    issued_at date,
    pdf_path character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklist_template_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_template_section_id uuid NOT NULL,
    standard_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklist_template_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_template_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_template_id uuid NOT NULL,
    standard_section_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklist_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    standard_version_id uuid NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid NOT NULL,
    checklist_template_id uuid NOT NULL,
    valid_until date,
    status character varying,
    raw_whatsapp_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    inspection_id uuid NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    CONSTRAINT checklists_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    linked_account_id uuid,
    name character varying NOT NULL,
    cnpj character varying,
    contact_name character varying,
    contact_email character varying,
    contact_phone character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT clients_cnpj_check CHECK (((cnpj IS NULL) OR ((cnpj)::text ~ '^\d{14}$'::text)))
);


--
-- Name: inspection_scope; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_scope (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_id uuid NOT NULL,
    location_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid DEFAULT public.current_account_id() NOT NULL
);


--
-- Name: inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    responsible_professional_id uuid,
    art_id uuid,
    status character varying DEFAULT 'in_field'::character varying NOT NULL,
    performed_on date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    name character varying NOT NULL,
    sequence_number integer NOT NULL,
    CONSTRAINT inspections_status_check CHECK (((status)::text = ANY ((ARRAY['in_field'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: location_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    location_type_id uuid,
    name character varying NOT NULL,
    address character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying NOT NULL
);


--
-- Name: machine_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_type_id uuid NOT NULL,
    manufacturer character varying NOT NULL,
    model_code character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machine_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_model_id uuid NOT NULL,
    location_id uuid NOT NULL,
    tag character varying NOT NULL,
    serial_number character varying,
    manufacture_year integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying NOT NULL
);


--
-- Name: professionals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professionals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    member_id uuid,
    full_name character varying NOT NULL,
    crea character varying,
    title character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cpf character varying,
    CONSTRAINT professionals_cpf_check CHECK (((cpf IS NULL) OR ((cpf)::text ~ '^\d{11}$'::text)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name character varying NOT NULL,
    cpf character varying,
    phone character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_cpf_check CHECK (((cpf IS NULL) OR ((cpf)::text ~ '^\d{11}$'::text)))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_id uuid NOT NULL,
    report_number character varying,
    issued_at date,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    ai_generated_text text,
    final_text text,
    pdf_path character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    account_id uuid DEFAULT public.current_account_id() NOT NULL,
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'in_review'::character varying, 'final'::character varying])::text[])))
);


--
-- Name: risk_matrix_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_matrix_rules (
    probability character varying NOT NULL,
    severity character varying NOT NULL,
    risk_level character varying NOT NULL,
    CONSTRAINT risk_matrix_rules_probability_check CHECK (((probability)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT risk_matrix_rules_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT risk_matrix_rules_severity_check CHECK (((severity)::text = ANY ((ARRAY['minor'::character varying, 'moderate'::character varying, 'major'::character varying])::text[])))
);


--
-- Name: standard_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standard_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    standard_section_id uuid NOT NULL,
    parent_item_id uuid,
    number character varying NOT NULL,
    text text NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: standard_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standard_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    standard_version_id uuid NOT NULL,
    section_type character varying NOT NULL,
    code character varying NOT NULL,
    title character varying NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT standard_sections_section_type_check CHECK (((section_type)::text = ANY ((ARRAY['module'::character varying, 'annex'::character varying])::text[])))
);


--
-- Name: standard_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standard_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    standard_id uuid NOT NULL,
    version_label character varying NOT NULL,
    source_portaria_number character varying,
    source_issuing_body character varying,
    source_signed_date date,
    source_dou_date date,
    source_url character varying,
    effective_from date,
    effective_until date,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT standard_versions_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'revoked'::character varying])::text[])))
);


--
-- Name: standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying NOT NULL,
    title character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account_members account_members_account_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_members
    ADD CONSTRAINT account_members_account_id_user_id_key UNIQUE (account_id, user_id);


--
-- Name: account_members account_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_members
    ADD CONSTRAINT account_members_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: action_plan_photos action_plan_photos_action_plan_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plan_photos
    ADD CONSTRAINT action_plan_photos_action_plan_id_position_key UNIQUE (action_plan_id, "position");


--
-- Name: action_plan_photos action_plan_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plan_photos
    ADD CONSTRAINT action_plan_photos_pkey PRIMARY KEY (id);


--
-- Name: action_plans action_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_pkey PRIMARY KEY (id);


--
-- Name: answer_photos answer_photos_answer_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_photos
    ADD CONSTRAINT answer_photos_answer_id_position_key UNIQUE (answer_id, "position");


--
-- Name: answer_photos answer_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_photos
    ADD CONSTRAINT answer_photos_pkey PRIMARY KEY (id);


--
-- Name: answers answers_checklist_id_checklist_template_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_checklist_id_checklist_template_item_id_key UNIQUE (checklist_id, checklist_template_item_id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: arts arts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arts
    ADD CONSTRAINT arts_pkey PRIMARY KEY (id);


--
-- Name: checklist_template_items checklist_template_items_checklist_template_section_id_stan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_items
    ADD CONSTRAINT checklist_template_items_checklist_template_section_id_stan_key UNIQUE (checklist_template_section_id, standard_item_id);


--
-- Name: checklist_template_items checklist_template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_items
    ADD CONSTRAINT checklist_template_items_pkey PRIMARY KEY (id);


--
-- Name: checklist_template_sections checklist_template_sections_checklist_template_id_standard__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_sections
    ADD CONSTRAINT checklist_template_sections_checklist_template_id_standard__key UNIQUE (checklist_template_id, standard_section_id);


--
-- Name: checklist_template_sections checklist_template_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_sections
    ADD CONSTRAINT checklist_template_sections_pkey PRIMARY KEY (id);


--
-- Name: checklist_templates checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: inspection_scope inspection_scope_inspection_id_location_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_scope
    ADD CONSTRAINT inspection_scope_inspection_id_location_id_key UNIQUE (inspection_id, location_id);


--
-- Name: inspection_scope inspection_scope_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_scope
    ADD CONSTRAINT inspection_scope_pkey PRIMARY KEY (id);


--
-- Name: inspections inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);


--
-- Name: location_types location_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_types
    ADD CONSTRAINT location_types_name_key UNIQUE (name);


--
-- Name: location_types location_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_types
    ADD CONSTRAINT location_types_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: machine_models machine_models_machine_type_id_manufacturer_model_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_models
    ADD CONSTRAINT machine_models_machine_type_id_manufacturer_model_code_key UNIQUE (machine_type_id, manufacturer, model_code);


--
-- Name: machine_models machine_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_models
    ADD CONSTRAINT machine_models_pkey PRIMARY KEY (id);


--
-- Name: machine_types machine_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_types
    ADD CONSTRAINT machine_types_name_key UNIQUE (name);


--
-- Name: machine_types machine_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_types
    ADD CONSTRAINT machine_types_pkey PRIMARY KEY (id);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: professionals professionals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT professionals_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: risk_matrix_rules risk_matrix_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_matrix_rules
    ADD CONSTRAINT risk_matrix_rules_pkey PRIMARY KEY (probability, severity);


--
-- Name: standard_items standard_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_items
    ADD CONSTRAINT standard_items_pkey PRIMARY KEY (id);


--
-- Name: standard_items standard_items_standard_section_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_items
    ADD CONSTRAINT standard_items_standard_section_id_number_key UNIQUE (standard_section_id, number);


--
-- Name: standard_sections standard_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_sections
    ADD CONSTRAINT standard_sections_pkey PRIMARY KEY (id);


--
-- Name: standard_sections standard_sections_standard_version_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_sections
    ADD CONSTRAINT standard_sections_standard_version_id_code_key UNIQUE (standard_version_id, code);


--
-- Name: standard_versions standard_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_versions
    ADD CONSTRAINT standard_versions_pkey PRIMARY KEY (id);


--
-- Name: standard_versions standard_versions_standard_id_version_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_versions
    ADD CONSTRAINT standard_versions_standard_id_version_label_key UNIQUE (standard_id, version_label);


--
-- Name: standards standards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standards
    ADD CONSTRAINT standards_code_key UNIQUE (code);


--
-- Name: standards standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standards
    ADD CONSTRAINT standards_pkey PRIMARY KEY (id);


--
-- Name: account_members uq_account_members_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_members
    ADD CONSTRAINT uq_account_members_user UNIQUE (user_id);


--
-- Name: accounts uq_accounts_cnpj; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT uq_accounts_cnpj UNIQUE (cnpj);


--
-- Name: action_plans uq_action_plans_answer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT uq_action_plans_answer UNIQUE (answer_id);


--
-- Name: arts uq_arts_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arts
    ADD CONSTRAINT uq_arts_number UNIQUE (number);


--
-- Name: checklists uq_checklists_inspection_machine_template; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT uq_checklists_inspection_machine_template UNIQUE (inspection_id, machine_id, checklist_template_id);


--
-- Name: clients uq_clients_account_cnpj; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT uq_clients_account_cnpj UNIQUE (account_id, cnpj);


--
-- Name: inspections uq_inspections_client_name_seq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT uq_inspections_client_name_seq UNIQUE (client_id, name, sequence_number);


--
-- Name: locations uq_locations_client_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT uq_locations_client_code UNIQUE (client_id, code);


--
-- Name: machines uq_machines_location_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT uq_machines_location_code UNIQUE (location_id, code);


--
-- Name: machines uq_machines_location_serial; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT uq_machines_location_serial UNIQUE (location_id, serial_number);


--
-- Name: professionals uq_professionals_account_crea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT uq_professionals_account_crea UNIQUE (account_id, crea);


--
-- Name: reports uq_reports_account_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT uq_reports_account_number UNIQUE (account_id, report_number);


--
-- Name: reports uq_reports_inspection; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT uq_reports_inspection UNIQUE (inspection_id);


--
-- Name: checklist_templates uq_template_account_version_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT uq_template_account_version_name UNIQUE (account_id, standard_version_id, name);


--
-- Name: action_plan_photos_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX action_plan_photos_account_id_idx ON public.action_plan_photos USING btree (account_id);


--
-- Name: action_plans_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX action_plans_account_id_idx ON public.action_plans USING btree (account_id);


--
-- Name: answer_photos_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX answer_photos_account_id_idx ON public.answer_photos USING btree (account_id);


--
-- Name: answers_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX answers_account_id_idx ON public.answers USING btree (account_id);


--
-- Name: checklists_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX checklists_account_id_idx ON public.checklists USING btree (account_id);


--
-- Name: inspection_scope_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inspection_scope_account_id_idx ON public.inspection_scope USING btree (account_id);


--
-- Name: inspections_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inspections_account_id_idx ON public.inspections USING btree (account_id);


--
-- Name: reports_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_account_id_idx ON public.reports USING btree (account_id);


--
-- Name: uq_one_owner_per_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_one_owner_per_account ON public.account_members USING btree (account_id) WHERE ((role)::text = 'owner'::text);


--
-- Name: account_members account_members_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_members
    ADD CONSTRAINT account_members_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_members account_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_members
    ADD CONSTRAINT account_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: action_plan_photos action_plan_photos_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plan_photos
    ADD CONSTRAINT action_plan_photos_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: action_plan_photos action_plan_photos_action_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plan_photos
    ADD CONSTRAINT action_plan_photos_action_plan_id_fkey FOREIGN KEY (action_plan_id) REFERENCES public.action_plans(id) ON DELETE CASCADE;


--
-- Name: action_plans action_plans_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: action_plans action_plans_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: action_plans action_plans_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: answer_photos answer_photos_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_photos
    ADD CONSTRAINT answer_photos_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: answer_photos answer_photos_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_photos
    ADD CONSTRAINT answer_photos_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: answers answers_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: answers answers_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;


--
-- Name: answers answers_checklist_template_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_checklist_template_item_id_fkey FOREIGN KEY (checklist_template_item_id) REFERENCES public.checklist_template_items(id);


--
-- Name: arts arts_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arts
    ADD CONSTRAINT arts_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.professionals(id);


--
-- Name: checklist_template_items checklist_template_items_checklist_template_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_items
    ADD CONSTRAINT checklist_template_items_checklist_template_section_id_fkey FOREIGN KEY (checklist_template_section_id) REFERENCES public.checklist_template_sections(id) ON DELETE CASCADE;


--
-- Name: checklist_template_items checklist_template_items_standard_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_items
    ADD CONSTRAINT checklist_template_items_standard_item_id_fkey FOREIGN KEY (standard_item_id) REFERENCES public.standard_items(id);


--
-- Name: checklist_template_sections checklist_template_sections_checklist_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_sections
    ADD CONSTRAINT checklist_template_sections_checklist_template_id_fkey FOREIGN KEY (checklist_template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE;


--
-- Name: checklist_template_sections checklist_template_sections_standard_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_template_sections
    ADD CONSTRAINT checklist_template_sections_standard_section_id_fkey FOREIGN KEY (standard_section_id) REFERENCES public.standard_sections(id);


--
-- Name: checklist_templates checklist_templates_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: checklist_templates checklist_templates_standard_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_standard_version_id_fkey FOREIGN KEY (standard_version_id) REFERENCES public.standard_versions(id);


--
-- Name: checklists checklists_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: checklists checklists_checklist_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_checklist_template_id_fkey FOREIGN KEY (checklist_template_id) REFERENCES public.checklist_templates(id);


--
-- Name: checklists checklists_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;


--
-- Name: checklists checklists_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: clients clients_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: clients clients_linked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_linked_account_id_fkey FOREIGN KEY (linked_account_id) REFERENCES public.accounts(id);


--
-- Name: inspection_scope inspection_scope_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_scope
    ADD CONSTRAINT inspection_scope_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: inspection_scope inspection_scope_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_scope
    ADD CONSTRAINT inspection_scope_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;


--
-- Name: inspection_scope inspection_scope_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_scope
    ADD CONSTRAINT inspection_scope_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: inspections inspections_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: inspections inspections_art_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_art_id_fkey FOREIGN KEY (art_id) REFERENCES public.arts(id);


--
-- Name: inspections inspections_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: inspections inspections_responsible_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_responsible_professional_id_fkey FOREIGN KEY (responsible_professional_id) REFERENCES public.professionals(id);


--
-- Name: locations locations_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: locations locations_location_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES public.location_types(id);


--
-- Name: machine_models machine_models_machine_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_models
    ADD CONSTRAINT machine_models_machine_type_id_fkey FOREIGN KEY (machine_type_id) REFERENCES public.machine_types(id);


--
-- Name: machines machines_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: machines machines_machine_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_model_id_fkey FOREIGN KEY (machine_model_id) REFERENCES public.machine_models(id);


--
-- Name: professionals professionals_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT professionals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: professionals professionals_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT professionals_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.account_members(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: reports reports_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id);


--
-- Name: standard_items standard_items_parent_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_items
    ADD CONSTRAINT standard_items_parent_item_id_fkey FOREIGN KEY (parent_item_id) REFERENCES public.standard_items(id);


--
-- Name: standard_items standard_items_standard_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_items
    ADD CONSTRAINT standard_items_standard_section_id_fkey FOREIGN KEY (standard_section_id) REFERENCES public.standard_sections(id) ON DELETE CASCADE;


--
-- Name: standard_sections standard_sections_standard_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_sections
    ADD CONSTRAINT standard_sections_standard_version_id_fkey FOREIGN KEY (standard_version_id) REFERENCES public.standard_versions(id) ON DELETE CASCADE;


--
-- Name: standard_versions standard_versions_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standard_versions
    ADD CONSTRAINT standard_versions_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: standards Standard_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Standard_read" ON public.standards FOR SELECT TO authenticated USING (true);


--
-- Name: account_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts accounts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounts_select ON public.accounts FOR SELECT USING ((id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: accounts accounts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounts_update ON public.accounts FOR UPDATE USING ((id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: action_plan_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_plan_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: action_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: answer_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.answer_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

--
-- Name: arts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arts ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_template_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_template_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_template_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: checklists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: inspection_scope; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspection_scope ENABLE ROW LEVEL SECURITY;

--
-- Name: inspections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

--
-- Name: location_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.location_types ENABLE ROW LEVEL SECURITY;

--
-- Name: location_types location_types_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY location_types_read ON public.location_types FOR SELECT TO authenticated USING (true);


--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_models ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_models machine_models_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY machine_models_read ON public.machine_models FOR SELECT TO authenticated USING (true);


--
-- Name: machine_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_types ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_types machine_types_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY machine_types_read ON public.machine_types FOR SELECT TO authenticated USING (true);


--
-- Name: machines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

--
-- Name: account_members members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_select ON public.account_members FOR SELECT USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: action_plan_photos own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.action_plan_photos USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: action_plans own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.action_plans USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: answer_photos own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.answer_photos USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: answers own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.answers USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: arts own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.arts USING ((EXISTS ( SELECT 1
   FROM public.professionals p
  WHERE ((p.id = arts.professional_id) AND (p.account_id IN ( SELECT public.current_account_ids() AS current_account_ids)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.professionals p
  WHERE ((p.id = arts.professional_id) AND (p.account_id IN ( SELECT public.current_account_ids() AS current_account_ids))))));


--
-- Name: checklist_template_items own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.checklist_template_items USING ((EXISTS ( SELECT 1
   FROM (public.checklist_template_sections s
     JOIN public.checklist_templates t ON ((t.id = s.checklist_template_id)))
  WHERE ((s.id = checklist_template_items.checklist_template_section_id) AND (t.account_id IN ( SELECT public.current_account_ids() AS current_account_ids)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.checklist_template_sections s
     JOIN public.checklist_templates t ON ((t.id = s.checklist_template_id)))
  WHERE ((s.id = checklist_template_items.checklist_template_section_id) AND (t.account_id IN ( SELECT public.current_account_ids() AS current_account_ids))))));


--
-- Name: checklist_template_sections own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.checklist_template_sections USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates t
  WHERE ((t.id = checklist_template_sections.checklist_template_id) AND (t.account_id IN ( SELECT public.current_account_ids() AS current_account_ids)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklist_templates t
  WHERE ((t.id = checklist_template_sections.checklist_template_id) AND (t.account_id IN ( SELECT public.current_account_ids() AS current_account_ids))))));


--
-- Name: checklist_templates own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.checklist_templates USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: checklists own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.checklists USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: clients own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.clients USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: inspection_scope own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.inspection_scope USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: inspections own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.inspections USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: locations own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.locations USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = locations.client_id) AND (c.account_id IN ( SELECT public.current_account_ids() AS current_account_ids)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = locations.client_id) AND (c.account_id IN ( SELECT public.current_account_ids() AS current_account_ids))))));


--
-- Name: machines own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.machines USING ((EXISTS ( SELECT 1
   FROM (public.locations l
     JOIN public.clients c ON ((c.id = l.client_id)))
  WHERE ((l.id = machines.location_id) AND (c.account_id IN ( SELECT public.current_account_ids() AS current_account_ids)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.locations l
     JOIN public.clients c ON ((c.id = l.client_id)))
  WHERE ((l.id = machines.location_id) AND (c.account_id IN ( SELECT public.current_account_ids() AS current_account_ids))))));


--
-- Name: professionals own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.professionals USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: reports own_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_account ON public.reports USING ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids))) WITH CHECK ((account_id IN ( SELECT public.current_account_ids() AS current_account_ids)));


--
-- Name: profiles own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_profile ON public.profiles USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: professionals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_matrix_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risk_matrix_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_matrix_rules risk_matrix_rules_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY risk_matrix_rules_read ON public.risk_matrix_rules FOR SELECT TO authenticated USING (true);


--
-- Name: standard_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standard_items ENABLE ROW LEVEL SECURITY;

--
-- Name: standard_items standard_items_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standard_items_read ON public.standard_items FOR SELECT TO authenticated USING (true);


--
-- Name: standard_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standard_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: standard_sections standard_sections_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standard_sections_read ON public.standard_sections FOR SELECT TO authenticated USING (true);


--
-- Name: standard_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standard_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: standard_versions standard_versions_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standard_versions_read ON public.standard_versions FOR SELECT TO authenticated USING (true);


--
-- Name: standards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

-- (linha \unrestrict do pg_dump removida — meta-comando do psql)

