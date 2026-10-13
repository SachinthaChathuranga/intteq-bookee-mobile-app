-- Up Migration
ALTER TABLE salon_appointment_services DROP CONSTRAINT salon_appointment_services_service_id_fkey;
ALTER TABLE salon_appointment_services ADD CONSTRAINT salon_appointment_services_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

-- Down Migration
ALTER TABLE salon_appointment_services DROP CONSTRAINT salon_appointment_services_service_id_fkey;
ALTER TABLE salon_appointment_services ADD CONSTRAINT salon_appointment_services_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;
