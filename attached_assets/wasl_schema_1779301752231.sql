--
-- PostgreSQL database dump
--

\restrict PTIQvflpJlx8aBpZQ3FEEKlddFr5f2I6HJDwPFs1AnfijsJOTOrItWXm9duF00J

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'customer',
    'supplier',
    'delivery_company',
    'admin',
    'driver',
    'delivery_driver'
);


--
-- Name: add_loyalty_points(uuid, integer, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_loyalty_points(_user_id uuid, _points integer, _description text DEFAULT ''::text, _reference_id uuid DEFAULT NULL::uuid, _reference_type text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points, total_earned)
  VALUES (_user_id, _points, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    points = loyalty_points.points + _points,
    total_earned = loyalty_points.total_earned + _points,
    updated_at = now();

  INSERT INTO public.loyalty_points_history (user_id, points, type, description, reference_id, reference_type)
  VALUES (_user_id, _points, 'earn', _description, _reference_id, _reference_type);
END;
$$;


--
-- Name: calculate_service_commission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_service_commission() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.agreed_price IS NOT NULL THEN
    NEW.platform_commission := FLOOR(NEW.agreed_price * NEW.platform_commission_rate / 100);
    NEW.partner_net := NEW.agreed_price - NEW.platform_commission;
    NEW.approved_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: generate_customer_display_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_customer_display_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.customer_display_id := 'عميل #' || (FLOOR(RANDOM() * 9000) + 1000)::TEXT;
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Insert role from metadata, default to customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: redeem_loyalty_points(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_loyalty_points(_user_id uuid, _points integer, _description text DEFAULT 'استبدال نقاط'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _current INTEGER;
BEGIN
  SELECT points INTO _current FROM public.loyalty_points WHERE user_id = _user_id;
  IF _current IS NULL OR _current < _points THEN
    RETURN false;
  END IF;

  UPDATE public.loyalty_points
  SET points = points - _points,
      total_redeemed = total_redeemed + _points,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.loyalty_points_history (user_id, points, type, description)
  VALUES (_user_id, -_points, 'redeem', _description);

  RETURN true;
END;
$$;


--
-- Name: refresh_menu_item_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_menu_item_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target UUID := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  avg_r NUMERIC;
  cnt_r INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO avg_r, cnt_r
  FROM public.menu_item_reviews WHERE menu_item_id = target;
  UPDATE public.menu_items
    SET rating = COALESCE(ROUND(avg_r::numeric, 2), 0),
        total_ratings = COALESCE(cnt_r, 0)
    WHERE id = target;
  RETURN NULL;
END;
$$;


--
-- Name: refresh_restaurant_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_restaurant_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target UUID := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  avg_r NUMERIC;
  cnt_r INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO avg_r, cnt_r
  FROM public.restaurant_reviews WHERE restaurant_id = target;
  UPDATE public.restaurants
    SET rating = COALESCE(ROUND(avg_r::numeric, 2), 0),
        total_ratings = COALESCE(cnt_r, 0)
    WHERE id = target;
  RETURN NULL;
END;
$$;


--
-- Name: touch_rider_cash_collections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_rider_cash_collections() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_favorite_entity_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_favorite_entity_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.entity_type NOT IN ('restaurant', 'menu_item') THEN
    RAISE EXCEPTION 'Invalid entity_type for favorite';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_menu_item_review(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_menu_item_review() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_profile_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_profile_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.account_status IS NOT NULL AND NEW.account_status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid account_status: %. Must be pending, approved, rejected, or suspended.', NEW.account_status;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_review_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_review_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF NEW.entity_type NOT IN ('supplier', 'delivery', 'driver') THEN
    RAISE EXCEPTION 'Invalid entity_type';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_support_message_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_support_message_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'read', 'replied', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, read, replied, or closed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounting_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_settings (
    id integer DEFAULT 1 NOT NULL,
    global_commission_booking numeric(5,2) DEFAULT 10 NOT NULL,
    global_commission_delivery numeric(5,2) DEFAULT 12 NOT NULL,
    global_commission_shipment numeric(5,2) DEFAULT 15 NOT NULL,
    global_commission_ride numeric(5,2) DEFAULT 10 NOT NULL,
    payment_due_days integer DEFAULT 7 NOT NULL,
    auto_suspend_days integer DEFAULT 15 NOT NULL,
    currency text DEFAULT 'YER'::text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: alert_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid,
    triggered_at timestamp with time zone DEFAULT now(),
    metric_value numeric(10,2),
    message text NOT NULL,
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    rule_type text DEFAULT 'error_rate'::text NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    notification_channels text[] DEFAULT ARRAY['dashboard'::text],
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    requester_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT approval_requests_type_check CHECK ((type = ANY (ARRAY['supplier_registration'::text, 'delivery_registration'::text, 'booking'::text, 'shipment'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auto_healing_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_healing_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    description text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    seat_count integer DEFAULT 1 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    status text DEFAULT 'confirmed'::text,
    created_at timestamp with time zone DEFAULT now(),
    payer_name text,
    payer_phone text,
    payment_receipt_url text,
    customer_notes text,
    CONSTRAINT bookings_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'direct_to_supplier'::text]))),
    CONSTRAINT bookings_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending_approval'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: bulk_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid,
    target_role text,
    title text NOT NULL,
    body text NOT NULL,
    sound text DEFAULT 'default'::text,
    image_url text,
    action_url text,
    status text DEFAULT 'pending'::text,
    sent_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone
);


--
-- Name: cancellation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancellation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    refund_amount numeric DEFAULT 0,
    refund_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    restaurant_id uuid,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_amount numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    admin_id uuid,
    subject text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    merchant_name text NOT NULL,
    merchant_phone text,
    link_token text DEFAULT (gen_random_uuid())::text NOT NULL,
    is_active boolean DEFAULT true,
    clicks integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: custom_regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    parent_region_id integer,
    submitted_by uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    address_name text NOT NULL,
    full_address text NOT NULL,
    latitude double precision,
    longitude double precision,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    city text,
    district text,
    street text,
    building_number text,
    landmark text,
    phone text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_performance_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_performance_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stat_date date NOT NULL,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    total_trips integer DEFAULT 0,
    total_shipments integer DEFAULT 0,
    total_deliveries integer DEFAULT 0,
    total_rides integer DEFAULT 0,
    total_transactions integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    platform_commission numeric(12,2) DEFAULT 0,
    avg_response_time numeric(10,2) DEFAULT 0,
    error_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    delivery_partner_id uuid,
    restaurant_name text,
    items jsonb DEFAULT '[]'::jsonb,
    delivery_address text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: delivery_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid,
    title text,
    subtitle text,
    image_url text NOT NULL,
    link_tab text DEFAULT 'restaurants'::text,
    badge_text text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    city text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    banner_type text DEFAULT 'carousel'::text,
    tile_action text DEFAULT 'restaurants'::text,
    tile_gradient text DEFAULT 'from-orange-500 to-amber-500'::text,
    link_url text,
    CONSTRAINT delivery_banners_banner_type_check CHECK ((banner_type = ANY (ARRAY['carousel'::text, 'offer'::text, 'service_tile'::text, 'delivery_request'::text])))
);


--
-- Name: delivery_company_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_company_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid,
    title text NOT NULL,
    description text,
    offer_type text NOT NULL,
    discount_percent numeric,
    discount_amount numeric,
    min_order_amount numeric,
    active_days text[],
    start_time text,
    end_time text,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    delivery_company_id uuid,
    license_number text,
    vehicle_type text DEFAULT 'motorcycle'::text,
    vehicle_plate text,
    is_approved boolean DEFAULT false,
    is_online boolean DEFAULT false,
    current_lat double precision,
    current_lng double precision,
    total_deliveries integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    total_earnings numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    restaurant_id uuid,
    customer_id uuid,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_address text NOT NULL,
    delivery_lat double precision,
    delivery_lng double precision,
    order_type text DEFAULT 'restaurant'::text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    payment_status text DEFAULT 'pending'::text,
    status text DEFAULT 'pending'::text,
    rider_id uuid,
    assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    notes text,
    estimated_delivery_time timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proposed_price numeric(10,2),
    final_price numeric(10,2),
    customer_accepted boolean DEFAULT false,
    negotiation_status text DEFAULT 'pending'::text,
    price_offered_at timestamp with time zone,
    price_accepted_at timestamp with time zone,
    customer_phone_hidden boolean DEFAULT true,
    barcode text,
    qr_code_url text,
    payment_proof_url text,
    proof_submitted_at timestamp with time zone
);

ALTER TABLE ONLY public.delivery_orders REPLICA IDENTITY FULL;


--
-- Name: delivery_proof; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_proof (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_type text NOT NULL,
    order_id uuid NOT NULL,
    barcode_scanned boolean DEFAULT false,
    scanned_at timestamp with time zone,
    scanned_by uuid,
    recipient_name text,
    signature_url text,
    photo_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_quote_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_quote_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid,
    customer_address text NOT NULL,
    delivery_lat numeric,
    delivery_lng numeric,
    quoted_fee numeric,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    zone_name text NOT NULL,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    estimated_time text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: driver_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    document_type text DEFAULT 'id_front'::text NOT NULL,
    document_url text NOT NULL,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: driver_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    lat double precision DEFAULT 0 NOT NULL,
    lng double precision DEFAULT 0 NOT NULL,
    heading double precision,
    speed double precision,
    is_online boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    license_number text,
    license_expiry date,
    years_experience integer,
    bio text,
    is_approved boolean DEFAULT false,
    approval_date timestamp with time zone,
    rejection_reason text,
    total_trips integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    total_earnings numeric(10,2) DEFAULT 0,
    is_online boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_of_birth date
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    error_code text,
    error_message text NOT NULL,
    stack_trace text,
    endpoint text,
    user_id uuid,
    request_data jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'error'::text,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_type text NOT NULL,
    reference_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    platform_commission numeric(10,2) DEFAULT 0 NOT NULL,
    partner_earning numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    due_date date,
    paid_at timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_transaction_id uuid,
    partner_name text,
    partner_phone text,
    partner_bank_account text,
    transaction_date date,
    transaction_time time without time zone,
    CONSTRAINT financial_transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'wallet'::text, 'later'::text]))),
    CONSTRAINT financial_transactions_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text]))),
    CONSTRAINT financial_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['booking'::text, 'shipment'::text, 'delivery'::text, 'ride'::text])))
);


