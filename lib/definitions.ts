import * as z from "zod";

// *This validates the form values before they are saved to the database.
// *It prevents empty fields, bad years, missing images, and invalid file types.
// export const ProjectPostSchema = z.object({
//   title: z
//     .string()
//     .trim()
//     .min(3, { error: "The title needs at least 3 characters." }),
//   year: z.coerce
//     .number()
//     .int()
//     .min(2000)
//     .max(2100, { error: "Enter a year like 2026." }),
//   summary: z
//     .string()
//     .trim()
//     .min(10, { error: "The description needs at least 10 characters." }),
//   image: z
//     .instanceof(File)
//     .refine((f) => f.size > 0, { error: "Choose a picture." })
//     .refine((f) => ["image/png", "image/jpeg", "image/webp"].includes(f.type), {
//       error: "The picture must be PNG, JPG, or WebP.",
//     })
//     .refine((f) => f.size <= 2 * 1024 * 1024, {
//       error: "The picture must be 2 MB or smaller.",
//     }),
// });

export const CredentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  password: z
    .string()
    .min(8, { error: "The password needs at least 8 characters." }),
});
