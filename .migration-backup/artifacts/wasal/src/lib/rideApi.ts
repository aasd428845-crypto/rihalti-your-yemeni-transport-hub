import { supabase } from "@/integrations/supabase/client";

// ==================== Ride Requests ====================

export const createRideRequest = async (params: {
  customerId: string;
  fromCity: string;
  toCity: string;
  fromAddress?: string;
  toAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  rideType?: string;
  passengerCount?: number;
  notes?: string;
  paymentMethod?: string;
}) => {
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({
      customer_id: params.customerId,
      from_city: params.fromCity,
      to_city: params.toCity,
      from_address: params.fromAddress,
      to_address: params.toAddress,
      pickup_lat: params.pickupLat,
      pickup_lng: params.pickupLng,
      dropoff_lat: params.dropoffLat,
      dropoff_lng: params.dropoffLng,
      ride_type: params.rideType || 'one_way',
      passenger_count: params.passengerCount || 1,
      notes: params.notes,
      payment_method: params.paymentMethod || 'cash',
      status: 'pending',
      negotiation_status: 'pending',
    } as any)
    .select()
    .single();
  if (error) throw error;

  // Notify nearby drivers
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        targetRole: 'driver',
        title: 'طلب أجرة جديد 🚕',
        body: `رحلة من ${params.fromCity} إلى ${params.toCity}`,
        sound: 'new_shipment',
        data: { type: 'ride_request', requestId: (data as any).id },
      },
    });
  } catch {}

  return data;
};

export const fetchCustomerRideRequests = async (customerId: string) => {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchPendingRideRequests = async () => {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("*")
    .in("status", ['pending', 'driver_assigned'])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchRideRequestById = async (id: string) => {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

// ==================== Driver Price Offer ====================

export const submitRidePrice = async (requestId: string, price: number, driverId: string) => {
  const { error } = await supabase
    .from("ride_requests")
    .update({
      proposed_price: price,
      driver_id: driverId,
      negotiation_status: 'offered',
      price_offered_at: new Date().toISOString(),
      status: 'driver_assigned',
    } as any)
    .eq("id", requestId);
  if (error) throw error;

  // Notify customer
  const request = await fetchRideRequestById(requestId);
  if (request) {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: (request as any).customer_id,
          title: 'تم تسعير رحلتك 💰',
          body: `السائق اقترح ${price} ريال لرحلتك`,
          sound: 'default',
          data: { type: 'ride_pricing', requestId },
        },
      });
    } catch {}
  }
};

export const acceptRidePrice = async (requestId: string) => {
  const request = await fetchRideRequestById(requestId);
  if (!request) throw new Error('طلب غير موجود');

  const finalPrice = (request as any).proposed_price;
  if (!finalPrice) throw new Error('لا يوجد سعر مقترح');

  // Update ride request
  const { error } = await supabase
    .from("ride_requests")
    .update({
      final_price: finalPrice,
      customer_accepted: true,
      negotiation_status: 'accepted',
      price_accepted_at: new Date().toISOString(),
      customer_phone_hidden: false,
    } as any)
    .eq("id", requestId);
  if (error) throw error;

  // Create ride record
  const driverId = (request as any).driver_id;
  await supabase.from("rides" as any).insert({
    request_id: requestId,
    driver_id: driverId,
    customer_id: (request as any).customer_id,
    pickup_location: `${(request as any).from_city} - ${(request as any).from_address || ''}`,
    dropoff_location: `${(request as any).to_city} - ${(request as any).to_address || ''}`,
    price: finalPrice,
    platform_commission: Math.round(finalPrice * 0.1 * 100) / 100,
    driver_earning: Math.round(finalPrice * 0.9 * 100) / 100,
    status: 'assigned',
  });

  // Create financial transaction
  try {
    await supabase.from("financial_transactions").insert({
      transaction_type: 'ride',
      reference_id: requestId,
      customer_id: (request as any).customer_id,
      partner_id: driverId,
      amount: finalPrice,
      platform_commission: Math.round(finalPrice * 0.1 * 100) / 100,
      partner_earning: Math.round(finalPrice * 0.9 * 100) / 100,
      payment_method: (request as any).payment_method || 'cash',
      payment_status: 'pending',
    } as any);
  } catch {}

  // Notify driver
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: driverId,
        title: 'تم قبول عرضك ✅',
        body: `العميل وافق على سعر ${finalPrice} ريال`,
        sound: 'payment_success',
        data: { type: 'ride_accepted', requestId },
      },
    });
  } catch {}
};

