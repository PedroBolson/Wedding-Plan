// src/components/LoginForm.tsx
import React, { useState } from "react";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../contexts/LoadingContext";
import "./LoginForm.css";

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
        <div className="login-form-container">
            <div
                className={`form-wrapper ${fadeOut ? "fade-out" : "fade-in"
                    } ${isProcessing ? "hidden" : ""}`}
            >
                <form onSubmit={handleLogin}>
                    <h2>Login</h2>
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isProcessing}
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isProcessing}
                        />
                    </div>
                    <button
                        className="login-btn"
                        type="submit"
                        disabled={isProcessing}
                    >
                        Entrar
                    </button>
                    <div className="forgot-password">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isProcessing}
                        >
                            Esqueci minha senha
                        </button>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    {info && <p className="info-message">{info}</p>}
                </form>
            </div>
            <div
                className={`centered-loading ${isProcessing ? "visible" : ""
                    }`}
            >
                <div className="loading-spinner"></div>
                <p>Autenticando...</p>
            </div>
        </div>
    );
};

export default LoginForm;