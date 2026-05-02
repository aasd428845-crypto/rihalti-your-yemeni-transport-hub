import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testAccounts = [
      { email: "customer@test.com", password: "Test@12345", full_name: "عميل تجريبي", role: "customer", phone: "777000001", city: "صنعاء" },
      { email: "supplier@test.com", password: "Test@12345", full_name: "مكتب الأمانة للنقل", role: "supplier", phone: "777000002", city: "صنعاء" },
      { email: "delivery@test.com", password: "Test@12345", full_name: "شركة سريع للتوصيل", role: "delivery_company", phone: "777000003", city: "صنعاء" },
      { email: "driver@test.com", password: "Test@12345", full_name: "أحمد السائق", role: "driver", phone: "777000004", city: "صنعاء" },
      { email: "delivery_driver@test.com", password: "Test@12345", full_name: "محمد المندوب", role: "delivery_driver", phone: "777000005", city: "صنعاء" },
      { email: "admin@test.com", password: "Test@12345", full_name: "مشرف النظام", role: "admin", phone: "777000006", city: "صنعاء" },
    ];

    const results: any[] = [];

    for (const account of testAccounts) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === account.email);

      if (existing) {
        results.push({ email: account.email, status: "already_exists", userId: existing.id });
        // Ensure profile and role exist
        await supabase.from("profiles").upsert({
          user_id: existing.id,
          full_name: account.full_name,
          phone: account.phone,
          city: account.city,
        }, { onConflict: "user_id" });

        await supabase.from("user_roles").upsert({
          user_id: existing.id,
          role: account.role,
        }, { onConflict: "user_id,role" });

        continue;
      }

      // Create user with auto-confirm
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.full_name, role: account.role },
      });

      if (createError) {
        results.push({ email: account.email, status: "error", error: createError.message });
        continue;
      }

      const userId = newUser.user.id;

      // Update profile with extra data
      await supabase.from("profiles").update({
        phone: account.phone,
        city: account.city,
        account_status: "approved",
      }).eq("user_id", userId);

      // Create driver record if driver
      if (account.role === "driver") {
        await supabase.from("drivers").insert({
          user_id: userId,
          is_approved: true,
          is_online: false,
          approval_date: new Date().toISOString(),
        });
      }

      // Create delivery driver record if delivery_driver
      if (account.role === "delivery_driver") {
        // Link to delivery company
        const { data: deliveryCompany } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "delivery_company")
          .limit(1)
          .maybeSingle();

        await supabase.from("delivery_drivers").insert({
          user_id: userId,
          delivery_company_id: deliveryCompany?.user_id || null,
          is_approved: true,
          is_online: false,
        });
      }

      results.push({ email: account.email, status: "created", userId });
    }

    // Seed sample trip for supplier
    const supplierResult = results.find(r => r.email === "supplier@test.com");
    if (supplierResult?.userId) {
      const { data: existingTrip } = await supabase
        .from("trips")
        .select("id")
        .eq("supplier_id", supplierResult.userId)
        .limit(1)
        .maybeSingle();

      if (!existingTrip) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        dayAfter.setHours(14, 0, 0, 0);

        await supabase.from("trips").insert([
          {
            supplier_id: supplierResult.userId,
            from_city: "صنعاء",
            to_city: "عدن",
            departure_time: tomorrow.toISOString(),
            price: 5000,
            available_seats: 30,
            status: "approved",
            bus_company: "باصات الأمانة",
            bus_number: "أ-15",
            period: "morning",
            amenities: ["ac", "wifi", "water"],
            notes: "رحلة مباشرة بدون توقف - مكيفة بالكامل",
          },
          {
            supplier_id: supplierResult.userId,
            from_city: "عدن",
            to_city: "صنعاء",
            departure_time: dayAfter.toISOString(),
            price: 5000,
            available_seats: 25,
            status: "approved",
            bus_company: "باصات الأمانة",
            bus_number: "أ-20",
            period: "afternoon",
            amenities: ["ac", "usb", "snacks"],
            notes: "رحلة العودة مع وجبة خفيفة",
          },
        ]);
        results.push({ type: "seed_data", item: "trips", status: "created", count: 2 });
      }
    }

    // Seed a restaurant for delivery company
    const deliveryResult = results.find(r => r.email === "delivery@test.com");
    if (deliveryResult?.userId) {
      const { data: existingRestaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("delivery_company_id", deliveryResult.userId)
        .limit(1)
        .maybeSingle();

      if (!existingRestaurant) {
        const { data: restaurant } = await supabase.from("restaurants").insert({
          delivery_company_id: deliveryResult.userId,
          name_ar: "مطعم الشام",
          name_en: "Al Sham Restaurant",
          description: "مطعم يمني تقليدي - أطباق شعبية ومشويات",
          cuisine_type: "يمني",
          is_active: true,
          phone: "777111222",
          address: "شارع الزبيري - صنعاء",
          delivery_fee: 500,
          min_order_amount: 1000,
          rating: 4.5,
        }).select().single();

        if (restaurant) {
          // Add menu category
          const { data: category } = await supabase.from("menu_categories").insert({
            restaurant_id: restaurant.id,
            name_ar: "الأطباق الرئيسية",
            name_en: "Main Dishes",
            is_active: true,
            sort_order: 1,
          }).select().single();

          if (category) {
            await supabase.from("menu_items").insert([
              { restaurant_id: restaurant.id, category_id: category.id, name_ar: "مندي لحم", price: 2500, is_available: true, sort_order: 1, description: "مندي لحم بلدي مع الأرز البسمتي" },
              { restaurant_id: restaurant.id, category_id: category.id, name_ar: "مندي دجاج", price: 1800, is_available: true, sort_order: 2, description: "مندي دجاج طازج" },
              { restaurant_id: restaurant.id, category_id: category.id, name_ar: "فحسة", price: 1500, is_available: true, sort_order: 3, description: "فحسة باللحم البلدي" },
              { restaurant_id: restaurant.id, category_id: category.id, name_ar: "سلتة", price: 1200, is_available: true, sort_order: 4, description: "سلتة يمنية أصلية" },
            ]);
          }

          results.push({ type: "seed_data", item: "restaurant_with_menu", status: "created" });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
