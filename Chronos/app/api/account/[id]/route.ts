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
    const [balance, info] = await Promise.all([
      client.getAccountBalance(params.id),
      client.getAccountInfo(params.id),
    ]);
    return NextResponse.json({ balance, info });
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
