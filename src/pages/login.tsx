
import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/toast";
import { User, Lock, Eye, EyeOff, LogIn, Shield, Zap, Cpu, AlertCircle, Sparkles } from "lucide-react";
import { collectSignals } from "@/lib/fingerprint";
import { getDeviceTrialStatus, startDeviceTrial } from "@/lib/trial.functions";

interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  username?: string;
  subscription?: string;
  expiry?: string;
  error?: string;
}

// Server errors are displayed to users without internal details

export default function LoginPage() {
  const router = useRouter();
  const { status, user, setUser, setError, clearError } = useAuthStore();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState<{ error: string } | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  // Check for existing session on mount only
  useEffect(() => {
    if (status === "authenticated" && user) {
      setCheckingSession(false);
      return;
    }

    // Restore session from local storage only — no server call
    const token = localStorage.getItem("mp_session");
    const storedUser = localStorage.getItem("mp_user");

    if (!token || !storedUser) {
      setCheckingSession(false);
      return;
    }

    try {
      const userData = JSON.parse(storedUser) as { username: string; subscription: string; expiry: string };
      setUser({
        username: userData.username || "User",
        subscription: userData.subscription || "Standard",
        expiry: userData.expiry || "",
        sessionToken: token,
      });
      router.replace("/dashboard");
    } catch {
      localStorage.removeItem("mp_session");
      localStorage.removeItem("mp_user");
      setCheckingSession(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      errors.username = "Username is required";
    }
    
    if (!password) {
      errors.password = "Password is required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      clearError();
      setServerError(null);
      
      if (!validateForm()) return;

      setIsLoading(true);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password, rememberMe }),
        });

        const data: LoginResponse = await res.json();

        if (data.success && data.sessionToken) {
          localStorage.setItem("mp_session", data.sessionToken);
          localStorage.setItem("mp_user", JSON.stringify({
            username: data.username || username.trim(),
            subscription: data.subscription || "Standard",
            expiry: data.expiry || "",
          }));
          setUser({
            username: data.username || username.trim(),
            subscription: data.subscription || "Standard",
            expiry: data.expiry || "",
            sessionToken: data.sessionToken,
          });
          toast.success("Welcome back!", `Logged in as ${data.username || username.trim()}`);
          router.push("/dashboard");
        } else {
          const errorMsg = data.error || "Invalid credentials";
          setError(errorMsg);
          setServerError({ error: errorMsg });
          toast.error("Login failed", errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(`Connection failed: ${errorMsg}`);
        setServerError({ error: "Network error — please check your connection" });
        toast.error("Connection error", errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [username, password, rememberMe, setUser, setError, clearError, router]
  );

  // Show loading if checking existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-bg grid-pattern">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="flex items-center gap-3 mt-6">
            <svg className="h-5 w-5 animate-spin text-accent-cyan" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-400">Checking session…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-dark-950">
      <ToastContainer />
      
      {/* Left panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-bg grid-pattern" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Logo size="lg" />
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mt-8 leading-tight">
            Precision tools for
            <br />
            <span className="bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple bg-clip-text text-transparent">
              modern machinists
            </span>
          </h1>
          
          <p className="text-gray-400 mt-4 max-w-md leading-relaxed">
            Access your premium engineering calculator suite. Scientific calculations,
            unit conversions, material databases, and more.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4">
            {[
              { icon: Cpu, text: "Advanced Scientific Calculations" },
              { icon: Zap, text: "Instant Unit Conversions" },
              { icon: Shield, text: "Secure Licensed Access" },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center">
                    <Icon size={16} className="text-accent-cyan" />
                  </div>
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-dark-800/80 border border-dark-600 p-8 backdrop-blur-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in to access your MachinistPro dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (fieldErrors.username) {
                        setFieldErrors((prev) => ({ ...prev, username: undefined }));
                      }
                      setServerError(null);
                    }}
                    placeholder="Enter your username"
                    className={`w-full rounded-lg border bg-dark-900 px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-600 transition-all duration-200 hover:border-dark-400 focus:border-accent-cyan/50 ${
                      fieldErrors.username ? "border-accent-red/50" : "border-dark-500"
                    }`}
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-xs text-accent-red animate-fade-in">{fieldErrors.username}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                      setServerError(null);
                    }}
                    placeholder="Enter your password"
                    className={`w-full rounded-lg border bg-dark-900 px-4 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-600 transition-all duration-200 hover:border-dark-400 focus:border-accent-cyan/50 ${
                      fieldErrors.password ? "border-accent-red/50" : "border-dark-500"
                    }`}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-accent-red animate-fade-in">{fieldErrors.password}</p>
                )}
              </div>

              {/* Server error display */}
              {serverError && (
                <div className="rounded-lg bg-accent-red/10 border border-accent-red/20 p-3 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-accent-red mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-accent-red flex-1">{serverError.error}</p>
                  </div>
                </div>
              )}

              {/* Remember me checkbox */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                    rememberMe
                      ? "bg-accent-cyan border-accent-cyan"
                      : "border-dark-400 hover:border-dark-300"
                  }`}
                  disabled={isLoading}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#050508"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <label
                  onClick={() => !isLoading && setRememberMe(!rememberMe)}
                  className="text-sm text-gray-400 cursor-pointer select-none"
                >
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                size="lg"
                loading={isLoading}
                className="w-full"
                icon={!isLoading ? <LogIn size={18} /> : undefined}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-dark-600" />
              <span className="text-xs text-gray-600">SECURE LOGIN</span>
              <div className="flex-1 h-px bg-dark-600" />
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 rounded-lg bg-dark-700/50 p-3">
              <Shield size={14} className="text-accent-cyan mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Your credentials are encrypted and verified through our secure authentication server.
                Contact support if you need assistance accessing your account.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-gray-700">
            MachinistPro v1.0.0-rc1 · Precision Engineering Tools
          </p>
        </div>
      </div>
    </div>
  );
}
