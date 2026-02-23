
-- جدول المطاعم
CREATE TABLE public.restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  logo_url TEXT,
  cover_image TEXT,
  phone TEXT,
  address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول فئات المنيو
CREATE TABLE public.menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- جدول عناصر المنيو
CREATE TABLE public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2),
  image_url TEXT,
  preparation_time INTEGER,
  is_available BOOLEAN DEFAULT true,
  options JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول المندوبين
CREATE TABLE public.riders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  profile_image TEXT,
  vehicle_type TEXT DEFAULT 'motorcycle',
  vehicle_plate TEXT,
  id_number TEXT,
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  earnings NUMERIC(10,2) DEFAULT 0,
  commission_type TEXT DEFAULT 'percentage',
  commission_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الطلبات
CREATE TABLE public.delivery_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id),
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  order_type TEXT DEFAULT 'restaurant',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  rider_id UUID REFERENCES public.riders(id),
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  estimated_delivery_time TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تتبع الطلب
CREATE TABLE public.order_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الروابط المخصصة
CREATE TABLE public.custom_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_phone TEXT,
  link_token TEXT UNIQUE NOT NULL DEFAULT (gen_random_uuid())::text,
  is_active BOOLEAN DEFAULT true,
  clicks INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول مكافآت المندوبين
CREATE TABLE public.rider_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  rider_id UUID REFERENCES public.riders(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'bonus',
  amount NUMERIC(10,2),
  description TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول طلبات انضمام الشركاء
CREATE TABLE public.partner_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT DEFAULT 'restaurant',
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS: restaurants
CREATE POLICY "Admins can manage restaurants" ON public.restaurants FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own restaurants" ON public.restaurants FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants FOR SELECT USING (is_active = true);

-- RLS: menu_categories
CREATE POLICY "Admins can manage menu_categories" ON public.menu_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Company owners can manage menu_categories" ON public.menu_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.restaurants WHERE restaurants.id = menu_categories.restaurant_id AND restaurants.delivery_company_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants WHERE restaurants.id = menu_categories.restaurant_id AND restaurants.delivery_company_id = auth.uid()));
CREATE POLICY "Anyone can view active menu_categories" ON public.menu_categories FOR SELECT USING (is_active = true);

-- RLS: menu_items
CREATE POLICY "Admins can manage menu_items" ON public.menu_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Company owners can manage menu_items" ON public.menu_items FOR ALL USING (EXISTS (SELECT 1 FROM public.restaurants WHERE restaurants.id = menu_items.restaurant_id AND restaurants.delivery_company_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants WHERE restaurants.id = menu_items.restaurant_id AND restaurants.delivery_company_id = auth.uid()));
CREATE POLICY "Anyone can view available menu_items" ON public.menu_items FOR SELECT USING (is_available = true);

-- RLS: riders
CREATE POLICY "Admins can manage riders" ON public.riders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own riders" ON public.riders FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);

-- RLS: delivery_orders
CREATE POLICY "Admins can manage delivery_orders" ON public.delivery_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own orders" ON public.delivery_orders FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);
CREATE POLICY "Customers can view own orders" ON public.delivery_orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Anyone can create orders" ON public.delivery_orders FOR INSERT WITH CHECK (true);

-- RLS: order_tracking
CREATE POLICY "Admins can manage order_tracking" ON public.order_tracking FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Company owners can manage order_tracking" ON public.order_tracking FOR ALL USING (EXISTS (SELECT 1 FROM public.delivery_orders WHERE delivery_orders.id = order_tracking.order_id AND delivery_orders.delivery_company_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_orders WHERE delivery_orders.id = order_tracking.order_id AND delivery_orders.delivery_company_id = auth.uid()));
CREATE POLICY "Anyone can view order_tracking" ON public.order_tracking FOR SELECT USING (true);

-- RLS: custom_links
CREATE POLICY "Admins can manage custom_links" ON public.custom_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own links" ON public.custom_links FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);

-- RLS: rider_rewards
CREATE POLICY "Admins can manage rider_rewards" ON public.rider_rewards FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own rewards" ON public.rider_rewards FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);

-- RLS: partner_join_requests
CREATE POLICY "Admins can manage partner_join_requests" ON public.partner_join_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delivery companies can manage own requests" ON public.partner_join_requests FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);
CREATE POLICY "Anyone can create partner requests" ON public.partner_join_requests FOR INSERT WITH CHECK (true);

-- Enable realtime for delivery_orders and riders
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