--
-- Name: generated_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text DEFAULT 'daily'::text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    title text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb,
    file_url text,
    status text DEFAULT 'completed'::text NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invitation_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitation_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token text DEFAULT (gen_random_uuid())::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_redeemed integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_points_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_points_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    points integer NOT NULL,
    type text DEFAULT 'earn'::text NOT NULL,
    description text,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    name_ar text NOT NULL,
    name_en text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    description text,
    image_url text
);


--
-- Name: menu_item_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid,
    name_ar text NOT NULL,
    name_en text,
    option_type text,
    choices jsonb DEFAULT '[]'::jsonb,
    is_required boolean DEFAULT false,
    max_selections integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT menu_item_options_option_type_check CHECK ((option_type = ANY (ARRAY['single'::text, 'multiple'::text, 'size'::text, 'extra'::text, 'remove'::text])))
);


--
-- Name: menu_item_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid,
    customer_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    review text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    category_id uuid,
    name_ar text NOT NULL,
    name_en text,
    description text,
    price numeric(10,2) NOT NULL,
    discounted_price numeric(10,2),
    image_url text,
    preparation_time integer,
    is_available boolean DEFAULT true,
    options jsonb DEFAULT '[]'::jsonb,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_featured boolean DEFAULT false,
    is_popular boolean DEFAULT false,
    calories integer,
    ingredients text[],
    promo_type text,
    promo_value numeric,
    promo_text text,
    promo_active boolean DEFAULT false,
    rating numeric(3,2) DEFAULT 0,
    total_ratings integer DEFAULT 0,
    promo_starts_at timestamp with time zone,
    promo_ends_at timestamp with time zone,
    promo_active_days text[],
    promo_start_time text,
    promo_end_time text
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    type text,
    sound text,
    is_read boolean DEFAULT false,
    sent_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enable_push_notifications boolean DEFAULT true,
    enable_sound boolean DEFAULT true,
    vibration_enabled boolean DEFAULT true,
    notify_trip_reminders boolean DEFAULT true,
    notify_shipment_updates boolean DEFAULT true,
    notify_delivery_updates boolean DEFAULT true,
    notify_ride_requests boolean DEFAULT true,
    notify_promotions boolean DEFAULT true,
    notify_payments boolean DEFAULT true,
    notification_sound text DEFAULT 'default'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    data jsonb DEFAULT '{}'::jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    notification_type text DEFAULT 'system'::text
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: order_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_type text NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'text'::text,
    attachment_url text,
    is_read boolean DEFAULT false,
    is_blocked boolean DEFAULT false,
    block_reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    status text NOT NULL,
    location_lat double precision,
    location_lng double precision,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: partner_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    account_name text NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    iban text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partner_commission_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_commission_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    commission_type text DEFAULT 'percentage'::text,
    commission_value numeric(5,2) DEFAULT 10 NOT NULL,
    override_global boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT partner_commission_settings_commission_type_check CHECK ((commission_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: partner_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    invoice_number text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_commission numeric(10,2) DEFAULT 0 NOT NULL,
    net_amount numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text,
    status text DEFAULT 'pending'::text,
    due_date date NOT NULL,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    period_type text,
    pdf_url text,
    CONSTRAINT partner_invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: partner_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    business_name text NOT NULL,
    business_type text DEFAULT 'restaurant'::text,
    contact_name text,
    contact_phone text NOT NULL,
    contact_email text,
    address text,
    notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: partner_price_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_price_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    service_type text NOT NULL,
    from_city text NOT NULL,
    to_city text NOT NULL,
    item_description text,
    reference_price numeric(10,0) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT partner_price_references_service_type_check CHECK ((service_type = ANY (ARRAY['shipment'::text, 'delivery'::text, 'taxi'::text])))
);


--
-- Name: partner_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_settings (
    partner_id uuid NOT NULL,
    allow_direct_payment boolean DEFAULT false,
    cash_on_delivery_enabled boolean DEFAULT true,
    cash_on_ride_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price_per_km double precision DEFAULT 0,
    min_delivery_fee double precision DEFAULT 0
);


--
-- Name: payment_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    account_type text NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    iban text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['platform'::text, 'partner'::text])))
);


--
-- Name: payment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    amount_paid numeric(10,2) NOT NULL,
    payment_method text,
    payment_date timestamp with time zone DEFAULT now(),
    received_by uuid,
    notes text,
    CONSTRAINT payment_logs_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'wallet'::text])))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    related_entity_id uuid NOT NULL,
    entity_type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    transfer_receipt_url text,
    transfer_reference text,
    status text DEFAULT 'pending'::text,
    verified_by uuid,
    verified_at timestamp with time zone,
    notes text,
    partner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_transactions_entity_type_check CHECK ((entity_type = ANY (ARRAY['booking'::text, 'shipment'::text, 'delivery'::text, 'ride'::text]))),
    CONSTRAINT payment_transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['bank_transfer'::text, 'cash'::text, 'wallet'::text]))),
    CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'completed'::text])))
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    partner_role text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    bank_account_details jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    iban text,
    swift_code text,
    is_active boolean DEFAULT true NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: privacy_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    phone text,
    city text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    company_name text,
    id_number text,
    id_image_front text,
    id_image_back text,
    selfie_image text,
    license_image text,
    vehicle_type text,
    vehicle_model text,
    vehicle_color text,
    vehicle_plate text,
    vehicle_image text,
    is_verified boolean DEFAULT false,
    rejection_reason text,
    account_status text DEFAULT 'approved'::text,
    phone_secondary text,
    address text,
    onesignal_player_id text,
    violations_count integer DEFAULT 0,
    last_violation_date timestamp with time zone,
    full_name_arabic text,
    phone_verified boolean DEFAULT false,
    default_lat double precision,
    default_lng double precision,
    default_address text,
    google_id text,
    trial_start_date timestamp with time zone,
    trial_end_date timestamp with time zone,
    is_trial_active boolean DEFAULT false,
    description text,
    profile_completed boolean DEFAULT false
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    delivery_company_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    discount_type text DEFAULT 'percentage'::text,
    discount_value numeric DEFAULT 0,
    min_order_amount numeric DEFAULT 0,
    max_discount numeric,
    promo_code text,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    is_active boolean DEFAULT true,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name_ar text NOT NULL,
    type text NOT NULL,
    parent_id integer,
    is_active boolean DEFAULT true,
    CONSTRAINT regions_type_check CHECK ((type = ANY (ARRAY['city'::text, 'governorate'::text, 'country'::text])))
);


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: request_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    message text NOT NULL,
    is_blocked boolean DEFAULT false,
    block_reason text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT request_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['customer'::text, 'partner'::text, 'admin'::text])))
);


--
-- Name: restaurant_cuisines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_cuisines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: restaurant_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    title text NOT NULL,
    description text,
    discount_percentage numeric,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    sort_order integer DEFAULT 0
);


--
-- Name: restaurant_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    customer_id uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    logo_url text,
    cover_image text,
    phone text,
    address text,
    location_lat double precision,
    location_lng double precision,
    is_active boolean DEFAULT true,
    commission_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    cuisine_type text[],
    opening_hours jsonb,
    is_featured boolean DEFAULT false,
    rating numeric(3,2) DEFAULT 0,
    total_ratings integer DEFAULT 0,
    min_order_amount numeric(10,2) DEFAULT 0,
    delivery_fee numeric(10,2) DEFAULT 0,
    estimated_delivery_time integer,
    city text,
    coverage_areas text[] DEFAULT '{}'::text[],
    latitude double precision,
    longitude double precision,
    price_per_km double precision DEFAULT 0,
    cover_image_url text
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewee_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    rating_punctuality integer,
    rating_cleanliness integer,
    rating_communication integer
);


