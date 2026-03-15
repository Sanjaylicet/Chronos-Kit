import { NextRequest, NextResponse } from 'next/server';
import { MirrorNodeClient } from '@/lib/client';
import { MirrorNodeError } from '@/lib/errors';

const MIRROR_NODE_URL =
  process.env.HIERO_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json(
      { error: 'accountId query parameter is required' },
      { status: 400 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 25;

  const client = new MirrorNodeClient({ baseUrl: MIRROR_NODE_URL });

  try {
    const transactions = await client.getTransactionHistory(accountId, { limit });
    return NextResponse.json({ transactions });
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
