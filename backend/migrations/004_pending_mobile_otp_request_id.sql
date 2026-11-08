ALTER TABLE pending_registrations
  ADD COLUMN mobile_otp_request_id VARCHAR(128) DEFAULT NULL;
