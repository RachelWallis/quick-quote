import { client } from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await client.execute('DELETE FROM questions WHERE id = ?', [Number(params.id)]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/questions/[id] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
} 