// src/components/LoginForm.tsx
import React, { useState } from "react";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../contexts/LoadingContext";

const authErrorMessages: Record<string, string> = {
    "auth/invalid-email": "Por favor, informe um e-mail no formato correto.",
    "auth/user-disabled": "Esta conta está desativada. Fale com o suporte.",
    "auth/user-not-found": "Não encontramos uma conta com este e-mail.",
    "auth/wrong-password": "A senha informada não confere. Tente novamente.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/network-request-failed": "Não foi possível conectar. Verifique sua internet.",
    "auth/internal-error": "Ops… algo deu errado no servidor. Tente novamente mais tarde.",
    "auth/invalid-credential": "Credenciais inválidas. Atualize suas credenciais.",
    "auth/operation-not-allowed": "Login com e-mail/senha não está habilitado.",
    "auth/user-token-expired": "Sua sessão expirou. Faça login novamente.",
    "auth/invalid-user-token": "Credencial de usuário inválida. Entre em contato com o suporte.",
    default: "Não foi possível autenticar. Tente novamente mais tarde."
};

const resetErrorMessages: Record<string, string> = {
    "auth/invalid-email": "Por favor, informe um e-mail válido para recuperação.",
    "auth/user-not-found": "Não há conta cadastrada com este e-mail.",
    "auth/too-many-requests": "Muitas solicitações. Tente novamente mais tarde.",
    default: "Não foi possível enviar o e-mail de recuperação. Tente depois."
};

const LoginForm: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const navigate = useNavigate();
    const { setLoadingMessage } = useLoading();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        setFadeOut(true);

        setTimeout(async () => {
            setIsProcessing(true);
            setLoadingMessage("Autenticando...");

            try {
                await signInWithEmailAndPassword(auth, email, password);
                setTimeout(() => navigate("/main"), 300);
            } catch (err: any) {
                const msg =
                    authErrorMessages[err.code] || authErrorMessages.default;
                setError(msg);
                setFadeOut(false);
                setTimeout(() => setIsProcessing(false), 300);
            }
        }, 300);
    };

    const handleResetPassword = async () => {
        setError("");
        setInfo("");
        if (!email) {
            setError("Por favor, informe seu e-mail para redefinir a senha.");
            return;
        }

        setFadeOut(true);
        setTimeout(async () => {
            setIsProcessing(true);
            setLoadingMessage("Enviando e-mail de recuperação...");

            try {
                await sendPasswordResetEmail(auth, email);
                setInfo("E-mail de recuperação enviado com sucesso!");
            } catch (err: any) {
                const msg =
                    resetErrorMessages[err.code] || resetErrorMessages.default;
                setError(msg);
            } finally {
                setFadeOut(false);
                setTimeout(() => setIsProcessing(false), 300);
            }
        }, 300);
    };

    return (
        <div className="w-full">
            <div
                className={`transition-all duration-300 ${fadeOut ? "opacity-0 transform scale-95" : "opacity-100 transform scale-100"
                    } ${isProcessing ? "hidden" : ""}`}
            >
                <form onSubmit={handleLogin} className="space-y-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">Login</h2>

                    <div className="space-y-4">
                        <div>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isProcessing}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isProcessing}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 transform hover:scale-105 disabled:hover:scale-100"
                    >
                        Entrar
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isProcessing}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Esqueci minha senha
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </p>
                    )}
                    {info && (
                        <p className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            {info}
                        </p>
                    )}
                </form>
            </div>

            <div
                className={`flex flex-col items-center justify-center space-y-4 transition-all duration-300 ${isProcessing ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
            >
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-400">Autenticando...</p>
            </div>
        </div>
    );
};

export default LoginForm;