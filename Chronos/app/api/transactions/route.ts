import { NextRequest, NextResponse } from 'next/server';
import { MirrorNodeClient, type Transaction } from '@/lib/client';
import { MirrorNodeError } from '@/lib/errors';
import { z } from 'zod';

const MIRROR_NODE_URL =
  process.env.HIERO_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

const querySchema = z.object({
  accountId: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'accountId must match shard.realm.num (e.g. 0.0.12345)'),
});

interface ApiErrorBody {
  error: {
    code: 'INVALID_QUERY' | 'MIRROR_NODE_ERROR' | 'INTERNAL_ERROR';
    message: string;
    details?: unknown;
  };
}

interface TransactionsResponse {
  accountId: string;
  count: number;
  transactions: Transaction[];
}

export async function GET(request: NextRequest) {
  const parsedQuery = querySchema.safeParse({
    accountId: request.nextUrl.searchParams.get('accountId') ?? undefined,
  });

  if (!parsedQuery.success) {
    const body: ApiErrorBody = {
      error: {
        code: 'INVALID_QUERY',
        message: 'Missing or invalid accountId query parameter',
        details: parsedQuery.error.flatten(),
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  const { accountId } = parsedQuery.data;

  const client = new MirrorNodeClient({ baseUrl: MIRROR_NODE_URL });

  try {
    const transactions: Transaction[] = [];

    for await (const transaction of client.paginate<Transaction>('/api/v1/transactions', {
      'account.id': accountId,
    })) {
      transactions.push(transaction);
      if (transactions.length >= 25) {
        break;
      }
    }

    const response: TransactionsResponse = {
      accountId,
      count: transactions.length,
      transactions,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof MirrorNodeError) {
      const body: ApiErrorBody = {
        error: {
          code: 'MIRROR_NODE_ERROR',
          message: error.message,
          details: { path: error.path, statusCode: error.statusCode },
        },
      };
      return NextResponse.json(body, { status: 502 });
    }

    const body: ApiErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    };
    return NextResponse.json(body, { status: 500 });
  }
}
