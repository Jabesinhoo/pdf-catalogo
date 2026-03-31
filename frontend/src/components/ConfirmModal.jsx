import { X, AlertCircle } from "lucide-react";

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) {
  if (!isOpen) return null;

  return (
    <div className="confirmModalOverlay" onClick={onClose}>
      <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmModalHeader">
          <div className="confirmModalTitle">
            <AlertCircle size={24} className="confirmModalIcon" />
            <h3>{title}</h3>
          </div>
          <button className="confirmModalClose" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="confirmModalBody">
          <p>{message}</p>
        </div>

        <div className="confirmModalFooter">
          <button className="confirmModalBtn confirmModalBtn--cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="confirmModalBtn confirmModalBtn--confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;