import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
    const filePath = path.join(process.cwd(), 'public', 'keyword_template.xlsx');

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="keyword_template.xlsx"',
        },
    });
}