--
-- Name: ride_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ride_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    driver_id uuid,
    from_city text NOT NULL,
    to_city text NOT NULL,
    from_address text,
    to_address text,
    ride_type text DEFAULT 'one_way'::text,
    passenger_count integer DEFAULT 1,
    notes text,
    status text DEFAULT 'pending'::text,
    proposed_price numeric(10,2),
    final_price numeric(10,2),
    customer_accepted boolean DEFAULT false,
    negotiation_status text DEFAULT 'pending'::text,
    price_offered_at timestamp with time zone,
    price_accepted_at timestamp with time zone,
    customer_phone_hidden boolean DEFAULT true,
    barcode text,
    qr_code_url text,
    payment_method text DEFAULT 'cash'::text,
    payment_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pickup_lat double precision,
    pickup_lng double precision,
    dropoff_lat double precision,
    dropoff_lng double precision,
    assigned_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancellation_reason text,
    waiting_time integer
);


--
-- Name: rider_cash_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rider_cash_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rider_id uuid NOT NULL,
    delivery_company_id uuid NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending_pickup'::text NOT NULL,
    collected_at timestamp with time zone,
    settled_at timestamp with time zone,
    settled_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rider_cash_collections_status_check CHECK ((status = ANY (ARRAY['pending_pickup'::text, 'collected'::text, 'settled'::text, 'cancelled'::text])))
);


--
-- Name: rider_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rider_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    rider_id uuid,
    type text DEFAULT 'bonus'::text,
    amount numeric(10,2),
    description text,
    achieved_at timestamp with time zone DEFAULT now()
);


--
-- Name: riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_company_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    profile_image text,
    vehicle_type text DEFAULT 'motorcycle'::text,
    vehicle_plate text,
    id_number text,
    is_active boolean DEFAULT true,
    is_online boolean DEFAULT false,
    current_lat double precision,
    current_lng double precision,
    last_location_update timestamp with time zone,
    total_deliveries integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    earnings numeric(10,2) DEFAULT 0,
    commission_type text DEFAULT 'percentage'::text,
    commission_value numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    is_approved boolean DEFAULT false NOT NULL
);


