// app/api/vendor/projects/ai-suggestions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Catalogue du vendeur
    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
    });

    // 2. Projets disponibles avec leurs items
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['BROUILLON', 'EN_ATTENTE'] },
      },
      include: {
        items: {
          include: {
            product: true, // pour récupérer le nom du produit
          },
        },
      },
    });

    if (products.length === 0 || projects.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // 3. Construire le prompt
    const prompt = `
      Tu es un assistant IA pour un vendeur de matériaux.
      
      Catalogue du vendeur :
      ${JSON.stringify(products.map(p => ({ name: p.name, stock: p.stock, salePrice: p.salePrice })), null, 2)}
      
      Projets des artisans :
      ${JSON.stringify(
        projects.map(p => ({
          id: p.id,
          name: p.name,
          needs: p.items.map((item: { product: { name: string } | null; quantity: number }) => ({
            productName: item.product?.name || 'Inconnu',
            quantity: item.quantity,
          })),
        })),
        null,
        2
      )}
      
      Propose des suggestions (max 5) sous forme de JSON :
      - type: "offer" ou "restock"
      - projectId, projectName, productId, productName, quantity, suggestedPrice, category, message
      Réponds uniquement en JSON.
    `;

    // 4. Appel à OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Tu es un assistant IA en conseil pour vendeurs.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const raw = completion.choices[0].message.content || '{"suggestions": []}';
    const parsed = JSON.parse(raw);
    const suggestions = parsed.suggestions || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('AI Suggestions error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse IA' },
      { status: 500 }
    );
  }
}