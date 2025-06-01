// src/components/AdminModal.tsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { makeUserAdmin } from '../../firebase/createadmin';

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
            <div className="bg-white dark:bg-gray-800 rounded-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 m-0">Gerenciar Usuários</h2>
                    <button
                        className="bg-none border-none text-2xl cursor-pointer text-gray-600 dark:text-gray-400 w-9 h-9 rounded-full flex justify-center items-center hover:scale-125 transition-transform"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <section className="flex gap-4 mx-4 mt-4 flex-wrap">
                    <button
                        className="px-4 py-2 border-none rounded bg-indigo-600 text-white font-medium transition-all duration-200 hover:brightness-90 disabled:opacity-70"
                        onClick={() => setShowAdd(!showAdd)}
                        disabled={loading}
                    >
                        {showAdd ? 'Cancelar criação' : 'Criar Novo Usuário'}
                    </button>
                    <button
                        className="px-4 py-2 border-none rounded bg-indigo-600 text-white font-medium transition-all duration-200 hover:brightness-90 disabled:opacity-70 flex items-center gap-2"
                        onClick={loadUsers}
                        disabled={loading}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Atualizar Lista'}
                    </button>
                </section>

                {showAdd && (
                    <form className="mx-4 my-4 space-y-4" onSubmit={handleCreateUser}>
                        <input
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            required
                        />
                        <input
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            type="password"
                            placeholder="Senha"
                            minLength={6}
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            required
                        />
                        <button
                            className="px-6 py-3 border-none rounded bg-green-600 text-white font-medium cursor-pointer text-base transition-colors hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Criar Usuário'}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="mx-4 my-4 px-3 py-3 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-center font-medium border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mx-4 my-4 px-3 py-3 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-center font-medium border border-green-200 dark:border-green-800">
                        {success}
                    </div>
                )}

                <div className="overflow-x-auto mx-4 mb-4">
                    <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700">
                                <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-gray-100 font-semibold">Email</th>
                                <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-gray-100 font-semibold">Função</th>
                                <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-gray-100 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-gray-100">{u.email}</td>
                                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-gray-100">{u.isAdmin ? 'Admin' : 'User'}</td>
                                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3">
                                        <div className="flex gap-2 flex-wrap">
                                            {u.isAdmin ? (
                                                <button
                                                    className="px-3 py-1.5 border-none rounded bg-red-600 text-white font-medium transition-all duration-200 hover:bg-red-700 disabled:opacity-70 text-sm flex items-center gap-1"
                                                    onClick={() => handleRevokeAdmin(u.uid)}
                                                    disabled={loading}
                                                >
                                                    {loading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : 'Remover Admin'}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className="px-3 py-1.5 border-none rounded bg-indigo-600 text-white font-medium transition-all duration-200 hover:brightness-90 hover:-translate-y-0.5 disabled:opacity-70 text-sm flex items-center gap-1"
                                                        onClick={() => handleGrantAdmin(u.uid, u.email)}
                                                        disabled={loading}
                                                    >
                                                        {loading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : 'Conceder Admin'}
                                                    </button>
                                                    <button
                                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-70 text-sm flex items-center gap-1"
                                                        onClick={() => handleDeleteUser(u.uid, u.email)}
                                                        disabled={deletingUid === u.uid}
                                                    >
                                                        {deletingUid === u.uid ? <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" /> : 'Remover Usuário'}
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