export const rejectRidePrice = async (requestId: string) => {
  const { error } = await supabase
    .from("ride_requests")
    .update({
      negotiation_status: 'rejected',
      driver_id: null,
      proposed_price: null,
      status: 'pending',
    } as any)
    .eq("id", requestId);
  if (error) throw error;
};

// ==================== Driver Management ====================

export const fetchDriverProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("drivers" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const createDriverProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("drivers" as any)
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateDriverOnlineStatus = async (driverId: string, isOnline: boolean) => {
  await supabase
    .from("drivers" as any)
    .update({ is_online: isOnline, updated_at: new Date().toISOString() })
    .eq("id", driverId);

  // Also update driver_locations
  await supabase
    .from("driver_locations" as any)
    .upsert({ driver_id: driverId, is_online: isOnline, updated_at: new Date().toISOString() }, { onConflict: 'driver_id' });
};

// ==================== Driver Location ====================

export const updateDriverLocation = async (driverId: string, lat: number, lng: number, heading?: number, speed?: number) => {
  const { error } = await supabase
    .from("driver_locations" as any)
    .upsert({
      driver_id: driverId,
      lat,
      lng,
      heading,
      speed,
      is_online: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'driver_id' });
  if (error) throw error;
};

export const fetchNearbyDrivers = async (lat: number, lng: number, radiusKm: number = 10) => {
  // Simple distance filter (not PostGIS, just rough filtering)
  const degreeRadius = radiusKm / 111; // ~111km per degree
  const { data, error } = await supabase
    .from("driver_locations" as any)
    .select("*")
    .eq("is_online", true)
    .gte("lat", lat - degreeRadius)
    .lte("lat", lat + degreeRadius)
    .gte("lng", lng - degreeRadius)
    .lte("lng", lng + degreeRadius);
  if (error) throw error;
  return data || [];
};

// ==================== Vehicles ====================

export const fetchDriverVehicles = async (driverId: string) => {
  const { data, error } = await supabase
    .from("vehicles" as any)
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addVehicle = async (vehicle: {
  driverId: string;
  vehicleType: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  plateNumber: string;
}) => {
  const { data, error } = await supabase
    .from("vehicles" as any)
    .insert({
      driver_id: vehicle.driverId,
      vehicle_type: vehicle.vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      plate_number: vehicle.plateNumber,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ==================== Ride Status Updates ====================

export const updateRideStatus = async (rideId: string, status: string, extras?: Record<string, unknown>) => {
  const update: Record<string, unknown> = { status, ...extras };
  if (status === 'started') update.started_at = new Date().toISOString();
  if (status === 'completed') update.ended_at = new Date().toISOString();

  const { error } = await supabase
    .from("rides" as any)
    .update(update)
    .eq("id", rideId);
  if (error) throw error;
};

export const cancelRideRequest = async (requestId: string, reason: string) => {
  const { error } = await supabase
    .from("ride_requests")
    .update({
      status: 'cancelled',
      negotiation_status: 'cancelled',
      cancellation_reason: reason,
    } as any)
    .eq("id", requestId);
  if (error) throw error;
};

// ==================== Admin ====================

export const fetchAllDrivers = async () => {
  const { data, error } = await supabase
    .from("drivers" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const approveDriver = async (driverId: string) => {
  const { error } = await supabase
    .from("drivers" as any)
    .update({ is_approved: true, approval_date: new Date().toISOString() })
    .eq("id", driverId);
  if (error) throw error;
};

export const rejectDriver = async (driverId: string, reason: string) => {
  const { error } = await supabase
    .from("drivers" as any)
    .update({ is_approved: false, rejection_reason: reason })
    .eq("id", driverId);
  if (error) throw error;
};