--
-- Name: rides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    driver_id uuid,
    customer_id uuid NOT NULL,
    pickup_location text,
    dropoff_location text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    platform_commission numeric(10,2) DEFAULT 0,
    driver_earning numeric(10,2) DEFAULT 0,
    status text DEFAULT 'assigned'::text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    distance_km double precision,
    rating_by_customer integer,
    rating_by_driver integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_number text DEFAULT ('REQ-'::text || (EXTRACT(epoch FROM now()))::text) NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending_price'::text NOT NULL,
    customer_id uuid NOT NULL,
    customer_display_id text DEFAULT ''::text NOT NULL,
    partner_id uuid,
    partner_type text,
    from_city text NOT NULL,
    to_city text NOT NULL,
    from_address text,
    to_address text,
    description text,
    quantity integer DEFAULT 1,
    notes text,
    receiver_name text,
    receiver_phone_masked text,
    receiver_phone text,
    proposed_price numeric(10,0),
    agreed_price numeric(10,0),
    platform_commission_rate numeric(5,2) DEFAULT 10.00,
    platform_commission numeric(10,0),
    partner_net numeric(10,0),
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    whatsapp_shared boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    from_lat double precision,
    from_lng double precision,
    to_lat double precision,
    to_lng double precision,
    distance_km numeric(8,2),
    estimated_price numeric(10,2),
    service_subtype text,
    package_size text,
    sender_name text,
    sender_phone text,
    CONSTRAINT service_requests_partner_type_check CHECK ((partner_type = ANY (ARRAY['supplier'::text, 'delivery'::text, 'taxi'::text]))),
    CONSTRAINT service_requests_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text]))),
    CONSTRAINT service_requests_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text]))),
    CONSTRAINT service_requests_status_check CHECK ((status = ANY (ARRAY['pending_price'::text, 'price_sent'::text, 'approved'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT service_requests_type_check CHECK ((type = ANY (ARRAY['shipment'::text, 'delivery'::text, 'taxi'::text])))
);


--
-- Name: service_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    shipment_type text NOT NULL,
    pickup_address text,
    pickup_lat double precision,
    pickup_lng double precision,
    delivery_address text,
    delivery_lat double precision,
    delivery_lng double precision,
    recipient_name text,
    recipient_phone text,
    item_description text,
    item_weight numeric(10,2),
    item_dimensions text,
    images text[] DEFAULT '{}'::text[],
    status text DEFAULT 'pending_approval'::text,
    admin_approved boolean DEFAULT false,
    supplier_priced boolean DEFAULT false,
    price numeric(10,2),
    payment_method text,
    barcode text,
    tracking_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proposed_price numeric(10,2),
    final_price numeric(10,2),
    customer_accepted boolean DEFAULT false,
    negotiation_status text DEFAULT 'pending'::text,
    price_offered_at timestamp with time zone,
    price_accepted_at timestamp with time zone,
    customer_phone_hidden boolean DEFAULT true,
    qr_code_url text,
    pickup_landmark text,
    delivery_landmark text,
    CONSTRAINT shipment_requests_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'direct_to_supplier'::text]))),
    CONSTRAINT shipment_requests_shipment_type_check CHECK ((shipment_type = ANY (ARRAY['door_to_door'::text, 'office_to_office'::text]))),
    CONSTRAINT shipment_requests_status_check CHECK ((status = ANY (ARRAY['pending_approval'::text, 'pending_pricing'::text, 'priced'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    supplier_id uuid,
    pickup_location text NOT NULL,
    delivery_location text NOT NULL,
    weight numeric,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_public_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_public_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    image_url text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: supplier_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    reference_id uuid,
    category text,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT supplier_transactions_type_check CHECK ((type = ANY (ARRAY['platform_payout'::text, 'external_income'::text, 'external_expense'::text, 'adjustment'::text])))
);


--
-- Name: supplier_working_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_working_areas (
    supplier_id uuid NOT NULL,
    region_id integer NOT NULL
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name text NOT NULL,
    user_email text,
    user_phone text,
    message text NOT NULL,
    status text DEFAULT 'pending'::text,
    admin_reply text,
    replied_by uuid,
    replied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_event_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_event_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    entity_id uuid,
    entity_type text,
    user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'info'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(10,2) NOT NULL,
    tags jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    partner_id uuid,
    type text NOT NULL,
    reference_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    platform_fee numeric DEFAULT 0 NOT NULL,
    partner_earning numeric DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    refunded_at timestamp with time zone
);


--
-- Name: trip_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_types (
    id integer NOT NULL,
    name_ar text NOT NULL,
    slug text NOT NULL
);


--
-- Name: trip_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trip_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trip_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trip_types_id_seq OWNED BY public.trip_types.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    from_city text NOT NULL,
    to_city text NOT NULL,
    departure_time timestamp with time zone NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    available_seats integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type_id integer,
    period text,
    from_region_id integer,
    to_region_id integer,
    bus_company text,
    bus_number text,
    amenities jsonb DEFAULT '[]'::jsonb,
    notes text,
    is_offer boolean DEFAULT false,
    offer_type text,
    offer_value numeric(10,2),
    offer_until timestamp with time zone,
    image_url text,
    departure_days text[],
    check_in_time text,
    check_in_location text,
    luggage_weight text,
    description text,
    trip_type text DEFAULT 'عادي'::text,
    arrival_time text,
    capacity integer,
    driver_phone text,
    CONSTRAINT trips_offer_type_check CHECK ((offer_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
    CONSTRAINT trips_period_check CHECK ((period = ANY (ARRAY['morning'::text, 'evening'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    vehicle_type text DEFAULT 'car'::text NOT NULL,
    brand text DEFAULT ''::text NOT NULL,
    model text DEFAULT ''::text NOT NULL,
    year integer,
    color text,
    plate_number text DEFAULT ''::text NOT NULL,
    insurance_number text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    image_url text
);


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: violation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.violation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    violation_type text,
    details text,
    related_entity_id uuid,
    severity text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT violation_logs_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT violation_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text]))),
    CONSTRAINT violation_logs_violation_type_check CHECK ((violation_type = ANY (ARRAY['phone_number'::text, 'whatsapp_link'::text, 'external_contact'::text, 'other'::text])))
);


--
-- Name: whatsapp_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_type text NOT NULL,
    driver_phone text NOT NULL,
    message_sent text,
    status text DEFAULT 'sent'::text,
    sent_at timestamp with time zone DEFAULT now()
);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: trip_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_types ALTER COLUMN id SET DEFAULT nextval('public.trip_types_id_seq'::regclass);


--
-- Name: accounting_settings accounting_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_settings
    ADD CONSTRAINT accounting_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: alert_history alert_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT alert_history_pkey PRIMARY KEY (id);


--
-- Name: alert_rules alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auto_healing_logs auto_healing_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_healing_logs
    ADD CONSTRAINT auto_healing_logs_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bulk_notifications bulk_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_notifications
    ADD CONSTRAINT bulk_notifications_pkey PRIMARY KEY (id);


--
-- Name: cancellation_requests cancellation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_requests
    ADD CONSTRAINT cancellation_requests_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_links custom_links_link_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_links
    ADD CONSTRAINT custom_links_link_token_key UNIQUE (link_token);


--
-- Name: custom_links custom_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_links
    ADD CONSTRAINT custom_links_pkey PRIMARY KEY (id);


--
-- Name: custom_regions custom_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_regions
    ADD CONSTRAINT custom_regions_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_favorites customer_favorites_customer_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_customer_id_entity_type_entity_id_key UNIQUE (customer_id, entity_type, entity_id);


--
-- Name: customer_favorites customer_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_pkey PRIMARY KEY (id);


--
-- Name: daily_performance_stats daily_performance_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_performance_stats
    ADD CONSTRAINT daily_performance_stats_pkey PRIMARY KEY (id);


--
-- Name: daily_performance_stats daily_performance_stats_stat_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_performance_stats
    ADD CONSTRAINT daily_performance_stats_stat_date_key UNIQUE (stat_date);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: delivery_banners delivery_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_banners
    ADD CONSTRAINT delivery_banners_pkey PRIMARY KEY (id);


--
-- Name: delivery_company_offers delivery_company_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_company_offers
    ADD CONSTRAINT delivery_company_offers_pkey PRIMARY KEY (id);


--
-- Name: delivery_drivers delivery_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_drivers
    ADD CONSTRAINT delivery_drivers_pkey PRIMARY KEY (id);


--
-- Name: delivery_drivers delivery_drivers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_drivers
    ADD CONSTRAINT delivery_drivers_user_id_key UNIQUE (user_id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: delivery_proof delivery_proof_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_proof
    ADD CONSTRAINT delivery_proof_pkey PRIMARY KEY (id);


--
-- Name: delivery_quote_requests delivery_quote_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_quote_requests
    ADD CONSTRAINT delivery_quote_requests_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: driver_documents driver_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_documents
    ADD CONSTRAINT driver_documents_pkey PRIMARY KEY (id);


--
-- Name: driver_locations driver_locations_driver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_driver_id_key UNIQUE (driver_id);


--
-- Name: driver_locations driver_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: financial_transactions financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: generated_reports generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (id);


--
-- Name: invitation_tokens invitation_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_pkey PRIMARY KEY (id);


--
-- Name: invitation_tokens invitation_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_token_key UNIQUE (token);


--
-- Name: loyalty_points_history loyalty_points_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points_history
    ADD CONSTRAINT loyalty_points_history_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_item_options menu_item_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_pkey PRIMARY KEY (id);


--
-- Name: menu_item_reviews menu_item_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_reviews
    ADD CONSTRAINT menu_item_reviews_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_messages order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_messages
    ADD CONSTRAINT order_messages_pkey PRIMARY KEY (id);


--
-- Name: order_tracking order_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_pkey PRIMARY KEY (id);


--
-- Name: partner_bank_accounts partner_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_bank_accounts
    ADD CONSTRAINT partner_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: partner_commission_settings partner_commission_settings_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_commission_settings
    ADD CONSTRAINT partner_commission_settings_partner_id_key UNIQUE (partner_id);


--
-- Name: partner_commission_settings partner_commission_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_commission_settings
    ADD CONSTRAINT partner_commission_settings_pkey PRIMARY KEY (id);


--
-- Name: partner_invoices partner_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invoices
    ADD CONSTRAINT partner_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: partner_invoices partner_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invoices
    ADD CONSTRAINT partner_invoices_pkey PRIMARY KEY (id);


--
-- Name: partner_join_requests partner_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_join_requests
    ADD CONSTRAINT partner_join_requests_pkey PRIMARY KEY (id);


--
-- Name: partner_price_references partner_price_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_price_references
    ADD CONSTRAINT partner_price_references_pkey PRIMARY KEY (id);


--
-- Name: partner_settings partner_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_settings
    ADD CONSTRAINT partner_settings_pkey PRIMARY KEY (partner_id);


--
-- Name: payment_accounts payment_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_accounts
    ADD CONSTRAINT payment_accounts_pkey PRIMARY KEY (id);


--
-- Name: payment_logs payment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_logs
    ADD CONSTRAINT payment_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: platform_bank_accounts platform_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_bank_accounts
    ADD CONSTRAINT platform_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: privacy_policies privacy_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_policies
    ADD CONSTRAINT privacy_policies_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: request_messages request_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_messages
    ADD CONSTRAINT request_messages_pkey PRIMARY KEY (id);


--
-- Name: restaurant_cuisines restaurant_cuisines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_cuisines
    ADD CONSTRAINT restaurant_cuisines_pkey PRIMARY KEY (id);


--
-- Name: restaurant_promotions restaurant_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_promotions
    ADD CONSTRAINT restaurant_promotions_pkey PRIMARY KEY (id);


--
-- Name: restaurant_reviews restaurant_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_reviews
    ADD CONSTRAINT restaurant_reviews_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: ride_requests ride_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ride_requests
    ADD CONSTRAINT ride_requests_pkey PRIMARY KEY (id);


--
-- Name: rider_cash_collections rider_cash_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_cash_collections
    ADD CONSTRAINT rider_cash_collections_pkey PRIMARY KEY (id);


--
-- Name: rider_rewards rider_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_rewards
    ADD CONSTRAINT rider_rewards_pkey PRIMARY KEY (id);


--
-- Name: riders riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT riders_pkey PRIMARY KEY (id);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: rides rides_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_request_id_key UNIQUE (request_id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_request_number_key UNIQUE (request_number);


--
-- Name: service_types service_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_types
    ADD CONSTRAINT service_types_pkey PRIMARY KEY (id);


--
-- Name: shipment_requests shipment_requests_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_requests
    ADD CONSTRAINT shipment_requests_barcode_key UNIQUE (barcode);


--
-- Name: shipment_requests shipment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_requests
    ADD CONSTRAINT shipment_requests_pkey PRIMARY KEY (id);


--
-- Name: shipment_requests shipment_requests_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_requests
    ADD CONSTRAINT shipment_requests_tracking_number_key UNIQUE (tracking_number);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: supplier_public_images supplier_public_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_public_images
    ADD CONSTRAINT supplier_public_images_pkey PRIMARY KEY (id);


--
-- Name: supplier_transactions supplier_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_transactions
    ADD CONSTRAINT supplier_transactions_pkey PRIMARY KEY (id);


--
-- Name: supplier_working_areas supplier_working_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_working_areas
    ADD CONSTRAINT supplier_working_areas_pkey PRIMARY KEY (supplier_id, region_id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: system_event_logs system_event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_event_logs
    ADD CONSTRAINT system_event_logs_pkey PRIMARY KEY (id);


--
-- Name: system_metrics system_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: trip_types trip_types_name_ar_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_types
    ADD CONSTRAINT trip_types_name_ar_key UNIQUE (name_ar);


--
-- Name: trip_types trip_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_types
    ADD CONSTRAINT trip_types_pkey PRIMARY KEY (id);


--
-- Name: trip_types trip_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_types
    ADD CONSTRAINT trip_types_slug_key UNIQUE (slug);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: violation_logs violation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_logs
    ADD CONSTRAINT violation_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_logs whatsapp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_alert_history_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_history_triggered ON public.alert_history USING btree (triggered_at DESC);


--
-- Name: idx_alert_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_rules_active ON public.alert_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_auto_healing_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_healing_logs_created ON public.auto_healing_logs USING btree (created_at DESC);


--
-- Name: idx_customer_addresses_customer_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_customer_default ON public.customer_addresses USING btree (customer_id, is_default);


--
-- Name: idx_daily_stats_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_stats_date ON public.daily_performance_stats USING btree (stat_date DESC);


--
-- Name: idx_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_created_at ON public.error_logs USING btree (created_at DESC);


--
-- Name: idx_error_logs_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_resolved ON public.error_logs USING btree (is_resolved);


--
-- Name: idx_event_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_created_at ON public.system_event_logs USING btree (created_at DESC);


--
-- Name: idx_event_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_logs_type ON public.system_event_logs USING btree (event_type);


--
-- Name: idx_favorites_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_customer ON public.customer_favorites USING btree (customer_id);


--
-- Name: idx_favorites_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_entity ON public.customer_favorites USING btree (entity_type, entity_id);


--
-- Name: idx_generated_reports_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_type_date ON public.generated_reports USING btree (report_type, period_end DESC);


--
-- Name: idx_loyalty_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_history_user ON public.loyalty_points_history USING btree (user_id);


--
-- Name: idx_loyalty_points_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_loyalty_points_user ON public.loyalty_points USING btree (user_id);


--
-- Name: idx_menu_item_reviews_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_reviews_customer ON public.menu_item_reviews USING btree (customer_id);


--
-- Name: idx_menu_item_reviews_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_reviews_item ON public.menu_item_reviews USING btree (menu_item_id);


--
-- Name: idx_menu_items_promo_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_promo_active ON public.menu_items USING btree (promo_active, promo_ends_at) WHERE (promo_active = true);


--
-- Name: idx_notifications_sent_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_sent_by ON public.notifications USING btree (sent_by);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (notification_type);


--
-- Name: idx_rider_cash_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rider_cash_company_status ON public.rider_cash_collections USING btree (delivery_company_id, status);


--
-- Name: idx_rider_cash_one_active_per_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rider_cash_one_active_per_order ON public.rider_cash_collections USING btree (order_id) WHERE (status = ANY (ARRAY['pending_pickup'::text, 'collected'::text]));


--
-- Name: idx_rider_cash_rider_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rider_cash_rider_status ON public.rider_cash_collections USING btree (rider_id, status);


--
-- Name: idx_riders_company_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riders_company_email ON public.riders USING btree (delivery_company_id, email);


--
-- Name: idx_riders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riders_user_id ON public.riders USING btree (user_id);


--
-- Name: idx_system_metrics_name_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_metrics_name_time ON public.system_metrics USING btree (metric_name, created_at DESC);


--
-- Name: service_requests on_service_request_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_service_request_update BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.calculate_service_commission();


--
-- Name: service_requests set_customer_display_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_customer_display_id BEFORE INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.generate_customer_display_id();


--
-- Name: menu_item_reviews trg_refresh_menu_item_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_refresh_menu_item_rating AFTER INSERT OR DELETE OR UPDATE ON public.menu_item_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_menu_item_rating();


--
-- Name: restaurant_reviews trg_refresh_restaurant_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_refresh_restaurant_rating AFTER INSERT OR DELETE OR UPDATE ON public.restaurant_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_restaurant_rating();


--
-- Name: rider_cash_collections trg_touch_rider_cash_collections; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_rider_cash_collections BEFORE UPDATE ON public.rider_cash_collections FOR EACH ROW EXECUTE FUNCTION public.touch_rider_cash_collections();


--
-- Name: customer_favorites trg_validate_favorite_entity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_favorite_entity BEFORE INSERT OR UPDATE ON public.customer_favorites FOR EACH ROW EXECUTE FUNCTION public.validate_favorite_entity_type();


--
-- Name: menu_item_reviews trg_validate_menu_item_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_menu_item_review BEFORE INSERT OR UPDATE ON public.menu_item_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_menu_item_review();


--
-- Name: reviews trg_validate_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_review BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();


--
-- Name: admin_settings update_admin_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: privacy_policies update_privacy_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_privacy_policies_updated_at BEFORE UPDATE ON public.privacy_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: trips update_trips_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles validate_profile_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_profile_status_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_status();


--
-- Name: support_messages validate_support_message_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_support_message_status_trigger BEFORE INSERT OR UPDATE ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.validate_support_message_status();


--
-- Name: admin_settings admin_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: alert_history alert_history_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT alert_history_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: bookings bookings_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: carts carts_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: custom_regions custom_regions_parent_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_regions
    ADD CONSTRAINT custom_regions_parent_region_id_fkey FOREIGN KEY (parent_region_id) REFERENCES public.regions(id);


--
-- Name: delivery_banners delivery_banners_delivery_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_banners
    ADD CONSTRAINT delivery_banners_delivery_company_id_fkey FOREIGN KEY (delivery_company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: delivery_company_offers delivery_company_offers_delivery_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_company_offers
    ADD CONSTRAINT delivery_company_offers_delivery_company_id_fkey FOREIGN KEY (delivery_company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: delivery_drivers delivery_drivers_delivery_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_drivers
    ADD CONSTRAINT delivery_drivers_delivery_company_id_fkey FOREIGN KEY (delivery_company_id) REFERENCES auth.users(id);


--
-- Name: delivery_drivers delivery_drivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_drivers
    ADD CONSTRAINT delivery_drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: delivery_orders delivery_orders_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: delivery_orders delivery_orders_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: driver_documents driver_documents_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_documents
    ADD CONSTRAINT driver_documents_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- Name: driver_locations driver_locations_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: menu_item_options menu_item_options_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_reviews menu_item_reviews_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_reviews
    ADD CONSTRAINT menu_item_reviews_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: order_tracking order_tracking_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;


--
-- Name: payment_logs payment_logs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_logs
    ADD CONSTRAINT payment_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.partner_invoices(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: regions regions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.regions(id);


--
-- Name: request_messages request_messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_messages
    ADD CONSTRAINT request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: restaurant_promotions restaurant_promotions_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_promotions
    ADD CONSTRAINT restaurant_promotions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: restaurant_reviews restaurant_reviews_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_reviews
    ADD CONSTRAINT restaurant_reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: rider_cash_collections rider_cash_collections_delivery_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_cash_collections
    ADD CONSTRAINT rider_cash_collections_delivery_company_id_fkey FOREIGN KEY (delivery_company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rider_cash_collections rider_cash_collections_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_cash_collections
    ADD CONSTRAINT rider_cash_collections_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;


--
-- Name: rider_cash_collections rider_cash_collections_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_cash_collections
    ADD CONSTRAINT rider_cash_collections_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE;


--
-- Name: rider_cash_collections rider_cash_collections_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_cash_collections
    ADD CONSTRAINT rider_cash_collections_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: rider_rewards rider_rewards_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_rewards
    ADD CONSTRAINT rider_rewards_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE;


--
-- Name: riders riders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT riders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: rides rides_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: rides rides_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.ride_requests(id);


--
-- Name: supplier_working_areas supplier_working_areas_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_working_areas
    ADD CONSTRAINT supplier_working_areas_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: trips trips_from_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_from_region_id_fkey FOREIGN KEY (from_region_id) REFERENCES public.regions(id);


--
-- Name: trips trips_to_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_to_region_id_fkey FOREIGN KEY (to_region_id) REFERENCES public.regions(id);


--
-- Name: trips trips_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.trip_types(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- Name: audit_logs Admins can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_addresses Admins can manage all addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all addresses" ON public.customer_addresses TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_logs Admins can manage all notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notification logs" ON public.notification_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_settings Admins can manage all notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notification settings" ON public.notification_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_requests Admins can manage all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all requests" ON public.approval_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partner_bank_accounts Admins can manage bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bank accounts" ON public.partner_bank_accounts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bookings Admins can manage bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bookings" ON public.bookings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bulk_notifications Admins can manage bulk notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bulk notifications" ON public.bulk_notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cancellation_requests Admins can manage cancellations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cancellations" ON public.cancellation_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conversations Admins can manage conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage conversations" ON public.conversations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_links Admins can manage custom_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage custom_links" ON public.custom_links USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deliveries Admins can manage deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage deliveries" ON public.deliveries USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_orders Admins can manage delivery_orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage delivery_orders" ON public.delivery_orders USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invitation_tokens Admins can manage invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invitations" ON public.invitation_tokens USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: menu_categories Admins can manage menu_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage menu_categories" ON public.menu_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: menu_items Admins can manage menu_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage menu_items" ON public.menu_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Admins can manage messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage messages" ON public.messages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notifications" ON public.notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_tracking Admins can manage order_tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage order_tracking" ON public.order_tracking USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partner_join_requests Admins can manage partner_join_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage partner_join_requests" ON public.partner_join_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payouts Admins can manage payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payouts" ON public.payouts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: platform_bank_accounts Admins can manage platform bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage platform bank accounts" ON public.platform_bank_accounts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: privacy_policies Admins can manage policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage policies" ON public.privacy_policies USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: supplier_public_images Admins can manage public images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage public images" ON public.supplier_public_images USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regions Admins can manage regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage regions" ON public.regions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: restaurant_cuisines Admins can manage restaurant cuisines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage restaurant cuisines" ON public.restaurant_cuisines USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: restaurants Admins can manage restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage restaurants" ON public.restaurants USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rider_rewards Admins can manage rider_rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rider_rewards" ON public.rider_rewards USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: riders Admins can manage riders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage riders" ON public.riders USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: service_types Admins can manage service types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage service types" ON public.service_types USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.admin_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipment_requests Admins can manage shipment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipment_requests" ON public.shipment_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipments Admins can manage shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipments" ON public.shipments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: supplier_transactions Admins can manage supplier_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage supplier_transactions" ON public.supplier_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_messages Admins can manage support messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage support messages" ON public.support_messages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transactions Admins can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transactions" ON public.transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trip_types Admins can manage trip types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage trip types" ON public.trip_types USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trips Admins can manage trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage trips" ON public.trips USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: violation_logs Admins can manage violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage violations" ON public.violation_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: supplier_working_areas Admins can manage working areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage working areas" ON public.supplier_working_areas USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_regions Admins can update custom regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update custom regions" ON public.custom_regions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_event_logs Admins can view system events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view system events" ON public.system_event_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_metrics Admins can view system metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view system metrics" ON public.system_metrics TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_drivers Admins full access delivery_drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access delivery_drivers" ON public.delivery_drivers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: driver_documents Admins full access driver_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access driver_documents" ON public.driver_documents USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: driver_locations Admins full access driver_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access driver_locations" ON public.driver_locations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: drivers Admins full access drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access drivers" ON public.drivers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: financial_transactions Admins full access financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access financial_transactions" ON public.financial_transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rides Admins full access rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access rides" ON public.rides USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vehicles Admins full access vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access vehicles" ON public.vehicles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: accounting_settings Admins manage accounting_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage accounting_settings" ON public.accounting_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: alert_history Admins manage alert_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage alert_history" ON public.alert_history TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: alert_rules Admins manage alert_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage alert_rules" ON public.alert_rules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: auto_healing_logs Admins manage auto_healing_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage auto_healing_logs" ON public.auto_healing_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: daily_performance_stats Admins manage daily_performance_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage daily_performance_stats" ON public.daily_performance_stats TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: error_logs Admins manage error_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage error_logs" ON public.error_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: generated_reports Admins manage generated_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage generated_reports" ON public.generated_reports TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: menu_item_options Admins manage menu_item_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage menu_item_options" ON public.menu_item_options USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: menu_item_reviews Admins manage menu_item_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage menu_item_reviews" ON public.menu_item_reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partner_commission_settings Admins manage partner_commission_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage partner_commission_settings" ON public.partner_commission_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partner_invoices Admins manage partner_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage partner_invoices" ON public.partner_invoices TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partner_settings Admins manage partner_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage partner_settings" ON public.partner_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_accounts Admins manage payment_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payment_accounts" ON public.payment_accounts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_logs Admins manage payment_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payment_logs" ON public.payment_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_transactions Admins manage payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payment_transactions" ON public.payment_transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promotions Admins manage promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage promotions" ON public.promotions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: restaurants Admins manage restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage restaurants" ON public.restaurants USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: restaurant_reviews Admins manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage reviews" ON public.restaurant_reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reviews Admins manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage reviews" ON public.reviews TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ride_requests Admins manage ride_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ride_requests" ON public.ride_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_event_logs Admins manage system_event_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage system_event_logs" ON public.system_event_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_metrics Admins manage system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage system_metrics" ON public.system_metrics TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: violation_logs Admins manage violation_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage violation_logs" ON public.violation_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: whatsapp_logs Admins manage whatsapp_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage whatsapp_logs" ON public.whatsapp_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_orders Anyone can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create orders" ON public.delivery_orders FOR INSERT WITH CHECK (true);


--
-- Name: partner_join_requests Anyone can create partner requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create partner requests" ON public.partner_join_requests FOR INSERT WITH CHECK (true);


--
-- Name: support_messages Anyone can create support messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create support messages" ON public.support_messages FOR INSERT WITH CHECK (true);


--
-- Name: verification_codes Anyone can insert verification code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert verification code" ON public.verification_codes FOR INSERT WITH CHECK (true);


--
-- Name: accounting_settings Anyone can read accounting_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read accounting_settings" ON public.accounting_settings FOR SELECT TO authenticated USING (true);


--
-- Name: partner_settings Anyone can read partner_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read partner_settings" ON public.partner_settings FOR SELECT TO authenticated USING (true);


--
-- Name: privacy_policies Anyone can read policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read policies" ON public.privacy_policies FOR SELECT USING (true);


--
-- Name: regions Anyone can read regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read regions" ON public.regions FOR SELECT USING (true);


--
-- Name: reviews Anyone can read reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT TO authenticated USING (true);


--
-- Name: trip_types Anyone can read trip types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read trip types" ON public.trip_types FOR SELECT USING (true);


--
-- Name: supplier_working_areas Anyone can read working areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read working areas" ON public.supplier_working_areas FOR SELECT USING (true);


--
-- Name: newsletter_subscribers Anyone can subscribe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: verification_codes Anyone can update verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update verification codes" ON public.verification_codes FOR UPDATE USING (true);


--
-- Name: menu_categories Anyone can view active menu_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active menu_categories" ON public.menu_categories FOR SELECT USING ((is_active = true));


--
-- Name: payment_accounts Anyone can view active partner accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active partner accounts" ON public.payment_accounts FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: payment_accounts Anyone can view active platform accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active platform accounts" ON public.payment_accounts FOR SELECT TO authenticated USING (((account_type = 'platform'::text) AND (is_active = true)));


--
-- Name: platform_bank_accounts Anyone can view active platform bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active platform bank accounts" ON public.platform_bank_accounts FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: promotions Anyone can view active promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING ((is_active = true));


--
-- Name: restaurant_cuisines Anyone can view active restaurant cuisines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active restaurant cuisines" ON public.restaurant_cuisines FOR SELECT USING ((is_active = true));


--
-- Name: restaurants Anyone can view active restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active restaurants" ON public.restaurants FOR SELECT USING ((is_active = true));


--
-- Name: service_types Anyone can view active service types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active service types" ON public.service_types FOR SELECT USING ((is_active = true));


--
-- Name: trips Anyone can view approved trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved trips" ON public.trips FOR SELECT USING ((status = 'approved'::text));


--
-- Name: menu_items Anyone can view available menu_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view available menu_items" ON public.menu_items FOR SELECT USING ((is_available = true));


--
-- Name: menu_item_options Anyone can view menu_item_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view menu_item_options" ON public.menu_item_options FOR SELECT USING (true);


--
-- Name: menu_item_reviews Anyone can view menu_item_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view menu_item_reviews" ON public.menu_item_reviews FOR SELECT USING (true);


--
-- Name: driver_locations Anyone can view online driver locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view online driver locations" ON public.driver_locations FOR SELECT USING ((is_online = true));


--
-- Name: order_tracking Anyone can view order_tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view order_tracking" ON public.order_tracking FOR SELECT USING (true);


--
-- Name: supplier_public_images Anyone can view public images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public images" ON public.supplier_public_images FOR SELECT USING (true);


--
-- Name: restaurant_reviews Anyone can view restaurant_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view restaurant_reviews" ON public.restaurant_reviews FOR SELECT USING (true);


--
-- Name: profiles Anyone can view supplier profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view supplier profiles" ON public.profiles FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = profiles.user_id) AND (user_roles.role = ANY (ARRAY['supplier'::public.app_role, 'delivery_company'::public.app_role]))))));


--
-- Name: verification_codes Anyone can view verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view verification codes" ON public.verification_codes FOR SELECT USING (true);


--
-- Name: notification_logs Authenticated can insert own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert own notification logs" ON public.notification_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: menu_item_options Authenticated can manage menu_item_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can manage menu_item_options" ON public.menu_item_options USING ((auth.role() = 'authenticated'::text));


--
-- Name: user_roles Authenticated can view partner roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view partner roles" ON public.user_roles FOR SELECT TO authenticated USING ((role = ANY (ARRAY['supplier'::public.app_role, 'delivery_company'::public.app_role])));


--
-- Name: financial_transactions Authenticated insert own financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated insert own financial_transactions" ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = customer_id) OR (auth.uid() = partner_id)));


--
-- Name: rides Authenticated insert rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated insert rides" ON public.rides FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: partner_settings Authenticated read partner settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read partner settings" ON public.partner_settings FOR SELECT TO authenticated USING (true);


--
-- Name: admin_settings Authenticated users can read settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);


--
-- Name: partner_bank_accounts Authenticated users can view partner bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view partner bank accounts" ON public.partner_bank_accounts FOR SELECT TO authenticated USING (true);


--
-- Name: delivery_proof Authenticated users manage delivery_proof; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users manage delivery_proof" ON public.delivery_proof USING (((auth.uid() = scanned_by) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() = scanned_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: invitation_tokens Companies can create their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies can create their invitations" ON public.invitation_tokens FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND (public.has_role(auth.uid(), 'delivery_company'::public.app_role) OR public.has_role(auth.uid(), 'supplier'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: invitation_tokens Companies can delete their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies can delete their invitations" ON public.invitation_tokens FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: invitation_tokens Companies can update their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies can update their invitations" ON public.invitation_tokens FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: invitation_tokens Companies can view their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies can view their invitations" ON public.invitation_tokens FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: delivery_drivers Companies update own delivery_drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies update own delivery_drivers" ON public.delivery_drivers FOR UPDATE TO authenticated USING ((auth.uid() = delivery_company_id));


--
-- Name: delivery_drivers Companies view own delivery_drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Companies view own delivery_drivers" ON public.delivery_drivers FOR SELECT TO authenticated USING ((auth.uid() = delivery_company_id));


--
-- Name: rider_cash_collections Company manages its rider collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company manages its rider collections" ON public.rider_cash_collections TO authenticated USING ((delivery_company_id = auth.uid())) WITH CHECK ((delivery_company_id = auth.uid()));


--
-- Name: menu_categories Company owners can manage menu_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners can manage menu_categories" ON public.menu_categories USING ((EXISTS ( SELECT 1
   FROM public.restaurants
  WHERE ((restaurants.id = menu_categories.restaurant_id) AND (restaurants.delivery_company_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.restaurants
  WHERE ((restaurants.id = menu_categories.restaurant_id) AND (restaurants.delivery_company_id = auth.uid())))));


--
-- Name: menu_items Company owners can manage menu_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners can manage menu_items" ON public.menu_items USING ((EXISTS ( SELECT 1
   FROM public.restaurants
  WHERE ((restaurants.id = menu_items.restaurant_id) AND (restaurants.delivery_company_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.restaurants
  WHERE ((restaurants.id = menu_items.restaurant_id) AND (restaurants.delivery_company_id = auth.uid())))));


--
-- Name: order_tracking Company owners can manage order_tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners can manage order_tracking" ON public.order_tracking USING ((EXISTS ( SELECT 1
   FROM public.delivery_orders
  WHERE ((delivery_orders.id = order_tracking.order_id) AND (delivery_orders.delivery_company_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.delivery_orders
  WHERE ((delivery_orders.id = order_tracking.order_id) AND (delivery_orders.delivery_company_id = auth.uid())))));


--
-- Name: menu_item_options Company owners manage menu_item_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners manage menu_item_options" ON public.menu_item_options USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.restaurants r ON ((r.id = mi.restaurant_id)))
  WHERE ((mi.id = menu_item_options.menu_item_id) AND (r.delivery_company_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.restaurants r ON ((r.id = mi.restaurant_id)))
  WHERE ((mi.id = menu_item_options.menu_item_id) AND (r.delivery_company_id = auth.uid())))));


--
-- Name: promotions Company owners manage own promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners manage own promotions" ON public.promotions USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: messages Conversation participants can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.user_id = auth.uid()) OR (conversations.admin_id = auth.uid())))))));


--
-- Name: messages Conversation participants can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.user_id = auth.uid()) OR (conversations.admin_id = auth.uid()))))));


