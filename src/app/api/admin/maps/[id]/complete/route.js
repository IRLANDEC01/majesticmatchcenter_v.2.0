import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const { winnerFamilyId, mvpPlayerId, ratingChanges, playerStats } = body;

    await mapService.completeMap(id, {
      winnerFamilyId,
      mvpPlayerId,
      ratingChanges,
      playerStats,
    });

    // При успешном завершении возвращаем статус 200 OK без тела.
    return new Response(null, { status: 200 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('ValidationError details:', JSON.stringify(error.errors, null, 2));
    } else {
      console.error('ERROR in POST /api/admin/maps/[id]/complete:', error);
    }
    return handleApiError(error);
  }
} 