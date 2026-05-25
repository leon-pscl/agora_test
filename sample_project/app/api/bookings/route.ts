import { NextRequest, NextResponse } from 'next/server';
import type { BookingRecord } from '@/types';
import { generateId } from '@/lib/utils';

const bookingStore = new Map<string, BookingRecord>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const landlord_id = searchParams.get('landlord_id');
  const unit_id = searchParams.get('unit_id');

  let bookings = Array.from(bookingStore.values());

  if (landlord_id) {
    bookings = bookings.filter((b) => b.landlord_id === landlord_id);
  }
  if (unit_id) {
    bookings = bookings.filter((b) => b.unit_id === unit_id);
  }

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const body: Omit<BookingRecord, 'booking_id'> = await request.json();

    const booking: BookingRecord = {
      ...body,
      booking_id: generateId('booking'),
    };

    bookingStore.set(booking.booking_id, booking);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create booking',
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: Partial<BookingRecord> & { booking_id: string } =
      await request.json();
    const { booking_id, ...updates } = body;

    const existing = bookingStore.get(booking_id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 },
      );
    }

    const updated: BookingRecord = { ...existing, ...updates };
    bookingStore.set(booking_id, updated);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update booking',
      },
      { status: 400 },
    );
  }
}
