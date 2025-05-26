'use client';

import { useEffect, useState } from 'react';

// Faixas de atraso possíveis
type Faixa = 'pontual' | 'menos1' | 'ate5' | 'ate10' | 'mais10';

const opcoesTexto: Record<Faixa, string> = {
  pontual: 'Sem atraso',
  menos1: 'Menos de 1 minuto',
  ate5: '2 a 5 minutos',
  ate10: '6 a 10 minutos',
  mais10: 'Mais de 10 minutos',
};

const horarios = Array.from({ length: 28 }, (_, i) => {
  const inicioMinutos = 5 * 60 + 30; // 05:30
  const minutosTotais = inicioMinutos + i * 40;
  const h = Math.floor(minutosTotais / 60);
  const m = minutosTotais % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function getHorarioAtualVlt() {
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const inicio = 5 * 60 + 30;
  const fim = 23 * 60 + 30;

  if (minutos < inicio || minutos > fim) {
    return null; // Fora do horário
  }

  const index = Math.floor((minutos - inicio) / 40);
  return horarios[Math.max(0, Math.min(index, horarios.length - 1))];
}

interface Rota {
  id: string;
  nome: string;
  votos?: Record<Faixa, number>;
}

export default function HomePage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [votou, setVotou] = useState<{ [rotaId: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [votandoId, setVotandoId] = useState<string | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState(
    getHorarioAtualVlt(),
  );

  const fetchVotos = async (horario: string | null) => {
    if (!horario) return;
    setIsLoading(true);
    const res = await fetch(`/api/votar?horario=${horario}`);
    const data = await res.json();

    setRotas([
      {
        id: 'parangaba-iate',
        nome: 'Parangaba → Iate',
        votos: data['parangaba'],
      },
      {
        id: 'iate-parangaba',
        nome: 'Iate → Parangaba',
        votos: data['iate'],
      },
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!horarioSelecionado) return;
    fetchVotos(horarioSelecionado);

    const interval = setInterval(() => {
      const novoHorario = getHorarioAtualVlt();
      setHorarioSelecionado(novoHorario);
      if (novoHorario) fetchVotos(novoHorario);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const votar = async (rotaId: string, faixa: Faixa) => {
    if (votou[rotaId] || votandoId || !horarioSelecionado) return;

    setVotandoId(rotaId);

    try {
      const rotaIdBackend = rotaId.startsWith('parangaba')
        ? 'parangaba'
        : 'iate';

      await fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rotaId: rotaIdBackend,
          faixa,
          horario_previsto: horarioSelecionado,
        }),
      });

      await new Promise((resolve) => setTimeout(resolve, 400));

      setVotou((prev) => ({ ...prev, [rotaId]: true }));
      await fetchVotos(horarioSelecionado);
    } finally {
      setVotandoId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 flex flex-col items-center">
      <section className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-green-700 text-center mb-10">
          🚃 Monitor de Atrasos - VLT Fortaleza
        </h1>

        {horarioSelecionado === null ? (
          <p className="text-center text-red-500 font-medium mb-10">
            Fora do horário de operação do VLT (05:30 até 23:30).
          </p>
        ) : (
          <p className="text-center text-sm text-gray-600 mb-6">
            Horário atual considerado: <strong>{horarioSelecionado}</strong>
          </p>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow p-6 animate-pulse space-y-4"
              >
                <div className="h-5 w-1/3 bg-gray-300 rounded" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                        <div className="h-3 w-6 bg-gray-200 rounded" />
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mt-4">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="h-9 bg-gray-300 rounded w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          horarioSelecionado && (
            <div className="space-y-8">
              {rotas.map((rota) => {
                const total = Object.values(rota.votos || {}).reduce(
                  (a, b) => a + b,
                  0,
                );

                return (
                  <div
                    key={rota.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 bg-green-50 rounded-t-xl">
                      <h2 className="text-lg font-semibold text-green-800">
                        {rota.nome}
                      </h2>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      <div className="space-y-3">
                        {Object.entries(opcoesTexto).map(([faixa, label]) => {
                          const votos = rota.votos?.[faixa as Faixa] || 0;
                          const percent = total > 0 ? (votos / total) * 100 : 0;

                          return (
                            <div key={faixa}>
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>{label}</span>
                                <span>{Math.round(percent)}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-green-500 rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        {votou[rota.id] ? (
                          <p className="text-sm text-green-600 font-medium text-center transition-opacity duration-300 opacity-100">
                            ✅ Obrigado! Seu voto foi registrado.
                          </p>
                        ) : (
                          <div className="space-y-2 transition-opacity duration-300 opacity-100">
                            {Object.entries(opcoesTexto).map(
                              ([faixa, label]) => (
                                <button
                                  key={faixa}
                                  onClick={() => votar(rota.id, faixa as Faixa)}
                                  className="w-full py-2 px-4 text-sm rounded-md transition
                                  bg-green-600 text-white hover:bg-green-700
                                  disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                                  disabled={!!votandoId}
                                >
                                  {votandoId === rota.id
                                    ? 'Carregando...'
                                    : label}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        <div className="mt-14 text-center border-t pt-10 border-gray-300">
          <h2 className="text-lg font-semibold mb-2">
            🌐 Junte-se à Comunidade
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Receba atualizações, compartilhe informações e ajude a monitorar o
            VLT em tempo real com outros usuários.
          </p>
          <a
            href="https://chat.whatsapp.com/HyUySWZjnmVDhoXwx81EoA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Entrar no Grupo do WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
