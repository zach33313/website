import { AlertCircle, X } from 'lucide-react';
import { useStore } from '../../stores/useStore';

export function ErrorBanner() {
  const { error, setError } = useStore();

  if (!error) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
      <AlertCircle size={20} className="flex-shrink-0" />
      <p className="flex-1 text-sm">{error}</p>
      <button
        onClick={() => setError(null)}
        className="p-1 hover:bg-red-500/20 rounded transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}
