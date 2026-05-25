import { NextRequest, NextResponse } from 'next/server';
import type { LandlordProfile } from '@/types';

// In-memory store — replace with database in production
const landlordStore = new Map<string, LandlordProfile>();

export async function GET(
  _request: NextRequest,
  { params }: { params: { landlord_id: string } },
) {
  const { landlord_id } = params;
  const landlord = landlordStore.get(landlord_id);

  if (!landlord) {
    return NextResponse.json(
      { error: 'Landlord not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(landlord);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { landlord_id: string } },
) {
  const { landlord_id } = params;

  try {
    const body: LandlordProfile = await request.json();
    landlordStore.set(landlord_id, body);
    return NextResponse.json({ success: true, landlord_id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update landlord',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { landlord_id: string } },
) {
  const { landlord_id } = params;
  landlordStore.delete(landlord_id);
  return NextResponse.json({ success: true });
}
