import { NextRequest, NextResponse } from 'next/server';
import type { LandlordProfile } from '@/types';
import {
  ensureDefaultLandlordSeeded,
  getLandlordProfile,
  saveLandlordProfile,
} from '@/lib/landlords';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;

  try {
    await ensureDefaultLandlordSeeded();
    const landlord = await getLandlordProfile(landlord_id);

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    return NextResponse.json(landlord);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load landlord',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;

  try {
    const body: LandlordProfile = await request.json();
    const profile = await saveLandlordProfile({
      ...body,
      landlord_id,
    });
    return NextResponse.json({ success: true, landlord_id: profile.landlord_id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update landlord',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;

  try {
    const { prisma } = await import('@/lib/db');
    await prisma.landlord.delete({ where: { id: landlord_id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete landlord',
      },
      { status: 400 },
    );
  }
}
