import { defineCollection, z } from "astro:content";

const posts = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        image: z.string().optional(),
        tags: z.array(z.string()).optional(),
    }),
});

// const products = defineCollection({
//     schema: z.object({
//         title: z.string(),
//         description: z.string(),
//         price: z.number(),
//         image: z.string().optional(),
//         category: z.string(),
//         stock: z.number().optional(),
//         tags: z.array(z.string()).optional(),
//     }),
// });