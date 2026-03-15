import { NextRequest, NextResponse } from 'next/server';
import { MirrorNodeClient, type AccountInfo, type TokenBalance } from '@/lib/client';
import { MirrorNodeError } from '@/lib/errors';
import { z } from 'zod';

const MIRROR_NODE_URL =
  process.env.HIERO_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

const accountIdSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid Hiero account ID format');

interface ApiErrorBody {
  error: {
    code: 'INVALID_ACCOUNT_ID' | 'NOT_FOUND' | 'MIRROR_NODE_ERROR' | 'INTERNAL_ERROR';
    message: string;
    details?: unknown;
  };
}

interface AccountLookupResponse {
  accountInfo: AccountInfo;
  tokenBalances: TokenBalance[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const parsedId = accountIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    const body: ApiErrorBody = {
      error: {
        code: 'INVALID_ACCOUNT_ID',
        message: 'Account ID must match the format shard.realm.num (e.g. 0.0.12345)',
        details: parsedId.error.flatten(),
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  const client = new MirrorNodeClient({ baseUrl: MIRROR_NODE_URL });

  try {
    const [accountInfo, tokenBalances] = await Promise.all([
      client.getAccountInfo(parsedId.data),
      client.getAccountTokens(parsedId.data),
    ]);

    const response: AccountLookupResponse = { accountInfo, tokenBalances };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof MirrorNodeError) {
      if (error.statusCode === 404) {
        const body: ApiErrorBody = {
          error: {
            code: 'NOT_FOUND',
            message: `Account ${parsedId.data} was not found on the mirror node`,
          },
        };
        return NextResponse.json(body, { status: 404 });
      }

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
