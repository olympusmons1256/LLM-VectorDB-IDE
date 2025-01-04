import { NextResponse } from 'next/server';
import { getNamespaces, getNamespaceStats } from '@/lib/pinecone-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const indexName = searchParams.get('index');

    if (!indexName) {
      return NextResponse.json(
        { error: 'Index name is required' },
        { status: 400 }
      );
    }

    // Get all namespaces for the index
    const namespaces = await getNamespaces(indexName);

    // If stats are requested, get them for each namespace
    const includeStats = searchParams.get('stats') === 'true';
    if (includeStats) {
      const namespaceStats = await Promise.all(
        namespaces.map(async (namespace) => {
          const stats = await getNamespaceStats(indexName, namespace);
          return {
            name: namespace,
            stats
          };
        })
      );
      
      return NextResponse.json({ namespaces: namespaceStats });
    }

    return NextResponse.json({ namespaces });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch namespaces' },
      { status: 500 }
    );
  }
}