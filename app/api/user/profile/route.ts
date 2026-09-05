import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const serializeUserProfile = (user: {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  brandColor?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  age?: number | null;
  trade?: string | null;
  certificationScore?: number | null;
  certificationLabel?: string | null;
  certificationAnswers?: string | null;
  role?: string | null;
}) => ({
  ...user,
  firstName: user.firstName ?? null,
  lastName: user.lastName ?? null,
  phone: user.phone ?? null,
  address: user.address ?? null,
  age: user.age ?? null,
  logoUrl: user.imageUrl ?? null,
  trade: user.trade ?? null,
  role: user.role ?? null,
  profileType: user.role ?? null,
  certificationScore: user.certificationScore ?? 0,
  certificationLabel: user.certificationLabel ?? null,
  certificationAnswers: user.certificationAnswers ?? null,
});

// ============================================================
// GET : Récupérer le profil
// ============================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        companyName: true,
        brandColor: true,
        imageUrl: true,
        phone: true,
        address: true,
        age: true,
        trade: true,
        certificationScore: true,
        certificationLabel: true,
        certificationAnswers: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json(serializeUserProfile(user));
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PUT : Mettre à jour le profil
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    console.log('📌 PUT /api/user/profile appelé');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body reçu :', body);

    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      address,
      age,
      companyName,
      brandColor,
      logoUrl,
      trade,
      profileType,
      role,
      certificationScore,
      certificationLabel,
      certificationAnswers,
    } = body;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9\s().-]{8,20}$/;

    if (email !== undefined && String(email).trim() && !emailPattern.test(String(email).trim())) {
      return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 });
    }

    if (phone !== undefined && String(phone).trim() && !phonePattern.test(String(phone).trim())) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 });
    }

    if (age !== undefined && age !== null && age !== '' && (Number(age) < 0 || Number(age) > 120 || Number.isNaN(Number(age)))) {
      return NextResponse.json({ error: 'L’âge doit être un nombre valide entre 0 et 120 ans' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!existingUser) {
      console.log('❌ Utilisateur introuvable');
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const normalizedFirstName = firstName === undefined ? existingUser.firstName ?? null : String(firstName).trim() || null;
    const normalizedLastName = lastName === undefined ? existingUser.lastName ?? null : String(lastName).trim() || null;
    const normalizedEmail = email === undefined ? existingUser.email : String(email).trim();
    const normalizedPhone = phone === undefined ? existingUser.phone ?? null : String(phone).trim() || null;
    const normalizedName = name === undefined
      ? [existingUser.firstName, existingUser.lastName].filter(Boolean).join(' ').trim() || existingUser.name
      : String(name).trim() || [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim() || existingUser.name;
    const normalizedAddress = address === undefined ? existingUser.address ?? null : String(address).trim() || null;
    const normalizedAge = age === undefined ? existingUser.age ?? null : age === '' || age === null ? null : Number(age);
    const normalizedProfileType = String(profileType ?? role ?? existingUser.role ?? 'user').trim().toLowerCase();
    const normalizedTrade = trade === undefined ? existingUser.trade ?? null : String(trade).trim() || null;

    const normalizedDateOfBirth = body.dateOfBirth === undefined ? null : String(body.dateOfBirth).trim() || null;
    const calculatedAgeFromBirthDate = normalizedDateOfBirth ? (() => {
      const birth = new Date(normalizedDateOfBirth);
      if (Number.isNaN(birth.getTime())) return existingUser.age ?? null;
      const today = new Date();
      let calcAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) calcAge--;
      return calcAge;
    })() : (age === undefined || age === '' || age === null ? existingUser.age ?? null : Number(age));

    if (normalizedEmail !== existingUser.email) {
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (userWithSameEmail && userWithSameEmail.id !== session.user.id) {
        return NextResponse.json({ error: 'Cet e-mail est déjà utilisé par un autre compte' }, { status: 400 });
      }
    }

    const updateData: Record<string, string | number | null> = {};
    updateData.name = normalizedName || existingUser.name;
    updateData.firstName = normalizedFirstName;
    updateData.lastName = normalizedLastName;
    updateData.email = normalizedEmail;
    updateData.phone = normalizedPhone;
    updateData.address = normalizedAddress;
    updateData.age = calculatedAgeFromBirthDate ?? normalizedAge ?? existingUser.age ?? null;
    if (companyName !== undefined) updateData.companyName = companyName === '' ? null : companyName;
    if (brandColor !== undefined) updateData.brandColor = brandColor === '' ? null : brandColor;
    if (logoUrl !== undefined) updateData.imageUrl = logoUrl === '' ? null : logoUrl;
    if (profileType !== undefined || role !== undefined) {
      const allowedProfileTypes = ['artisan', 'vendeur', 'promoteur', 'user'];
      if (allowedProfileTypes.includes(normalizedProfileType)) {
        updateData.role = normalizedProfileType;
      }
    }
    if (trade !== undefined) updateData.trade = normalizedTrade;
    if (normalizedTrade !== null && (!existingUser.trade || existingUser.trade !== normalizedTrade)) {
      updateData.trade = normalizedTrade;
    }
    if (certificationScore !== undefined) updateData.certificationScore = Number(certificationScore);
    if (certificationLabel !== undefined) updateData.certificationLabel = certificationLabel === '' ? null : String(certificationLabel);
    if (certificationAnswers !== undefined) updateData.certificationAnswers = typeof certificationAnswers === 'string' ? certificationAnswers : JSON.stringify(certificationAnswers ?? {});

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        companyName: true,
        brandColor: true,
        imageUrl: true,
        phone: true,
        address: true,
        age: true,
        trade: true,
        certificationScore: true,
        certificationLabel: true,
        certificationAnswers: true,
      },
    });

    console.log('✅ Utilisateur mis à jour :', updatedUser);

    return NextResponse.json(serializeUserProfile(updatedUser));
  } catch (error) {
    console.error('🔥 Erreur PUT /api/user/profile :', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}