--
-- Name: delivery_quote_requests Customer manages own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customer manages own quotes" ON public.delivery_quote_requests TO authenticated USING ((customer_id = auth.uid())) WITH CHECK ((customer_id = auth.uid()));


--
-- Name: bookings Customers can create bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: restaurant_reviews Customers can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create reviews" ON public.restaurant_reviews FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: shipment_requests Customers can create shipment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create shipment_requests" ON public.shipment_requests FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: customer_addresses Customers can manage own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can manage own addresses" ON public.customer_addresses TO authenticated USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: restaurant_reviews Customers can manage own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can manage own reviews" ON public.restaurant_reviews USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: bookings Customers can update own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: bookings Customers can view own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: deliveries Customers can view own deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own deliveries" ON public.deliveries FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: delivery_orders Customers can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own orders" ON public.delivery_orders FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: shipment_requests Customers can view own shipment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own shipment_requests" ON public.shipment_requests FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: shipments Customers can view own shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own shipments" ON public.shipments FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: carts Customers manage own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers manage own carts" ON public.carts USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: customer_favorites Customers manage own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers manage own favorites" ON public.customer_favorites USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: menu_item_reviews Customers manage own item reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers manage own item reviews" ON public.menu_item_reviews USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: restaurant_reviews Customers manage own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers manage own reviews" ON public.restaurant_reviews USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: ride_requests Customers manage own ride_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers manage own ride_requests" ON public.ride_requests USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: delivery_zones Customers read active zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers read active zones" ON public.delivery_zones FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: financial_transactions Customers view own financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers view own financial_transactions" ON public.financial_transactions FOR SELECT TO authenticated USING ((auth.uid() = customer_id));


