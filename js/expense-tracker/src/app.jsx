import React, { useMemo, useState } from "react";

const currency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
const yyyymm = (d) => d?.slice(0, 7);

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    desc: "",
    cat: "Food",
    amt: ""
  });
  const [filters, setFilters] = useState({ month: "", cat: "" });
  const cats = ["Food","Transport","Rent","Utilities","Shopping","Other","Income"];

  const filtered = useMemo(
    () => items
      .filter(e => (!filters.month || yyyymm(e.date)===filters.month) && (!filters.cat || e.cat===filters.cat))
      .sort((a,b)=> b.date.localeCompare(a.date)),
    [items, filters]
  );

  const totalVisible = useMemo(() => filtered.reduce((s,e)=> s+Number(e.amt),0), [filtered]);

  function add(e){
    e.preventDefault();
    const amt = parseFloat(form.amt);
    if (!form.desc.trim() || !form.date || isNaN(amt) || amt<=0) return;
    setItems(prev => [...prev, { id: crypto.randomUUID(), ...form, amt }]);
    setForm(f => ({ ...f, desc:"", amt:"" }));
  }
  function remove(id){ setItems(prev => prev.filter(e => e.id!==id)); }

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-2">Expense Tracker</h1>
      <p className="text-slate-400 mb-6">Add expenses and filter by month/category.</p>

      <form onSubmit={add} className="grid sm:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-lg mb-6">
        <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}
               className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700" required/>
        <input type="text" placeholder="Description" value={form.desc}
               onChange={e=>setForm({...form, desc:e.target.value})}
               className="sm:col-span-2 rounded px-3 py-2 bg-slate-800 border border-slate-700" required/>
        <select value={form.cat} onChange={e=>setForm({...form, cat:e.target.value})}
                className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700">
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Amount" value={form.amt}
               onChange={e=>setForm({...form, amt:e.target.value})}
               className="sm:col-span-1 rounded px-3 py-2 bg-slate-800 border border-slate-700" required/>
        <button className="sm:col-span-5 bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 font-semibold">Add Expense</button>
      </form>

      <div className="flex gap-2 mb-4">
        <input type="month" value={filters.month} onChange={e=>setFilters(f=>({...f, month:e.target.value}))}
               className="rounded px-3 py-2 bg-slate-800 border border-slate-700"/>
        <select value={filters.cat} onChange={e=>setFilters(f=>({...f, cat:e.target.value}))}
                className="rounded px-3 py-2 bg-slate-800 border border-slate-700">
          <option value="">All Categories</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>setFilters({month:"", cat:""})} className="px-3 py-2 rounded border border-slate-700">Clear</button>
      </div>

      <div className="bg-slate-900/60 p-4 rounded mb-4">
        <p className="text-slate-400 text-sm">Total (visible)</p>
        <p className="text-2xl font-bold">{currency(totalVisible)}</p>
      </div>

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
            {filtered.map(e => (
              <tr key={e.id} className="border-t border-slate-800">
                <td className="px-4 py-2">{e.date}</td>
                <td className="px-4 py-2">{e.desc}</td>
                <td className="px-4 py-2">{e.cat}</td>
                <td className="px-4 py-2 text-right">{currency(e.amt)}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={()=>remove(e.id)} className="text-rose-400 hover:text-rose-300 underline">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan="5" className="px-4 py-6 text-slate-400">No expenses yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
