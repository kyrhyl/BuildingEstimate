import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CalcRun from '@/models/CalcRun';

// GET /api/projects/:id/calcruns - Get all calculation runs for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const calcRuns = await CalcRun.find({ projectId: id })
      .sort({ timestamp: -1 }) // Most recent first
      .limit(10); // Limit to last 10 runs

    return NextResponse.json({
      calcRuns,
      count: calcRuns.length,
    });
  } catch (error) {
    console.error('GET /api/projects/:id/calcruns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calculation runs' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/calcruns - Create a new calculation run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const { takeoffLines, boqLines, summary } = body;

    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const calcRun = await CalcRun.create({
      runId,
      projectId: id,
      timestamp: new Date(),
      status: 'completed',
      summary,
      takeoffLines: takeoffLines || [],
      boqLines: boqLines || [],
    });

    return NextResponse.json({
      calcRun,
      message: 'Calculation run saved successfully',
    });
  } catch (error) {
    console.error('POST /api/projects/:id/calcruns error:', error);
    return NextResponse.json(
      { error: 'Failed to create calculation run' },
      { status: 500 }
    );
  }
}
