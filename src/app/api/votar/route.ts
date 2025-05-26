import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

type Faixa = 'pontual' | 'menos1' | 'ate5' | 'ate10' | 'mais10';
type RotaId = 'iate' | 'parangaba';

const rotasValidas: RotaId[] = ['iate', 'parangaba'];
const faixasValidas: Faixa[] = ['pontual', 'menos1', 'ate5', 'ate10', 'mais10'];

export async function POST(req: Request) {
  try {
    const {
      rotaId,
      faixa,
      horario_previsto,
    }: { rotaId: string; faixa: string; horario_previsto: string } =
      await req.json();

    if (
      !rotasValidas.includes(rotaId as RotaId) ||
      !faixasValidas.includes(faixa as Faixa) ||
      !/^\d{2}:\d{2}$/.test(horario_previsto)
    ) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { error } = await supabase
      .from('votos_vlt')
      .insert([{ rota: rotaId, faixa, horario_previsto }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Erro no corpo da requisição' },
      { status: 400 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const horario = searchParams.get('horario');

  if (!horario || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ error: 'Horário inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('votos_vlt')
    .select()
    .eq('horario_previsto', horario);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao consultar votos' },
      { status: 500 },
    );
  }

  const votosPorRota: Record<RotaId, Record<Faixa, number>> = {
    iate: { pontual: 0, menos1: 0, ate5: 0, ate10: 0, mais10: 0 },
    parangaba: { pontual: 0, menos1: 0, ate5: 0, ate10: 0, mais10: 0 },
  };

  for (const voto of data) {
    const rota = voto.rota as RotaId;
    const faixa = voto.faixa as Faixa;

    if (votosPorRota[rota] && votosPorRota[rota][faixa] !== undefined) {
      votosPorRota[rota][faixa]++;
    }
  }

  return NextResponse.json(votosPorRota);
}
