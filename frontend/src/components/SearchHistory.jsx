function SearchHistory({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="panel historyPanel">
      <div className="panelHeader compact">
        <div>
          <h3>Búsquedas agregadas</h3>
          <p>Todo esto forma parte del documento actual.</p>
        </div>
      </div>

      <div className="historyChips">
        {items.map((item) => (
          <span key={item.id} className="chip">
            {(item.mode || "").toUpperCase()}: {item.value} ({item.count ?? 0})
          </span>
        ))}
      </div>
    </section>
  );
}

export default SearchHistory;