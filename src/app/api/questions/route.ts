import { client } from '../../../lib/db';
import { Row } from '@libsql/client';
import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/* Helper types – keep admin UI and API perfectly in sync             */
/* ------------------------------------------------------------------ */
export interface OptionIn {
  id?: number;                           // new option => undefined
  label: string;
  next_question_id?: number | null;
  price_modifier?: number | null;
}

export interface QuestionIn {
  id?: number;                           // new question => undefined
  field: string;
  text: string;
  subtext?: string;
  type: string;
  hint?: string;
  validationKey?: string | null;
  input?: Record<string, unknown> | null;
  next_question_id?: number | null;      // for non‑option questions
  options?: OptionIn[];
}

/* ------------------------------------------------------------------ */
/* GET  /api/questions  – list everything with options as array        */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const result = await client.execute(`
      SELECT q.*,
             json_group_array(
               json_object(
                 'id',               o.id,
                 'label',            o.label,
                 'next_question_id', o.next_question_id,
                 'price_modifier',   o.price_modifier
               )
             ) AS options
      FROM   questions q
      LEFT JOIN question_options o ON q.id = o.question_id
      GROUP BY q.id
    `);

    const rows = result.rows as Row[];
    const questions = rows.map((row) => ({
      id:            Number(row.id),
      field:         String(row.field),
      text:          String(row.text),
      subtext:       String(row.subtext),
      type:          String(row.type),
      hint:          String(row.hint),
      validationKey: row.validation_key as string | null,
      input:         row.input_config ? JSON.parse(String(row.input_config)) : null,
      next_question_id: row.next_question_id as number | null,
      options:       row.options ? JSON.parse(String(row.options)) : [],
    }));

    return NextResponse.json(questions);
  } catch (err) {
    console.error('GET /api/questions failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST  /api/questions  – create a question + options                 */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const body: QuestionIn = await req.json();

  // Validate option labels
  if (body.options?.some(opt => !opt.label.trim())) {
    return NextResponse.json(
      { error: 'Option labels cannot be empty' },
      { status: 400 }
    );
  }

  try {
    /* 1. insert question */
    const insertQ = await client.execute(
      `INSERT INTO questions
         (field, text, subtext, type, hint,
          validation_key, input_config, next_question_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.field,
        body.text,
        body.subtext ?? '',
        body.type,
        body.hint ?? '',
        body.validationKey ?? null,
        body.input ? JSON.stringify(body.input) : null,
        body.next_question_id ?? null,
      ],
    );
    const qId = Number(insertQ.lastInsertRowid);

    /* 2. insert any options */
    if (body.options?.length) {
      for (const o of body.options) {
        await client.execute(
          `INSERT INTO question_options
             (question_id, label, next_question_id, price_modifier)
           VALUES (?, ?, ?, ?)`,
          [
            qId,
            o.label,
            o.next_question_id ?? null,
            o.price_modifier ?? 0,
          ],
        );
      }
    }

    const created = await client.execute(
      'SELECT * FROM questions WHERE id = ?',
      [qId],
    );
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/questions failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* PUT  /api/questions  – update core row & up‑sert options            */
/* ------------------------------------------------------------------ */
export async function PUT(req: Request) {
  const body: QuestionIn = await req.json();
  if (body.id === undefined) {
    return NextResponse.json({ error: 'id is required for PUT' }, { status: 400 });
  }

  // Validate option labels
  if (body.options?.some(opt => !opt.label.trim())) {
    return NextResponse.json(
      { error: 'Option labels cannot be empty' },
      { status: 400 }
    );
  }

  const questionId = body.id as number;

  try {
    /* 1. update the question itself */
    await client.execute(
      `UPDATE questions
         SET field            = ?,
             text             = ?,
             subtext          = ?,
             type             = ?,
             hint             = ?,
             validation_key   = ?,
             input_config     = ?,
             next_question_id = ?
       WHERE id = ?`,
      [
        body.field,
        body.text,
        body.subtext ?? '',
        body.type,
        body.hint ?? '',
        body.validationKey ?? null,
        body.input ? JSON.stringify(body.input) : null,
        body.next_question_id ?? null,
        questionId,
      ],
    );

    /* 2. up‑sert each option that came in */
    const seenIds: number[] = [];

    for (const o of body.options ?? []) {
      const result = await client.execute(
        `INSERT INTO question_options
           (id, question_id, label, next_question_id, price_modifier)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE
           SET label            = excluded.label,
               next_question_id = excluded.next_question_id,
               price_modifier   = excluded.price_modifier`,
        [
          o.id ?? null,
          questionId,
          o.label,
          o.next_question_id ?? null,
          o.price_modifier ?? 0,
        ],
      );
      /* for new rows, lastInsertRowid gives us the fresh id */
      const newId = o.id ?? Number(result.lastInsertRowid);
      seenIds.push(newId);
    }

    /* 3. delete option rows the client removed */
    if (seenIds.length) {
      await client.execute(
        `DELETE FROM question_options
          WHERE question_id = ?
            AND id NOT IN (${seenIds.map(() => '?').join(',')})`,
        [questionId, ...seenIds],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/questions failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}