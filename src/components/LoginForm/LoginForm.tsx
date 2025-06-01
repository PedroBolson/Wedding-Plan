// src/components/LoginForm.tsx
import React, { useState, useContext } from "react";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../contexts/LoadingContext";
import { ThemeContext } from "../../contexts/ThemeContext";
import { Heart, Mail, Lock, Church, HelpCircle, Frown, Sparkles, Loader2 } from "lucide-react";

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
    const { colors } = useContext(ThemeContext);
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
                    <div className="text-center mb-8">
                        <h2
                            className="text-4xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent flex items-center justify-center gap-3"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                            }}
                        >
                            <Heart className="w-8 h-8" style={{ color: colors.primary }} />
                            Bem-vindos
                            <Heart className="w-8 h-8" style={{ color: colors.primary }} />
                        </h2>
                        <p
                            className="text-lg italic"
                            style={{ color: colors.textSecondary }}
                        >
                            Entre para planejar seu grande dia
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="email"
                                placeholder="Seu email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isProcessing}
                                className="w-full pl-12 pr-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 transform hover:scale-105 focus:scale-105"
                                style={{
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    border: `2px solid ${colors.accent}`,
                                    boxShadow: `0 2px 8px ${colors.primary}20`
                                }}
                            />
                            <Mail
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                                style={{ color: colors.primary }}
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isProcessing}
                                className="w-full pl-12 pr-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 transform hover:scale-105 focus:scale-105"
                                style={{
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    border: `2px solid ${colors.accent}`,
                                    boxShadow: `0 2px 8px ${colors.primary}20`
                                }}
                            />
                            <Lock
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                                style={{ color: colors.primary }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 cursor-pointer disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                            color: 'white',
                            boxShadow: `0 4px 15px ${colors.primary}50`
                        }}
                    >
                        <Church className="w-5 h-5" />
                        Entrar no Nosso Casamento
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isProcessing}
                            className="font-medium transition-colors disabled:opacity-50 cursor-pointer hover:underline flex items-center justify-center gap-2 mx-auto"
                            style={{ color: colors.primary }}
                        >
                            <HelpCircle className="w-4 h-4" />
                            Esqueci minha senha
                        </button>
                    </div>

                    {error && (
                        <div
                            className="text-center p-4 rounded-lg border-2 flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: `${colors.error}20`,
                                borderColor: colors.error,
                                color: colors.error
                            }}
                        >
                            <Frown className="w-5 h-5" />
                            <p className="font-medium">Ops! {error}</p>
                        </div>
                    )}
                    {info && (
                        <div
                            className="text-center p-4 rounded-lg border-2 flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: `${colors.success}20`,
                                borderColor: colors.success,
                                color: colors.success
                            }}
                        >
                            <Sparkles className="w-5 h-5" />
                            <p className="font-medium">{info}</p>
                        </div>
                    )}
                </form>
            </div>

            <div
                className={`flex flex-col items-center justify-center space-y-4 transition-all duration-300 ${isProcessing ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
            >
                <Loader2
                    className="w-12 h-12 animate-spin"
                    style={{ color: colors.primary }}
                />
                <p
                    className="font-medium flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                >
                    <Church className="w-5 h-5" style={{ color: colors.primary }} />
                    Preparando seu acesso...
                </p>
            </div>
        </div>
    );
};

export default LoginForm;