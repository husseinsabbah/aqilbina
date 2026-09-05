import { notFound } from 'next/navigation';
import ProfessionalRequestFlow from './ProfessionalRequestFlow';

const categories = {
  artisan: 'Trouvez l’artisan adapté à votre projet',
  vendeur: 'Trouvez le vendeur adapté à votre besoin',
  promoteur: 'Trouvez le promoteur adapté à votre projet',
} as const;

export default async function RequestCategoryPage({
  params,
}: {
  params: Promise<{ categorie: string }>;
}) {
  const { categorie } = await params;
  const title = categories[categorie as keyof typeof categories];

  if (!title) notFound();

  return <ProfessionalRequestFlow category={categorie} title={title} />;
}