import { useState, useContext } from "react";
import { ArrowLeft, Heart, Key } from "lucide-react";
import LoginForm from "../../components/LoginForm/LoginForm";
import PasswordResetForm from "../../components/LoginForm/PasswordResetForm";
import { ThemeContext } from "../../contexts/ThemeContext";

const LoginPage = () => {
    const { colors } = useContext(ThemeContext);
    const [isResetMode, setIsResetMode] = useState(false);

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15, ${colors.accent}10)`
            }}
        >
            <div className="relative w-full max-w-6xl">
                {/* Decorative elements */}
                <div
                    className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-20 animate-pulse"
                    style={{ backgroundColor: colors.primary }}
                ></div>
                <div
                    className="absolute -bottom-20 -right-20 w-32 h-32 rounded-full opacity-20 animate-pulse delay-1000"
                    style={{ backgroundColor: colors.secondary }}
                ></div>

                <div
                    className="rounded-2xl shadow-2xl overflow-hidden relative min-h-[600px] md:min-h-[600px] flex flex-col md:flex-row"
                    style={{ backgroundColor: colors.background }}
                >
                    {/* Password Reset Form - Fixed Left Side (Desktop) / Top (Mobile) */}
                    <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-12 flex items-center justify-center min-h-[350px] md:min-h-0 relative z-0">
                        <div className="w-full max-w-md">
                            <PasswordResetForm onBackToLogin={() => setIsResetMode(false)} />
                        </div>
                    </div>

                    {/* Login Form - Fixed Right Side (Desktop) / Bottom (Mobile) */}
                    <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-12 flex items-center justify-center min-h-[350px] md:min-h-0 relative z-0">
                        <div className="w-full max-w-md">
                            <LoginForm onForgotPassword={() => setIsResetMode(true)} />
                        </div>
                    </div>

                    {/* Sliding Cover/Title Overlay - Responsive */}
                    <div
                        className={`absolute top-0 left-0 right-0 flex items-center justify-center text-center transition-all duration-700 ease-in-out md:w-1/2 md:h-full md:inset-0 h-1/2 ${isResetMode
                            ? 'md:translate-x-full md:translate-y-0 translate-y-full'
                            : 'md:translate-x-0 translate-y-0'
                            }`}
                        style={{
                            backgroundColor: colors.surface,
                            zIndex: 20,
                            minHeight: '50%'
                        }}
                    >
                        <div className="p-8 md:p-12">
                            {/* Wedding Title - Visible when covering Password Reset Form (inicial) */}
                            <div
                                className={`transition-all duration-700 ease-in-out ${!isResetMode
                                    ? 'opacity-100 transform translate-x-0 translate-y-0'
                                    : 'opacity-0 transform md:-translate-x-full -translate-y-full pointer-events-none absolute inset-0 flex items-center justify-center'
                                    }`}
                            >
                                <div>
                                    <h1
                                        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight flex flex-col md:flex-row items-center justify-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Heart className="w-8 md:w-10 h-8 md:h-10" style={{ color: colors.primary }} />
                                            Wedding
                                        </div>
                                        <span style={{ color: colors.primary }} className="text-center">
                                            Mari <br />
                                            <span className="font-light text-3xl md:text-4xl lg:text-5xl" style={{ fontFamily: 'Georgia, serif' }}>&</span> <br />
                                            Pedro
                                        </span>
                                    </h1>
                                    <p
                                        className="text-base md:text-lg text-center"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        Bem-vindo à plataforma de administração do nosso grande dia
                                    </p>
                                </div>
                            </div>

                            {/* Recovery Title - Visible when covering Login Form (quando clica "esqueci senha") */}
                            <div
                                className={`transition-all duration-700 ease-in-out ${isResetMode
                                    ? 'opacity-100 transform translate-x-0 translate-y-0'
                                    : 'opacity-0 transform md:translate-x-full translate-y-full pointer-events-none absolute inset-0 flex items-center justify-center'
                                    }`}
                            >
                                <div>
                                    <h1
                                        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight flex flex-col md:flex-row items-center justify-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Key className="w-8 md:w-10 h-8 md:h-10" style={{ color: colors.secondary }} />
                                            Recuperar
                                        </div>
                                        <span style={{ color: colors.secondary }}>Acesso</span>
                                    </h1>
                                    <p
                                        className="text-base md:text-lg mb-6 text-center"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        Não se preocupe! Vamos ajudar você a recuperar o acesso à nossa plataforma de casamento.
                                    </p>
                                    <button
                                        onClick={() => setIsResetMode(false)}
                                        className="inline-flex cursor-pointer items-center gap-2 font-medium transition-all duration-200 hover:underline transform hover:scale-105 text-sm md:text-base"
                                        style={{ color: colors.primary }}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Voltar ao login
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;