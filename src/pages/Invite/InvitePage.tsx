import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { ThemeContext } from '../../contexts/ThemeContext';

interface GuestData { id: string; name: string; side: 'noivo' | 'noiva'; rsvpStatus?: string; inviteCode?: string; }

const InvitePage = () => {
    const { code } = useParams();
    const { colors } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [guest, setGuest] = useState<GuestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const fetchGuest = async () => {
            if (!code) return;
            setLoading(true); setError(null);
            try {
                const q = query(collection(db, 'guests'), where('inviteCode', '==', code.toUpperCase()));
                const snap = await getDocs(q);
                if (snap.empty) { setError('Convite inválido.'); } else {
                    const d = snap.docs[0];
                    setGuest({ id: d.id, ...(d.data() as any) });
                }
            } catch (e) { console.error(e); setError('Erro ao carregar convite.'); }
            finally { setLoading(false); }
        };
        fetchGuest();
    }, [code]);

    const confirm = async (status: 'confirmed' | 'declined') => {
        if (!guest) return;
        setSaving(true); setError(null);
        try {
            await updateDoc(doc(db, 'guests', guest.id), { rsvpStatus: status, confirmedAt: status === 'confirmed' ? new Date() : null, updatedAt: new Date() });
            setGuest(g => g ? { ...g, rsvpStatus: status } : g);
            setDone(true);
        } catch (e) { console.error(e); setError('Erro ao registrar resposta.'); }
        finally { setSaving(false); }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ maxWidth: 520, width: '100%', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 24, padding: '2.5rem', boxShadow: `0 10px 35px ${colors.primary}25` }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text', color: 'transparent' }}>Confirmação de Presença</h1>
                {loading && <p style={{ color: colors.textSecondary }}>Carregando convite...</p>}
                {error && <p style={{ color: colors.error, fontWeight: 500 }}>{error}</p>}
                {guest && !loading && !error && (
                    <>
                        <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>Olá <strong style={{ color: colors.primary }}>{guest.name}</strong>, confirme sua presença no nosso casamento.</p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                            <button disabled={saving || guest.rsvpStatus === 'confirmed'} onClick={() => confirm('confirmed')} style={{ flex: 1, padding: '0.9rem 1rem', borderRadius: 12, fontWeight: 600, backgroundColor: guest.rsvpStatus === 'confirmed' ? colors.success : colors.primary, color: 'white', cursor: saving ? 'wait' : 'pointer', opacity: guest.rsvpStatus === 'declined' ? 0.85 : 1, transition: 'all .25s' }}>Vou Comparecer</button>
                            <button disabled={saving || guest.rsvpStatus === 'declined'} onClick={() => confirm('declined')} style={{ flex: 1, padding: '0.9rem 1rem', borderRadius: 12, fontWeight: 600, backgroundColor: guest.rsvpStatus === 'declined' ? colors.error : colors.accent, color: guest.rsvpStatus === 'declined' ? 'white' : colors.text, cursor: saving ? 'wait' : 'pointer', transition: 'all .25s' }}>Não Poderei</button>
                        </div>
                        {done && <div style={{ padding: '0.85rem 1rem', backgroundColor: colors.success + '20', borderRadius: 12, fontSize: 14, color: colors.success, fontWeight: 500 }}>Resposta registrada! Obrigado.</div>}
                        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
                            <button onClick={() => navigate('/login')} style={{ fontSize: 12, background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}>Entrar no sistema</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
