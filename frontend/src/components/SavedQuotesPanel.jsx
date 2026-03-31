function SavedQuotesPanel({
  savedQuotes,
  filters,
  setFilters,
  loadQuote,
  removeQuote,
}) {
  const filtered = savedQuotes.filter((item) => {
    const nameOk = !filters.name ||
      item.quoteName?.toLowerCase().includes(filters.name.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(filters.name.toLowerCase());

    const dateOk = !filters.date || item.createdAt?.slice(0, 10) === filters.date;

    const countOk = !filters.productCount ||
      Number(item.productCount) === Number(filters.productCount);

    return nameOk && dateOk && countOk;
  });

  return (
    <section className="panel">
      <div className="panelHeader compact">
        <div>
          <h3>Cotizaciones guardadas</h3>
          <p>Versión lite: guardadas en este navegador.</p>
        </div>
      </div>

      <div className="savedQuoteFilters">
        <input
          type="text"
          placeholder="Buscar por nombre o cliente"
          value={filters.name}
          onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))}
        />
        <input
          type="number"
          min="1"
          placeholder="Cantidad de productos"
          value={filters.productCount}
          onChange={(e) =>
            setFilters((p) => ({ ...p, productCount: e.target.value }))
          }
        />
      </div>

      <div className="savedQuotesList">
        {filtered.map((item) => (
          <div className="savedQuoteCard" key={item.id}>
            <div>
              <strong>{item.quoteName || "Sin nombre"}</strong>
              <p>{item.customerName || "Sin cliente"} · {item.productCount} productos</p>
              <p>{new Date(item.createdAt).toLocaleString("es-CO")}</p>
            </div>

            <div className="savedQuoteActions">
              <button className="secondaryBtn smallBtn" onClick={() => loadQuote(item)}>
                Cargar
              </button>
              <button className="ghostBtn smallBtn" onClick={() => removeQuote(item.id)}>
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SavedQuotesPanel;