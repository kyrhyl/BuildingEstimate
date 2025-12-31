import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CalcRun from '@/models/CalcRun';

// GET /api/projects/:id/calcruns/latest - Get the most recent calculation run
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const latestRun = await CalcRun.findOne({ projectId: id })
      .sort({ timestamp: -1 }); // Most recent first

    if (!latestRun) {
      return NextResponse.json(
        { calcRun: null, message: 'No calculation runs found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      calcRun: latestRun,
    });
  } catch (error) {
    console.error('GET /api/projects/:id/calcruns/latest error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest calculation run' },
      { status: 500 }
    );
  }
}
