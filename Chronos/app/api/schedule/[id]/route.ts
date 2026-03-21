import { NextRequest, NextResponse } from 'next/server';
import { MirrorNodeClient, type ScheduleInfo } from '@/lib/client';
import { MirrorNodeError } from '@/lib/errors';
import { z } from 'zod';

const MIRROR_NODE_URL =
  process.env.HIERO_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

const scheduleIdSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid schedule ID format');

interface ApiErrorBody {
  error: {
    code: 'INVALID_SCHEDULE_ID' | 'NOT_FOUND' | 'MIRROR_NODE_ERROR' | 'INTERNAL_ERROR';
    message: string;
    details?: unknown;
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const parsedId = scheduleIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    const body: ApiErrorBody = {
      error: {
        code: 'INVALID_SCHEDULE_ID',
        message: 'Schedule ID must match the format shard.realm.num (e.g. 0.0.12345)',
        details: parsedId.error.flatten(),
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  const client = new MirrorNodeClient({ baseUrl: MIRROR_NODE_URL });

  try {
    const schedule: ScheduleInfo = await client.getScheduleInfo(parsedId.data);
    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof MirrorNodeError) {
      if (error.statusCode === 404) {
        const body: ApiErrorBody = {
          error: {
            code: 'NOT_FOUND',
            message: `Schedule ${parsedId.data} was not found on the mirror node`,
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