--
-- Name: rides Customers view own rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers view own rides" ON public.rides FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: custom_links Delivery companies can manage own links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own links" ON public.custom_links USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: delivery_orders Delivery companies can manage own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own orders" ON public.delivery_orders USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: partner_join_requests Delivery companies can manage own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own requests" ON public.partner_join_requests USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: restaurants Delivery companies can manage own restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own restaurants" ON public.restaurants USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: rider_rewards Delivery companies can manage own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own rewards" ON public.rider_rewards USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: riders Delivery companies can manage own riders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery companies can manage own riders" ON public.riders USING ((auth.uid() = delivery_company_id)) WITH CHECK ((auth.uid() = delivery_company_id));


--
-- Name: delivery_drivers Delivery drivers manage own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery drivers manage own data" ON public.delivery_drivers TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: delivery_orders Delivery drivers update assigned orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery drivers update assigned orders" ON public.delivery_orders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.delivery_drivers dd
  WHERE ((dd.user_id = auth.uid()) AND (dd.delivery_company_id = delivery_orders.delivery_company_id) AND (dd.is_approved = true)))));


--
-- Name: delivery_orders Delivery drivers view company orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery drivers view company orders" ON public.delivery_orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.delivery_drivers dd
  WHERE ((dd.user_id = auth.uid()) AND (dd.delivery_company_id = delivery_orders.delivery_company_id) AND (dd.is_approved = true)))));


