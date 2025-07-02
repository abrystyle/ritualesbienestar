import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const products = defineCollection({
	// Load Markdown and MDX files in the `src/content/products/` directory.
	loader: glob({ base: './src/content/products', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema for EverGreen Life products
	schema: ({ image }) => z.object({
		// Información básica del producto
		name: z.string(),
		description: z.string().optional(),
		price: z.string(),
		originalPrice: z.string().optional(),
		
		// SKU y marca
		sku: z.string().optional(),
		brand: z.string().default('EverGreen Life'),
		
		// Imágenes y enlaces
		image: z.string().url().optional(),
		productUrl: z.string().url().optional(),
		
		// Estado y disponibilidad
		availability: z.enum(['available', 'unavailable', 'limited']).default('available'),
		inStock: z.boolean().default(true),
		
		// Categorización
		category: z.string().optional(),
		tags: z.array(z.string()).default([]),
		
		// Información adicional
		rating: z.number().min(0).max(5).optional(),
		discount: z.string().optional(),
		
		// Fechas
		createdAt: z.coerce.date().default(() => new Date()),
		updatedAt: z.coerce.date().optional(),
		
		// Imagen hero para la página del producto
		heroImage: image().optional(),
		
		// Metadatos para SEO
		seoTitle: z.string().optional(),
		seoDescription: z.string().optional(),
		
		// Información nutricional o técnica (opcional)
		nutritionalInfo: z.object({
			servingSize: z.string().optional(),
			ingredients: z.array(z.string()).optional(),
			allergens: z.array(z.string()).optional(),
		}).optional(),
		
		// Información de envío
		weight: z.string().optional(),
		dimensions: z.string().optional(),
		
		// Selector usado en el scraping (para debugging)
		scrapingSelector: z.string().optional(),
	}),
});

export const collections = { products };