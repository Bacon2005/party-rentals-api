import { z } from "zod";

const PAYMENT_IMAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/PaymentReciepts/`;

export const createPaymentSchema = z.object({
  reservationItemId: z.string().uuid(),
  referenceNum: z.string().min(1).max(255),
  screenshotUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith(PAYMENT_IMAGE), "Invalid image URL"),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
