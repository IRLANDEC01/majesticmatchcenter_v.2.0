import { NextResponse } from 'next/server';
import playerService from '@/lib/domain/players/player-service.js';
import { handleApiError } from '@/lib/api/handle-api-error';
import { revalidatePath } from 'next/cache';
import { NotFoundError } from '@/lib/errors';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const result = await playerService.unarchivePlayer(id);

    if (!result) {
      throw new NotFoundError(`Игрок с ID ${id} не найден для восстановления.`);
    }

    // Возвращаем оба вызова
    revalidatePath('/admin/players');
    revalidatePath(`/admin/players/${id}`);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}