--
-- Name: ride_requests Drivers can offer price on pending rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can offer price on pending rides" ON public.ride_requests FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (status = 'pending'::text) AND ((driver_id IS NULL) OR (driver_id = auth.uid())))) WITH CHECK (public.has_role(auth.uid(), 'driver'::public.app_role));


--
-- Name: riders Drivers can update own rider row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update own rider row" ON public.riders FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: riders Drivers can view own rider row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view own rider row" ON public.riders FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ride_requests Drivers can view pending ride_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view pending ride_requests" ON public.ride_requests FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (status = 'pending'::text) AND (negotiation_status = 'pending'::text) AND (driver_id IS NULL)));


--
-- Name: ride_requests Drivers manage assigned ride_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers manage assigned ride_requests" ON public.ride_requests USING ((auth.uid() = driver_id)) WITH CHECK ((auth.uid() = driver_id));


--
-- Name: drivers Drivers manage own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers manage own data" ON public.drivers USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: driver_documents Drivers manage own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers manage own documents" ON public.driver_documents USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_documents.driver_id) AND (drivers.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_documents.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: driver_locations Drivers manage own location; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers manage own location" ON public.driver_locations USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_locations.driver_id) AND (drivers.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_locations.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: vehicles Drivers manage own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers manage own vehicles" ON public.vehicles USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = vehicles.driver_id) AND (drivers.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = vehicles.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: rides Drivers update own rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers update own rides" ON public.rides FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = rides.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: rides Drivers view own rides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers view own rides" ON public.rides FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = rides.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: newsletter_subscribers Only admins can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_messages Participants can manage order_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can manage order_messages" ON public.order_messages USING (((auth.uid() = sender_id) OR (EXISTS ( SELECT 1
   FROM public.shipment_requests
  WHERE ((shipment_requests.id = order_messages.order_id) AND ((shipment_requests.customer_id = auth.uid()) OR (shipment_requests.supplier_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.delivery_orders
  WHERE ((delivery_orders.id = order_messages.order_id) AND ((delivery_orders.customer_id = auth.uid()) OR (delivery_orders.delivery_company_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.ride_requests
  WHERE ((ride_requests.id = order_messages.order_id) AND ((ride_requests.customer_id = auth.uid()) OR (ride_requests.driver_id = auth.uid()))))) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() = sender_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: delivery_proof Participants can read delivery_proof; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can read delivery_proof" ON public.delivery_proof FOR SELECT USING (((auth.uid() = scanned_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.shipment_requests
  WHERE ((shipment_requests.id = delivery_proof.order_id) AND ((shipment_requests.customer_id = auth.uid()) OR (shipment_requests.supplier_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.delivery_orders
  WHERE ((delivery_orders.id = delivery_proof.order_id) AND ((delivery_orders.customer_id = auth.uid()) OR (delivery_orders.delivery_company_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.ride_requests
  WHERE ((ride_requests.id = delivery_proof.order_id) AND ((ride_requests.customer_id = auth.uid()) OR (ride_requests.driver_id = auth.uid())))))));


--
-- Name: delivery_quote_requests Partner manages own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partner manages own quotes" ON public.delivery_quote_requests TO authenticated USING ((delivery_company_id = auth.uid())) WITH CHECK ((delivery_company_id = auth.uid()));


--
-- Name: partner_settings Partner manages own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partner manages own settings" ON public.partner_settings TO authenticated USING ((partner_id = auth.uid())) WITH CHECK ((partner_id = auth.uid()));


--
-- Name: partner_bank_accounts Partners can manage own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners can manage own accounts" ON public.partner_bank_accounts USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));


--
-- Name: deliveries Partners can view assigned deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners can view assigned deliveries" ON public.deliveries FOR SELECT USING ((auth.uid() = delivery_partner_id));


--
-- Name: payouts Partners can view own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners can view own payouts" ON public.payouts FOR SELECT USING ((auth.uid() = partner_id));


--
-- Name: payment_accounts Partners manage own payment_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners manage own payment_accounts" ON public.payment_accounts TO authenticated USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));


--
-- Name: partner_settings Partners manage own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners manage own settings" ON public.partner_settings TO authenticated USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));


--
-- Name: whatsapp_logs Partners manage own whatsapp_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners manage own whatsapp_logs" ON public.whatsapp_logs USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));


--
-- Name: delivery_zones Partners manage own zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners manage own zones" ON public.delivery_zones TO authenticated USING ((delivery_company_id = auth.uid())) WITH CHECK ((delivery_company_id = auth.uid()));


--
-- Name: payment_transactions Partners update related payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners update related payment_transactions" ON public.payment_transactions FOR UPDATE TO authenticated USING ((auth.uid() = partner_id));


--
-- Name: partner_commission_settings Partners view own commission_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners view own commission_settings" ON public.partner_commission_settings FOR SELECT TO authenticated USING ((auth.uid() = partner_id));


--
-- Name: financial_transactions Partners view own financial_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners view own financial_transactions" ON public.financial_transactions FOR SELECT TO authenticated USING ((auth.uid() = partner_id));


--
-- Name: partner_invoices Partners view own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners view own invoices" ON public.partner_invoices FOR SELECT TO authenticated USING ((auth.uid() = partner_id));


--
-- Name: payment_transactions Partners view related payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partners view related payment_transactions" ON public.payment_transactions FOR SELECT TO authenticated USING ((auth.uid() = partner_id));


--
-- Name: menu_item_options Public can read menu_item_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read menu_item_options" ON public.menu_item_options FOR SELECT USING (true);


--
-- Name: drivers Public can view approved drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view approved drivers" ON public.drivers FOR SELECT USING ((is_approved = true));


--
-- Name: restaurants Public view active restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public view active restaurants" ON public.restaurants FOR SELECT USING ((is_active = true));


--
-- Name: rider_cash_collections Rider views own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Rider views own collections" ON public.rider_cash_collections FOR SELECT TO authenticated USING ((rider_id IN ( SELECT riders.id
   FROM public.riders
  WHERE (riders.user_id = auth.uid()))));


--
-- Name: loyalty_points_history Service can insert history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert history" ON public.loyalty_points_history FOR INSERT WITH CHECK (true);


--
-- Name: loyalty_points Service can manage points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage points" ON public.loyalty_points USING (true) WITH CHECK (true);


--
-- Name: alert_history Service insert alert_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert alert_history" ON public.alert_history FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: auto_healing_logs Service insert auto_healing_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert auto_healing_logs" ON public.auto_healing_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: daily_performance_stats Service insert daily_performance_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert daily_performance_stats" ON public.daily_performance_stats FOR INSERT TO anon WITH CHECK (true);


--
-- Name: error_logs Service insert error_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert error_logs" ON public.error_logs FOR INSERT TO anon WITH CHECK (true);


--
-- Name: system_event_logs Service insert system_event_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert system_event_logs" ON public.system_event_logs FOR INSERT TO anon WITH CHECK (true);


--
-- Name: system_metrics Service insert system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service insert system_metrics" ON public.system_metrics FOR INSERT TO anon WITH CHECK (true);


--
-- Name: daily_performance_stats Service update daily_performance_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service update daily_performance_stats" ON public.daily_performance_stats FOR UPDATE TO anon USING (true);


--
-- Name: bulk_notifications Suppliers can create bulk notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can create bulk notifications" ON public.bulk_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'supplier'::public.app_role));


--
-- Name: supplier_working_areas Suppliers can manage own areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can manage own areas" ON public.supplier_working_areas USING ((auth.uid() = supplier_id)) WITH CHECK ((auth.uid() = supplier_id));


--
-- Name: supplier_public_images Suppliers can manage own images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can manage own images" ON public.supplier_public_images USING ((auth.uid() = supplier_id)) WITH CHECK ((auth.uid() = supplier_id));


--
-- Name: supplier_transactions Suppliers can manage own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can manage own transactions" ON public.supplier_transactions USING ((auth.uid() = supplier_id)) WITH CHECK ((auth.uid() = supplier_id));


--
-- Name: trips Suppliers can manage own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can manage own trips" ON public.trips USING ((auth.uid() = supplier_id)) WITH CHECK ((auth.uid() = supplier_id));


--
-- Name: shipment_requests Suppliers can update assigned shipment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update assigned shipment_requests" ON public.shipment_requests FOR UPDATE USING ((auth.uid() = supplier_id));


--
-- Name: bookings Suppliers can update trip bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update trip bookings" ON public.bookings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = bookings.trip_id) AND (trips.supplier_id = auth.uid())))));


--
-- Name: shipment_requests Suppliers can view assigned shipment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view assigned shipment_requests" ON public.shipment_requests FOR SELECT USING ((auth.uid() = supplier_id));


--
-- Name: shipments Suppliers can view assigned shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view assigned shipments" ON public.shipments FOR SELECT USING ((auth.uid() = supplier_id));


--
-- Name: bulk_notifications Suppliers can view own bulk notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view own bulk notifications" ON public.bulk_notifications FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: bookings Suppliers can view trip bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view trip bookings" ON public.bookings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = bookings.trip_id) AND (trips.supplier_id = auth.uid())))));


