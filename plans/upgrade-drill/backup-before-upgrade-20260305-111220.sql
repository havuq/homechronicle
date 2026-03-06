--
-- PostgreSQL database dump
--

\restrict x8RRwLoUlho2wVBBcMBgER5qpk6BFewMqw60XoQNymWjCE2Jb3j1GAMRemDghg0

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alert_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_deliveries (
    id bigint NOT NULL,
    rule_id bigint NOT NULL,
    event_id bigint,
    status text NOT NULL,
    target_url text NOT NULL,
    response_code integer,
    error text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_alert_delivery_status CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'suppressed'::text])))
);


--
-- Name: alert_deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_deliveries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_deliveries_id_seq OWNED BY public.alert_deliveries.id;


--
-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_rules (
    id bigint NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    scope_type text DEFAULT 'all'::text NOT NULL,
    scope_value text,
    characteristic text,
    operator text DEFAULT 'equals'::text NOT NULL,
    match_value text NOT NULL,
    target_url text NOT NULL,
    quiet_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_alert_operator CHECK ((operator = ANY (ARRAY['equals'::text, 'not_equals'::text, 'contains'::text]))),
    CONSTRAINT chk_alert_quiet_minutes CHECK (((quiet_minutes >= 0) AND (quiet_minutes <= 10080))),
    CONSTRAINT chk_alert_scope_type CHECK ((scope_type = ANY (ARRAY['all'::text, 'room'::text, 'accessory'::text, 'characteristic'::text])))
);


--
-- Name: alert_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_rules_id_seq OWNED BY public.alert_rules.id;


--
-- Name: event_hourly_agg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_hourly_agg (
    bucket_day date NOT NULL,
    bucket_hour integer NOT NULL,
    accessory_id text NOT NULL,
    accessory_name text NOT NULL,
    room_name text,
    event_count bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_event_hourly_agg_hour CHECK (((bucket_hour >= 0) AND (bucket_hour <= 23)))
);


--
-- Name: event_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_logs (
    id bigint NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    accessory_id text NOT NULL,
    accessory_name text NOT NULL,
    room_name text,
    service_type text,
    characteristic text NOT NULL,
    old_value text,
    new_value text NOT NULL,
    raw_iid integer,
    protocol text DEFAULT 'homekit'::text NOT NULL,
    transport text,
    endpoint_id integer,
    cluster_id bigint,
    attribute_id bigint
);


--
-- Name: event_logs_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_logs_archive (
    archived_id bigint NOT NULL,
    source_id bigint NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    accessory_id text NOT NULL,
    accessory_name text NOT NULL,
    room_name text,
    service_type text,
    characteristic text NOT NULL,
    old_value text,
    new_value text NOT NULL,
    raw_iid integer,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    protocol text DEFAULT 'homekit'::text NOT NULL,
    transport text,
    endpoint_id integer,
    cluster_id bigint,
    attribute_id bigint
);


--
-- Name: event_logs_archive_archived_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_logs_archive_archived_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_logs_archive_archived_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_logs_archive_archived_id_seq OWNED BY public.event_logs_archive.archived_id;


--
-- Name: event_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_logs_id_seq OWNED BY public.event_logs.id;


--
-- Name: alert_deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries ALTER COLUMN id SET DEFAULT nextval('public.alert_deliveries_id_seq'::regclass);


--
-- Name: alert_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules ALTER COLUMN id SET DEFAULT nextval('public.alert_rules_id_seq'::regclass);


--
-- Name: event_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_logs ALTER COLUMN id SET DEFAULT nextval('public.event_logs_id_seq'::regclass);


--
-- Name: event_logs_archive archived_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_logs_archive ALTER COLUMN archived_id SET DEFAULT nextval('public.event_logs_archive_archived_id_seq'::regclass);


--
-- Data for Name: alert_deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alert_deliveries (id, rule_id, event_id, status, target_url, response_code, error, sent_at) FROM stdin;
\.


