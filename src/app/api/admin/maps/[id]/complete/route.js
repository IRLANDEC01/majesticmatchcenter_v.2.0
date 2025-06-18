import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST(request, { params }) {
  const { id } = params;
  try {
    const payload = await request.json(); 

    await mapService.completeMap(id, payload);

    return new Response(null, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 