--
-- Name: cancellation_requests Users can create cancellations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create cancellations" ON public.cancellation_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can create conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reviews Users can create own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reviewer_id));


--
-- Name: approval_requests Users can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create requests" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = requester_id));


--
-- Name: custom_regions Users can insert custom regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert custom regions" ON public.custom_regions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = submitted_by));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_settings Users can manage own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own notification settings" ON public.notification_settings USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_logs Users can update own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notification logs" ON public.notification_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING ((auth.uid() = reviewer_id));


--
-- Name: custom_regions Users can view own and approved custom regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own and approved custom regions" ON public.custom_regions FOR SELECT TO authenticated USING (((submitted_by = auth.uid()) OR (status = 'approved'::text)));


--
-- Name: cancellation_requests Users can view own cancellations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cancellations" ON public.cancellation_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: loyalty_points_history Users can view own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own history" ON public.loyalty_points_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notification_logs Users can view own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification logs" ON public.notification_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: loyalty_points Users can view own points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own points" ON public.loyalty_points FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: approval_requests Users can view own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own requests" ON public.approval_requests FOR SELECT TO authenticated USING ((auth.uid() = requester_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_messages Users can view own support messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own support messages" ON public.support_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = partner_id)));


--
-- Name: payment_transactions Users manage own payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own payment_transactions" ON public.payment_transactions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: violation_logs Users view own violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own violations" ON public.violation_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: accounting_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: service_requests admin_all_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all_requests ON public.service_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auto_healing_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auto_healing_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bulk_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: cancellation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_links ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_regions ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: service_requests customer_own_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_own_requests ON public.service_requests USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: delivery_banners customers_view_active_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_view_active_banners ON public.delivery_banners FOR SELECT USING ((is_active = true));


--
-- Name: restaurant_promotions customers_view_active_promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_view_active_promotions ON public.restaurant_promotions FOR SELECT USING ((is_active = true));


--
-- Name: delivery_banners customers_view_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_view_banners ON public.delivery_banners FOR SELECT USING ((is_active = true));


--
-- Name: delivery_company_offers customers_view_offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_view_offers ON public.delivery_company_offers FOR SELECT USING ((is_active = true));


--
-- Name: daily_performance_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_performance_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_banners ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_banners delivery_companies_manage_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_companies_manage_banners ON public.delivery_banners USING ((delivery_company_id = auth.uid()));


--
-- Name: delivery_company_offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_company_offers ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_banners delivery_manage_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_manage_banners ON public.delivery_banners USING ((delivery_company_id = auth.uid()));


--
-- Name: delivery_company_offers delivery_manage_offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_manage_offers ON public.delivery_company_offers USING ((delivery_company_id = auth.uid()));


--
-- Name: restaurant_promotions delivery_manage_restaurant_promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_manage_restaurant_promotions ON public.restaurant_promotions USING ((restaurant_id IN ( SELECT restaurants.id
   FROM public.restaurants
  WHERE (restaurants.delivery_company_id = auth.uid()))));


--
-- Name: delivery_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_proof; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_proof ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_quote_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_quote_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions delivery_view_payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_view_payment_transactions ON public.payment_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.delivery_orders do2
  WHERE ((do2.id = payment_transactions.related_entity_id) AND (do2.delivery_company_id = auth.uid())))));


--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: generated_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: invitation_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: order_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_commission_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_commission_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_price_references partner_own_prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_own_prices ON public.partner_price_references USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));


--
-- Name: partner_price_references; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_price_references ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: service_requests partner_update_assigned_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_update_assigned_requests ON public.service_requests FOR UPDATE USING ((auth.uid() = partner_id));


--
-- Name: service_requests partner_view_assigned_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_view_assigned_requests ON public.service_requests FOR SELECT USING ((auth.uid() = partner_id));


--
-- Name: payment_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.privacy_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_price_references public_read_prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_prices ON public.partner_price_references FOR SELECT USING ((is_active = true));


--
-- Name: regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

--
-- Name: request_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: request_messages request_participants_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_participants_messages ON public.request_messages USING (((EXISTS ( SELECT 1
   FROM public.service_requests sr
  WHERE ((sr.id = request_messages.request_id) AND ((sr.customer_id = auth.uid()) OR (sr.partner_id = auth.uid()))))) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.service_requests sr
  WHERE ((sr.id = request_messages.request_id) AND ((sr.customer_id = auth.uid()) OR (sr.partner_id = auth.uid()))))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: restaurant_cuisines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurant_promotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurant_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: ride_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: rider_cash_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rider_cash_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: rider_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rider_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

--
-- Name: rides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

--
-- Name: service_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: service_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_public_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_public_images ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_working_areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_working_areas ENABLE ROW LEVEL SECURITY;

--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: system_event_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trip_types ENABLE ROW LEVEL SECURITY;

--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: violation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict PTIQvflpJlx8aBpZQ3FEEKlddFr5f2I6HJDwPFs1AnfijsJOTOrItWXm9duF00J

