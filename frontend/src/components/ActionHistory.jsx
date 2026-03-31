import { RotateCcw, Trash2 } from "lucide-react";

function ActionHistory({ actions, onUndo, onClear }) {
  if (!actions.length) return null;

  return (
    <div className="actionHistory">
      <div className="actionHistoryHeader">
        <h4>Historial</h4>
        <button className="actionHistoryClear" onClick={onClear}>
          Limpiar
        </button>
      </div>
      <div className="actionHistoryList">
        {actions.map((action, index) => (
          <div key={index} className="actionHistoryItem">
            <span className="actionHistoryIcon">
              {action.type === 'delete' ? <Trash2 size={14} /> : null}
            </span>
            <span className="actionHistoryText">{action.message}</span>
            <button 
              className="actionHistoryUndo"
              onClick={() => onUndo(index)}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActionHistory;