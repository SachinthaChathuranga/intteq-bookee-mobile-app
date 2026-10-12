export interface SmsService {
  /** `phone` is in 94XXXXXXXXX format. */
  sendSms(phone: string, message: string): Promise<void>;
}
