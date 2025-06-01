import LoginForm from "../../components/LoginForm/LoginForm";

const LoginPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="relative w-full max-w-4xl">
                {/* Decorative elements */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-300 dark:bg-pink-600 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-20 -right-20 w-32 h-32 bg-purple-300 dark:bg-purple-600 rounded-full opacity-20 animate-pulse delay-1000"></div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center text-center md:text-left">
                        <div className="mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                                Wedding <br className="hidden md:block" />
                                <span className="text-pink-600 dark:text-pink-400">Mari e Pedro</span>
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 text-lg">
                                Bem-vindo à plataforma de administração
                            </p>
                        </div>
                    </div>
                    <div className="md:w-1/2 p-8 md:p-12 bg-gray-50 dark:bg-gray-700 flex items-center">
                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;