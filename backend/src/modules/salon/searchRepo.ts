import { pool, type Queryable } from '../../db/pool.js';

export interface SalonSearchService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface SalonSearchWorkingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface SalonSearchResult {
  id: string;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  business_status: string;
  branch_name: string;
  address: string;
  phone: string | null;
  cover_image_url: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  services: SalonSearchService[];
  working_hours: SalonSearchWorkingHour[];
  active_barbers_count: number;
}

export interface SalonSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

export async function searchSalonBranches(
  params: SalonSearchParams = {},
  db: Queryable = pool,
): Promise<SalonSearchResult[]> {
  const values: any[] = [];
  let paramIndex = 1;

  let distanceExpr = 'NULL::double precision AS distance_km';
  let distanceFilter = '';

  const hasCoords =
    typeof params.lat === 'number' &&
    typeof params.lng === 'number' &&
    !isNaN(params.lat) &&
    !isNaN(params.lng);

  if (hasCoords) {
    const latIdx = paramIndex++;
    const lngIdx = paramIndex++;
    values.push(params.lat, params.lng);

    // Haversine formula in KM
    distanceExpr = `
      CASE 
        WHEN br.lat IS NOT NULL AND br.lng IS NOT NULL THEN
          round((6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians($${latIdx})) * cos(radians(br.lat)) * cos(radians(br.lng) - radians($${lngIdx})) +
              sin(radians($${latIdx})) * sin(radians(br.lat))
            ))
          ))::numeric, 1)::double precision
        ELSE NULL
      END AS distance_km
    `;

    if (params.radius_km && params.radius_km > 0) {
      const radiusIdx = paramIndex++;
      values.push(params.radius_km);
      distanceFilter = `
        AND br.lat IS NOT NULL AND br.lng IS NOT NULL AND
        (6371 * acos(
          least(1.0, greatest(-1.0,
            cos(radians($${latIdx})) * cos(radians(br.lat)) * cos(radians(br.lng) - radians($${lngIdx})) +
            sin(radians($${latIdx})) * sin(radians(br.lat))
          ))
        )) <= $${radiusIdx}
      `;
    }
  }

  let textSearchFilter = '';
  if (params.query && params.query.trim()) {
    const qIdx = paramIndex++;
    values.push(`%${params.query.trim()}%`);
    textSearchFilter = `
      AND (
        b.name ILIKE $${qIdx} OR
        br.name ILIKE $${qIdx} OR
        br.address ILIKE $${qIdx}
      )
    `;
  }

  const sql = `
    SELECT 
      br.id,
      br.business_id,
      b.name AS business_name,
      b.logo_url AS business_logo,
      b.status AS business_status,
      br.name AS branch_name,
      br.address,
      br.phone,
      br.cover_image_url,
      br.lat,
      br.lng,
      ${distanceExpr},
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'price', s.price,
            'duration_minutes', s.duration_minutes
          )
        ), '[]'::json)
        FROM services s
        WHERE s.branch_id = br.id AND s.is_active = true
      ) AS services_json,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'day_of_week', wh.day_of_week,
            'open_time', wh.open_time,
            'close_time', wh.close_time,
            'is_closed', wh.is_closed
          )
          ORDER BY wh.day_of_week
        ), '[]'::json)
        FROM working_hours wh
        WHERE wh.branch_id = br.id
      ) AS working_hours_json,
      (
        SELECT count(DISTINCT bb.barber_id)::int
        FROM barber_branches bb
        WHERE bb.branch_id = br.id AND bb.is_active = true
      ) AS active_barbers_count
    FROM branches br
    JOIN businesses b ON br.business_id = b.id
    WHERE b.type = 'SALON' AND b.status = 'active'
    ${textSearchFilter}
    ${distanceFilter}
    ORDER BY 
      ${hasCoords ? 'distance_km ASC NULLS LAST,' : ''}
      b.name ASC, 
      br.name ASC
  `;

  const { rows } = await db.query<any>(sql, values);

  return rows.map((r) => ({
    id: r.id,
    business_id: r.business_id,
    business_name: r.business_name,
    business_logo: r.business_logo,
    business_status: r.business_status,
    branch_name: r.branch_name,
    address: r.address,
    phone: r.phone,
    cover_image_url: r.cover_image_url ?? null,
    lat: r.lat ? parseFloat(r.lat) : null,
    lng: r.lng ? parseFloat(r.lng) : null,
    distance_km: r.distance_km !== null ? parseFloat(r.distance_km) : null,
    services: r.services_json ?? [],
    working_hours: r.working_hours_json ?? [],
    active_barbers_count: r.active_barbers_count ?? 0,
  }));
}
