import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST(request, { params }) {
  try {
    const { id: mapId } = params;
    const body = await request.json();

    const { winnerId, mvpId, ratingChanges, statistics } = body;

    const completedMap = await mapService.completeMap(mapId, {
      winnerId,
      mvpId,
      ratingChanges,
      statistics,
    });

    return NextResponse.json(completedMap, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 