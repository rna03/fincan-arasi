import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Coffee,
  FilterX,
  Heart,
  Inbox,
  LayoutList,
  LogOut,
  MessageSquarePlus,
  RefreshCcw,
  Search,
  Settings2,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { DemoBanner } from "../components/DemoBanner";
import { FeedbackDetail } from "../components/FeedbackDetail";
import { StateView } from "../components/StateView";
import { useFeedback } from "../context/feedbackContext";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
} from "../utils/validation";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const typeIcons = {
  suggestion: MessageSquarePlus,
  issue: CircleAlert,
  thanks: Heart,
};

function StatItem({ label, value, accent = false }) {
  return (
    <div className="min-w-0 px-4 py-3.5 sm:px-5">
      <dt className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-espresso-500">
        {label}
      </dt>
      <dd className={`mt-1 font-display text-3xl leading-none ${accent ? "text-copper-700" : "text-espresso-950"}`}>
        {value}
      </dd>
    </div>
  );
}

function FeedbackListItem({ feedback, selected, onSelect }) {
  const TypeIcon = typeIcons[feedback.type] || MessageSquarePlus;
  return (
    <li>
      <button
        type="button"
        className={`group w-full border-b border-line-200 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-cream-100 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-petrol-600 sm:px-5 ${selected ? "bg-petrol-50/80 shadow-[inset_3px_0_0_#0e5c50]" : "bg-cream-50"}`}
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
      >
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl type-icon-${feedback.type}`}>
            <TypeIcon aria-hidden="true" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className="line-clamp-1 font-semibold text-espresso-900">
                {feedback.title}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-espresso-300 transition-transform group-hover:translate-x-0.5 group-hover:text-petrol-700"
                size={17}
              />
            </span>
            <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-espresso-600">
              {feedback.message}
            </span>
            <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-espresso-500">
              <span className={`status-badge status-${feedback.status}`}>
                {STATUS_LABELS[feedback.status]}
              </span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[feedback.category]}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={feedback.created_at}>
                {dateFormatter.format(new Date(feedback.created_at))}
              </time>
            </span>
          </span>
        </div>
      </button>
    </li>
  );
}

export function AdminDashboardPage() {
  const {
    feedbacks,
    totalCount,
    summary,
    initialLoading,
    loadError,
    operationLoading,
    loadFeedbacks,
    refreshFeedbacks,
    updateFeedback,
    deleteFeedback,
    resetDemo,
    failNext,
    isDemo,
    signOut,
    showDemoTools,
  } = useFeedback();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [demoView, setDemoView] = useState("normal");
  const [resetMessage, setResetMessage] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const delay = search.trim() ? 250 : 0;
    const timer = window.setTimeout(() => {
      loadFeedbacks({
        search,
        type: typeFilter,
        category: categoryFilter,
        status: statusFilter,
        page,
        pageSize: 20,
      }).catch(() => {});
    }, delay);
    return () => window.clearTimeout(timer);
  }, [categoryFilter, loadFeedbacks, page, search, statusFilter, typeFilter]);

  const selectedFeedback = feedbacks.find((item) => item.id === selectedId) || null;
  const hasActiveFilters =
    search || typeFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all";

  const stats = {
    total: summary.total || 0,
    new: summary.statuses?.new || 0,
    reviewing: summary.statuses?.reviewing || 0,
    resolved: summary.statuses?.resolved || 0,
  };

  const categoryCounts = useMemo(
    () =>
      CATEGORY_OPTIONS.map((category) => ({
        ...category,
        count: summary.categories?.[category.value] || 0,
      })),
    [summary.categories],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const selectFeedback = (id) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteFeedback(id);
    if (feedbacks.length === 1 && page > 1) setPage((current) => current - 1);
    setSelectedId(null);
    setMobileDetailOpen(false);
  };

  const handleReset = async () => {
    setResetMessage("");
    try {
      await resetDemo();
      setSelectedId(null);
      setMobileDetailOpen(false);
      setDemoView("normal");
      setResetMessage("Demo verileri başlangıç durumuna döndü.");
    } catch (error) {
      setResetMessage(error.message || "Demo verileri sıfırlanamadı.");
    }
  };

  const listState = demoView === "loading"
    ? "loading"
    : demoView === "error" || loadError
      ? "error"
      : demoView === "empty"
        ? "empty"
        : initialLoading
          ? "loading"
          : "normal";

  return (
    <div className="min-h-screen bg-cream-100 text-espresso-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line-200 bg-cream-50 px-4 py-5 lg:flex">
        <BrandMark compact />
        <nav className="mt-8" aria-label="Yönetici menüsü">
          <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-espresso-400">
            Çalışma alanı
          </p>
          <a
            href="#feedback-list"
            className="mt-2 flex min-h-11 items-center gap-3 rounded-xl bg-petrol-700 px-3 text-sm font-semibold text-white shadow-sm"
            aria-current="page"
          >
            <LayoutList aria-hidden="true" size={18} />
            Geri bildirimler
          </a>
          <a
            href="#category-summary"
            className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-espresso-600 hover:bg-cream-100 hover:text-espresso-900"
          >
            <BarChart3 aria-hidden="true" size={18} />
            Kategori özeti
          </a>
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-copper-200 bg-copper-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-copper-800">
              {isDemo ? "Demo modu" : "Yetkili oturum"}
            </p>
            <p className="mt-1 text-xs leading-5 text-espresso-600">
              {isDemo
                ? "Şifresiz panel erişimi yalnızca bu prototipe özeldir."
                : "Kayıtlar sunucu yetkisi doğrulandıktan sonra gösterilir."}
            </p>
          </div>
          {!isDemo ? (
            <button type="button" className="button-ghost w-full justify-center" onClick={() => signOut().catch(() => {})} disabled={operationLoading.auth}>
              <LogOut aria-hidden="true" size={17} />
              Çıkış yap
            </button>
          ) : null}
          <Link to="/" className="button-secondary w-full justify-center">
            <Coffee aria-hidden="true" size={17} />
            Müşteri formu
          </Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-line-200 bg-cream-100/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol-700">
                Fincan Arası / Yönetici
              </p>
              <h1 className="mt-0.5 font-display text-2xl text-espresso-950">Geri bildirim masası</h1>
            </div>
            {isDemo ? (
              <Link to="/yonetici/giris" className="button-ghost whitespace-nowrap text-xs sm:text-sm">Demo erişim bilgisi</Link>
            ) : (
              <button type="button" className="button-ghost whitespace-nowrap text-xs sm:text-sm" onClick={() => signOut().catch(() => {})} disabled={operationLoading.auth}>
                <LogOut aria-hidden="true" size={16} /> Çıkış yap
              </button>
            )}
          </div>
          {isDemo ? <DemoBanner compact /> : null}
        </header>

        <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <section aria-labelledby="overview-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol-700 lg:hidden">
                  Yönetici önizlemesi
                </p>
                <h1 id="overview-heading" className="mt-1 font-display text-3xl text-espresso-950 lg:text-[2.15rem]">
                  Bugünün nabzı
                </h1>
                <p className="mt-1 text-sm text-espresso-600">
                  {isDemo
                    ? "Kayıtlar, durumlar ve iç notlar bu tarayıcı oturumunda birlikte güncellenir."
                    : "Özet tüm kalıcı kayıtları; liste ise seçili filtrelerin geçerli sayfasını gösterir."}
                </p>
              </div>
              {showDemoTools ? (
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="demo-view">Demo ekran durumu</label>
                  <select
                    id="demo-view"
                    className="field-control h-10 w-auto min-w-36 py-1.5 text-xs"
                    value={demoView}
                    onChange={(event) => setDemoView(event.target.value)}
                  >
                    <option value="normal">Normal görünüm</option>
                    <option value="loading">Yükleniyor durumu</option>
                    <option value="error">Hata durumu</option>
                    <option value="empty">Boş veri durumu</option>
                  </select>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={handleReset}
                    disabled={operationLoading.reset}
                    aria-label="Demo verilerini başlangıç durumuna döndür"
                    title="Demo verilerini sıfırla"
                  >
                    <RefreshCcw
                      aria-hidden="true"
                      size={18}
                      className={operationLoading.reset ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              ) : null}
            </div>

            {showDemoTools ? (
              <p aria-live="polite" className="mt-2 min-h-5 text-xs text-petrol-700">
                {resetMessage}
              </p>
            ) : null}

            <dl className="mt-3 grid grid-cols-2 divide-x divide-y divide-line-200 overflow-hidden rounded-2xl border border-line-200 bg-cream-50 shadow-soft sm:grid-cols-4 sm:divide-y-0">
              <StatItem label="Toplam kayıt" value={stats.total} />
              <StatItem label="Yeni" value={stats.new} accent />
              <StatItem label="İncelenen" value={stats.reviewing} />
              <StatItem label="Sonuçlanan" value={stats.resolved} />
            </dl>
          </section>

          <div className="mt-5 grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(390px,0.88fr)]">
            <section id="feedback-list" className="min-w-0" aria-labelledby="list-heading">
              <div className="overflow-hidden rounded-2xl border border-line-200 bg-cream-50 shadow-soft">
                <div className="border-b border-line-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 id="list-heading" className="font-display text-2xl text-espresso-950">Kayıtlar</h2>
                      <p className="mt-0.5 text-xs text-espresso-500">
                        {feedbacks.length} / {totalCount} eşleşen kayıt gösteriliyor
                      </p>
                    </div>
                    {hasActiveFilters ? (
                      <button type="button" className="button-ghost text-xs" onClick={clearFilters}>
                        <FilterX aria-hidden="true" size={16} />
                        Temizle
                      </button>
                    ) : null}
                  </div>

                  <div className="relative mt-4">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400" size={18} />
                    <label htmlFor="feedback-search" className="sr-only">Geri bildirimlerde ara</label>
                    <input
                      id="feedback-search"
                      type="search"
                      className="field-control pl-10"
                      value={search}
                      onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                      placeholder="Başlık veya açıklamada ara…"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="sr-only" htmlFor="type-filter">Tür filtresi</label>
                    <select id="type-filter" className="field-control py-2 text-sm" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}>
                      <option value="all">Tüm türler</option>
                      {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{TYPE_LABELS[option.value] || option.label}</option>)}
                    </select>
                    <label className="sr-only" htmlFor="category-filter">Kategori filtresi</label>
                    <select id="category-filter" className="field-control py-2 text-sm" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}>
                      <option value="all">Tüm kategoriler</option>
                      {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{CATEGORY_LABELS[option.value] || option.label}</option>)}
                    </select>
                    <label className="sr-only" htmlFor="status-filter">Durum filtresi</label>
                    <select id="status-filter" className="field-control py-2 text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                      <option value="all">Tüm durumlar</option>
                      {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{STATUS_LABELS[option.value] || option.label}</option>)}
                    </select>
                  </div>
                </div>

                {listState === "loading" ? (
                  <div className="p-4 sm:p-5">
                    <StateView kind="loading" compact title="Kayıtlar hazırlanıyor" description={isDemo ? "Demo veri katmanı kısa bir gecikmeyle yanıt veriyor." : "Yetkili kayıtlar sunucudan alınıyor."} />
                  </div>
                ) : listState === "error" ? (
                  <div className="p-4 sm:p-5">
                    <StateView
                      kind="error"
                      compact
                      title="Kayıtlar alınamadı"
                      description={loadError || "Bu, kontrollü demo hata görünümüdür; veriler değiştirilmedi."}
                      action={<button type="button" className="button-secondary" onClick={() => { setDemoView("normal"); refreshFeedbacks().catch(() => {}); }}>Yeniden dene</button>}
                    />
                  </div>
                ) : listState === "empty" ? (
                  <div className="p-4 sm:p-5">
                    <StateView kind="empty" compact title="Henüz kayıt yok" description="İlk geri bildirim geldiğinde burada görünecek." />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="p-4 sm:p-5">
                    <StateView
                      kind="filtered"
                      compact
                      title="Bu filtrelerle sonuç yok"
                      description="Arama ifadesini veya seçili filtreleri değiştirerek yeniden deneyin."
                      action={<button type="button" className="button-secondary" onClick={clearFilters}>Filtreleri temizle</button>}
                    />
                  </div>
                ) : (
                  <>
                    <ul className="max-h-[720px] overflow-y-auto" aria-label="Geri bildirim kayıtları">
                      {feedbacks.map((feedback) => (
                        <FeedbackListItem
                          key={feedback.id}
                          feedback={feedback}
                          selected={feedback.id === selectedId}
                          onSelect={() => selectFeedback(feedback.id)}
                        />
                      ))}
                    </ul>
                    {totalPages > 1 ? (
                      <div className="flex items-center justify-between gap-3 border-t border-line-200 px-4 py-3 text-sm sm:px-5">
                        <button type="button" className="button-small" disabled={page <= 1 || initialLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                          <ChevronLeft aria-hidden="true" size={16} /> Önceki
                        </button>
                        <span className="font-semibold text-espresso-600" aria-live="polite">Sayfa {page} / {totalPages}</span>
                        <button type="button" className="button-small" disabled={page >= totalPages || initialLoading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                          Sonraki <ChevronRight aria-hidden="true" size={16} />
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <section id="category-summary" className="mt-5 rounded-2xl border border-line-200 bg-cream-50 p-5 shadow-soft" aria-labelledby="category-heading">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 id="category-heading" className="font-display text-xl text-espresso-950">Kategori özeti</h2>
                    <p className="mt-1 text-xs text-espresso-500">Filtrelerden ve sayfalamadan bağımsız tüm kayıtların dağılımı</p>
                  </div>
                  <Settings2 aria-hidden="true" className="text-copper-600" size={20} />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {categoryCounts.map((category) => {
                    const percentage = summary.total ? Math.round((category.count / summary.total) * 100) : 0;
                    return (
                      <div key={category.value}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-espresso-700">{category.label}</span>
                          <span className="tabular-nums text-espresso-500">{category.count}</span>
                        </div>
                        <progress
                          className="summary-progress mt-2 block h-1.5 w-full overflow-hidden rounded-full"
                          max="100"
                          value={percentage}
                          aria-label={`${category.label}: yüzde ${percentage}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            </section>

            <aside
              className={`${mobileDetailOpen ? "fixed inset-0 z-40 block h-screen bg-cream-50" : "hidden"} min-h-[640px] xl:sticky xl:inset-auto xl:top-[8.2rem] xl:z-auto xl:block xl:h-[calc(100vh-10rem)]`}
              aria-label="Seçili geri bildirim"
            >
              {selectedFeedback ? (
                <FeedbackDetail
                  key={`${selectedFeedback.id}-${selectedFeedback.updated_at}`}
                  feedback={selectedFeedback}
                  onUpdate={updateFeedback}
                  onDelete={handleDelete}
                  onCloseMobile={() => setMobileDetailOpen(false)}
                  updateBusy={operationLoading.update}
                  deleteBusy={operationLoading.delete}
                  failNext={failNext}
                  showDemoTools={showDemoTools}
                />
              ) : (
                <StateView kind="empty" title="Bir kayıt seçin" description="Özgün müşteri metnini, iç değerlendirmeyi ve durum geçmişini burada inceleyin." />
              )}
            </aside>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line-200 bg-cream-50 px-3 py-2 shadow-[0_-8px_24px_rgba(40,27,22,0.08)] lg:hidden" aria-label="Mobil yönetici menüsü">
        <a href="#feedback-list" className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold text-petrol-700">
          <Inbox aria-hidden="true" size={18} /> Kayıtlar
        </a>
        <a href="#category-summary" className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold text-espresso-500">
          <BarChart3 aria-hidden="true" size={18} /> Özet
        </a>
        <Link to="/" className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold text-espresso-500">
          <Coffee aria-hidden="true" size={18} /> Form
        </Link>
      </nav>
    </div>
  );
}
