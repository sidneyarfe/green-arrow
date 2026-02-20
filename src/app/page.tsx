'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/db';
import { Instance, Campaign } from '@/lib/types';
import { useTopbarActions } from '@/lib/topbarContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { setActions } = useTopbarActions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instData, campData] = await Promise.all([
          db.getInstances(),
          db.getCampaigns()
        ]);
        setInstances(instData);
        setCampaigns(campData);
      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNewCampaign = useCallback(() => router.push('/campanhas'), [router]);

  const actionBar = useMemo(() => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-2)',
        background: 'var(--surface)',
        color: 'var(--text-2)',
        fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s'
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="2" width="10" height="10" rx="1.5" /><path d="M1.5 5.5h10M4.5 1v2M8.5 1v2" /></svg>
        Últimos 30 dias
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l3.5 3.5L9 4" /></svg>
      </div>
      <button
        className="btn-primary"
        onClick={handleNewCampaign}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" /></svg>
        Nova campanha
      </button>
    </div>
  ), [handleNewCampaign]);

  // Set Topbar actions (Date Range + New Campaign)
  useEffect(() => {
    setActions(actionBar);
    return () => setActions(null);
  }, [setActions, actionBar]);

  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'running').length, [campaigns]);
  const totalSent = useMemo(() => campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0), [campaigns]);
  const totalLeads = useMemo(() => campaigns.reduce((acc, c) => acc + (c.stats?.total || 0), 0), [campaigns]);
  const deliveryRate = useMemo(() => totalLeads > 0 ? ((totalSent / totalLeads) * 100).toFixed(1) : '–', [totalSent, totalLeads]);

  const recentCampaigns = useMemo(() => [...campaigns]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5), [campaigns]);

  const instanceStatus = useMemo(() => ({
    total: instances.length,
    online: instances.filter(i => i.status === 'success').length,
    offline: instances.filter(i => i.status === 'error').length,
    idle: instances.filter(i => i.status === 'idle' || i.status === 'testing').length,
  }), [instances]);

  if (loading) {
    // Simple loading state matching background to avoid flash
    return <div className="fade-in" style={{ padding: 28 }} />;
  }

  return (
    <div className="fade-in" style={{ padding: '28px 28px', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: 3 }}>Visão geral</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Acompanhe o desempenho da sua operação de envios.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {/* Total Disparos */}
        <div className="stat-card" style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', transition: 'border-color 0.2s',
          animation: 'fadeUp 0.35s ease both', animationDelay: '0s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 400 }}>Total de disparos</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green-dim)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#00d26a" strokeWidth="1.5">
                <path d="M1 7l4-4 3 3 5-5M11 2h3v3" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-1)', fontFamily: 'var(--mono)', marginBottom: 6, lineHeight: 1 }}>
            {totalSent}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 500, padding: '2px 6px', borderRadius: 4, color: 'var(--text-3)', background: 'var(--surface-2)' }}>
              — Sem dados ainda
            </span>
          </div>
        </div>

        {/* Campanhas Ativas */}
        <div className="stat-card" style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', transition: 'border-color 0.2s',
          animation: 'fadeUp 0.35s ease both', animationDelay: '0.05s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 400 }}>Campanhas ativas</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#60a5fa" strokeWidth="1.5">
                <path d="M8 2l1.5 4h4l-3.5 2.5 1.5 4L8 10l-3.5 2.5 1.5-4L2.5 6h4z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-1)', fontFamily: 'var(--mono)', marginBottom: 6, lineHeight: 1 }}>
            {activeCampaigns}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 500, padding: '2px 6px', borderRadius: 4, color: 'var(--text-3)', background: 'var(--surface-2)' }}>
              — Nenhuma ativa
            </span>
          </div>
        </div>

        {/* Taxa de Entrega */}
        <div className="stat-card" style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', transition: 'border-color 0.2s',
          animation: 'fadeUp 0.35s ease both', animationDelay: '100ms'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 400 }}>Taxa de entrega</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                <path d="M2 10l3-4 3 2 4-6" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 22, paddingTop: 4, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: 6, lineHeight: 1 }}>
            {deliveryRate === '–' ? '—' : deliveryRate + '%'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 500, padding: '2px 6px', borderRadius: 4, color: 'var(--text-3)', background: 'var(--surface-2)' }}>
              Disponível após envios
            </span>
          </div>
        </div>
      </div>

      {/* Arsenal Status + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, marginBottom: 20 }}>

        {/* Arsenal Status */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
          animation: 'fadeUp 0.35s ease both', animationDelay: '150ms'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-2)" strokeWidth="1.5">
                <rect x="1" y="3" width="12" height="3.5" rx="1" /><rect x="1" y="8" width="12" height="3.5" rx="1" />
              </svg>
              Status do Arsenal
            </span>
            <Link href="/arsenal" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 4 }} className="hover:!text-[var(--text-1)]">
              Gerenciar
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 9L9 2M9 2H4.5M9 2v4.5" /></svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {[
              { label: 'Total', value: instanceStatus.total, color: 'var(--text-1)' },
              { label: 'Online', value: instanceStatus.online, color: 'var(--green)' },
              { label: 'Inativo', value: instanceStatus.idle, color: 'var(--text-1)' },
              { label: 'Erro', value: instanceStatus.offline, color: 'var(--red)' },
            ].map((stat, idx) => (
              <div key={idx} style={{ padding: '14px 20px', borderRight: idx < 3 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '-0.02em', color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {instanceStatus.total === 0 ? (
            <div style={{ padding: '28px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--yellow-dim)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fbbf24" strokeWidth="1.5">
                  <path d="M8 3v5M8 11v1" /><circle cx="8" cy="8" r="6.5" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', marginBottom: 2 }}>Arsenal não configurado</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Conecte um script Google Apps para começar a disparar emails.</div>
              </div>
              <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12, padding: '5px 12px' }} onClick={() => router.push('/arsenal')}>Conectar</button>
            </div>
          ) : (
            <div style={{ padding: '28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              Arsenal operando normalmente.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
          animation: 'fadeUp 0.35s ease both', animationDelay: '200ms'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-2)" strokeWidth="1.5">
                <path d="M7 1v12M1 7h12" />
              </svg>
              Ações rápidas
            </span>
          </div>
          <div style={{ padding: 0 }}>
            {[
              {
                label: 'Nova campanha', desc: 'Configure e dispare um envio',
                href: '/campanhas',
                icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M7.5 2l1.5 4h4l-3.5 2.5 1.5 4-3.5-2.5L4 12.5l1.5-4L2 6h4z" /></svg>
              },
              {
                label: 'Importar lista', desc: 'Adicionar contatos via CSV',
                href: '/listas',
                icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#60a5fa" strokeWidth="1.5"><circle cx="7.5" cy="5.5" r="3" /><path d="M2 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /></svg>
              },
              {
                label: 'Criar template', desc: 'Novo modelo de email',
                href: '/templates',
                icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#a78bfa" strokeWidth="1.5"><rect x="2" y="3" width="11" height="9" rx="1.5" /><path d="M2 6h11" /></svg>
              },
              {
                label: 'Conectar script', desc: 'Adicionar instância ao Arsenal',
                href: '/arsenal',
                icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#fb923c" strokeWidth="1.5"><rect x="1" y="3" width="13" height="9" rx="1.5" /><rect x="4" y="6.5" width="7" height="2" rx="0.5" /></svg>
              }
            ].map((action, i) => (
              <div
                key={i}
                onClick={() => router.push(action.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                  borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 1 }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{action.desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth="1.4"><path d="M5 3l4 4-4 4" /></svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Atividade Recente */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
        animation: 'fadeUp 0.35s ease both', animationDelay: '250ms'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-2)" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5.5" /><path d="M7 4v3.5l2 2" />
            </svg>
            Atividade recente
          </span>
          <Link href="/metricas" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 4 }} className="hover:!text-[var(--text-1)]">
            Ver todas
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 9L9 2M9 2H4.5M9 2v4.5" /></svg>
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div style={{ padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--text-3)" strokeWidth="1.4">
                <circle cx="9" cy="9" r="6.5" /><path d="M9 5.5v4l2.5 2.5" />
              </svg>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)' }}>Nenhuma atividade ainda</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', maxWidth: 260, lineHeight: 1.5 }}>Suas campanhas e disparos aparecerão aqui em tempo real.</div>
            <button className="btn-ghost" style={{ marginTop: 6, fontSize: 12.5 }} onClick={handleNewCampaign}>Criar primeira campanha</button>
          </div>
        ) : (
          <div>
            {recentCampaigns.map((c, i) => (
              <div key={c.id} style={{ padding: '14px 20px', borderBottom: i < recentCampaigns.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'running' ? 'var(--green)' : 'var(--text-3)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>
                  {c.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
