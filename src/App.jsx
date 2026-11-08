import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { StateView } from "./components/StateView";
import { appConfig } from "./config/appConfig";
import { FeedbackProvider } from "./context/FeedbackContext.jsx";
import { useFeedback } from "./context/feedbackContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminForgotPasswordPage } from "./pages/AdminForgotPasswordPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminResetPasswordPage } from "./pages/AdminResetPasswordPage";
import { CustomerFeedbackPage } from "./pages/CustomerFeedbackPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function ProtectedAdminRoute({ children }) {
  const { authState, isDemo } = useFeedback();

  if (isDemo) return children;
  if (authState.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream-100 p-6">
        <StateView kind="loading" title="Yönetici oturumu doğrulanıyor" description="Veriler yetki kontrolü tamamlanmadan yüklenmez." />
      </main>
    );
  }
  if (!authState.isAdmin) return <Navigate to="/yonetici/giris" replace />;
  return children;
}

function ConfigurationErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream-100 p-6 text-espresso-900">
      <div className="w-full max-w-xl rounded-2xl border border-copper-200 bg-cream-50 p-6 shadow-soft">
        <StateView
          kind="error"
          title="Gerçek veri modu yapılandırılmamış"
          description={appConfig.configurationError}
        />
      </div>
    </main>
  );
}

export default function App() {
  if (appConfig.configurationError) return <ConfigurationErrorPage />;

  return (
    <FeedbackProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<CustomerFeedbackPage />} />
        <Route path="/yonetici/giris" element={<AdminLoginPage />} />
        <Route path="/yonetici/sifremi-unuttum" element={<AdminForgotPasswordPage />} />
        <Route path="/yonetici/sifre-yenile" element={<AdminResetPasswordPage />} />
        <Route
          path="/yonetici"
          element={(
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          )}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </FeedbackProvider>
  );
}
