import * as z from "zod";
import { isAdult } from "@/lib/age";

// *This validates the form values before they are saved to the database.
// *It prevents empty fields, bad years, missing images, and invalid file types.

export const CredentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  password: z
    .string()
    .min(6, { error: "The password needs at least 6 characters." }),
});

export const SignUpSchema = z
  .object({
    name: z.string().min(1, { error: "Enter your name." }),
    email: z.email({ error: "Enter a valid email." }),
    dateOfBirth: z.iso.date({ error: "Enter a valid date of birth." })
      .refine((value) => isAdult(value), { error: "You must be 18 or older to join Party Link." }),
    acceptTerms: z.literal("on", { error: "Accept the terms and privacy notice to continue." }),
    password: z
      .string()
      .min(8, { error: "The password needs at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const EmailSchema = z.email({ error: "Enter a valid email." });
export const VerifyEmailSchema = z.object({
  email: EmailSchema,
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});