--
-- Data for Name: alert_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alert_rules (id, name, enabled, scope_type, scope_value, characteristic, operator, match_value, target_url, quiet_minutes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_hourly_agg; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_hourly_agg (bucket_day, bucket_hour, accessory_id, accessory_name, room_name, event_count) FROM stdin;
2026-01-28	21	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-28	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-29	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-29	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-29	1	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-29	2	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-29	2	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-29	5	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-01-29	6	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-29	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	3
2026-01-29	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-29	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-29	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-01-29	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	10	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-29	10	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-29	12	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	12	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-01-29	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-01-29	14	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-29	16	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-01-29	17	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-29	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-29	18	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-29	18	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-29	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-29	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-29	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-29	21	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-29	22	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-01-29	22	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-29	23	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-29	23	AA:11:22:33:44:06	Garage Door	Garage	2
2026-01-30	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-30	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-30	3	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-30	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-30	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-30	4	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-01-30	6	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-30	7	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	7	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-30	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-30	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-30	12	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-30	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	13	AA:11:22:33:44:08	Contact Sensor	Back Door	2
2026-01-30	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-30	14	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-30	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-30	15	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-30	17	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-30	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-30	20	AA:11:22:33:44:06	Garage Door	Garage	2
2026-01-30	20	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-30	21	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-01-30	21	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-30	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-30	22	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-30	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-31	0	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-31	1	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-31	2	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-31	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-01-31	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-31	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-31	8	AA:11:22:33:44:03	Front Door Lock	Entryway	3
2026-01-31	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-31	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-31	10	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-31	12	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-31	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-31	13	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-01-31	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-31	16	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-31	16	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-31	17	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-01-31	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-01-31	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-01-31	19	AA:11:22:33:44:01	Living Room Light	Living Room	2
2026-01-31	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-01-31	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-31	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-01-31	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-31	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-01-31	23	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-01	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-01	3	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-01	3	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-01	4	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-01	5	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-01	5	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-01	8	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-01	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-01	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-01	10	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-01	11	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-01	14	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-01	14	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-01	15	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-01	16	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-01	17	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-01	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-01	19	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-01	20	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-01	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-01	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-01	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	0	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-02	1	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-02	2	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-02	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	3	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-02	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	5	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-02	6	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-02	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-02	7	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	7	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-02	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-02	9	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-02	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	3
2026-02-02	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-02	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-02	15	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-02	15	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-02	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-02	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-02	19	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-02	20	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-02	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-02	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	3
2026-02-03	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-03	0	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-03	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-03	2	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-03	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-03	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-03	4	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-03	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	4	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-03	5	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-03	6	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-03	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	6	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-03	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-03	9	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-03	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-03	12	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-03	12	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-03	12	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-03	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	14	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-03	15	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	16	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-03	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-03	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-03	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-03	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-03	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-04	0	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-04	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-04	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-04	3	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-04	4	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-04	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-04	6	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-04	6	AA:11:22:33:44:04	Motion Sensor	Hallway	3
2026-02-04	7	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-04	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-04	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-04	10	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-04	10	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-04	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-04	11	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-04	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-04	12	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-04	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-04	15	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-04	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-04	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-04	18	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-04	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-04	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-04	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-04	20	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-04	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-04	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-04	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-04	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-05	0	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-05	0	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-05	1	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-05	2	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-05	2	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-05	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	3	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-05	4	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-05	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	7	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-05	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-05	9	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-05	9	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-05	9	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-05	10	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-05	10	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-05	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-05	11	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-05	13	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	13	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-05	14	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-05	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	17	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	18	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	18	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-05	20	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-05	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-05	21	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-05	21	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-05	22	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-05	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-06	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	0	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-06	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-06	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-06	2	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-06	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-06	4	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-06	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	5	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	6	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	9	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	10	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-06	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	13	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	13	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-06	14	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-06	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-06	14	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-06	16	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-06	17	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-06	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-06	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	20	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-06	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-06	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-06	21	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-06	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-06	22	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-06	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-07	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-07	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	3	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-07	5	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	5	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-07	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-07	10	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-07	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-07	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-07	13	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	13	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-07	14	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	14	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	15	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-07	17	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-07	18	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-07	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-07	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-07	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-07	20	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-07	22	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-07	23	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-08	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	3	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-08	4	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	6	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-08	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-08	9	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-08	9	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	9	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	10	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-08	10	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-08	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	13	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-08	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-08	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-08	16	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-08	17	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-08	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-08	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-08	21	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-08	21	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-08	22	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-08	22	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-08	23	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-08	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-08	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-09	0	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-09	1	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	1	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-09	1	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-09	2	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-09	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-09	3	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-09	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-09	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-09	5	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-09	5	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	5	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-09	6	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-09	6	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-09	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-09	6	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-09	7	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-09	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-09	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-09	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-09	9	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-09	10	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-09	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-09	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-09	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-09	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-09	19	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-09	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-09	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-09	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-10	3	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-10	3	AA:11:22:33:44:08	Contact Sensor	Back Door	2
2026-02-10	5	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-10	6	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-10	7	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-10	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-10	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-10	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-10	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-10	12	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-10	12	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-10	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-10	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-10	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-10	16	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-10	16	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-10	18	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-10	19	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-10	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-10	20	AA:11:22:33:44:01	Living Room Light	Living Room	2
2026-02-10	20	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-10	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-10	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-11	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-11	3	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-11	4	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-11	5	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-11	5	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	6	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-11	8	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-11	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-11	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-11	9	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-11	9	AA:11:22:33:44:04	Motion Sensor	Hallway	3
2026-02-11	10	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-11	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	15	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	16	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-11	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-11	16	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-11	16	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	17	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-11	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-11	18	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-11	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-11	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-11	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	20	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-11	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-11	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-11	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-11	21	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-11	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-11	22	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-11	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-11	23	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-12	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-12	1	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-12	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-12	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-12	6	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	7	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-12	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-12	8	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-12	8	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-12	10	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-12	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-12	11	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-12	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-12	12	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-12	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-12	14	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-12	16	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-12	16	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-12	17	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-12	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-12	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-12	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-12	18	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-12	18	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	19	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-12	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-12	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-12	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-12	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-12	23	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-12	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-13	1	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-13	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-13	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-13	7	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-13	8	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-13	9	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-13	10	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-13	10	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	11	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	12	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-13	12	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-13	14	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-13	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-13	14	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-13	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-13	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-13	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-13	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-13	21	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	22	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-13	22	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-13	22	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-13	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-13	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-13	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-13	23	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-14	1	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-14	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-14	3	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-14	4	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-14	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-14	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-14	9	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-14	11	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	13	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-14	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	13	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-14	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-14	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-14	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	20	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-14	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-14	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-14	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-14	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-14	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-14	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-15	0	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-15	1	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-15	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-15	1	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-15	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-15	2	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-15	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-15	4	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-15	5	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-15	5	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-15	8	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-15	8	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-15	8	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-15	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-15	10	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-15	10	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-15	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-15	11	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-15	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-15	14	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-15	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-15	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-15	15	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-15	15	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-15	16	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-15	17	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-15	19	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-15	20	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-15	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-15	21	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-15	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-15	23	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-15	23	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-16	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	0	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-16	3	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	3	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	5	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-16	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-16	5	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-16	5	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-16	6	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	7	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	11	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-16	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-16	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-16	11	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-16	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-16	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-16	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-16	16	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	17	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-16	18	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-16	22	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-16	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-16	22	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-16	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-16	22	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-16	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-17	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-17	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-17	0	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-17	1	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-17	1	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-17	2	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-17	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-17	2	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-17	3	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-17	4	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-17	5	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-17	6	AA:11:22:33:44:08	Contact Sensor	Back Door	2
2026-02-17	8	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-17	10	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-17	10	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-17	11	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-17	11	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-17	12	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-17	13	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-17	14	AA:11:22:33:44:03	Front Door Lock	Entryway	2
2026-02-17	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-17	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-17	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-17	16	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-17	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-17	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-17	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-17	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-17	21	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-17	23	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-17	23	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-18	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-18	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-18	2	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-18	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-18	6	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-18	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	7	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-18	7	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-18	8	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-18	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	10	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	11	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-18	12	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	13	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-18	13	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-18	13	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-18	15	AA:11:22:33:44:03	Front Door Lock	Entryway	3
2026-02-18	15	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-18	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-18	16	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-18	16	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	18	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-18	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-18	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-18	22	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-18	23	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-18	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-18	23	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-19	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-19	0	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-19	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	1	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-19	2	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-19	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-19	2	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	3	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-19	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-19	6	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-19	6	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	6	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-19	7	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-19	7	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	8	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-19	10	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-19	12	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-19	12	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-19	13	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-19	14	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-19	16	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-19	17	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-19	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-19	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-19	21	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-19	21	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-19	22	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-19	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-20	0	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-20	1	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-20	1	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	2	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-20	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-20	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-20	3	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	4	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-20	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-20	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-20	4	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-20	5	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-20	5	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	5	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	5	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-20	6	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-20	8	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-20	11	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-20	14	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-20	14	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-20	14	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-20	15	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-20	16	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-20	17	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-20	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-20	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-20	17	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-20	18	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-20	18	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	19	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-20	19	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-20	19	AA:11:22:33:44:05	Thermostat	Living Room	2
2026-02-20	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-20	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-20	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-20	23	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-21	1	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-21	2	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-21	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-21	2	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-21	4	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-21	4	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-21	6	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-21	7	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-21	7	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-21	8	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-21	8	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-21	9	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-21	10	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-21	10	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-21	10	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-21	12	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-21	12	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-21	12	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-21	13	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-21	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-21	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-21	16	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-21	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-21	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-21	20	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	12
2026-02-21	20	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	2
2026-02-21	21	0E:22:C6:B6:29:56:2	Core 600S	media-room	3
2026-02-21	21	0E:42:7D:E1:23:79:2	Middle Basement Shade	media-room	3
2026-02-21	21	0E:42:7D:E1:23:79:3	Right Basement Shade	media-room	2
2026-02-21	21	0E:42:7D:E1:23:79:4	Left Basement Shade	media-room	3
2026-02-21	21	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	4
2026-02-21	21	0E:B2:28:59:91:97:2	Adguard-sync	\N	2
2026-02-21	21	0E:B2:28:59:91:97:3	Adguard-1	\N	2
2026-02-21	21	0E:B2:28:59:91:97:4	Adguard-3	\N	2
2026-02-21	21	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	3
2026-02-21	21	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	2
2026-02-21	21	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-21	22	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	5
2026-02-21	22	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	3
2026-02-21	22	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	1
2026-02-21	22	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	8
2026-02-21	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-21	23	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	1
2026-02-21	23	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	3
2026-02-21	23	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	2
2026-02-21	23	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	1
2026-02-21	23	0E:C7:B3:C6:B3:BA:5	Left garage	outside	2
2026-02-21	23	0E:C7:B3:C6:B3:BA:6	Right garage	outside	1
2026-02-21	23	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	7
2026-02-21	23	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-21	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-22	0	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	4
2026-02-22	0	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	1
2026-02-22	0	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	5
2026-02-22	0	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-22	1	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	4
2026-02-22	1	0E:C7:B3:C6:B3:BA:5	Left garage	outside	4
2026-02-22	1	0E:C7:B3:C6:B3:BA:6	Right garage	outside	2
2026-02-22	1	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	5
2026-02-22	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-22	2	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	2	0E:60:29:72:96:8C:2	Neakasa M1	\N	2
2026-02-22	2	0E:C7:B3:C6:B3:BA:5	Left garage	outside	4
2026-02-22	2	0E:C7:B3:C6:B3:BA:6	Right garage	outside	2
2026-02-22	2	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	9
2026-02-22	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-22	3	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-22	4	0E:B2:28:59:91:97:2	Adguard-sync	\N	1
2026-02-22	4	0E:B2:28:59:91:97:3	Adguard-1	\N	1
2026-02-22	4	0E:B2:28:59:91:97:4	Adguard-3	\N	1
2026-02-22	4	0E:C7:B3:C6:B3:BA:5	Left garage	outside	4
2026-02-22	4	0E:C7:B3:C6:B3:BA:6	Right garage	outside	3
2026-02-22	4	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	4
2026-02-22	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-22	5	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	5	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	7
2026-02-22	5	0E:C7:B3:C6:B3:BA:5	Left garage	outside	6
2026-02-22	5	0E:C7:B3:C6:B3:BA:6	Right garage	outside	3
2026-02-22	5	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	1
2026-02-22	6	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	3
2026-02-22	6	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-22	7	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	4
2026-02-22	7	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-22	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-22	7	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-22	8	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-22	8	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-22	8	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-22	10	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	1
2026-02-22	10	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-22	11	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	12	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	1
2026-02-22	12	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-22	12	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-22	12	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-22	13	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	1
2026-02-22	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-22	14	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	1
2026-02-22	15	0E:B2:28:59:91:97:2	Adguard-sync	\N	2
2026-02-22	15	0E:B2:28:59:91:97:3	Adguard-1	\N	2
2026-02-22	15	0E:B2:28:59:91:97:4	Adguard-3	\N	2
2026-02-22	15	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	1
2026-02-22	15	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	3
2026-02-22	16	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	16	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	6
2026-02-22	17	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	17	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	6
2026-02-22	17	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-22	17	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-22	18	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	1
2026-02-22	18	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	1
2026-02-22	18	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	5
2026-02-22	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-22	18	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-22	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-22	19	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	19	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	4
2026-02-22	19	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-22	20	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	2
2026-02-22	20	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	2
2026-02-22	20	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	7
2026-02-22	20	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-22	21	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	3
2026-02-22	22	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	1
2026-02-22	22	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	3
2026-02-22	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-22	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-22	23	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-22	23	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	3
2026-02-22	23	0E:C7:B3:C6:B3:BA:5	Left garage	outside	2
2026-02-22	23	0E:C7:B3:C6:B3:BA:6	Right garage	outside	1
2026-02-22	23	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	1
2026-02-22	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-23	0	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	8
2026-02-23	0	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-23	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-23	1	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	11
2026-02-23	1	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-23	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-23	2	0E:60:29:72:96:8C:2	Neakasa M1	entrance	8
2026-02-23	2	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	4
2026-02-23	2	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	2
2026-02-23	2	0E:C7:B3:C6:B3:BA:5	Left garage	outside	4
2026-02-23	2	0E:C7:B3:C6:B3:BA:6	Right garage	outside	2
2026-02-23	2	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	6
2026-02-23	3	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	7
2026-02-23	4	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	1
2026-02-23	4	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	10
2026-02-23	5	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-23	7	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-23	7	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-23	7	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-23	8	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-23	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-23	9	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-23	11	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-23	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-23	12	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-23	12	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-23	12	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-23	13	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-23	14	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	1
2026-02-23	14	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	2
2026-02-23	14	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	2
2026-02-23	14	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	6
2026-02-23	15	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	3
2026-02-23	15	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	3
2026-02-23	15	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	4
2026-02-23	16	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	3
2026-02-23	16	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	3
2026-02-23	16	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	4
2026-02-23	16	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-23	19	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-23	21	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-23	23	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-23	23	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-23	23	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-24	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-24	1	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-24	2	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	3	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	3	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-24	3	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-24	8	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-24	10	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-24	10	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	11	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-24	11	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-24	11	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-24	13	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	2
2026-02-24	14	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	8
2026-02-24	15	0E:60:29:72:96:8C:2	Neakasa M1	entrance	1
2026-02-24	15	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	6
2026-02-24	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-24	15	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-24	16	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-24	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	16	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-24	17	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	2
2026-02-24	17	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	3
2026-02-24	17	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-24	17	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-24	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	18	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	2
2026-02-24	18	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-24	18	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	19	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	10
2026-02-24	19	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	2
2026-02-24	19	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-24	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-24	19	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	19	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-24	20	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	4
2026-02-24	20	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-24	20	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-24	21	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-24	22	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-24	22	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-24	23	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-24	23	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-25	0	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-25	2	AA:11:22:33:44:05	Thermostat	Living Room	3
2026-02-25	3	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	4	AA:11:22:33:44:07	Bedroom Light	Bedroom	3
2026-02-25	5	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	5	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-25	6	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	6	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-25	8	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-25	8	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	9	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-25	10	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	10	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-25	11	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-25	11	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-25	13	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-25	14	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-25	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-25	16	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	17	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	17	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-25	18	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	18	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-25	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-25	20	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-25	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-25	21	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-25	21	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-25	22	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-25	22	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-25	23	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-26	0	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-26	0	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-26	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-26	3	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-26	4	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-26	8	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-26	10	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-26	10	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-26	11	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-26	11	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-26	12	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-26	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-26	14	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-26	15	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-26	16	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-26	17	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-26	17	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-26	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-26	18	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-26	19	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-26	20	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-26	20	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-26	20	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-26	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-26	23	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-27	1	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	2	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-27	4	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-27	4	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	4	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-27	6	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-27	7	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-27	8	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	9	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-27	11	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-27	11	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-27	11	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-27	12	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	12	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-27	13	AA:11:22:33:44:02	Kitchen Light	Kitchen	1
2026-02-27	14	AA:11:22:33:44:02	Kitchen Light	Kitchen	2
2026-02-27	14	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-27	15	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	15	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-02-27	16	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-27	17	AA:11:22:33:44:08	Contact Sensor	Back Door	1
2026-02-27	18	AA:11:22:33:44:04	Motion Sensor	Hallway	2
2026-02-27	18	AA:11:22:33:44:06	Garage Door	Garage	2
2026-02-27	19	AA:11:22:33:44:01	Living Room Light	Living Room	1
2026-02-27	19	AA:11:22:33:44:03	Front Door Lock	Entryway	1
2026-02-27	19	AA:11:22:33:44:05	Thermostat	Living Room	1
2026-02-27	19	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-27	20	AA:11:22:33:44:04	Motion Sensor	Hallway	1
2026-02-27	20	AA:11:22:33:44:06	Garage Door	Garage	1
2026-02-27	20	AA:11:22:33:44:07	Bedroom Light	Bedroom	1
2026-03-01	22	0X1234ABCD:1	0X1234ABCD	\N	1
2026-03-02	0	0X1234ABCD:1	Office Plug	\N	1
\.


--
-- Data for Name: event_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_logs (id, "timestamp", accessory_id, accessory_name, room_name, service_type, characteristic, old_value, new_value, raw_iid, protocol, transport, endpoint_id, cluster_id, attribute_id) FROM stdin;
522	2026-02-21 20:24:43.573529+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	65	31	homekit	\N	\N	\N	\N
523	2026-02-21 20:42:50.435808+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
524	2026-02-21 20:43:00.436058+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
525	2026-02-21 20:43:07.683493+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
526	2026-02-21 20:43:17.6834+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
527	2026-02-21 20:44:27.152305+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
528	2026-02-21 20:44:37.152569+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
529	2026-02-21 20:44:46.988959+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
530	2026-02-21 20:44:56.989318+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
531	2026-02-21 20:45:09.76356+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
532	2026-02-21 20:45:19.763229+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
533	2026-02-21 20:45:22.627082+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
534	2026-02-21 20:45:32.627918+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
535	2026-02-21 20:54:43.567004+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	66	31	homekit	\N	\N	\N	\N
536	2026-02-21 21:02:40.35142+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
537	2026-02-21 21:02:50.352706+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
538	2026-02-21 21:03:04.013836+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
539	2026-02-21 21:03:14.011576+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	\N	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
540	2026-02-21 21:04:43.586931+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	64	31	homekit	\N	\N	\N	\N
541	2026-02-21 21:10:50.103876+00	0E:22:C6:B6:29:56:2	Core 600S	media-room	AirPurifier	Active	\N	0	9	homekit	\N	\N	\N	\N
542	2026-02-21 21:10:50.423539+00	0E:22:C6:B6:29:56:2	Core 600S	media-room	AirPurifier	Active	\N	0	9	homekit	\N	\N	\N	\N
543	2026-02-21 21:10:52.530848+00	0E:22:C6:B6:29:56:2	Core 600S	media-room	AirPurifier	Active	\N	1	9	homekit	\N	\N	\N	\N
544	2026-02-21 21:11:22.255891+00	0E:42:7D:E1:23:79:2	Middle Basement Shade	media-room	WindowCovering	ContactSensorState	\N	6	9	homekit	\N	\N	\N	\N
545	2026-02-21 21:11:24.86867+00	0E:42:7D:E1:23:79:4	Left Basement Shade	media-room	WindowCovering	ContactSensorState	\N	8	9	homekit	\N	\N	\N	\N
546	2026-02-21 21:11:30.921918+00	0E:42:7D:E1:23:79:3	Right Basement Shade	media-room	WindowCovering	ContactSensorState	\N	16	9	homekit	\N	\N	\N	\N
547	2026-02-21 21:11:33.051869+00	0E:42:7D:E1:23:79:2	Middle Basement Shade	media-room	WindowCovering	ContactSensorState	\N	16	9	homekit	\N	\N	\N	\N
548	2026-02-21 21:11:35.538541+00	0E:42:7D:E1:23:79:4	Left Basement Shade	media-room	WindowCovering	ContactSensorState	\N	15	9	homekit	\N	\N	\N	\N
549	2026-02-21 21:11:41.258918+00	0E:42:7D:E1:23:79:3	Right Basement Shade	media-room	WindowCovering	ContactSensorState	\N	47	9	homekit	\N	\N	\N	\N
550	2026-02-21 21:11:44.011923+00	0E:42:7D:E1:23:79:2	Middle Basement Shade	media-room	WindowCovering	ContactSensorState	\N	47	9	homekit	\N	\N	\N	\N
551	2026-02-21 21:11:46.208463+00	0E:42:7D:E1:23:79:4	Left Basement Shade	media-room	WindowCovering	ContactSensorState	\N	47	9	homekit	\N	\N	\N	\N
552	2026-02-21 21:12:25.945764+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	1	11	homekit	\N	\N	\N	\N
553	2026-02-21 21:12:27.490704+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	0	11	homekit	\N	\N	\N	\N
554	2026-02-21 21:16:32.436027+00	0E:B2:28:59:91:97:2	Adguard-sync	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
555	2026-02-21 21:16:32.994047+00	0E:B2:28:59:91:97:3	Adguard-1	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
556	2026-02-21 21:16:33.358781+00	0E:B2:28:59:91:97:4	Adguard-3	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
557	2026-02-21 21:19:43.59749+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	65	31	homekit	\N	\N	\N	\N
558	2026-02-21 21:30:03.386284+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	1	11	homekit	\N	\N	\N	\N
559	2026-02-21 21:56:40.990059+00	0E:B2:28:59:91:97:2	Adguard-sync	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
560	2026-02-21 21:56:41.391949+00	0E:B2:28:59:91:97:4	Adguard-3	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
561	2026-02-21 21:56:41.395663+00	0E:B2:28:59:91:97:3	Adguard-1	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
562	2026-02-21 22:04:43.610989+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
563	2026-02-21 22:04:43.615838+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	66	31	homekit	\N	\N	\N	\N
564	2026-02-21 22:09:43.609157+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	65	31	homekit	\N	\N	\N	\N
565	2026-02-21 22:10:05.929642+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	0	11	homekit	\N	\N	\N	\N
566	2026-02-21 22:24:43.642656+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
567	2026-02-21 22:33:44.652942+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	2	9	homekit	\N	\N	\N	\N
568	2026-02-21 22:34:43.636646+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	66	31	homekit	\N	\N	\N	\N
569	2026-02-21 22:37:44.560475+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	3	9	homekit	\N	\N	\N	\N
570	2026-02-21 22:37:47.765746+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	1	11	homekit	\N	\N	\N	\N
571	2026-02-21 22:37:54.867481+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	0	11	homekit	\N	\N	\N	\N
572	2026-02-21 22:39:43.639948+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
573	2026-02-21 22:41:44.526842+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	4	9	homekit	\N	\N	\N	\N
574	2026-02-21 22:49:43.631987+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	65	31	homekit	\N	\N	\N	\N
575	2026-02-21 22:49:44.57638+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	3	9	homekit	\N	\N	\N	\N
576	2026-02-21 22:54:43.635818+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	66	31	homekit	\N	\N	\N	\N
577	2026-02-21 22:57:44.512653+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	2	9	homekit	\N	\N	\N	\N
578	2026-02-21 22:58:15.001286+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	\N	1	11	homekit	\N	\N	\N	\N
579	2026-02-21 23:04:43.618907+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	67	31	homekit	\N	\N	\N	\N
580	2026-02-21 23:08:05.749201+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
581	2026-02-21 23:08:05.754884+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
582	2026-02-21 23:08:05.75733+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	100	12	homekit	\N	\N	\N	\N
583	2026-02-21 23:24:43.63244+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
584	2026-02-21 23:24:43.635422+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	68	31	homekit	\N	\N	\N	\N
585	2026-02-21 23:29:43.664901+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	69	31	homekit	\N	\N	\N	\N
586	2026-02-21 23:29:46.353782+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	1	11	homekit	\N	\N	\N	\N
587	2026-02-21 23:33:44.57853+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	1	9	homekit	\N	\N	\N	\N
588	2026-02-21 23:35:08.531556+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
589	2026-02-21 23:35:23.703045+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
590	2026-02-21 23:36:06.432079+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
591	2026-02-21 23:36:06.436305+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
592	2026-02-21 23:36:06.439243+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
593	2026-02-21 23:44:43.655533+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	0	23	homekit	\N	\N	\N	\N
594	2026-02-21 23:49:43.655276+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	71	31	homekit	\N	\N	\N	\N
595	2026-02-21 23:59:43.651406+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	72	31	homekit	\N	\N	\N	\N
596	2026-02-22 00:03:42.458431+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
597	2026-02-22 00:03:52.458563+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
598	2026-02-22 00:03:55.200306+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
599	2026-02-22 00:04:05.202331+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
600	2026-02-22 00:04:43.665686+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	73	31	homekit	\N	\N	\N	\N
601	2026-02-22 00:09:43.683604+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	74	31	homekit	\N	\N	\N	\N
602	2026-02-22 00:23:16.897541+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
603	2026-02-22 00:48:22.766872+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
604	2026-02-22 00:48:22.772369+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	74	31	homekit	\N	\N	\N	\N
605	2026-02-22 00:48:22.774067+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	23	homekit	\N	\N	\N	\N
606	2026-02-22 01:07:33.665373+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
607	2026-02-22 01:07:33.672951+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
608	2026-02-22 01:07:33.685077+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
609	2026-02-22 01:07:33.685135+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	0	11	homekit	\N	\N	\N	\N
610	2026-02-22 01:07:35.73673+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
611	2026-02-22 01:07:35.742783+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	74	31	homekit	\N	\N	\N	\N
612	2026-02-22 01:08:05.999275+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
613	2026-02-22 01:08:06.017827+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
614	2026-02-22 01:08:06.017804+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	77	31	homekit	\N	\N	\N	\N
615	2026-02-22 01:59:33.280349+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	100	15	homekit	\N	\N	\N	\N
616	2026-02-22 01:59:33.286009+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	76	15	homekit	\N	\N	\N	\N
617	2026-02-22 01:59:33.287386+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	30	14	homekit	\N	\N	\N	\N
618	2026-02-22 01:59:33.607612+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
619	2026-02-22 01:59:33.610121+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
620	2026-02-22 01:59:33.611262+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
621	2026-02-22 02:04:43.72134+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	23	homekit	\N	\N	\N	\N
622	2026-02-22 02:09:43.737553+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
623	2026-02-22 02:09:43.743403+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	78	31	homekit	\N	\N	\N	\N
624	2026-02-22 02:10:35.110174+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	100	15	homekit	\N	\N	\N	\N
625	2026-02-22 02:10:35.113969+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	76	15	homekit	\N	\N	\N	\N
626	2026-02-22 02:10:35.114825+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	30	14	homekit	\N	\N	\N	\N
627	2026-02-22 02:10:35.462846+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
628	2026-02-22 02:10:36.340897+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
629	2026-02-22 02:10:36.343052+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
630	2026-02-22 02:10:43.753118+00	0E:60:29:72:96:8C:2	Neakasa M1	\N	Switch	On	\N	1	41	homekit	\N	\N	\N	\N
631	2026-02-22 02:10:44.756783+00	0E:60:29:72:96:8C:2	Neakasa M1	\N	Switch	On	\N	0	41	homekit	\N	\N	\N	\N
632	2026-02-22 02:14:43.797874+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
633	2026-02-22 02:14:43.801932+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
634	2026-02-22 02:19:43.748396+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	77	31	homekit	\N	\N	\N	\N
635	2026-02-22 02:24:43.752238+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	78	31	homekit	\N	\N	\N	\N
636	2026-02-22 02:34:43.853912+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	79	31	homekit	\N	\N	\N	\N
637	2026-02-22 02:48:07.294338+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	35	11	homekit	\N	\N	\N	\N
638	2026-02-22 02:59:43.828336+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	78	31	homekit	\N	\N	\N	\N
639	2026-02-22 04:04:43.772654+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	79	31	homekit	\N	\N	\N	\N
640	2026-02-22 04:18:31.357129+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
641	2026-02-22 04:18:31.358897+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
642	2026-02-22 04:18:31.359541+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
643	2026-02-22 04:29:43.792169+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	78	31	homekit	\N	\N	\N	\N
644	2026-02-22 04:33:39.728977+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
645	2026-02-22 04:33:39.733121+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
646	2026-02-22 04:33:40.127067+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
647	2026-02-22 04:39:42.683784+00	0E:B2:28:59:91:97:2	Adguard-sync	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
648	2026-02-22 04:39:42.863696+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
649	2026-02-22 04:39:43.163189+00	0E:B2:28:59:91:97:3	Adguard-1	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
650	2026-02-22 04:39:43.165044+00	0E:B2:28:59:91:97:4	Adguard-3	\N	Switch	On	\N	1	9	homekit	\N	\N	\N	\N
651	2026-02-22 04:44:34.429007+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
652	2026-02-22 04:44:34.433525+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
653	2026-02-22 05:14:34.44891+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
654	2026-02-22 05:16:10.948672+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
655	2026-02-22 05:16:10.953432+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
656	2026-02-22 05:16:10.954627+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
657	2026-02-22 05:31:14.508808+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
658	2026-02-22 05:31:14.513446+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
659	2026-02-22 05:31:14.5149+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
660	2026-02-22 05:31:14.516194+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	100	15	homekit	\N	\N	\N	\N
661	2026-02-22 05:31:14.5173+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	76	15	homekit	\N	\N	\N	\N
662	2026-02-22 05:31:14.518607+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	30	14	homekit	\N	\N	\N	\N
663	2026-02-22 05:31:37.197269+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Saturation	\N	2	15	homekit	\N	\N	\N	\N
664	2026-02-22 05:31:37.200471+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Hue	\N	48	14	homekit	\N	\N	\N	\N
665	2026-02-22 05:31:37.20171+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	9	12	homekit	\N	\N	\N	\N
666	2026-02-22 05:32:37.305724+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	6	12	homekit	\N	\N	\N	\N
667	2026-02-22 05:33:37.167852+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	3	12	homekit	\N	\N	\N	\N
668	2026-02-22 05:34:37.237724+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	13	12	homekit	\N	\N	\N	\N
669	2026-02-22 05:34:42.626389+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	\N	0	11	homekit	\N	\N	\N	\N
670	2026-02-22 05:48:04.048927+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	35	11	homekit	\N	\N	\N	\N
671	2026-02-22 06:04:34.483785+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	74	31	homekit	\N	\N	\N	\N
672	2026-02-22 06:44:34.530597+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
673	2026-02-22 06:49:34.502674+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	74	31	homekit	\N	\N	\N	\N
674	2026-02-22 07:04:34.495614+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
675	2026-02-22 07:09:34.510686+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	75	31	homekit	\N	\N	\N	\N
676	2026-02-22 07:24:34.510615+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
677	2026-02-22 07:50:09.881422+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	23	homekit	\N	\N	\N	\N
678	2026-02-22 08:59:27.242249+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	77	31	homekit	\N	\N	\N	\N
679	2026-02-22 08:59:27.256355+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
680	2026-02-22 10:18:07.88205+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	80	31	homekit	\N	\N	\N	\N
681	2026-02-22 11:54:43.777313+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	32	11	homekit	\N	\N	\N	\N
682	2026-02-22 12:35:32.971464+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	81	31	homekit	\N	\N	\N	\N
683	2026-02-22 13:38:43.584124+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
684	2026-02-22 14:00:20.361263+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	83	31	homekit	\N	\N	\N	\N
685	2026-02-22 15:02:46.310159+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	80	31	homekit	\N	\N	\N	\N
686	2026-02-22 15:44:34.792205+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	38	homekit	\N	\N	\N	\N
687	2026-02-22 15:44:35.131575+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	Brightness	\N	5	12	homekit	\N	\N	\N	\N
688	2026-02-22 15:54:34.791194+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	79	31	homekit	\N	\N	\N	\N
689	2026-02-22 15:54:54.966274+00	0E:B2:28:59:91:97:2	Adguard-sync	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
690	2026-02-22 15:54:55.892738+00	0E:B2:28:59:91:97:4	Adguard-3	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
691	2026-02-22 15:54:56.454978+00	0E:B2:28:59:91:97:3	Adguard-1	\N	Switch	On	\N	0	9	homekit	\N	\N	\N	\N
692	2026-02-22 15:55:23.946601+00	0E:B2:28:59:91:97:2	Adguard-sync	\N	Switch	On	0	1	9	homekit	\N	\N	\N	\N
693	2026-02-22 15:55:24.712802+00	0E:B2:28:59:91:97:4	Adguard-3	\N	Switch	On	0	1	9	homekit	\N	\N	\N	\N
694	2026-02-22 15:55:24.715945+00	0E:B2:28:59:91:97:3	Adguard-1	\N	Switch	On	0	1	9	homekit	\N	\N	\N	\N
695	2026-02-22 16:06:55.109752+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	\N	0	38	homekit	\N	\N	\N	\N
696	2026-02-22 16:06:55.115628+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	\N	79	31	homekit	\N	\N	\N	\N
697	2026-02-22 16:16:53.244906+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	37	11	homekit	\N	\N	\N	\N
698	2026-02-22 16:21:55.057468+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	79	77	31	homekit	\N	\N	\N	\N
699	2026-02-22 16:41:55.107103+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	78	31	homekit	\N	\N	\N	\N
700	2026-02-22 16:46:55.089977+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	78	77	31	homekit	\N	\N	\N	\N
701	2026-02-22 16:51:55.10354+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	76	31	homekit	\N	\N	\N	\N
702	2026-02-22 17:06:55.126709+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	75	31	homekit	\N	\N	\N	\N
703	2026-02-22 17:21:55.122979+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	75	76	31	homekit	\N	\N	\N	\N
704	2026-02-22 17:31:55.148701+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	77	31	homekit	\N	\N	\N	\N
705	2026-02-22 17:36:55.127385+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	79	31	homekit	\N	\N	\N	\N
706	2026-02-22 17:41:55.14024+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	79	78	31	homekit	\N	\N	\N	\N
707	2026-02-22 17:47:05.079212+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	37	35	11	homekit	\N	\N	\N	\N
708	2026-02-22 17:51:55.119323+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	78	77	31	homekit	\N	\N	\N	\N
709	2026-02-22 18:01:55.154269+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	76	31	homekit	\N	\N	\N	\N
710	2026-02-22 18:16:55.166435+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	75	31	homekit	\N	\N	\N	\N
711	2026-02-22 18:31:55.172485+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	75	77	31	homekit	\N	\N	\N	\N
712	2026-02-22 18:41:55.193737+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	76	31	homekit	\N	\N	\N	\N
713	2026-02-22 18:46:55.173011+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
714	2026-02-22 18:46:55.509279+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	\N	1	11	homekit	\N	\N	\N	\N
715	2026-02-22 18:46:55.518737+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	\N	1	11	homekit	\N	\N	\N	\N
716	2026-02-22 19:01:55.263345+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	77	31	homekit	\N	\N	\N	\N
717	2026-02-22 19:16:55.179617+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	75	31	homekit	\N	\N	\N	\N
718	2026-02-22 19:17:11.152043+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	35	37	11	homekit	\N	\N	\N	\N
719	2026-02-22 19:41:55.205673+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	75	74	31	homekit	\N	\N	\N	\N
720	2026-02-22 19:46:55.238552+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	74	75	31	homekit	\N	\N	\N	\N
721	2026-02-22 20:06:55.219029+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	75	76	31	homekit	\N	\N	\N	\N
722	2026-02-22 20:11:55.235195+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
723	2026-02-22 20:11:55.574834+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
724	2026-02-22 20:11:55.583511+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
725	2026-02-22 20:16:55.239788+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	77	31	homekit	\N	\N	\N	\N
726	2026-02-22 20:26:55.268893+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
727	2026-02-22 20:26:55.273945+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	77	76	31	homekit	\N	\N	\N	\N
728	2026-02-22 20:26:55.574885+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
729	2026-02-22 20:26:55.58529+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
730	2026-02-22 20:31:55.257337+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	\N	HumiditySensor	CurrentRelativeHumidity	76	77	31	homekit	\N	\N	\N	\N
731	2026-02-22 20:41:55.263859+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
732	2026-02-22 21:01:55.262926+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	76	77	31	homekit	\N	\N	\N	\N
733	2026-02-22 21:21:55.265824+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	77	78	31	homekit	\N	\N	\N	\N
734	2026-02-22 21:31:55.287021+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	77	31	homekit	\N	\N	\N	\N
735	2026-02-22 22:31:55.336875+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	77	78	31	homekit	\N	\N	\N	\N
736	2026-02-22 22:36:55.315967+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	79	31	homekit	\N	\N	\N	\N
737	2026-02-22 22:41:55.314982+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	80	31	homekit	\N	\N	\N	\N
738	2026-02-22 22:59:22.818694+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	Brightness	\N	12	12	homekit	\N	\N	\N	\N
739	2026-02-22 23:01:55.318831+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	81	31	homekit	\N	\N	\N	\N
740	2026-02-22 23:09:04.916487+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
741	2026-02-22 23:09:04.921404+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
742	2026-02-22 23:09:04.922804+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	Brightness	\N	100	12	homekit	\N	\N	\N	\N
743	2026-02-22 23:33:18.95134+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
744	2026-02-22 23:33:18.955925+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	\N	0	15	homekit	\N	\N	\N	\N
745	2026-02-22 23:33:18.957404+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	\N	0	14	homekit	\N	\N	\N	\N
746	2026-02-22 23:47:46.696581+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	35	11	homekit	\N	\N	\N	\N
747	2026-02-23 00:01:55.36588+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	81	80	31	homekit	\N	\N	\N	\N
748	2026-02-23 00:11:55.368435+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	38	homekit	\N	\N	\N	\N
749	2026-02-23 00:16:55.388068+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
750	2026-02-23 00:21:55.401758+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
751	2026-02-23 00:26:55.388875+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
752	2026-02-23 00:31:55.410843+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
753	2026-02-23 00:31:55.415464+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	79	31	homekit	\N	\N	\N	\N
754	2026-02-23 00:46:55.385641+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
755	2026-02-23 01:01:55.600529+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	0	54	homekit	\N	\N	\N	\N
756	2026-02-23 01:01:55.604186+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	78	31	homekit	\N	\N	\N	\N
757	2026-02-23 01:06:55.400989+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	54	homekit	\N	\N	\N	\N
758	2026-02-23 01:06:55.409638+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	77	31	homekit	\N	\N	\N	\N
759	2026-02-23 01:16:55.397003+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
760	2026-02-23 01:21:55.425501+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
761	2026-02-23 01:36:55.413093+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
762	2026-02-23 01:41:55.412188+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	54	homekit	\N	\N	\N	\N
763	2026-02-23 01:41:55.416422+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	77	78	31	homekit	\N	\N	\N	\N
764	2026-02-23 01:46:55.415128+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
765	2026-02-23 01:51:55.420119+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
766	2026-02-23 02:01:55.420535+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	54	homekit	\N	\N	\N	\N
767	2026-02-23 02:01:55.424661+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	79	31	homekit	\N	\N	\N	\N
768	2026-02-23 02:31:55.44411+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	80	31	homekit	\N	\N	\N	\N
769	2026-02-23 02:36:55.465903+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
770	2026-02-23 02:38:22.253446+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	0	100	15	homekit	\N	\N	\N	\N
771	2026-02-23 02:38:22.258125+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	0	30	14	homekit	\N	\N	\N	\N
772	2026-02-23 02:38:22.259849+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	0	76	15	homekit	\N	\N	\N	\N
773	2026-02-23 02:38:22.529773+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Saturation	76	0	15	homekit	\N	\N	\N	\N
774	2026-02-23 02:38:22.532714+00	0E:C7:B3:C6:B3:BA:5	Left garage	outside	Lightbulb	Hue	30	0	14	homekit	\N	\N	\N	\N
775	2026-02-23 02:38:22.534202+00	0E:C7:B3:C6:B3:BA:6	Right garage	outside	Lightbulb	Saturation	100	0	15	homekit	\N	\N	\N	\N
776	2026-02-23 02:39:01.782667+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	OccupancySensor	OccupancyDetected	\N	1	64	homekit	\N	\N	\N	\N
777	2026-02-23 02:39:02.402841+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	\N	1	11	homekit	\N	\N	\N	\N
778	2026-02-23 02:40:01.425426+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	MotionSensor	MotionDetected	\N	1	68	homekit	\N	\N	\N	\N
779	2026-02-23 02:40:01.428822+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	OccupancySensor	OccupancyDetected	1	0	64	homekit	\N	\N	\N	\N
780	2026-02-23 02:41:01.124914+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	MotionSensor	MotionDetected	1	0	68	homekit	\N	\N	\N	\N
781	2026-02-23 02:41:55.442756+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
782	2026-02-23 02:42:01.321717+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	BA	FilterLifeLevel	\N	20	11	homekit	\N	\N	\N	\N
783	2026-02-23 02:46:55.465082+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	81	31	homekit	\N	\N	\N	\N
784	2026-02-23 02:49:05.228781+00	0E:C7:B3:C6:B3:BA:3	Kasa - Smelly	entrance	Outlet	On	1	0	11	homekit	\N	\N	\N	\N
785	2026-02-23 02:50:28.557798+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	Switch	On	\N	1	44	homekit	\N	\N	\N	\N
786	2026-02-23 02:50:29.558113+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	Switch	On	1	0	44	homekit	\N	\N	\N	\N
787	2026-02-23 02:53:07.161953+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	BA	FilterLifeLevel	20	100	11	homekit	\N	\N	\N	\N
788	2026-02-23 02:55:44.87965+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
789	2026-02-23 02:55:54.883038+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
790	2026-02-23 02:55:56.551051+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
791	2026-02-23 02:56:06.55227+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
792	2026-02-23 03:01:55.438561+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
793	2026-02-23 03:06:55.463458+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
794	2026-02-23 03:21:55.444542+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	81	82	31	homekit	\N	\N	\N	\N
795	2026-02-23 03:31:55.480791+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	82	83	31	homekit	\N	\N	\N	\N
796	2026-02-23 03:36:55.466287+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	83	82	31	homekit	\N	\N	\N	\N
797	2026-02-23 03:41:55.467147+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	82	83	31	homekit	\N	\N	\N	\N
798	2026-02-23 03:51:55.4671+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
799	2026-02-23 04:01:55.502077+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	83	82	31	homekit	\N	\N	\N	\N
800	2026-02-23 04:06:55.47987+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	82	80	31	homekit	\N	\N	\N	\N
801	2026-02-23 04:11:55.48356+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
802	2026-02-23 04:16:55.474335+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
803	2026-02-23 04:17:18.453809+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	35	32	11	homekit	\N	\N	\N	\N
804	2026-02-23 04:21:55.477093+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
805	2026-02-23 04:21:55.48078+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	81	31	homekit	\N	\N	\N	\N
806	2026-02-23 04:26:55.480561+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	81	82	31	homekit	\N	\N	\N	\N
807	2026-02-23 04:31:55.513975+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	82	81	31	homekit	\N	\N	\N	\N
808	2026-02-23 04:46:55.50276+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	81	82	31	homekit	\N	\N	\N	\N
809	2026-02-23 04:51:55.505264+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	82	81	31	homekit	\N	\N	\N	\N
810	2026-02-23 05:01:55.503812+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	81	80	31	homekit	\N	\N	\N	\N
811	2026-02-23 05:06:55.490845+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	79	31	homekit	\N	\N	\N	\N
812	2026-02-23 13:36:55.918176+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	80	31	homekit	\N	\N	\N	\N
813	2026-02-23 13:51:55.79951+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	80	79	31	homekit	\N	\N	\N	\N
814	2026-02-23 14:01:56.594222+00	0E:22:C6:B6:29:56:3	Core 600S Air Quality	media-room	AirQualitySensor	AirQuality	\N	1	9	homekit	\N	\N	\N	\N
815	2026-02-23 14:06:55.773644+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	78	31	homekit	\N	\N	\N	\N
816	2026-02-23 14:11:55.834986+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	79	31	homekit	\N	\N	\N	\N
817	2026-02-23 14:16:55.844083+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	79	78	31	homekit	\N	\N	\N	\N
818	2026-02-23 14:20:53.300352+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	\N	1	11	homekit	\N	\N	\N	\N
819	2026-02-23 14:20:53.309976+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	\N	1	11	homekit	\N	\N	\N	\N
820	2026-02-23 14:21:01.492206+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
821	2026-02-23 14:29:36.393036+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	78	77	31	homekit	\N	\N	\N	\N
822	2026-02-23 14:42:36.873841+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
823	2026-02-23 14:42:36.884923+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
824	2026-02-23 14:42:51.14437+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
825	2026-02-23 15:29:36.909218+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
826	2026-02-23 15:29:36.923449+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
828	2026-02-23 15:29:45.17522+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
827	2026-02-23 15:29:45.17502+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
829	2026-02-23 15:29:45.187082+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
830	2026-02-23 15:29:45.187133+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
831	2026-02-23 15:39:25.218347+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
832	2026-02-23 15:39:25.221369+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	77	76	31	homekit	\N	\N	\N	\N
833	2026-02-23 15:39:47.285524+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
834	2026-02-23 15:39:49.333635+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
835	2026-02-23 16:13:51.191064+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
836	2026-02-23 16:13:55.288441+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
837	2026-02-23 16:13:55.298919+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
838	2026-02-23 16:14:34.886332+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	0	1	38	homekit	\N	\N	\N	\N
839	2026-02-23 16:14:35.22757+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
840	2026-02-23 16:14:35.526368+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	0	1	11	homekit	\N	\N	\N	\N
841	2026-02-23 16:48:54.47862+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	1	0	38	homekit	\N	\N	\N	\N
842	2026-02-23 16:48:58.579873+00	0E:C7:B3:C6:B3:BA:4	Back Porch	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
843	2026-02-23 16:49:00.555103+00	0E:45:BA:7A:D1:1C:5	Front Porch Lumary 	outside	Lightbulb	On	1	0	11	homekit	\N	\N	\N	\N
844	2026-02-23 16:51:55.849515+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	76	75	31	homekit	\N	\N	\N	\N
845	2026-02-24 14:12:04.146599+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	\N	76	31	homekit	\N	\N	\N	\N
846	2026-02-24 14:17:04.130868+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	76	75	31	homekit	\N	\N	\N	\N
847	2026-02-24 14:22:04.140047+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	75	74	31	homekit	\N	\N	\N	\N
848	2026-02-24 14:32:04.185044+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	74	72	31	homekit	\N	\N	\N	\N
849	2026-02-24 14:42:04.118341+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	1	54	homekit	\N	\N	\N	\N
850	2026-02-24 14:42:04.124417+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	72	71	31	homekit	\N	\N	\N	\N
851	2026-02-24 14:47:04.134638+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	71	70	31	homekit	\N	\N	\N	\N
852	2026-02-24 14:57:04.126857+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	70	69	31	homekit	\N	\N	\N	\N
853	2026-02-24 15:02:04.125489+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	69	70	31	homekit	\N	\N	\N	\N
854	2026-02-24 15:07:04.17683+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	70	69	31	homekit	\N	\N	\N	\N
855	2026-02-24 15:12:04.127877+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	69	68	31	homekit	\N	\N	\N	\N
856	2026-02-24 15:22:04.153832+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	68	67	31	homekit	\N	\N	\N	\N
857	2026-02-24 15:28:09.922558+00	0E:60:29:72:96:8C:2	Neakasa M1	entrance	BA	FilterLifeLevel	\N	90	11	homekit	\N	\N	\N	\N
858	2026-02-24 15:32:04.163156+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	67	66	31	homekit	\N	\N	\N	\N
859	2026-02-24 15:42:04.125694+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	66	65	31	homekit	\N	\N	\N	\N
860	2026-02-24 16:12:04.137812+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	65	64	31	homekit	\N	\N	\N	\N
861	2026-02-24 16:37:04.207215+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	64	63	31	homekit	\N	\N	\N	\N
862	2026-02-24 17:02:04.172359+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	63	62	31	homekit	\N	\N	\N	\N
863	2026-02-24 17:07:04.171172+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	62	61	31	homekit	\N	\N	\N	\N
864	2026-02-24 17:22:04.183379+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	61	60	31	homekit	\N	\N	\N	\N
865	2026-02-24 17:44:27.749028+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	\N	40	11	homekit	\N	\N	\N	\N
866	2026-02-24 17:44:33.000174+00	0E:42:7D:E1:23:79:6	3 Button Basement Remote	media-room	Battery	StatusLowBattery	40	35	11	homekit	\N	\N	\N	\N
867	2026-02-24 18:05:44.551064+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	\N	1	11	homekit	\N	\N	\N	\N
868	2026-02-24 18:05:59.821361+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
869	2026-02-24 18:12:04.225291+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	60	59	31	homekit	\N	\N	\N	\N
870	2026-02-24 18:47:04.223742+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	59	58	31	homekit	\N	\N	\N	\N
871	2026-02-24 19:22:04.235419+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	OccupancySensor	OccupancyDetected	\N	1	23	homekit	\N	\N	\N	\N
872	2026-02-24 19:32:04.256814+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	58	57	31	homekit	\N	\N	\N	\N
873	2026-02-24 19:40:03.395075+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
874	2026-02-24 19:40:21.07322+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
875	2026-02-24 19:40:38.67297+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
876	2026-02-24 19:40:50.373871+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
877	2026-02-24 19:40:52.676968+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
878	2026-02-24 19:41:02.676583+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
879	2026-02-24 19:41:44.047472+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
880	2026-02-24 19:41:54.0353+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
881	2026-02-24 19:42:08.026039+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	0	1	11	homekit	\N	\N	\N	\N
882	2026-02-24 19:42:18.015735+00	0E:A6:32:76:70:D2:3	G4 Doorbell Front	outside	MotionSensor	MotionDetected	1	0	11	homekit	\N	\N	\N	\N
883	2026-02-24 20:02:04.26697+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	57	56	31	homekit	\N	\N	\N	\N
884	2026-02-24 20:07:04.263052+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	56	55	31	homekit	\N	\N	\N	\N
885	2026-02-24 20:22:04.282471+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	55	54	31	homekit	\N	\N	\N	\N
886	2026-02-24 20:27:04.274333+00	0E:E3:9A:D3:BA:04:2	ZVille OWM	outside	HumiditySensor	CurrentRelativeHumidity	54	55	31	homekit	\N	\N	\N	\N
887	2026-02-20 05:02:20.102516+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
888	2026-01-30 03:39:20.064414+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
889	2026-02-02 21:44:24.999977+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
890	2026-02-09 08:26:23.972261+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
891	2026-02-27 12:59:33.96238+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
892	2026-02-11 20:12:47.231718+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
893	2026-02-11 14:13:24.845393+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
894	2026-02-25 08:58:23.867852+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
895	2026-02-08 11:14:51.734657+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
896	2026-02-27 04:30:36.168449+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
897	2026-02-24 22:21:43.934279+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
898	2026-02-22 12:46:09.086006+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
899	2026-02-04 20:16:16.054557+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
900	2026-02-13 10:37:51.601312+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
901	2026-02-20 00:46:59.674816+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
902	2026-02-11 22:13:28.738844+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
903	2026-01-29 21:57:03.15119+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
904	2026-02-11 16:17:22.379372+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
905	2026-02-14 01:11:17.884831+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
906	2026-02-14 20:14:08.124369+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
907	2026-02-21 13:46:48.607645+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	21.3	\N	homekit	\N	\N	\N	\N
908	2026-02-27 19:26:40.775274+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	3	\N	homekit	\N	\N	\N	\N
909	2026-02-27 16:17:28.070311+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
910	2026-02-26 03:00:34.596996+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
911	2026-02-11 15:59:21.976972+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
912	2026-02-07 17:54:11.436191+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
913	2026-02-16 22:52:24.616372+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
914	2026-02-09 05:00:21.995277+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
915	2026-02-03 02:49:23.850383+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
916	2026-02-17 14:59:19.944726+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
917	2026-01-30 13:49:55.226056+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
918	2026-02-15 01:11:57.001623+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
919	2026-02-02 15:37:21.591495+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
920	2026-02-11 21:48:37.262709+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
921	2026-02-24 10:25:00.036648+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	22.1	\N	homekit	\N	\N	\N	\N
922	2026-02-22 18:44:25.739837+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
923	2026-02-04 23:47:43.914795+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
924	2026-02-01 17:13:48.571762+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
925	2026-02-24 19:24:23.46821+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	19.5	\N	homekit	\N	\N	\N	\N
926	2026-02-26 02:23:30.535309+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
927	2026-02-08 21:05:35.896091+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
928	2026-02-08 22:00:02.511005+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
929	2026-02-14 22:15:40.416238+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	0	\N	homekit	\N	\N	\N	\N
930	2026-02-20 14:22:29.125884+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
931	2026-02-15 10:24:58.6434+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
932	2026-02-16 22:12:37.281192+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
933	2026-02-01 15:29:06.91251+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
934	2026-02-25 05:47:49.378975+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
935	2026-02-24 13:53:15.949216+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	0	\N	homekit	\N	\N	\N	\N
936	2026-02-22 18:38:17.316519+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
937	2026-01-31 22:59:44.738468+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
938	2026-02-17 23:57:24.112694+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
939	2026-01-29 06:44:57.483316+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
940	2026-02-14 22:50:50.33671+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
941	2026-02-04 16:16:59.628684+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
942	2026-02-12 10:35:05.344994+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
943	2026-02-18 16:20:17.306312+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	23.0	\N	homekit	\N	\N	\N	\N
944	2026-02-07 18:55:18.050723+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
945	2026-02-04 04:29:09.48768+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
946	2026-01-29 01:08:21.957086+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	21.3	\N	homekit	\N	\N	\N	\N
947	2026-02-24 02:27:01.017216+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	false	\N	homekit	\N	\N	\N	\N
948	2026-02-01 00:35:31.267214+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
949	2026-02-03 04:10:25.675859+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
950	2026-01-31 03:48:18.091165+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
951	2026-02-05 02:42:23.807439+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
952	2026-02-27 14:11:12.340802+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
953	2026-02-23 01:41:16.362071+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
954	2026-01-30 19:05:20.825357+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
955	2026-02-01 08:56:39.001242+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
956	2026-02-08 04:37:43.390591+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
957	2026-02-24 17:41:31.651661+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
958	2026-02-17 14:18:12.150413+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
959	2026-02-21 08:49:49.136902+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
960	2026-02-19 08:08:58.607868+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
961	2026-02-09 17:24:43.142631+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	2	\N	homekit	\N	\N	\N	\N
962	2026-02-11 18:18:48.398447+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
963	2026-02-24 16:58:27.309343+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
964	2026-02-17 00:22:53.098785+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
965	2026-01-29 01:45:26.787792+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	3	\N	homekit	\N	\N	\N	\N
966	2026-02-11 16:11:29.474225+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
967	2026-02-18 18:47:05.767529+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
968	2026-02-23 07:05:42.989359+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
969	2026-02-16 13:00:09.034551+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
970	2026-02-09 05:21:03.289087+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
971	2026-02-08 13:17:23.994618+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
972	2026-02-06 02:08:51.673068+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	3	\N	homekit	\N	\N	\N	\N
973	2026-02-04 19:11:47.949781+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
974	2026-01-29 08:58:37.129226+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	3	\N	homekit	\N	\N	\N	\N
975	2026-02-27 17:19:23.902074+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
976	2026-02-05 22:45:23.043744+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
977	2026-02-10 12:20:01.042728+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	On	\N	3	\N	homekit	\N	\N	\N	\N
978	2026-01-29 08:39:02.112671+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
979	2026-02-12 06:50:17.380768+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
980	2026-02-01 16:18:08.757941+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
981	2026-02-26 11:26:48.974806+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
982	2026-02-19 04:46:48.065037+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
983	2026-02-20 03:46:30.144921+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	0	\N	homekit	\N	\N	\N	\N
984	2026-01-30 00:58:45.427734+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
985	2026-02-11 19:27:28.53504+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
986	2026-02-06 14:08:23.432626+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
987	2026-01-31 23:23:21.04714+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
988	2026-02-23 19:21:23.996793+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
989	2026-02-23 09:15:54.41188+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
990	2026-02-01 19:13:00.591855+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
991	2026-02-20 02:52:04.456592+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
992	2026-02-27 19:30:57.550238+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
993	2026-02-02 11:23:16.087328+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
994	2026-02-16 03:09:37.654412+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
995	2026-02-25 16:43:16.205211+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
996	2026-02-13 22:45:03.596848+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
997	2026-02-09 00:02:53.513114+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
998	2026-02-15 01:02:46.128742+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
999	2026-01-31 08:30:04.047945+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1000	2026-02-03 11:36:06.52057+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1001	2026-02-21 04:47:38.381693+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1002	2026-02-20 04:47:58.959852+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1003	2026-02-11 19:19:47.726442+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1004	2026-02-08 17:01:29.373541+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1005	2026-02-20 00:59:17.146404+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1006	2026-02-01 05:13:33.761931+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1007	2026-02-16 11:42:23.214834+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1008	2026-02-26 17:00:35.043987+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1009	2026-02-08 09:53:59.725887+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1010	2026-02-19 08:09:12.117089+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	1	\N	homekit	\N	\N	\N	\N
1011	2026-02-25 21:11:30.80135+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1012	2026-02-17 14:02:53.612016+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1013	2026-02-24 04:39:40.372053+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1014	2026-02-06 14:02:55.462558+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1015	2026-02-19 19:18:10.886294+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	false	\N	homekit	\N	\N	\N	\N
1016	2026-02-21 12:53:10.428314+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1017	2026-02-27 14:58:43.541215+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1018	2026-02-18 07:13:03.895805+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1019	2026-02-12 14:45:41.143753+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1020	2026-02-19 21:55:26.190114+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1021	2026-02-18 16:09:41.727034+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1022	2026-02-02 15:04:37.792488+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1023	2026-02-10 20:17:22.805573+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1024	2026-01-30 20:46:42.412089+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1025	2026-02-04 11:29:45.629191+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1026	2026-02-02 09:24:40.134775+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1027	2026-02-18 18:19:55.747246+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1028	2026-02-20 02:25:15.977324+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1029	2026-02-22 12:09:31.089934+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1030	2026-01-31 10:29:19.877823+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1031	2026-02-08 08:39:58.739217+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1032	2026-02-17 13:39:59.408162+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1033	2026-01-29 10:22:00.620893+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1034	2026-02-14 11:11:46.194679+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1035	2026-02-12 14:27:38.923911+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1036	2026-01-30 06:38:10.116636+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1037	2026-02-02 05:45:13.340644+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1038	2026-02-22 07:01:32.44529+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1039	2026-02-13 00:39:26.655628+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1040	2026-02-27 11:56:15.21333+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1041	2026-02-05 03:09:27.847711+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1042	2026-02-11 08:27:26.075764+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1043	2026-02-10 14:10:07.554297+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1044	2026-02-07 20:28:58.895396+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1045	2026-01-29 23:07:14.408429+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1046	2026-02-13 04:04:40.664282+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1047	2026-01-29 18:34:46.19984+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1048	2026-02-25 06:05:54.12986+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1049	2026-02-18 05:15:58.294212+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1050	2026-02-12 16:27:26.573502+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1051	2026-02-01 11:08:55.741046+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1052	2026-02-17 11:47:19.734801+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1053	2026-02-22 22:48:00.530358+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1054	2026-02-13 01:29:37.82079+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	2	\N	homekit	\N	\N	\N	\N
1055	2026-02-01 08:55:54.483731+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1056	2026-02-15 00:30:06.397519+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1057	2026-02-19 03:54:49.950943+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1058	2026-02-02 22:23:36.859779+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1059	2026-02-14 23:52:50.887556+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1060	2026-02-07 04:37:13.735334+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1061	2026-02-17 20:14:30.393393+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1062	2026-02-06 07:04:03.99978+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1063	2026-02-13 14:37:34.323302+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1064	2026-02-01 23:15:24.476705+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	23.0	\N	homekit	\N	\N	\N	\N
1065	2026-02-10 16:12:52.830702+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1066	2026-02-20 14:55:58.135825+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1067	2026-02-09 14:10:16.696832+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1068	2026-02-26 18:04:25.083196+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1069	2026-02-18 07:10:27.264449+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1070	2026-02-07 07:08:45.438374+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1071	2026-02-24 19:42:50.63189+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1072	2026-02-05 04:42:24.819849+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1073	2026-02-21 21:57:59.778066+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1074	2026-02-20 11:34:59.724375+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1075	2026-02-22 22:08:20.054368+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1076	2026-02-07 19:24:42.638963+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1077	2026-02-11 03:59:29.721865+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1078	2026-01-29 00:54:00.13276+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1079	2026-02-13 12:05:42.234+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1080	2026-02-03 20:31:42.499045+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1081	2026-02-24 19:49:53.34207+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1082	2026-02-19 22:08:50.253342+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1083	2026-02-12 19:48:00.666409+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1084	2026-02-19 13:31:19.354771+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1085	2026-02-15 20:28:17.999827+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1086	2026-02-18 02:45:05.710506+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1087	2026-02-26 20:41:44.39238+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1088	2026-02-17 11:25:27.616687+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1089	2026-02-24 22:58:18.756703+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1090	2026-02-05 17:37:18.596941+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1091	2026-02-16 07:28:33.99651+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1092	2026-02-15 15:30:54.965235+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1093	2026-02-18 22:29:30.185476+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1094	2026-02-20 04:57:05.226369+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1095	2026-02-27 19:16:26.923114+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1096	2026-02-27 02:11:45.028967+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1097	2026-02-14 17:08:16.623113+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1098	2026-02-20 08:59:34.620631+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1099	2026-02-22 23:43:34.7606+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1100	2026-02-03 12:42:31.688298+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1101	2026-02-10 21:12:18.264334+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1102	2026-02-06 14:32:40.013042+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1103	2026-02-16 05:36:35.664129+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1104	2026-02-21 23:31:10.103461+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1105	2026-02-11 17:36:17.114488+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1106	2026-02-03 04:48:44.049729+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1107	2026-02-09 01:52:44.325135+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1108	2026-02-22 13:43:33.809321+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1109	2026-02-22 01:04:08.985532+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1110	2026-02-17 01:17:38.957073+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1111	2026-01-31 01:51:35.561419+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1112	2026-02-21 09:41:31.440504+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1113	2026-01-30 20:02:15.793566+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1114	2026-02-12 23:50:58.292836+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1115	2026-02-02 20:30:13.923864+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	23.0	\N	homekit	\N	\N	\N	\N
1116	2026-01-28 23:01:10.792705+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1117	2026-02-07 14:32:37.362901+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1118	2026-02-06 00:21:31.941365+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1119	2026-02-27 04:22:27.547344+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1120	2026-02-21 19:20:32.90537+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1121	2026-02-15 17:58:31.996938+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1122	2026-02-05 09:46:59.938142+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	1	\N	homekit	\N	\N	\N	\N
1123	2026-01-29 10:51:53.254727+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1124	2026-01-31 13:43:53.922557+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1125	2026-02-14 13:06:13.64231+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1126	2026-02-17 02:10:42.173943+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	3	\N	homekit	\N	\N	\N	\N
1127	2026-02-25 00:25:04.729569+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1128	2026-02-26 16:10:49.645401+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1129	2026-02-11 12:34:22.030413+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1130	2026-01-30 00:47:56.508466+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	0	\N	homekit	\N	\N	\N	\N
1131	2026-02-20 17:48:34.676436+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1132	2026-02-01 08:26:18.088108+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1133	2026-02-25 14:10:14.746856+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1134	2026-02-23 12:41:44.26812+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1135	2026-02-23 23:46:03.909352+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1136	2026-01-29 12:29:08.484621+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1137	2026-02-25 02:58:24.924462+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	0	\N	homekit	\N	\N	\N	\N
1138	2026-02-22 13:12:23.581945+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1139	2026-02-06 01:54:50.916122+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	23.0	\N	homekit	\N	\N	\N	\N
1140	2026-02-18 15:30:40.161727+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1141	2026-02-25 21:11:55.087383+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1142	2026-02-22 08:47:50.844755+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1143	2026-02-20 06:38:16.353183+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1144	2026-02-15 13:55:34.61845+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1145	2026-01-30 05:26:14.880521+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1146	2026-02-03 04:53:02.672236+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1147	2026-02-14 13:41:40.212824+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1148	2026-02-12 01:22:50.165898+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1149	2026-02-04 12:23:00.850605+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1150	2026-02-20 04:50:14.103656+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1151	2026-02-25 11:16:46.857297+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1152	2026-02-24 08:28:56.972417+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1153	2026-02-05 08:49:04.128767+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1154	2026-02-02 11:22:03.354221+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1155	2026-02-11 20:52:37.073202+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1156	2026-02-26 15:29:42.533388+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1157	2026-02-24 16:48:57.344052+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1158	2026-01-31 12:17:16.266826+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1159	2026-02-05 21:09:50.339957+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1160	2026-01-30 21:51:45.420197+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1161	2026-02-21 23:50:32.398901+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1162	2026-02-11 09:20:43.660537+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1163	2026-02-08 16:48:44.023231+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1164	2026-02-12 22:39:58.775549+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1165	2026-02-15 05:10:14.270195+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1166	2026-02-15 11:08:45.495617+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1167	2026-02-24 15:56:15.938763+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1168	2026-02-03 05:56:21.396532+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1169	2026-02-25 02:55:09.642643+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1170	2026-02-08 22:25:06.141377+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1171	2026-02-07 05:01:06.065911+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1172	2026-02-06 05:36:08.904472+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	0	\N	homekit	\N	\N	\N	\N
1173	2026-02-25 02:44:44.089823+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1174	2026-02-27 19:40:57.475949+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1175	2026-02-17 02:16:32.999667+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	3	\N	homekit	\N	\N	\N	\N
1176	2026-02-03 00:14:12.795225+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1177	2026-02-06 17:22:22.359677+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1178	2026-02-13 13:27:03.192029+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1179	2026-02-11 18:22:24.934837+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1180	2026-02-11 09:07:40.017181+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1181	2026-02-13 19:43:19.381581+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1182	2026-02-09 22:00:22.337823+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1183	2026-02-25 04:27:22.402644+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1184	2026-02-21 10:23:21.381111+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1185	2026-02-14 03:26:50.669123+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1186	2026-02-03 03:41:08.199497+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1187	2026-02-20 17:50:47.614661+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1188	2026-01-30 08:18:22.948004+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1189	2026-02-17 00:01:27.044973+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1190	2026-02-11 08:01:32.044162+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1191	2026-01-29 00:11:46.597857+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1192	2026-02-03 00:34:01.969144+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1193	2026-02-17 10:03:22.062314+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1194	2026-02-07 15:03:56.297892+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1195	2026-01-29 19:27:21.812108+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1196	2026-02-13 23:01:00.985443+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1197	2026-02-15 05:56:12.254565+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1198	2026-02-02 03:41:13.593686+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1199	2026-02-04 18:06:28.688468+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1200	2026-02-26 08:30:07.315928+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1201	2026-02-08 23:53:09.155386+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1202	2026-02-08 09:51:11.925663+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1203	2026-02-04 06:07:42.424443+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1204	2026-02-17 04:11:22.262543+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1205	2026-02-20 17:25:55.608033+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1206	2026-02-20 04:04:14.831102+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1207	2026-02-16 22:13:07.684093+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	true	\N	homekit	\N	\N	\N	\N
1208	2026-02-04 00:40:34.767317+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1209	2026-02-04 06:46:28.425529+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1210	2026-02-22 17:36:35.740102+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	3	\N	homekit	\N	\N	\N	\N
1211	2026-02-23 08:48:14.872961+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1212	2026-02-27 11:12:48.597514+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1213	2026-02-20 01:05:04.058263+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1214	2026-02-07 11:08:18.522142+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1215	2026-02-24 13:20:05.964186+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1216	2026-02-18 00:44:45.811262+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1217	2026-01-29 06:08:40.502142+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1218	2026-02-04 10:15:11.502691+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1219	2026-02-12 00:00:42.960977+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1220	2026-01-30 15:57:12.768282+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1221	2026-02-01 14:58:43.348169+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1222	2026-02-04 13:40:58.06006+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1223	2026-02-03 14:44:19.218178+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1224	2026-02-10 07:39:25.324086+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1225	2026-02-02 07:56:33.970192+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1226	2026-02-09 04:30:26.823278+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1227	2026-02-27 15:30:07.150648+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1228	2026-02-10 20:55:05.986892+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	1	\N	homekit	\N	\N	\N	\N
1229	2026-02-07 13:33:45.77873+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1230	2026-02-26 11:46:31.582219+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1231	2026-01-29 17:20:25.134944+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1232	2026-02-21 02:24:15.691682+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1233	2026-02-24 01:21:28.518376+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1234	2026-02-18 16:50:44.593969+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1235	2026-02-13 14:58:25.8983+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1236	2026-02-17 00:30:18.092502+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1237	2026-02-12 04:11:44.526017+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1238	2026-02-06 20:39:35.553681+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1239	2026-02-06 13:36:29.692551+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1240	2026-02-20 19:10:52.615767+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1241	2026-02-11 21:38:27.537591+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1242	2026-02-24 00:35:58.635873+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1243	2026-02-17 04:44:54.668304+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1244	2026-01-30 22:47:25.964947+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1245	2026-02-15 10:54:51.991731+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1246	2026-02-25 16:40:54.613256+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1247	2026-02-06 21:00:21.399122+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1248	2026-02-03 13:10:47.094199+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1249	2026-02-15 10:35:43.168923+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1250	2026-01-30 14:16:02.984162+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1251	2026-02-07 19:05:53.351419+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1252	2026-02-22 04:14:54.542039+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1253	2026-02-02 19:59:49.534918+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1254	2026-01-30 20:15:00.628795+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1255	2026-02-01 05:54:17.870771+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1256	2026-02-11 19:51:16.726637+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1257	2026-02-16 00:41:20.920853+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1258	2026-02-15 04:09:43.586054+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1259	2026-02-02 02:53:24.688493+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1260	2026-02-07 13:56:35.69241+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1261	2026-02-02 00:28:15.939479+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1262	2026-02-05 07:12:17.889648+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1263	2026-02-16 05:41:42.323758+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1264	2026-02-18 23:43:03.87724+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1265	2026-02-16 11:36:07.377414+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1266	2026-01-31 00:09:26.233001+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1267	2026-02-26 20:37:39.271607+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1268	2026-02-17 03:06:17.879041+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	true	\N	homekit	\N	\N	\N	\N
1269	2026-02-23 00:54:23.825854+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1270	2026-02-18 21:22:19.730152+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1271	2026-02-23 11:12:13.516927+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1272	2026-02-03 04:19:15.502414+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	1	\N	homekit	\N	\N	\N	\N
1273	2026-02-27 18:00:00.822839+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1274	2026-02-08 19:29:35.235452+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1275	2026-02-05 13:03:11.220925+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1276	2026-02-07 00:53:48.442213+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1277	2026-01-29 23:25:43.469984+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1278	2026-02-26 10:02:05.947016+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1279	2026-02-08 14:13:23.359802+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1280	2026-01-29 22:36:45.802913+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1281	2026-02-15 20:19:35.383366+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1282	2026-02-25 06:37:54.446272+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1283	2026-02-02 06:43:50.745947+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1284	2026-02-09 01:42:42.022746+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1285	2026-02-04 19:22:57.766099+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1286	2026-02-11 09:44:38.075645+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1287	2026-02-12 02:02:01.148908+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1288	2026-02-02 13:20:05.472972+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1289	2026-02-18 13:48:18.068544+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1290	2026-02-05 21:37:26.385109+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1291	2026-02-12 08:41:51.821479+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1292	2026-01-30 12:04:02.011043+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1293	2026-02-13 03:30:41.255577+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1294	2026-02-14 07:13:47.504003+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1295	2026-01-31 03:05:22.492231+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1296	2026-02-17 06:04:30.318005+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1297	2026-02-05 11:21:53.386009+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1298	2026-01-30 22:16:14.188329+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1299	2026-01-29 16:28:32.828567+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1300	2026-02-06 21:25:10.98982+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1301	2026-02-23 07:57:13.161108+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1302	2026-02-20 14:27:26.610313+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1303	2026-02-06 20:38:34.760266+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1304	2026-02-07 15:57:11.662369+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1305	2026-02-06 14:05:04.870203+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1306	2026-02-17 23:36:21.573764+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1307	2026-02-10 07:56:34.005588+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1308	2026-02-20 02:53:43.231095+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1309	2026-02-09 17:24:38.634242+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1310	2026-02-11 05:10:04.601961+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1311	2026-02-10 19:31:41.1752+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1312	2026-01-29 08:31:24.849528+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1313	2026-02-10 21:17:49.668961+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1314	2026-02-01 10:59:27.477061+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1315	2026-02-17 08:47:54.289857+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1316	2026-02-06 11:12:36.904266+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1317	2026-02-04 06:52:26.317689+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1318	2026-02-09 06:29:03.96567+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1319	2026-02-20 06:06:55.160347+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	0	\N	homekit	\N	\N	\N	\N
1320	2026-02-12 16:02:33.477458+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1321	2026-02-04 11:37:18.191021+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1322	2026-02-02 22:57:56.692086+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1323	2026-02-16 03:22:13.836007+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1324	2026-02-15 19:41:24.053302+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1325	2026-02-20 01:17:00.385647+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1326	2026-02-18 16:42:22.356482+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1327	2026-02-13 21:57:46.13572+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1328	2026-02-07 22:20:42.132736+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1329	2026-02-27 20:32:40.54953+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1330	2026-02-05 00:36:54.628878+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1331	2026-02-22 18:50:55.616756+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	3	\N	homekit	\N	\N	\N	\N
1332	2026-02-25 13:09:27.317037+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1333	2026-02-12 12:00:33.136921+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1334	2026-02-17 16:51:21.0982+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1335	2026-02-16 22:18:13.968951+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1336	2026-02-06 00:38:47.286458+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1337	2026-02-05 09:23:53.362035+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1338	2026-02-06 10:19:51.063184+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1339	2026-02-27 12:12:23.21918+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1340	2026-02-25 17:39:36.831209+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1341	2026-02-21 07:27:31.930776+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1342	2026-01-30 20:30:01.91379+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1343	2026-02-02 02:13:05.827938+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1344	2026-02-03 01:47:09.848113+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1345	2026-02-02 22:18:55.703037+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1346	2026-02-12 21:10:41.330631+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1347	2026-02-18 17:39:59.488172+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1348	2026-02-15 14:34:46.683542+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1349	2026-02-03 15:01:35.25826+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1350	2026-02-19 11:02:22.114694+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1351	2026-02-13 09:13:36.814788+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1352	2026-02-12 22:08:20.957298+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1353	2026-02-16 05:58:30.912462+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1354	2026-02-08 14:01:56.408623+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1355	2026-01-31 19:48:57.573245+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1356	2026-02-25 15:49:37.294349+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1357	2026-01-29 13:04:17.715575+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1358	2026-02-25 22:34:32.873386+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1359	2026-01-31 08:30:02.196348+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1360	2026-02-24 18:05:55.004199+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1361	2026-02-26 14:51:23.374412+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1362	2026-02-12 04:50:36.200798+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1363	2026-02-19 13:22:29.039402+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1364	2026-01-30 23:31:11.388817+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1365	2026-02-04 03:33:13.11195+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1366	2026-02-09 06:28:00.861625+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1367	2026-02-02 15:42:43.464207+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1368	2026-02-14 02:41:30.827655+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1369	2026-02-20 19:26:13.62229+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1370	2026-02-09 10:00:51.516247+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1371	2026-02-09 21:11:41.002971+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1372	2026-02-10 12:09:41.529925+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1373	2026-02-18 22:54:39.219482+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1374	2026-02-25 20:47:31.935423+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1375	2026-02-20 15:32:50.489182+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1376	2026-02-13 23:08:27.037729+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1377	2026-02-15 02:28:58.393509+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1378	2026-02-04 12:47:37.968867+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1379	2026-02-02 15:39:10.057664+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1380	2026-02-20 14:13:55.622252+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1381	2026-02-03 05:42:20.810173+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1382	2026-02-09 03:12:01.986399+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1383	2026-02-04 21:01:37.585786+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1384	2026-02-07 17:13:33.792648+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1385	2026-02-06 17:33:32.1097+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1386	2026-02-23 23:18:27.672687+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1387	2026-02-12 11:53:47.330957+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1388	2026-02-08 03:19:19.453854+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1389	2026-02-18 00:30:50.076734+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1390	2026-02-02 07:02:53.000067+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1391	2026-02-15 05:18:11.004299+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1392	2026-02-11 17:53:00.41536+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1393	2026-02-13 22:21:58.546076+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1394	2026-02-08 09:23:07.399772+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1395	2026-02-18 12:21:52.213281+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1396	2026-01-30 04:00:20.604079+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1397	2026-01-29 05:43:32.360843+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1398	2026-02-17 16:58:52.867616+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1399	2026-02-23 19:38:55.151204+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1400	2026-02-02 07:06:59.237816+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1401	2026-02-19 06:17:10.154448+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1402	2026-01-31 06:51:03.021033+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1403	2026-02-15 08:29:31.702017+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1404	2026-02-15 09:32:49.476235+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1405	2026-02-13 22:23:00.88965+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1406	2026-02-17 05:52:45.164251+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1407	2026-02-25 09:43:10.604211+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1408	2026-02-19 12:09:47.56705+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1409	2026-02-16 18:49:52.227355+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1410	2026-02-15 21:06:54.130136+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1411	2026-02-17 02:43:04.838535+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	false	\N	homekit	\N	\N	\N	\N
1412	2026-02-04 10:24:20.977586+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1413	2026-01-29 14:06:44.971105+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1414	2026-02-09 07:17:24.686679+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1415	2026-02-24 20:52:43.423962+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	23.0	\N	homekit	\N	\N	\N	\N
1416	2026-02-18 15:28:53.057385+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1417	2026-02-13 09:46:44.54001+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1418	2026-02-14 04:04:20.744722+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1419	2026-02-15 02:43:39.788912+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1420	2026-02-06 04:05:40.773141+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	1	\N	homekit	\N	\N	\N	\N
1421	2026-02-05 05:41:42.720215+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1422	2026-02-11 20:47:32.592483+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	3	\N	homekit	\N	\N	\N	\N
1423	2026-02-22 19:31:16.258379+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1424	2026-02-10 20:15:25.600646+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1425	2026-02-08 23:50:09.294095+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1426	2026-02-06 17:06:11.769808+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1427	2026-02-18 08:39:16.979296+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1428	2026-02-26 10:38:11.10104+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1429	2026-02-27 01:12:45.804034+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1430	2026-02-27 09:12:58.40394+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1431	2026-02-25 16:29:43.517291+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1432	2026-02-13 16:41:37.313899+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	0	\N	homekit	\N	\N	\N	\N
1433	2026-02-08 17:41:39.890718+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1434	2026-02-11 09:05:30.983648+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1435	2026-02-24 03:33:56.110295+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	0	\N	homekit	\N	\N	\N	\N
1436	2026-02-04 06:57:42.610047+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1437	2026-02-24 13:55:00.678689+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	3	\N	homekit	\N	\N	\N	\N
1438	2026-02-17 01:57:25.255325+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1439	2026-02-18 11:47:57.423708+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1440	2026-02-22 03:11:40.17467+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1441	2026-02-27 18:18:54.481843+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1442	2026-02-19 00:09:00.449755+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1443	2026-02-26 14:28:28.24944+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1444	2026-02-10 16:10:36.176438+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1445	2026-02-02 06:14:29.62251+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1446	2026-02-24 20:52:10.758054+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1447	2026-02-15 08:35:38.442161+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1448	2026-02-19 17:38:12.089337+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1449	2026-02-24 10:07:20.952326+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1450	2026-01-30 11:23:25.708491+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1451	2026-02-13 08:55:54.010665+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1452	2026-01-30 03:45:27.066297+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1453	2026-02-10 21:26:53.308855+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1454	2026-02-09 01:51:28.275857+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1455	2026-02-04 15:58:43.352576+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1456	2026-02-24 17:35:57.784214+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1457	2026-02-08 21:52:42.663304+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1458	2026-02-15 16:24:40.535522+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1459	2026-02-16 13:36:23.708963+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1460	2026-02-12 12:40:52.945047+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1461	2026-02-22 08:47:35.655978+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1462	2026-02-22 06:23:28.973262+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1463	2026-02-21 16:17:13.241958+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1464	2026-02-19 07:13:16.542288+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1465	2026-02-14 23:09:10.407852+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1466	2026-02-05 14:56:41.10274+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1467	2026-02-11 06:58:16.234712+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1468	2026-02-22 00:55:05.788003+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1469	2026-02-23 09:29:27.27208+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1470	2026-01-30 13:15:44.752758+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1471	2026-02-09 20:04:28.979586+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1472	2026-01-31 08:04:02.481742+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	1	\N	homekit	\N	\N	\N	\N
1473	2026-02-14 21:06:31.111315+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1474	2026-02-09 21:57:36.697683+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1475	2026-01-31 18:14:50.922806+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1476	2026-02-12 17:18:59.830536+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1477	2026-02-24 11:05:11.617607+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	1	\N	homekit	\N	\N	\N	\N
1478	2026-02-23 16:31:11.11328+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1479	2026-02-10 08:36:19.999707+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1480	2026-01-30 07:40:53.175336+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1481	2026-02-07 02:28:44.781142+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1482	2026-02-17 12:46:37.08575+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1483	2026-02-01 20:52:31.181812+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1484	2026-02-13 11:05:22.592679+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1485	2026-02-21 02:49:23.867369+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1486	2026-02-05 00:22:22.303076+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1487	2026-01-31 17:12:38.001089+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1488	2026-02-11 16:07:56.442162+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1489	2026-02-27 07:52:04.768529+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1490	2026-02-27 14:50:03.840841+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1491	2026-02-25 10:47:49.461083+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1492	2026-02-19 06:52:51.927155+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1493	2026-02-09 02:10:23.6975+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1494	2026-02-16 14:16:07.810397+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1495	2026-02-19 12:35:45.565797+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1496	2026-02-06 04:41:42.086133+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1497	2026-02-10 15:40:02.064837+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1498	2026-02-05 21:33:42.598177+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1499	2026-02-15 20:59:09.058587+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1500	2026-02-11 10:17:00.904371+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1501	2026-02-21 12:25:01.929979+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1502	2026-02-10 16:56:00.009818+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1503	2026-02-11 05:51:45.17358+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1504	2026-02-17 21:08:45.998042+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	1	\N	homekit	\N	\N	\N	\N
1505	2026-02-15 14:00:59.379604+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	true	\N	homekit	\N	\N	\N	\N
1506	2026-01-31 23:15:00.562185+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1507	2026-01-30 19:16:28.330259+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1508	2026-02-11 21:42:43.530708+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1509	2026-02-11 13:20:37.930541+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1510	2026-02-25 20:50:18.44604+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1511	2026-02-17 10:05:04.926933+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1512	2026-02-15 08:44:05.011418+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1513	2026-02-13 14:09:39.231391+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1514	2026-02-11 04:57:40.098316+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	23.0	\N	homekit	\N	\N	\N	\N
1515	2026-02-21 08:02:12.9109+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1516	2026-02-06 20:15:13.53341+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1517	2026-02-13 22:25:18.632972+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1518	2026-02-15 02:21:02.291464+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1519	2026-02-27 08:29:42.673288+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1520	2026-02-18 15:54:46.150498+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1521	2026-02-21 01:20:59.927052+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1522	2026-02-23 21:01:08.958136+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1523	2026-01-30 07:46:45.339132+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1524	2026-02-18 06:16:50.618466+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1525	2026-02-02 01:45:28.829141+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1526	2026-02-06 02:47:27.821917+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1527	2026-01-29 07:20:09.989181+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1528	2026-02-01 08:43:37.832188+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1529	2026-01-31 19:03:05.490639+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1530	2026-02-10 03:47:43.589681+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1531	2026-02-15 23:26:44.314941+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1532	2026-02-03 12:33:54.931479+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1533	2026-02-23 21:53:55.873477+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1534	2026-01-30 15:15:43.494649+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1535	2026-02-27 04:33:56.688006+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1536	2026-02-12 17:50:52.606815+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1537	2026-02-25 22:28:54.897647+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1538	2026-02-11 03:06:51.729862+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1539	2026-02-03 19:04:19.732017+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1540	2026-02-06 04:54:30.644531+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1541	2026-02-18 15:05:15.051652+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1542	2026-02-25 18:57:00.781564+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1543	2026-02-16 00:32:56.345986+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	2	\N	homekit	\N	\N	\N	\N
1544	2026-02-04 21:09:06.011056+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1545	2026-02-19 04:23:55.91325+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1546	2026-02-24 23:15:03.399714+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1547	2026-02-19 00:28:55.894568+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1548	2026-02-06 13:10:58.660911+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1549	2026-02-05 03:07:13.113072+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1550	2026-01-29 02:18:20.460208+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	true	\N	homekit	\N	\N	\N	\N
1551	2026-02-09 19:07:14.813891+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1552	2026-02-25 20:41:36.281492+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1553	2026-02-13 19:05:18.393753+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1554	2026-02-19 16:46:23.106823+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1555	2026-02-07 19:15:58.753679+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1556	2026-02-05 07:21:58.011683+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1557	2026-02-10 12:24:51.551687+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1558	2026-02-01 14:59:56.065728+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1559	2026-02-26 17:29:37.821162+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1560	2026-01-31 09:45:56.485466+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1561	2026-02-19 02:23:50.565999+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1562	2026-01-29 22:41:02.785277+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1563	2026-02-08 04:55:18.83423+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1564	2026-02-22 12:23:05.53091+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1565	2026-02-20 19:42:37.943404+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1566	2026-02-08 23:04:41.89122+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	false	\N	homekit	\N	\N	\N	\N
1567	2026-02-04 20:41:33.384591+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1568	2026-02-17 23:20:00.687858+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1569	2026-02-01 19:46:53.499362+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	3	\N	homekit	\N	\N	\N	\N
1570	2026-02-09 04:51:22.5118+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	0	\N	homekit	\N	\N	\N	\N
1571	2026-02-25 08:17:10.018187+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1572	2026-02-19 02:51:24.789284+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1573	2026-02-22 02:07:46.046114+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1574	2026-02-26 00:28:53.357704+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1575	2026-02-16 08:14:36.152241+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1576	2026-02-18 23:14:39.878623+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1577	2026-02-09 06:04:24.362907+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1578	2026-02-14 13:09:15.946646+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1579	2026-02-03 02:03:01.201384+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1580	2026-02-18 13:26:52.406775+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1581	2026-02-16 17:36:43.229221+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1582	2026-02-16 16:28:13.297757+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1583	2026-02-17 19:03:33.917303+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1584	2026-02-21 12:07:53.459782+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1585	2026-01-31 14:57:15.481172+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1586	2026-02-23 12:31:10.799866+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1587	2026-02-03 09:16:17.638413+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1588	2026-02-05 10:21:55.577452+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1589	2026-02-21 22:29:16.785396+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1590	2026-01-29 17:43:01.519582+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1591	2026-02-02 06:24:18.580572+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1592	2026-02-02 17:01:45.306411+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1593	2026-02-13 23:29:10.857381+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1594	2026-01-31 08:15:30.869452+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1595	2026-02-05 18:38:55.935663+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1596	2026-02-09 06:46:30.06444+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1597	2026-02-21 04:55:24.442711+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1598	2026-02-10 03:19:51.526526+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1599	2026-02-20 22:34:26.260172+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1600	2026-01-29 09:03:30.198073+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1601	2026-02-04 17:51:31.697792+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1602	2026-01-31 19:32:06.610215+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1603	2026-02-04 08:12:41.972104+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1604	2026-02-15 01:23:05.193655+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	true	\N	homekit	\N	\N	\N	\N
1605	2026-02-26 20:35:41.837353+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1606	2026-02-01 20:32:13.133575+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	true	\N	homekit	\N	\N	\N	\N
1607	2026-02-24 11:00:22.390473+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1608	2026-01-29 06:55:23.756425+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1609	2026-02-07 21:55:12.079861+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1610	2026-02-20 20:41:46.172426+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1611	2026-02-14 08:37:36.494356+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1612	2026-02-18 10:02:55.027035+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1613	2026-02-14 23:32:53.433126+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1614	2026-02-03 06:53:16.46234+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1615	2026-02-03 03:28:09.993358+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1616	2026-02-09 19:44:36.409737+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1617	2026-02-02 14:34:39.047664+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1618	2026-02-26 23:21:27.721809+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1619	2026-02-03 22:57:07.483744+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	3	\N	homekit	\N	\N	\N	\N
1620	2026-01-31 19:17:52.364869+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1621	2026-02-26 17:40:26.084378+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1622	2026-02-24 23:41:45.817733+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1623	2026-02-18 23:39:45.705659+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1624	2026-02-20 05:34:41.132847+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1625	2026-02-25 03:40:43.230958+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1626	2026-02-20 05:20:43.612442+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1627	2026-02-20 05:39:40.438168+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1628	2026-02-09 18:41:15.520089+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1629	2026-02-13 10:34:32.159363+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1630	2026-01-31 16:18:21.360995+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1631	2026-02-05 15:25:20.46902+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1632	2026-02-15 04:39:57.54063+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1633	2026-02-06 20:03:10.433075+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1634	2026-02-10 18:05:32.913033+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1635	2026-02-09 05:37:02.377526+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1636	2026-02-06 03:47:11.469284+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1637	2026-02-22 07:24:07.085142+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1638	2026-02-04 08:25:02.119849+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1639	2026-02-23 23:58:07.519212+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1640	2026-01-31 16:17:38.287168+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1641	2026-02-04 00:23:49.517869+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1642	2026-02-14 23:37:01.635289+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1643	2026-02-08 02:50:46.966162+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1644	2026-02-08 06:52:06.854934+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1645	2026-02-06 09:22:37.984472+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1646	2026-02-18 06:51:13.346816+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1647	2026-02-24 03:52:45.456718+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1648	2026-02-03 21:40:54.512544+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1649	2026-01-29 18:05:09.641469+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1650	2026-02-08 10:12:20.623793+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1651	2026-02-22 20:20:29.902948+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1652	2026-02-22 17:36:31.089711+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1653	2026-02-11 08:03:58.194501+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1654	2026-02-05 02:10:29.363948+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1655	2026-02-12 17:54:20.384067+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1656	2026-02-01 03:56:36.141203+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1657	2026-02-25 04:41:06.984487+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1658	2026-02-18 13:49:03.070979+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1659	2026-01-29 16:40:51.355017+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1660	2026-02-27 14:00:06.728051+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1661	2026-02-19 14:50:47.563454+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1662	2026-02-18 08:30:09.264317+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1663	2026-02-10 07:11:35.457295+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1664	2026-02-26 12:55:51.30293+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1665	2026-02-21 07:35:26.728728+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1666	2026-02-26 14:56:16.937313+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1667	2026-02-14 18:36:39.766529+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	1	\N	homekit	\N	\N	\N	\N
1668	2026-02-01 04:02:46.597226+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1669	2026-02-21 17:14:38.284329+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1670	2026-02-14 02:36:48.15852+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1671	2026-02-19 07:01:53.45744+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	23.0	\N	homekit	\N	\N	\N	\N
1672	2026-02-02 05:16:45.023077+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1673	2026-02-04 09:49:48.377576+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	20.0	\N	homekit	\N	\N	\N	\N
1674	2026-02-09 11:01:43.184646+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1675	2026-02-10 12:24:53.524745+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1676	2026-02-20 18:55:59.999176+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1677	2026-02-04 04:39:11.81512+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1678	2026-02-12 08:34:24.291639+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1679	2026-02-26 20:32:50.857032+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1680	2026-02-07 18:18:54.87123+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1681	2026-02-26 19:57:20.750859+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1682	2026-02-27 11:22:25.41884+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1683	2026-02-05 18:46:42.434611+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1684	2026-02-09 05:25:24.578218+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1685	2026-02-09 05:29:56.95771+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1686	2026-02-03 04:56:46.783856+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	23.0	\N	homekit	\N	\N	\N	\N
1687	2026-02-27 15:41:06.230561+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1688	2026-02-09 08:54:05.937331+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1689	2026-02-12 17:57:18.153098+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1690	2026-02-10 19:08:26.350384+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1691	2026-02-12 16:46:04.00754+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1692	2026-02-04 19:28:43.967897+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1693	2026-02-10 03:42:54.441109+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1694	2026-02-23 00:44:29.286078+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1695	2026-02-05 01:31:13.945722+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1696	2026-02-23 01:19:23.601215+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1697	2026-02-18 16:38:59.195295+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1698	2026-02-21 15:45:37.33787+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1699	2026-02-15 15:19:17.775181+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1700	2026-02-27 20:19:55.877676+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1701	2026-02-11 22:14:40.260862+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1702	2026-02-13 12:31:06.319574+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1703	2026-02-20 03:41:37.558717+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1704	2026-02-13 07:50:19.41317+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1705	2026-02-21 07:50:12.811931+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1706	2026-02-06 18:06:45.812884+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1707	2026-01-29 00:51:31.182144+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1708	2026-02-15 14:21:58.971369+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1709	2026-02-26 00:06:55.901538+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1710	2026-02-07 17:02:38.069283+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1711	2026-02-09 07:23:57.303445+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1712	2026-02-19 17:31:48.561127+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1713	2026-02-03 06:24:10.704845+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1714	2026-01-29 19:44:46.568389+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1715	2026-02-08 21:17:47.865284+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	On	\N	1	\N	homekit	\N	\N	\N	\N
1716	2026-02-24 03:31:00.094556+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	true	\N	homekit	\N	\N	\N	\N
1717	2026-02-01 19:16:15.380131+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1718	2026-02-13 19:36:29.954012+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1719	2026-02-04 20:48:36.130974+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1720	2026-02-15 23:09:37.786423+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1721	2026-02-02 03:17:14.710814+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1722	2026-02-07 10:02:21.157937+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1723	2026-02-06 20:28:46.855046+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1724	2026-02-21 10:49:13.453822+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1725	2026-02-25 18:20:38.576538+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1726	2026-02-16 06:19:28.749645+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1727	2026-01-31 13:35:11.590031+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1728	2026-01-31 02:37:46.545345+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1729	2026-02-12 13:29:10.891503+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1730	2026-02-01 20:25:58.896511+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1731	2026-02-19 22:33:22.108447+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1732	2026-02-17 17:17:32.185721+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1733	2026-02-22 18:38:48.430206+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1734	2026-02-19 06:41:57.703719+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1735	2026-02-16 23:58:59.797419+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1736	2026-01-29 06:28:04.631635+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1737	2026-02-19 01:11:34.678771+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1738	2026-02-16 11:26:22.086416+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1739	2026-02-22 07:20:20.802092+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1740	2026-02-19 10:35:42.276227+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1741	2026-02-19 21:10:34.634827+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1742	2026-02-11 03:34:52.287949+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1743	2026-02-03 20:33:41.907971+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	true	\N	homekit	\N	\N	\N	\N
1744	2026-02-20 13:51:57.675206+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1745	2026-01-28 21:20:58.479275+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1746	2026-02-04 22:43:08.533121+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1747	2026-02-08 00:26:46.686586+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1748	2026-02-25 19:24:19.799149+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1749	2026-02-10 05:24:09.692012+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1750	2026-02-05 00:50:56.672501+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1751	2026-02-06 04:51:40.918006+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1752	2026-02-24 21:26:51.962267+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1753	2026-02-06 00:24:46.076217+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1754	2026-02-13 23:38:34.133197+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1755	2026-02-23 12:40:41.702372+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1756	2026-02-21 02:40:17.417101+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1757	2026-02-04 07:40:54.917648+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1758	2026-02-08 04:20:30.546253+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1759	2026-02-12 19:38:35.02375+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1760	2026-02-16 07:56:10.985865+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1761	2026-02-03 06:17:12.808734+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1762	2026-02-25 05:04:41.472931+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1763	2026-02-08 13:00:50.429291+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1764	2026-01-31 19:40:31.416252+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1765	2026-02-20 17:32:10.575655+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1766	2026-02-17 18:25:57.692519+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1767	2026-02-20 11:07:29.83822+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1768	2026-02-05 20:33:11.516527+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1769	2026-02-07 05:25:55.6807+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1770	2026-02-23 12:27:21.51349+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1771	2026-02-24 15:12:14.940991+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	20.0	\N	homekit	\N	\N	\N	\N
1772	2026-02-12 07:53:03.960081+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1773	2026-02-27 18:29:23.546682+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1774	2026-02-27 20:40:48.594797+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1775	2026-02-12 07:29:19.970768+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1776	2026-02-20 23:43:59.287643+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	0	\N	homekit	\N	\N	\N	\N
1777	2026-02-03 07:24:22.431176+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1778	2026-02-24 11:01:08.270056+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1779	2026-01-29 23:28:31.715653+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	3	\N	homekit	\N	\N	\N	\N
1780	2026-02-03 12:52:10.068785+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1781	2026-02-12 13:27:47.06543+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1782	2026-02-03 16:50:41.482362+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1783	2026-02-01 03:25:59.779388+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1784	2026-02-14 09:29:42.672228+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1785	2026-02-09 19:33:28.449349+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	3	\N	homekit	\N	\N	\N	\N
1786	2026-02-18 23:32:15.724446+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1787	2026-02-05 10:20:25.142318+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	LockCurrentState	\N	22.1	\N	homekit	\N	\N	\N	\N
1788	2026-02-20 16:09:41.035878+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1789	2026-02-25 04:05:49.62419+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1790	2026-02-19 02:58:56.346722+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1791	2026-02-23 08:53:18.854894+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1792	2026-02-08 21:23:36.628621+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1793	2026-02-15 11:50:34.420149+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	3	\N	homekit	\N	\N	\N	\N
1794	2026-02-07 03:57:52.042037+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1795	2026-02-06 06:57:51.24259+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1796	2026-02-08 10:47:53.287478+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1797	2026-02-24 19:03:40.655377+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1798	2026-02-21 06:57:32.757282+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1799	2026-01-29 19:39:50.227862+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	23.0	\N	homekit	\N	\N	\N	\N
1800	2026-02-25 23:20:52.563555+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	0	\N	homekit	\N	\N	\N	\N
1801	2026-01-29 13:13:23.089083+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1802	2026-01-29 08:30:27.920295+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1803	2026-02-20 19:01:13.470319+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	false	\N	homekit	\N	\N	\N	\N
1804	2026-02-06 21:55:05.84629+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	false	\N	homekit	\N	\N	\N	\N
1805	2026-02-20 03:54:37.896815+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1806	2026-02-13 07:24:51.249171+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	0	\N	homekit	\N	\N	\N	\N
1807	2026-01-29 02:45:58.624397+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1808	2026-01-31 17:47:22.502874+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	1	\N	homekit	\N	\N	\N	\N
1809	2026-01-30 13:54:04.857958+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	ContactSensorState	\N	2	\N	homekit	\N	\N	\N	\N
1810	2026-02-11 23:14:14.634195+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1811	2026-01-29 12:01:31.363058+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1812	2026-02-27 13:05:42.670192+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	0	\N	homekit	\N	\N	\N	\N
1813	2026-02-16 22:27:19.728417+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1814	2026-02-20 17:51:52.479033+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	23.0	\N	homekit	\N	\N	\N	\N
1815	2026-02-14 04:50:50.828623+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	3	\N	homekit	\N	\N	\N	\N
1816	2026-02-06 16:49:41.803773+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1817	2026-02-16 04:53:08.749096+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1818	2026-02-25 23:39:07.241798+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1819	2026-02-22 10:19:30.832358+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1820	2026-02-06 03:37:34.224059+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1821	2026-02-07 13:10:28.971648+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1822	2026-02-09 09:55:28.855868+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1823	2026-02-17 10:55:44.329479+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	1	\N	homekit	\N	\N	\N	\N
1824	2026-02-09 02:19:25.362312+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1825	2026-01-30 21:17:58.526265+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1826	2026-02-12 01:21:39.799418+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	21.3	\N	homekit	\N	\N	\N	\N
1827	2026-02-07 05:07:43.470022+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	19.5	\N	homekit	\N	\N	\N	\N
1828	2026-02-16 05:56:46.913642+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1829	2026-02-07 23:54:26.451064+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1830	2026-02-05 11:39:50.890691+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1831	2026-02-04 03:31:33.811496+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1832	2026-02-06 22:05:38.879113+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1833	2026-02-09 02:32:34.125401+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1834	2026-02-16 14:06:37.550734+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	23.0	\N	homekit	\N	\N	\N	\N
1835	2026-02-25 10:19:01.055608+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1836	2026-01-31 07:01:43.677163+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1837	2026-02-12 23:49:27.8187+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	21.3	\N	homekit	\N	\N	\N	\N
1838	2026-02-05 13:27:04.753803+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1839	2026-02-12 18:03:18.283919+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1840	2026-02-06 22:05:25.937919+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	0	\N	homekit	\N	\N	\N	\N
1841	2026-01-30 14:11:52.690943+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1842	2026-02-14 14:05:34.994928+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1843	2026-02-12 18:39:39.772871+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1844	2026-02-23 07:26:13.580092+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1845	2026-02-10 20:07:26.235053+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1846	2026-01-29 18:57:00.696437+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1847	2026-02-16 11:31:42.651371+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	MotionDetected	\N	20.0	\N	homekit	\N	\N	\N	\N
1848	2026-02-21 13:13:30.62241+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	MotionDetected	\N	2	\N	homekit	\N	\N	\N	\N
1849	2026-02-24 17:58:50.971911+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	ContactSensorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1850	2026-02-05 20:02:10.132512+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	On	\N	0	\N	homekit	\N	\N	\N	\N
1851	2026-02-24 17:34:09.341518+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	ContactSensorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1852	2026-02-11 16:20:49.503265+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	LockCurrentState	\N	21.3	\N	homekit	\N	\N	\N	\N
1853	2026-02-20 18:46:25.389866+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	2	\N	homekit	\N	\N	\N	\N
1854	2026-02-12 11:15:32.013972+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	19.5	\N	homekit	\N	\N	\N	\N
1855	2026-02-04 20:10:28.716147+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	On	\N	21.3	\N	homekit	\N	\N	\N	\N
1856	2026-01-30 17:00:26.373472+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1857	2026-02-05 09:58:06.306793+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1858	2026-02-15 15:26:54.658432+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1859	2026-02-17 06:33:23.857809+00	AA:11:22:33:44:08	Contact Sensor	Back Door	ContactSensor	CurrentDoorState	\N	1	\N	homekit	\N	\N	\N	\N
1860	2026-02-21 10:07:46.596385+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	On	\N	22.1	\N	homekit	\N	\N	\N	\N
1861	2026-02-14 13:39:03.860085+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1862	2026-02-27 18:43:40.428383+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	1	\N	homekit	\N	\N	\N	\N
1863	2026-02-02 16:45:37.661226+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	On	\N	20.0	\N	homekit	\N	\N	\N	\N
1864	2026-02-08 06:00:56.839816+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	MotionDetected	\N	22.1	\N	homekit	\N	\N	\N	\N
1865	2026-02-17 14:44:30.729981+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	2	\N	homekit	\N	\N	\N	\N
1866	2026-02-19 01:36:37.428998+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	false	\N	homekit	\N	\N	\N	\N
1867	2026-02-15 15:14:29.565017+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentTemperature	\N	3	\N	homekit	\N	\N	\N	\N
1868	2026-02-19 06:41:12.476378+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentTemperature	\N	19.5	\N	homekit	\N	\N	\N	\N
1869	2026-02-07 14:24:26.79987+00	AA:11:22:33:44:01	Living Room Light	Living Room	Lightbulb	LockCurrentState	\N	false	\N	homekit	\N	\N	\N	\N
1870	2026-02-03 19:50:02.05309+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	MotionDetected	\N	0	\N	homekit	\N	\N	\N	\N
1871	2026-02-03 12:57:50.244984+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	21.3	\N	homekit	\N	\N	\N	\N
1872	2026-01-30 05:10:57.048532+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1873	2026-02-20 19:48:42.454635+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	23.0	\N	homekit	\N	\N	\N	\N
1874	2026-02-20 11:11:26.951275+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentDoorState	\N	2	\N	homekit	\N	\N	\N	\N
1875	2026-02-27 06:49:54.816847+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	ContactSensorState	\N	20.0	\N	homekit	\N	\N	\N	\N
1876	2026-01-29 12:14:25.320861+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentTemperature	\N	22.1	\N	homekit	\N	\N	\N	\N
1877	2026-02-05 23:52:19.775546+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	ContactSensorState	\N	1	\N	homekit	\N	\N	\N	\N
1878	2026-02-12 20:16:23.768886+00	AA:11:22:33:44:06	Garage Door	Garage	GarageDoorOpener	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1879	2026-02-25 11:11:14.127647+00	AA:11:22:33:44:05	Thermostat	Living Room	Thermostat	CurrentDoorState	\N	22.1	\N	homekit	\N	\N	\N	\N
1880	2026-01-30 04:55:27.337004+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1881	2026-02-10 06:38:59.150073+00	AA:11:22:33:44:03	Front Door Lock	Entryway	LockMechanism	CurrentTemperature	\N	false	\N	homekit	\N	\N	\N	\N
1882	2026-02-26 04:51:54.672367+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	On	\N	19.5	\N	homekit	\N	\N	\N	\N
1883	2026-02-02 11:47:28.128918+00	AA:11:22:33:44:02	Kitchen Light	Kitchen	Lightbulb	LockCurrentState	\N	19.5	\N	homekit	\N	\N	\N	\N
1884	2026-02-25 17:46:32.861177+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	MotionDetected	\N	3	\N	homekit	\N	\N	\N	\N
1885	2026-02-15 21:25:46.369364+00	AA:11:22:33:44:07	Bedroom Light	Bedroom	Lightbulb	CurrentDoorState	\N	true	\N	homekit	\N	\N	\N	\N
1886	2026-02-08 16:19:40.256818+00	AA:11:22:33:44:04	Motion Sensor	Hallway	MotionSensor	CurrentTemperature	\N	true	\N	homekit	\N	\N	\N	\N
1887	2026-03-01 22:52:35.030356+00	0X1234ABCD:1	0X1234ABCD	\N	\N	cluster:6/attribute:0	\N	on	\N	matter	\N	1	6	0
1888	2026-03-02 00:02:57.744086+00	0X1234ABCD:1	Office Plug	\N	\N	cluster:6/attribute:0	\N	off	\N	matter	ip	1	6	0
\.


--
-- Data for Name: event_logs_archive; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_logs_archive (archived_id, source_id, "timestamp", accessory_id, accessory_name, room_name, service_type, characteristic, old_value, new_value, raw_iid, archived_at, protocol, transport, endpoint_id, cluster_id, attribute_id) FROM stdin;
\.


--
-- Name: alert_deliveries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.alert_deliveries_id_seq', 1, false);


--
-- Name: alert_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.alert_rules_id_seq', 1, false);


--
-- Name: event_logs_archive_archived_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_logs_archive_archived_id_seq', 1, false);


--
-- Name: event_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_logs_id_seq', 1888, true);


--
-- Name: alert_deliveries alert_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_pkey PRIMARY KEY (id);


--
-- Name: alert_rules alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (id);


--
-- Name: event_hourly_agg event_hourly_agg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_hourly_agg
    ADD CONSTRAINT event_hourly_agg_pkey PRIMARY KEY (bucket_day, bucket_hour, accessory_id);


--
-- Name: event_logs_archive event_logs_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_logs_archive
    ADD CONSTRAINT event_logs_archive_pkey PRIMARY KEY (archived_id);


--
-- Name: event_logs event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_logs
    ADD CONSTRAINT event_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_alert_deliveries_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_deliveries_event ON public.alert_deliveries USING btree (event_id);


--
-- Name: idx_alert_deliveries_rule_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_deliveries_rule_sent ON public.alert_deliveries USING btree (rule_id, sent_at DESC);


--
-- Name: idx_alert_rules_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_rules_enabled ON public.alert_rules USING btree (enabled);


--
-- Name: idx_alert_rules_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_rules_updated ON public.alert_rules USING btree (updated_at DESC);


--
-- Name: idx_event_hourly_agg_accessory_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_hourly_agg_accessory_day ON public.event_hourly_agg USING btree (accessory_id, bucket_day DESC);


--
-- Name: idx_event_hourly_agg_accessory_hour_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_hourly_agg_accessory_hour_day ON public.event_hourly_agg USING btree (accessory_name, bucket_hour, bucket_day DESC);


--
-- Name: idx_event_hourly_agg_day_hour; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_hourly_agg_day_hour ON public.event_hourly_agg USING btree (bucket_day DESC, bucket_hour);


--
-- Name: idx_event_hourly_agg_room_hour_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_hourly_agg_room_hour_day ON public.event_hourly_agg USING btree (COALESCE(room_name, 'Unassigned'::text), bucket_hour, bucket_day DESC);


--
-- Name: idx_event_logs_accessory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_accessory ON public.event_logs USING btree (accessory_name);


--
-- Name: idx_event_logs_accessory_id_ts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_accessory_id_ts_id ON public.event_logs USING btree (accessory_id, "timestamp" DESC, id DESC) INCLUDE (accessory_name, room_name, service_type, protocol);


--
-- Name: idx_event_logs_accessory_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_accessory_trgm ON public.event_logs USING gin (accessory_name public.gin_trgm_ops);


--
-- Name: idx_event_logs_accessory_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_accessory_ts ON public.event_logs USING btree (accessory_name, "timestamp" DESC, id DESC);


--
-- Name: idx_event_logs_archive_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_event_logs_archive_source_id ON public.event_logs_archive USING btree (source_id);


--
-- Name: idx_event_logs_char; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_char ON public.event_logs USING btree (characteristic);


--
-- Name: idx_event_logs_char_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_char_ts ON public.event_logs USING btree (characteristic, "timestamp" DESC, id DESC);


--
-- Name: idx_event_logs_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_room ON public.event_logs USING btree (room_name);


--
-- Name: idx_event_logs_room_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_room_ts ON public.event_logs USING btree (room_name, "timestamp" DESC, id DESC);


--
-- Name: idx_event_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_timestamp ON public.event_logs USING btree ("timestamp" DESC);


--
-- Name: idx_event_logs_timestamp_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_timestamp_id ON public.event_logs USING btree ("timestamp" DESC, id DESC);


--
-- Name: idx_event_logs_timestamp_trunc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_timestamp_trunc ON public.event_logs USING btree (date_trunc('hour'::text, ("timestamp" AT TIME ZONE 'UTC'::text)));


--
-- Name: alert_deliveries alert_deliveries_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event_logs(id) ON DELETE SET NULL;


--
-- Name: alert_deliveries alert_deliveries_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict x8RRwLoUlho2wVBBcMBgER5qpk6BFewMqw60XoQNymWjCE2Jb3j1GAMRemDghg0

