// src/components/AdminModal.tsx
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { makeUserAdmin } from '../../firebase/createadmin';
import { ThemeContext } from '../../contexts/ThemeContext';

interface CombinedUser {
    uid: string;
    email: string;
    isAdmin: boolean;
}

type AdminModalProps = {
    onClose: () => void;
};

const LIST_API = import.meta.env.VITE_FIREBASE_LIST_USER_API;
const CREATE_API = import.meta.env.VITE_FIREBASE_ADMIN_API;
const DELETE_API = import.meta.env.VITE_FIREBASE_DELETE_USER_API;

const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
    const [users, setUsers] = useState<CombinedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingUid, setDeletingUid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '' });
    const { colors } = useContext(ThemeContext);

    // Carrega todos os usuários e marca os admins
    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const resAuth = await fetch(LIST_API, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
            if (!resAuth.ok) {
                const err = await resAuth.json();
                throw new Error(err.message || 'Erro ao listar usuários');
            }
            const { users: authList } = (await resAuth.json()) as { users: { uid: string; email: string }[] };

            const snap = await getDocs(collection(db, 'users'));
            const adminSet = new Set(snap.docs.map(d => d.id));

            setUsers(authList.map(u => ({ uid: u.uid, email: u.email, isAdmin: adminSet.has(u.uid) })));
        } catch (err: any) {
            console.error('Erro ao carregar usuários:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setDeletingUid(null);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    // Concede role admin
    const handleGrantAdmin = async (uid: string, email: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await makeUserAdmin(uid, email);
            setSuccess(`Usuário ${email} promovido a admin.`);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao conceder admin:', err);
            setError(err.message);
        }
    };

    // Revoga role admin
    const handleRevokeAdmin = async (uid: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await deleteDoc(doc(db, 'users', uid));
            setSuccess('Privilégios de admin removidos.');
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao revogar admin:', err);
            setError(err.message);
        }
    };

    // Remove usuário comum do Auth via endpoint DELETE
    const handleDeleteUser = async (uid: string, email: string) => {
        setDeletingUid(uid);
        setError(null);
        setSuccess(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const res = await fetch(DELETE_API, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Erro ao remover usuário');
            }
            setSuccess(`Usuário ${email} removido com sucesso.`);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao remover usuário:', err);
            setError(err.message);
        }
    };

    // Cria novo usuário no Auth
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const res = await fetch(CREATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Erro ao criar usuário');
            }
            setSuccess(`Usuário ${newUser.email} criado com sucesso!`);
            setNewUser({ email: '', password: '' });
            setShowAdd(false);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao criar usuário:', err);
            setError(err.message);
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100]" onClick={onClose}>
            <div className="rounded-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
                style={{ backgroundColor: colors.surface }}
                onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b sticky top-0 z-10"
                    style={{
                        borderColor: colors.border,
                        backgroundColor: colors.surface
                    }}>
                    <h2 className="text-xl font-semibold m-0" style={{ color: colors.text }}>Gerenciar Usuários</h2>
                    <button
                        className="bg-none border-none text-2xl cursor-pointer w-9 h-9 rounded-full flex justify-center items-center hover:scale-125 transition-transform"
                        style={{ color: colors.textSecondary }}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <section className="flex gap-4 mx-4 mt-4 flex-wrap">
                    <button
                        className="px-4 py-2 border-none rounded text-white font-medium transition-all duration-200 hover:brightness-90 disabled:opacity-70"
                        style={{ backgroundColor: colors.primary }}
                        onClick={() => setShowAdd(!showAdd)}
                        disabled={loading}
                    >
                        {showAdd ? 'Cancelar criação' : 'Criar Novo Usuário'}
                    </button>
                    <button
                        className="px-4 py-2 border-none rounded text-white font-medium transition-all duration-200 hover:brightness-90 disabled:opacity-70 flex items-center gap-2"
                        style={{ backgroundColor: colors.primary }}
                        onClick={loadUsers}
                        disabled={loading}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Atualizar Lista'}
                    </button>
                </section>

                {showAdd && (
                    <form className="mx-4 my-4 space-y-4" onSubmit={handleCreateUser}>
                        <input
                            className="w-full px-4 py-2 border rounded text-base focus:ring-2 focus:border-transparent"
                            style={{
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.text,
                                outlineColor: colors.primary
                            }}
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            required
                        />
                        <input
                            className="w-full px-4 py-2 border rounded text-base focus:ring-2 focus:border-transparent"
                            style={{
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.text,
                                outlineColor: colors.primary
                            }}
                            type="password"
                            placeholder="Senha"
                            minLength={6}
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            required
                        />
                        <button
                            className="px-6 py-3 border-none rounded text-white font-medium cursor-pointer text-base transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{ backgroundColor: colors.success }}
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Criar Usuário'}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="mx-4 my-4 px-3 py-3 rounded text-center font-medium border"
                        style={{
                            backgroundColor: colors.error.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                            color: colors.error,
                            borderColor: colors.error.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                        }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mx-4 my-4 px-3 py-3 rounded text-center font-medium border"
                        style={{
                            backgroundColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                            color: colors.success,
                            borderColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                        }}>
                        {success}
                    </div>
                )}

                <div className="overflow-x-auto mx-4 mb-4">
                    <table className="w-full border-collapse border rounded-lg overflow-hidden"
                        style={{ borderColor: colors.border }}>
                        <thead>
                            <tr style={{ backgroundColor: colors.background }}>
                                <th className="border px-4 py-3 text-left font-semibold"
                                    style={{
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}>Email</th>
                                <th className="border px-4 py-3 text-left font-semibold"
                                    style={{
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}>Função</th>
                                <th className="border px-4 py-3 text-left font-semibold"
                                    style={{
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b transition-colors"
                                    style={{
                                        borderColor: colors.border,
                                        backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.background;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}>
                                    <td className="border px-4 py-3"
                                        style={{
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}>{u.email}</td>
                                    <td className="border px-4 py-3"
                                        style={{
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}>{u.isAdmin ? 'Admin' : 'User'}</td>
                                    <td className="border px-4 py-3"
                                        style={{ borderColor: colors.border }}>
                                        <div className="flex gap-2 flex-wrap">
                                            {u.isAdmin ? (
                                                <button
                                                    className="px-3 py-1.5 border-none rounded text-white font-medium transition-all duration-200 disabled:opacity-70 text-sm flex items-center gap-1"
                                                    style={{ backgroundColor: colors.error }}
                                                    onClick={() => handleRevokeAdmin(u.uid)}
                                                    disabled={loading}
                                                >
                                                    {loading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : 'Remover Admin'}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className="px-3 py-1.5 border-none rounded text-white font-medium transition-all duration-200 hover:brightness-90 hover:-translate-y-0.5 disabled:opacity-70 text-sm flex items-center gap-1"
                                                        style={{ backgroundColor: colors.primary }}
                                                        onClick={() => handleGrantAdmin(u.uid, u.email)}
                                                        disabled={loading}
                                                    >
                                                        {loading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : 'Conceder Admin'}
                                                    </button>
                                                    <button
                                                        className="px-3 py-1.5 border rounded font-medium transition-all duration-200 disabled:opacity-70 text-sm flex items-center gap-1"
                                                        style={{
                                                            backgroundColor: colors.background,
                                                            borderColor: colors.border,
                                                            color: colors.textSecondary
                                                        }}
                                                        onClick={() => handleDeleteUser(u.uid, u.email)}
                                                        disabled={deletingUid === u.uid}
                                                    >
                                                        {deletingUid === u.uid ? <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.textSecondary }} /> : 'Remover Usuário'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminModal;
