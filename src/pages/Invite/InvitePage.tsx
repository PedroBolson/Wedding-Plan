import { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { ThemeContext } from '../../contexts/ThemeContext';

interface GuestData { id: string; name: string; side: 'noivo' | 'noiva'; rsvpStatus?: string; inviteCode?: string; relatedIds?: string[]; groupPrimaryId?: string; }

const InvitePage = () => {
    const { code } = useParams();
    const { colors } = useContext(ThemeContext);
    const [guest, setGuest] = useState<GuestData | null>(null);
    const [groupMembers, setGroupMembers] = useState<GuestData[]>([]); // inclui principal
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showBox, setShowBox] = useState(false);
    const [savingRelated, setSavingRelated] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchGuest = async () => {
            if (!code) return;
            setLoading(true); setError(null);
            try {
                const inviteCode = code.toUpperCase();
                const firstRef = doc(db, 'guests', inviteCode);
                const firstSnap = await getDoc(firstRef);
                if (!firstSnap.exists()) { setError('Convite inválido.'); return; }
                const firstData = firstSnap.data() as any;
                if (firstData.inviteCode !== inviteCode) { setError('Convite inválido.'); return; }
                const targetPrimaryId = firstData.groupPrimaryId ? firstData.groupPrimaryId : firstSnap.id;
                const primarySnap = targetPrimaryId === firstSnap.id ? firstSnap : await getDoc(doc(db, 'guests', targetPrimaryId));
                if (!primarySnap.exists()) { setError('Convite inválido.'); return; }
                const primaryData = primarySnap.data() as any;
                if (primaryData.inviteCode !== primarySnap.id) { setError('Convite inválido.'); return; }
                const primaryGuest: GuestData = { id: primarySnap.id, ...primaryData };
                setGuest(primaryGuest);
                // Montar membros (principal + relacionados que apontam para o primary)
                const memberIds: string[] = Array.isArray(primaryData.relatedIds) ? primaryData.relatedIds.filter((rid: string) => rid && rid !== primarySnap.id) : [];
                const memberDocs = await Promise.all(memberIds.map(async (rid: string) => {
                    try {
                        const gs = await getDoc(doc(db, 'guests', rid.toUpperCase()));
                        if (gs.exists()) {
                            const gd = gs.data() as any;
                            if (gd.inviteCode === gs.id) return { id: gs.id, ...gd } as GuestData;
                        }
                        return null;
                    } catch { return null; }
                }));
                const members = [primaryGuest, ...memberDocs.filter(Boolean) as GuestData[]];
                setGroupMembers(members);
            } catch (e) {
                console.error(e);
                setError('Erro ao carregar convite.');
            } finally {
                setLoading(false);
            }
        };
        fetchGuest();
    }, [code]);

    useEffect(() => {
        const t1 = setTimeout(() => setMounted(true), 30);
        const t2 = setTimeout(() => setShowBox(true), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    const confirm = async (status: 'confirmed' | 'declined', id?: string) => {
        const targetId = id || guest?.id;
        if (!targetId) return;
        setSaving(true); setError(null);
        try {
            await updateDoc(doc(db, 'guests', targetId), { rsvpStatus: status, confirmedAt: status === 'confirmed' ? new Date() : null, updatedAt: new Date() });
            setGroupMembers(list => list.map(m => m.id === targetId ? { ...m, rsvpStatus: status } : m));
            if (!id) setGuest(g => g ? { ...g, rsvpStatus: status } : g);
            setDone(true);
        } catch (e) { console.error(e); setError('Erro ao registrar resposta.'); }
        finally { setSaving(false); }
    };
    // salvar individual com estado por id
    const confirmMember = async (memberId: string, status: 'confirmed' | 'declined') => {
        setSavingRelated(prev => new Set(prev).add(memberId));
        try {
            await confirm(status, memberId);
        } finally {
            setSavingRelated(prev => { const n = new Set(prev); n.delete(memberId); return n; });
        }
    };

    // Derivar mensagens de grupo
    const members = groupMembers;
    const confirmedMembers = members.filter(m => m.rsvpStatus === 'confirmed');
    const declinedMembers = members.filter(m => m.rsvpStatus === 'declined');
    const pendingMembers = members.filter(m => !m.rsvpStatus);

    const groupMessageBefore = guest && members.length > 1 && !guest.rsvpStatus ? (
        <div style={{ marginBottom: '1rem', fontSize: 14, lineHeight: 1.4, color: colors.textSecondary }}>
            {confirmedMembers.filter(m => m.id !== guest.id).length > 0 && (
                <div><strong style={{ color: colors.success }}>{confirmedMembers.filter(m => m.id !== guest.id).map(g => g.name).join(', ')}</strong> já confirmou presença.{pendingMembers.length ? ' Confirme também a sua.' : ''}</div>
            )}
            {declinedMembers.filter(m => m.id !== guest.id).length > 0 && (
                <div><strong style={{ color: colors.error }}>{declinedMembers.filter(m => m.id !== guest.id).map(g => g.name).join(', ')}</strong> não poderá comparecer.</div>
            )}
            {confirmedMembers.length > 0 && pendingMembers.length === 0 && (
                <div>Estamos ansiosos para receber vocês!</div>
            )}
        </div>
    ) : null;

    const groupMessageAfter = guest && (guest.rsvpStatus === 'confirmed' || guest.rsvpStatus === 'declined') ? (
        <div style={{ marginTop: '1rem', fontSize: 14, lineHeight: 1.4 }}>
            {guest.rsvpStatus === 'confirmed' ? (
                <div style={{ color: colors.success }}>
                    Presença confirmada para: {confirmedMembers.map(g => g.name).join(', ')}.
                    {pendingMembers.length > 0 && ` Aguardando: ${pendingMembers.map(g => g.name).join(', ')}.`}
                    <br />Estamos ansiosos para receber {confirmedMembers.length || pendingMembers.length ? 'vocês' : 'você'}!
                </div>
            ) : (
                <div style={{ color: colors.error }}>
                    Registro atualizado. Sentiremos sua falta{confirmedMembers.length ? `, mas ${confirmedMembers.filter(m => m.id !== guest.id).map(g => g.name).join(', ')} estará(ão) conosco.` : '.'}
                </div>
            )}
        </div>
    ) : null;

    const isGroup = groupMembers.length > 1;
    const groupSize = groupMembers.length;
    const headlineCopy = isGroup
        ? (groupSize === 2
            ? 'Será uma grande alegria contar com a presença de vocês.'
            : groupSize === 3
                ? 'Será uma grande alegria ter vocês conosco.'
                : 'Que alegria ter cada um de vocês conosco neste momento especial.')
        : 'Será uma alegria ter você conosco nesse dia especial.';
    const secondaryLine = isGroup
        ? 'A presença de vocês torna nossa celebração mais calorosa e cheia de significado.'
        : 'Sua presença torna nossa celebração ainda mais especial.';
    const greeting = guest ? (
        <p style={{ color: colors.textSecondary, marginBottom: '1.1rem', fontSize: 15, lineHeight: 1.5 }}>
            {isGroup
                ? <><span style={{ fontWeight: 600, color: colors.primary }}>{headlineCopy}</span><br />{secondaryLine}</>
                : <>Olá <strong style={{ color: colors.primary }}>{guest.name}</strong>. {secondaryLine}</>}
        </p>
    ) : null;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.25rem' }}>
            <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
                <div style={{ position: 'relative', textAlign: 'center', padding: '5.6rem 1rem 2.8rem', overflow: 'visible' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2.5rem', pointerEvents: 'none' }} />
                    <div style={{
                        fontFamily: '"Great Vibes", cursive',
                        fontSize: 'clamp(86px, 14.5vw, 150px)',
                        lineHeight: 1.22,
                        backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        WebkitTextStroke: '1px transparent',
                        textShadow: '0 8px 22px rgba(0,0,0,.48)',
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'scale(1)' : 'scale(.94)',
                        filter: mounted ? 'blur(0) brightness(1)' : 'blur(6px) brightness(1.15)',
                        transition: 'opacity 1.1s ease, transform 1.25s cubic-bezier(.16,.8,.24,1), filter 1.15s ease',
                        willChange: 'transform, opacity, filter',
                        transformOrigin: 'center top',
                        display: 'inline-block',
                        padding: '.55rem 1.35rem .85rem .55rem',
                        overflow: 'visible'
                    }}>{'M & P\u00A0'}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: 12, letterSpacing: 6, fontWeight: 600, textTransform: 'uppercase', color: colors.textSecondary, opacity: mounted ? .85 : 0, transition: 'opacity 1.2s ease 0.4s' }}>Nosso Grande Dia</div>
                    <div aria-hidden style={{ height: 0, visibility: 'hidden', pointerEvents: 'none' }} />
                </div>
                <div style={{ maxWidth: 640, width: '100%', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 28, padding: '2.2rem 2.4rem 2.6rem', boxShadow: `0 12px 40px -8px ${colors.primary}30`, transition: 'all .7s cubic-bezier(.16,.8,.24,1)', opacity: showBox ? 1 : 0, transform: showBox ? 'translateY(0)' : 'translateY(28px)' }}>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem', backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text', color: 'transparent' }}>Confirmação de Presença</h1>
                    {loading && <p style={{ color: colors.textSecondary }}>Carregando convite...</p>}
                    {error && <p style={{ color: colors.error, fontWeight: 500 }}>{error}</p>}
                    {guest && !loading && !error && (
                        <>
                            {greeting}
                            {groupMessageBefore}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.25rem' }}>
                                {groupMembers.map((m, idx) => {
                                    const savingThis = savingRelated.has(m.id) || (saving && m.id === guest.id);
                                    const status = m.rsvpStatus;
                                    return (
                                        <div key={m.id} style={{
                                            padding: '1rem 1.1rem',
                                            borderRadius: 18,
                                            background: colors.surface,
                                            border: `1px solid ${colors.border}`,
                                            boxShadow: status === 'confirmed' ? `0 0 0 1px ${colors.success}50` : status === 'declined' ? `0 0 0 1px ${colors.error}50` : '0 2px 8px -2px rgba(0,0,0,.25)',
                                            transition: 'all .45s cubic-bezier(.16,.8,.24,1)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                                <div style={{ flex: '1 1 180px' }}>
                                                    <div style={{ fontWeight: 600, color: colors.primary, fontSize: 15 }}>{m.name}</div>
                                                    <div style={{ fontSize: 11, letterSpacing: .5, color: colors.textSecondary, marginTop: 4 }}>{m.side === 'noivo' ? 'Lado Noivo' : 'Lado Noiva'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 220 }}>
                                                    <button disabled={savingThis || status === 'confirmed'} onClick={() => confirmMember(m.id, 'confirmed')} style={{ flex: 1, padding: '.75rem .9rem', borderRadius: 12, fontWeight: 600, background: status === 'confirmed' ? colors.success : colors.primary, color: 'white', cursor: savingThis ? 'wait' : 'pointer', opacity: status === 'declined' ? .85 : 1, transition: 'all .3s' }}>Confirmar</button>
                                                    <button disabled={savingThis || status === 'declined'} onClick={() => confirmMember(m.id, 'declined')} style={{ flex: 1, padding: '.75rem .9rem', borderRadius: 12, fontWeight: 600, background: status === 'declined' ? colors.error : colors.accent, color: status === 'declined' ? 'white' : colors.text, cursor: savingThis ? 'wait' : 'pointer', transition: 'all .3s' }}>Não Poderei</button>
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 30, background: status === 'confirmed' ? colors.success + '25' : status === 'declined' ? colors.error + '25' : colors.accent, color: status === 'confirmed' ? colors.success : status === 'declined' ? colors.error : colors.textSecondary }}>{status === 'confirmed' ? 'Confirmado' : status === 'declined' ? 'Recusado' : 'Pendente'}</div>
                                            </div>
                                            {idx === 0 && groupMembers.length > 1 && (
                                                <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: .5, background: colors.primary, color: 'white', borderBottomLeftRadius: 10 }}>GRUPO</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {done && <div style={{ padding: '0.85rem 1rem', backgroundColor: colors.success + '20', borderRadius: 12, fontSize: 14, color: colors.success, fontWeight: 500 }}>Resposta registrada! Obrigado.</div>}
                            {groupMessageAfter}
                            {/* Login link removido conforme solicitação */}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvitePage;
