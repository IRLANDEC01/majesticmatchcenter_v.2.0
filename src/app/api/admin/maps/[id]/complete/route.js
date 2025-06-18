import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import container from '@/lib/di-container';

export async function POST(request, { params }) {
  try {
    const mapService = container.get('mapService');
    const { id } = params;
    const body = await request.json();
    
    // Передаем управление в сервис
    const completedMap = await mapService.completeMap(id, body);

    return NextResponse.json(completedMap, { status: 200 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('ValidationError details:', JSON.stringify(error.errors, null, 2));
    } else {
      console.error('ERROR in POST /api/admin/maps/[id]/complete:', error);
    }
    return handleApiError(error);
  }
} 