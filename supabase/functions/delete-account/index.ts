import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "مستخدم غير صالح" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Delete all user data from public tables (order matters for FK constraints)
    const tables = [
      { table: "order_messages", column: "sender_id" },
      { table: "messages", column: "sender_id" },
      { table: "notification_logs", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "notification_settings", column: "user_id" },
      { table: "loyalty_points_history", column: "user_id" },
      { table: "loyalty_points", column: "user_id" },
      { table: "conversations", column: "user_id" },
      { table: "bookings", column: "customer_id" },
      { table: "delivery_orders", column: "customer_id" },
      { table: "deliveries", column: "customer_id" },
      { table: "carts", column: "customer_id" },
      { table: "customer_addresses", column: "customer_id" },
      { table: "cancellation_requests", column: "user_id" },
      { table: "driver_locations", column: "driver_id" },
      { table: "partner_bank_accounts", column: "partner_id" },
      { table: "partner_working_areas", column: "partner_id" },
      { table: "approval_requests", column: "requester_id" },
      { table: "delivery_drivers", column: "user_id" },
      { table: "audit_logs", column: "admin_id" },
      { table: "user_roles", column: "user_id" },
      { table: "profiles", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      // First check if driver_id references drivers table
      if (table === "driver_locations") {
        // Get driver id first
        const { data: driver } = await admin.from("drivers").select("id").eq("user_id", userId).maybeSingle();
        if (driver) {
          await admin.from("driver_locations").delete().eq("driver_id", driver.id);
          await admin.from("driver_documents").delete().eq("driver_id", driver.id);
          await admin.from("drivers").delete().eq("user_id", userId);
        }
        continue;
      }
      await admin.from(table).delete().eq(column, userId);
    }

    // Delete user from auth
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "فشل حذف الحساب: " + deleteError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
