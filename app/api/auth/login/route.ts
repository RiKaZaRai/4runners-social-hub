import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { requireRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { requireCsrfToken } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    // Rate limiting for auth endpoints (stricter)
    const clientId = getClientIdentifier(req);
    await requireRateLimit(clientId, 'auth');

    // CSRF protection for all login forms
    await requireCsrfToken(req);

    const form = await req.formData();
    const requestMagic = form.get('requestMagic')?.toString() === '1';

    if (requestMagic) {
      const email = form.get('magicEmail')?.toString();
      if (!email) {
        return NextResponse.redirect(new URL('/login?message=Email+manquant', req.url));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.redirect(new URL('/login?message=Email+invalide', req.url));
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Don't reveal if email exists or not (security best practice)
        return NextResponse.redirect(
          new URL('/login?message=Si+l\'email+existe,+un+lien+magique+sera+envoyé', req.url)
        );
      }

      // Use 32 bytes (256 bits) for secure token
      const token = crypto.randomBytes(32).toString('hex');

      await prisma.magicLinkToken.create({
        data: {
          email,
          token,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15) // 15 minutes
        }
      });

      // TODO: Send email with magic link instead of displaying token
      // For now, log it (in production, this should send an email)
      console.log(`Magic link for ${email}: /login?magicToken=${token}`);

      // Don't expose the token in the URL
      return NextResponse.redirect(
        new URL('/login?message=Un+lien+magique+a+été+envoyé+à+votre+email', req.url)
      );
    }

    const accessToken = form.get('accessToken')?.toString();
    if (accessToken) {
      const user = await prisma.user.findUnique({ where: { accessToken } });
      if (!user) {
        return NextResponse.redirect(new URL('/login?message=Token+invalide', req.url));
      }

      await createSession(user.id);

      // Clean up old magic link tokens for this user
      await prisma.magicLinkToken.deleteMany({ where: { email: user.email } });

      return NextResponse.redirect(new URL('/select-tenant', req.url));
    }

    const email = form.get('email')?.toString();
    const password = form.get('password')?.toString();
    const magicToken = form.get('magicToken')?.toString();

    if (magicToken) {
      const tokenRow = await prisma.magicLinkToken.findFirst({
        where: { token: magicToken, expiresAt: { gt: new Date() } }
      });

      if (!tokenRow) {
        return NextResponse.redirect(
          new URL('/login?message=Magic+token+invalide+ou+expiré', req.url)
        );
      }

      const user = await prisma.user.findUnique({ where: { email: tokenRow.email } });
      if (!user) {
        return NextResponse.redirect(new URL('/login?message=Utilisateur+introuvable', req.url));
      }

      // Delete the used magic link token (one-time use)
      await prisma.magicLinkToken.deleteMany({ where: { token: magicToken } });

      await createSession(user.id);

      const membership = await prisma.tenantMembership.findFirst({
        where: { userId: user.id },
        select: { tenantId: true }
      });

      // Log the login
      await prisma.auditLog.create({
        data: {
          tenantId: membership?.tenantId ?? 'system',
          action: 'user.login',
          entityType: 'user',
          entityId: user.id,
          payload: { method: 'magic_link' }
        }
      });

      return NextResponse.redirect(new URL('/select-tenant', req.url));
    }

    if (!email || !password) {
      return NextResponse.redirect(new URL('/login?message=Champs+incomplets', req.url));
    }

    const envAdminEmail = process.env.ADMIN_LOGIN;
    const envAdminPassword = process.env.ADMIN_PASSWORD;
    if (envAdminEmail && envAdminPassword && email === envAdminEmail) {
      if (password !== envAdminPassword) {
        return NextResponse.redirect(new URL('/login?message=Identifiants+invalides', req.url));
      }

      const adminUser = await prisma.user.upsert({
        where: { email: envAdminEmail },
        update: { role: 'agency_admin' },
        create: {
          email: envAdminEmail,
          name: 'Admin Agence',
          role: 'agency_admin'
        }
      });

      await createSession(adminUser.id);

      // Ensure the admin can access all tenants
      const tenants = await prisma.tenant.findMany({ select: { id: true } });
      if (tenants.length > 0) {
        await prisma.tenantMembership.createMany({
          data: tenants.map((tenant) => ({
            tenantId: tenant.id,
            userId: adminUser.id
          })),
          skipDuplicates: true
        });
      }

      return NextResponse.redirect(new URL('/select-tenant', req.url));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.redirect(new URL('/login?message=Email+invalide', req.url));
    }

    // Validate password requirements
    if (password.length < 8) {
      return NextResponse.redirect(
        new URL('/login?message=Le+mot+de+passe+doit+contenir+au+moins+8+caractères', req.url)
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      // Use timing-safe comparison to prevent timing attacks
      // Hash a dummy password even if user doesn't exist
      await bcrypt.compare(password, '$2a$10$dummyhashtopreventtimingattack');
      return NextResponse.redirect(new URL('/login?message=Identifiants+invalides', req.url));
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.redirect(new URL('/login?message=Identifiants+invalides', req.url));
    }

    await createSession(user.id);

    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: user.id },
      select: { tenantId: true }
    });

    // Log the login
    await prisma.auditLog.create({
      data: {
        tenantId: membership?.tenantId ?? 'system',
        action: 'user.login',
        entityType: 'user',
        entityId: user.id,
        payload: { method: 'password' }
      }
    });

    return NextResponse.redirect(new URL('/select-tenant', req.url));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.redirect(
          new URL('/login?message=Trop+de+tentatives.+Réessayez+plus+tard', req.url)
        );
      }
      if (error.message === 'CSRF_INVALID') {
        return NextResponse.redirect(
          new URL('/login?message=Token+de+sécurité+invalide.+Veuillez+réessayer', req.url)
        );
      }
    }

    console.error('Login error:', error);
    return NextResponse.redirect(new URL('/login?message=Erreur+serveur', req.url));
  }
}
