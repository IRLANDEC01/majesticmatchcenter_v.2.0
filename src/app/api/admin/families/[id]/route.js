import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { handleApiError } from '@/lib/api/handle-api-error';

/**
 * GET /api/admin/families/[id]
 * Получает семью по ID.
 */
export async function GET(request, { params }) {
  try {
    const family = await familyService.getFamilyById(params.id);
    return NextResponse.json(family);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/families/[id]
 * Обновляет семью.
 */
export async function PUT(request, { params }) {
  try {
    const data = await request.json();
    const updatedFamily = await familyService.updateFamily(params.id, data);
    return NextResponse.json(updatedFamily);
  } catch (error) {
    return handleApiError(error);
  }
} 