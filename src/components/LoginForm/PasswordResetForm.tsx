import React, { useState, useContext } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useLoading } from "../../contexts/LoadingContext";
import { ThemeContext } from "../../contexts/ThemeContext";
import { Mail, Sparkles, Frown, Loader2, Key } from "lucide-react";

const resetErrorMessages: Record<string, string> = {
    "auth/invalid-email": "Por favor, informe um e-mail válido para recuperação.",
    "auth/user-not-found": "Não há conta cadastrada com este e-mail.",
    "auth/too-many-requests": "Muitas solicitações. Tente novamente mais tarde.",
    default: "Não foi possível enviar o e-mail de recuperação. Tente depois."
};

interface PasswordResetFormProps {
    onBackToLogin: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBackToLogin }) => {
    const { colors } = useContext(ThemeContext);
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const { setLoadingMessage } = useLoading();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
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
                setInfo("E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.");
                setTimeout(() => {
                    onBackToLogin();
                    setEmail("");
                    setInfo("");
                }, 3000);
            } catch (err: any) {
                const msg = resetErrorMessages[err.code] || resetErrorMessages.default;
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
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="text-center mb-8">
                        <h2
                            className="text-4xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent flex items-center justify-center gap-3"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`
                            }}
                        >
                            <Key className="w-8 h-8" style={{ color: colors.secondary }} />
                            Recuperar Senha
                        </h2>
                        <p
                            className="text-lg italic"
                            style={{ color: colors.textSecondary }}
                        >
                            Informe seu e-mail para receber as instruções
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="email"
                                placeholder="Seu email para recuperação"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isProcessing}
                                className="w-full pl-12 pr-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 transform hover:scale-105 focus:scale-105"
                                style={{
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    border: `2px solid ${colors.accent}`,
                                    boxShadow: `0 2px 8px ${colors.secondary}20`
                                }}
                            />
                            <Mail
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                                style={{ color: colors.secondary }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 cursor-pointer disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                        style={{
                            background: `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`,
                            color: 'white',
                            boxShadow: `0 4px 15px ${colors.secondary}50`
                        }}
                    >
                        <Mail className="w-5 h-5" />
                        Enviar E-mail de Recuperação
                    </button>

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
                    style={{ color: colors.secondary }}
                />
                <p
                    className="font-medium flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                >
                    <Key className="w-5 h-5" style={{ color: colors.secondary }} />
                    Enviando instruções...
                </p>
            </div>
        </div>
    );
};

export default PasswordResetForm;
