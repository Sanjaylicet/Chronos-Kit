import { NextRequest, NextResponse } from 'next/server';
import { MirrorNodeClient } from '@/lib/client';
import { MirrorNodeError } from '@/lib/errors';

const MIRROR_NODE_URL =
  process.env.HIERO_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new MirrorNodeClient({ baseUrl: MIRROR_NODE_URL });

  try {
    const schedule = await client.getScheduleInfo(params.id);
    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof MirrorNodeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
