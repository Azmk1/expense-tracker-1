// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "chart.js/auto"; // requires: npm i chart.js

// LocalStorage keys
const LS_ITEMS  = "et-react-v2-items";
const LS_BUDGET = "et-react-v2-budget";

// helpers
const currency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
const yyyymm = (d) => d?.slice(0, 7);

// small hook for localStorage state
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(val)), [key, val]);
  return [val, setVal];
}

export default function App() {
  const [items, setItems] = useLocalStorage(LS_ITEMS, []);
  const [budgetMap, setBudgetMap] = useLocalStorage(LS_BUDGET, {}); // { 'YYYY-MM': number }
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    desc: "",
    cat: "Food",
    amt: "",
  });
  const [filters, setFilters] = useState({ month: "", cat: "" });
  const [editingId, setEditingId] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const descRef = useRef(null);

  useEffect(() => {
    descRef.current?.focus();
  }, []);

  const categories = ["Food", "Transport", "Rent", "Utilities", "Shopping", "Other", "Income"];

  // filtered rows
  const filtered = useMemo(() => {
    return items
      .filter(
        (e) =>
          (!filters.month || yyyymm(e.date) === filters.month) &&
          (!filters.cat || e.cat === filters.cat)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items, filters]);

  const totalVisible = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amt), 0),
    [filtered]
  );

  // month rollup + budget
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalThisMonth = useMemo(() => {
    return items
      .filter((e) => yyyymm(e.date) === thisKey)
      .reduce((s, e) => s + Number(e.amt), 0);
  }, [items, thisKey]);
  const monthBudget = budgetMap[thisKey] || 0;
  const pct = monthBudget > 0 ? Math.min(100, (totalThisMonth / monthBudget) * 100) : 0;

  // category totals (for filtered view)
  const byCat = useMemo(() => {
    const map = {};
    filtered.forEach((e) => (map[e.cat] = (map[e.cat] || 0) + Number(e.amt)));
    return Object.entries(map).sort((a, b) => b[1] - a[1]); // [ [cat, total], ... ]
  }, [filtered]);

  // pie chart (Chart.js)
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (byCat.length === 0) return;

    // eslint-disable-next-line no-undef
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "pie",
      data: {
        labels: byCat.map(([k]) => k),
        datasets: [{ data: byCat.map(([, v]) => v) }],
      },
      options: {
        plugins: { legend: { labels: { color: "#cbd5e1" } } },
      },
    });

    return () => chartRef.current?.destroy();
  }, [byCat]);

  // actions
  function addExpense(e) {
    e.preventDefault();
    const amt = parseFloat(form.amt);
    if (!form.desc.trim() || !form.date || isNaN(amt) || amt <= 0) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date: form.date, desc: form.desc.trim(), cat: form.cat, amt },
    ]);
    setForm((f) => ({ ...f, desc: "", amt: "" }));
    descRef.current?.focus();
  }

  function remove(id) {
    const found = items.find((x) => x.id === id);
    setLastDeleted(found || null);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }
  function undoDelete() {
    if (!lastDeleted) return;
    setItems((prev) => [lastDeleted, ...prev]);
    setLastDeleted(null);
  }

  function startEdit(id) {
    setEditingId(id);
  }
  function saveEdit(id, patch) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setEditingId(null);
  }
  function cancelEdit() {
    setEditingId(null);
  }

  function exportCsv() {
    const rows = [
      ["date", "description", "category", "amount"],
      ...items.map((e) => [e.date, e.desc, e.cat, e.amt]),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setBudgetForMonth(v) {
    const n = Math.max(0, Number(v) || 0);
    setBudgetMap((m) => ({ ...m, [thisKey]: n }));
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Expense Tracker (React)</h1>
        <p className="text-slate-400">
          Add expenses, edit/delete, filter by month/category, view totals & category pie, set a
          monthly budget, and export CSV. Data stays in your browser.
        </p>
      </header>

      {/* Add Expense */}
      <form
        onSubmit={addExpense}
        className="grid sm:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-lg mb-6"
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700"
          required
        />
        <input
          ref={descRef}
          type="text"
          placeholder="Description"
          value={form.desc}
          onChange={(e) => setForm({ ...form, desc: e.target.value })}
          className="sm:col-span-2 rounded px-3 py-2 bg-slate-800 border border-slate-700"
          required
        />
        <select
          value={form.cat}
          onChange={(e) => setForm({ ...form, cat: e.target.value })}
          className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amt}
          onChange={(e) => setForm({ ...form, amt: e.target.value })}
          className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700"
          required
        />
        <button className="sm:col-span-5 bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 font-semibold">
          Add Expense
        </button>
      </form>

      {/* Filters + actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex gap-2">
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
            className="rounded px-3 py-2 bg-slate-800 border border-slate-700"
          />
          <select
            value={filters.cat}
            onChange={(e) => setFilters((f) => ({ ...f, cat: e.target.value }))}
            className="rounded px-3 py-2 bg-slate-800 border border-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ month: "", cat: "" })}
            className="px-3 py-2 rounded border border-slate-700"
          >
            Clear
          </button>
          {lastDeleted && (
            <button
              onClick={undoDelete}
              className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500"
            >
              Undo delete
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              if (confirm("Delete ALL expenses?")) setItems([]);
            }}
            className="px-3 py-2 rounded bg-rose-700 hover:bg-rose-600"
          >
            Wipe All
          </button>
        </div>
      </div>

      {/* Monthly budget */}
      <div className="bg-slate-900/60 p-4 rounded mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Budget for {thisKey}:</label>
          <input
            type="number"
            step="0.01"
            value={monthBudget}
            onChange={(e) => setBudgetForMonth(e.target.value)}
            className="w-40 rounded px-3 py-2 bg-slate-800 border border-slate-700"
            placeholder="e.g. 800"
          />
          <span className="text-sm text-slate-400">Spent: {currency(totalThisMonth)}</span>
        </div>
        {monthBudget > 0 && (
          <div className="mt-3">
            <div className="w-full h-3 rounded bg-slate-800 overflow-hidden">
              <div
                className={`h-full ${
                  totalThisMonth > monthBudget ? "bg-rose-600" : "bg-emerald-600"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {pct.toFixed(0)}% of budget used {totalThisMonth > monthBudget && "— over budget!"}
            </p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <section className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/60 p-4 rounded">
          <p className="text-slate-400 text-sm">Total (visible)</p>
          <p className="text-2xl font-bold">{currency(totalVisible)}</p>
        </div>
        <div className="bg-slate-900/60 p-4 rounded">
          <p className="text-slate-400 text-sm">This Month</p>
          <p className="text-2xl font-bold">{currency(totalThisMonth)}</p>
        </div>
        <div className="bg-slate-900/60 p-4 rounded">
          <p className="text-slate-400 text-sm">By Category (visible)</p>
          <ul className="text-sm mt-1 space-y-1">
            {byCat.map(([k, v]) => (
              <li key={k}>
                {k}: {currency(v)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Chart */}
      <div className="bg-slate-900/60 p-4 rounded mb-4">
        <p className="text-slate-300 mb-2 text-sm">Category breakdown (visible)</p>
        <canvas ref={canvasRef} height="140"></canvas>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-slate-900/60 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const isEdit = editingId === e.id;
              return (
                <tr key={e.id} className="border-t border-slate-800">
                  <td className="px-4 py-2">
                    {isEdit ? (
                      <input
                        type="date"
                        defaultValue={e.date}
                        onChange={(ev) => (e._nextDate = ev.target.value)}
                        className="rounded px-2 py-1 bg-slate-800 border border-slate-700"
                      />
                    ) : (
                      e.date
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEdit ? (
                      <input
                        type="text"
                        defaultValue={e.desc}
                        onChange={(ev) => (e._nextDesc = ev.target.value)}
                        className="w-48 rounded px-2 py-1 bg-slate-800 border border-slate-700"
                      />
                    ) : (
                      e.desc
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEdit ? (
                      <select
                        defaultValue={e.cat}
                        onChange={(ev) => (e._nextCat = ev.target.value)}
                        className="rounded px-2 py-1 bg-slate-800 border border-slate-700"
                      >
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      e.cat
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isEdit ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={e.amt}
                        onChange={(ev) => (e._nextAmt = ev.target.value)}
                        className="w-28 text-right rounded px-2 py-1 bg-slate-800 border border-slate-700"
                      />
                    ) : (
                      currency(e.amt)
                    )}
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    {!isEdit ? (
                      <>
                        <button
                          onClick={() => startEdit(e.id)}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(e.id)}
                          className="text-rose-400 hover:text-rose-300 underline"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            const patch = {
                              date: e._nextDate ?? e.date,
                              desc: (e._nextDesc ?? e.desc).trim(),
                              cat: e._nextCat ?? e.cat,
                              amt: Math.max(0.01, Number(e._nextAmt ?? e.amt)),
                            };
                            saveEdit(e.id, patch);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-slate-400 hover:text-slate-300 underline"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-slate-400">
                  No expenses yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
