import { FiX } from "react-icons/fi";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}

export default function Modal({
  title,
  children,
  visible,
  onClose,
}: ModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 bottom-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-[101] card backdrop-blur-lg dark:!bg-black/70 p-6 max-w-md w-full rounded-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <FiX size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  );
}
