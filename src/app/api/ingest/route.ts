import { ingestPdf } from '@/lib/ingest';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;

  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'No PDF file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestPdf(buffer, file.name, 'manual');

  const statusCode =
    result.status === 'completed' ? 201 :
    result.status === 'duplicate' ? 409 :
    500;

  return Response.json(result, { status: statusCode });
}
