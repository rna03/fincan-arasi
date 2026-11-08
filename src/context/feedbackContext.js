import { createContext, useContext } from "react";

export const FeedbackContext = createContext(null);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback, FeedbackProvider içinde kullanılmalıdır.");
  }
  return context;
}
