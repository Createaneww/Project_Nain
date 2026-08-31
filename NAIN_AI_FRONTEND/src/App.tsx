import AppRoutes from "./routes";
import { ToastProvider } from "./components/ToastProvider";

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

export default App;