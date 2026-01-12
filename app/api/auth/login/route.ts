import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  const requestMagic = form.get('requestMagic')?.toString() === '1';

  if (requestMagic) {
    const email = form.get('magicEmail')?.toString();
    if (!email) return NextResponse.redirect(new URL('/login?message=Email+manquant', req.url));
    const token = crypto.randomBytes(16).toString('hex');
    await prisma.magicLinkToken.create({
      data: {
        email,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 15)
      }
    });
    return NextResponse.redirect(new URL(`/login?message=Magic+token:+${token}`, req.url));
  }

  const accessToken = form.get('accessToken')?.toString();
  if (accessToken) {
    const user = await prisma.user.findUnique({ where: { accessToken } });
    if (!user) return NextResponse.redirect(new URL('/login?message=Token+invalide', req.url));
    await createSession(user.id);
    return NextResponse.redirect(new URL('/select-tenant', req.url));
  }

  const email = form.get('email')?.toString();
  const password = form.get('password')?.toString();
  const magicToken = form.get('magicToken')?.toString();

  if (magicToken) {
    const tokenRow = await prisma.magicLinkToken.findFirst({
      where: { token: magicToken, expiresAt: { gt: new Date() } }
    });
    if (!tokenRow) return NextResponse.redirect(new URL('/login?message=Magic+token+invalide', req.url));
    const user = await prisma.user.findUnique({ where: { email: tokenRow.email } });
    if (!user) return NextResponse.redirect(new URL('/login?message=Utilisateur+introuvable', req.url));
    await prisma.magicLinkToken.deleteMany({ where: { token: magicToken } });
    await createSession(user.id);
    return NextResponse.redirect(new URL('/select-tenant', req.url));
  }

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?message=Champs+incomplets', req.url));
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.redirect(new URL('/login?message=Identifiants+invalides', req.url));
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.redirect(new URL('/login?message=Identifiants+invalides', req.url));

  await createSession(user.id);
  return NextResponse.redirect(new URL('/select-tenant', req.url));
}
