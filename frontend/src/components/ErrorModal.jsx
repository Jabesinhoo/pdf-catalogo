import { AlertCircle, X } from "lucide-react";

function ErrorModal({ isOpen, onClose, title = "Error", errors }) {
  if (!isOpen) return null;

  const formatError = (err) => {
    if (typeof err === 'string') return err;
    if (err.msg) return err.msg;
    if (err.message) return err.message;
    if (err.type === 'field') return `${err.path}: ${err.msg}`;
    return JSON.stringify(err);
  };

  const renderErrors = () => {
    if (!errors) return <p>Error desconocido</p>;
    
    if (Array.isArray(errors)) {
      return (
        <ul className="errorList">
          {errors.map((err, idx) => (
            <li key={idx}> {formatError(err)}</li>
          ))}
        </ul>
      );
    }
    
    return <p className="errorMessage">{formatError(errors)}</p>;
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard errorModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <AlertCircle size={24} color="#ef4444" />
            <h3>{title}</h3>
          </div>
          <button className="closeBtn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="errorContent">
          {renderErrors()}
        </div>

        <div className="modalActions">
          <button className="primaryBtn" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorModal;