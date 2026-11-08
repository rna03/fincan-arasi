import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appConfig } from "../config/appConfig";
import { demoFeedbackService } from "../services/demoFeedbackService";
import { FeedbackContext } from "./feedbackContext";

let liveServicePromise;

function getFeedbackService() {
  if (appConfig.isDemo) return Promise.resolve(demoFeedbackService);
  liveServicePromise ??= import("../services/supabaseFeedbackService").then(
    (module) => module.supabaseFeedbackService,
  );
  return liveServicePromise;
}
const DEFAULT_QUERY = Object.freeze({
  search: "",
  type: "all",
  category: "all",
  status: "all",
  page: 1,
  pageSize: 20,
});

const EMPTY_SUMMARY = Object.freeze({
  total: 0,
  statuses: { new: 0, reviewing: 0, planned: 0, resolved: 0 },
  categories: { menu: 0, service: 0, atmosphere: 0, other: 0 },
});

function buildSummary(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      summary.statuses[record.status] = (summary.statuses[record.status] || 0) + 1;
      summary.categories[record.category] = (summary.categories[record.category] || 0) + 1;
      return summary;
    },
    structuredClone(EMPTY_SUMMARY),
  );
}

export function FeedbackProvider({ children }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [authState, setAuthState] = useState({
    loading: !appConfig.isDemo && !appConfig.configurationError,
    session: null,
    isAdmin: appConfig.isDemo,
    error: appConfig.configurationError,
  });
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false,
    reset: false,
    auth: false,
    recovery: false,
  });
  const queryRef = useRef(DEFAULT_QUERY);
  const authCheckRef = useRef(0);

  const clearSensitiveState = useCallback(() => {
    setFeedbacks([]);
    setTotalCount(0);
    setSummary(EMPTY_SUMMARY);
    setLoadError("");
  }, []);

  useEffect(() => {
    if (appConfig.isDemo || appConfig.configurationError) return undefined;

    let active = true;
    let unsubscribe = () => {};

    async function verifySession(session) {
      const checkId = ++authCheckRef.current;
      if (!session) {
        if (active) {
          clearSensitiveState();
          setAuthState({ loading: false, session: null, isAdmin: false, error: "" });
        }
        return;
      }

      if (active) setAuthState((current) => ({ ...current, loading: true, error: "" }));
      const activeService = await getFeedbackService();
      const isAdmin = await activeService.isCurrentUserAdmin();
      if (!active || checkId !== authCheckRef.current) return;

      if (!isAdmin) clearSensitiveState();
      setAuthState({ loading: false, session, isAdmin, error: "" });
    }

    void getFeedbackService().then((activeService) => {
      if (!active) return;
      unsubscribe = activeService.onAuthStateChange((_event, session) => {
        void verifySession(session).catch(() => {
          if (active) {
            clearSensitiveState();
            setAuthState({
              loading: false,
              session: null,
              isAdmin: false,
              error: "Yönetici oturumu doğrulanamadı.",
            });
          }
        });
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearSensitiveState]);

  const runOperation = useCallback(async (operation, callback) => {
    setOperationLoading((current) => ({ ...current, [operation]: true }));
    try {
      return await callback();
    } finally {
      setOperationLoading((current) => ({ ...current, [operation]: false }));
    }
  }, []);

  const loadFeedbacks = useCallback(async (query = queryRef.current) => {
    const normalizedQuery = { ...DEFAULT_QUERY, ...query };
    queryRef.current = normalizedQuery;
    setInitialLoading(true);
    setLoadError("");

    try {
      if (!appConfig.isDemo && !authState.isAdmin) {
        clearSensitiveState();
        return { items: [], total: 0 };
      }

      const activeService = await getFeedbackService();
      const [listResult, summaryResult] = await Promise.all([
        activeService.list(normalizedQuery),
        appConfig.isDemo ? activeService.list() : activeService.summary(),
      ]);

      const normalizedList = Array.isArray(listResult)
        ? {
            items: listResult.slice(
              (normalizedQuery.page - 1) * normalizedQuery.pageSize,
              normalizedQuery.page * normalizedQuery.pageSize,
            ),
            total: listResult.length,
          }
        : listResult;
      const normalizedSummary = Array.isArray(summaryResult)
        ? buildSummary(summaryResult)
        : summaryResult;

      setFeedbacks(normalizedList.items);
      setTotalCount(normalizedList.total);
      setSummary(normalizedSummary ?? EMPTY_SUMMARY);
      return normalizedList;
    } catch (error) {
      setLoadError(error.message || "Geri bildirimler alınamadı.");
      throw error;
    } finally {
      setInitialLoading(false);
    }
  }, [authState.isAdmin, clearSensitiveState]);

  const refreshFeedbacks = useCallback(
    () => loadFeedbacks(queryRef.current),
    [loadFeedbacks],
  );

  const createFeedback = useCallback(
    (input, options) =>
      runOperation("create", async () => {
        const activeService = await getFeedbackService();
        const created = await activeService.create(input, options);
        if (appConfig.isDemo && created?.id) {
          setFeedbacks((current) => [created, ...current.filter((item) => item.id !== created.id)]);
          setTotalCount((current) => current + 1);
          setSummary((current) => ({
            ...current,
            total: current.total + 1,
            statuses: { ...current.statuses, new: (current.statuses.new || 0) + 1 },
            categories: {
              ...current.categories,
              [created.category]: (current.categories[created.category] || 0) + 1,
            },
          }));
        }
        return created;
      }),
    [runOperation],
  );

  const updateFeedback = useCallback(
    (id, changes) =>
      runOperation("update", async () => {
        const currentRecord = feedbacks.find((item) => item.id === id);
        const activeService = await getFeedbackService();
        const updated = await activeService.updateAdminFields(id, changes, currentRecord?.updated_at);
        setFeedbacks((current) => current.map((item) => (item.id === id ? updated : item)));
        await loadFeedbacks(queryRef.current);
        return updated;
      }),
    [feedbacks, loadFeedbacks, runOperation],
  );

  const deleteFeedback = useCallback(
    (id) =>
      runOperation("delete", async () => {
        const currentRecord = feedbacks.find((item) => item.id === id);
        const activeService = await getFeedbackService();
        await activeService.delete(id, currentRecord?.updated_at);
        await loadFeedbacks(queryRef.current);
      }),
    [feedbacks, loadFeedbacks, runOperation],
  );

  const resetDemo = useCallback(
    () =>
      runOperation("reset", async () => {
        if (!appConfig.isDemo) throw new Error("Canlı veriler sıfırlanamaz.");
        await demoFeedbackService.reset();
        return loadFeedbacks(DEFAULT_QUERY);
      }),
    [loadFeedbacks, runOperation],
  );

  const failNext = useCallback((operation) => {
    if (!appConfig.isDemo) return;
    const serviceOperation = operation === "update" ? "updateAdminFields" : operation;
    demoFeedbackService.failNext(serviceOperation);
  }, []);

  const signIn = useCallback(
    (email, password, captchaToken) =>
      runOperation("auth", async () => {
        const activeService = await getFeedbackService();
        const session = await activeService.signIn(email.trim(), password, captchaToken);
        setAuthState({ loading: false, session, isAdmin: true, error: "" });
        return session;
      }),
    [runOperation],
  );

  const requestPasswordReset = useCallback(
    (email, captchaToken) =>
      runOperation("recovery", async () => {
        if (appConfig.isDemo) throw new Error("Parola kurtarma demo modunda kullanılamaz.");
        const activeService = await getFeedbackService();
        const redirectTo = new URL(
          "/yonetici/sifre-yenile",
          window.location.origin,
        ).toString();
        await activeService.requestPasswordReset(email.trim(), redirectTo, captchaToken);
      }),
    [runOperation],
  );

  const completePasswordRecovery = useCallback(
    (password) =>
      runOperation("recovery", async () => {
        if (appConfig.isDemo) throw new Error("Parola kurtarma demo modunda kullanılamaz.");
        const activeService = await getFeedbackService();
        await activeService.updatePassword(password);
        await activeService.signOut();
        clearSensitiveState();
        setAuthState({ loading: false, session: null, isAdmin: false, error: "" });
      }),
    [clearSensitiveState, runOperation],
  );

  const signOut = useCallback(
    () =>
      runOperation("auth", async () => {
        try {
          const activeService = await getFeedbackService();
          await activeService.signOut();
        } finally {
          clearSensitiveState();
          setAuthState({ loading: false, session: null, isAdmin: false, error: "" });
        }
      }),
    [clearSensitiveState, runOperation],
  );

  const value = useMemo(
    () => ({
      feedbacks,
      totalCount,
      summary,
      initialLoading,
      loadError,
      authState,
      operationLoading,
      loadFeedbacks,
      refreshFeedbacks,
      createFeedback,
      updateFeedback,
      deleteFeedback,
      resetDemo,
      failNext,
      signIn,
      requestPasswordReset,
      completePasswordRecovery,
      signOut,
      isDemo: appConfig.isDemo,
      showDemoTools: appConfig.showDemoTools,
    }),
    [
      authState,
      createFeedback,
      deleteFeedback,
      failNext,
      feedbacks,
      initialLoading,
      loadError,
      loadFeedbacks,
      operationLoading,
      refreshFeedbacks,
      resetDemo,
      requestPasswordReset,
      completePasswordRecovery,
      signIn,
      signOut,
      summary,
      totalCount,
      updateFeedback,
    ],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}
