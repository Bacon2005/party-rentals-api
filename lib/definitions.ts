import * as z from "zod";

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
    password: z
      .string()
      .min(6, { error: "The password needs at least 6 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
