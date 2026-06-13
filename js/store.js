// ===========================================================================
//  DATA STORE  —  Firestore-backed, realtime, with an in-memory cache and a
//  tiny pub/sub so pages can re-render on any change.
//
//  Layout in Firestore (all under the signed-in user, locked by rules):
//      users/{uid}                       → { settings:{...}, seeded:bool }
//      users/{uid}/sales/{id}            → Sale
//      users/{uid}/expenses/{id}         → Expense
// ===========================================================================
import {
  collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "./firebase.js";
import { SEED_SALES, SEED_EXPENSES } from "./seed-data.js";

const DEFAULT_SETTINGS = {
  monthlyRevenueGoal: 600,
  monthlyProfitGoal: 350,
  taxRatePct: 20,            // basic-rate income tax estimate
  taxFreeAllowance: 1000,    // £1,000 trading allowance
  filamentReorderLevel: 50,  // warn when remaining filament value < £50
};

const state = {
  uid: null,
  sales: [],
  expenses: [],
  settings: { ...DEFAULT_SETTINGS },
  seeded: false,
  ready: { sales: false, expenses: false, user: false },
};
const subs = new Set();
let unsub = [];

export const getState = () => state;
export const isReady = () => state.ready.sales && state.ready.expenses && state.ready.user;
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { for (const fn of subs) { try { fn(state); } catch (e) { console.error(e); } } }

const salesCol = () => collection(db, "users", state.uid, "sales");
const expensesCol = () => collection(db, "users", state.uid, "expenses");
const userDoc = () => doc(db, "users", state.uid);

// Attach realtime listeners for a user. Returns once listeners are set.
export function attach(uid) {
  detach();
  state.uid = uid;
  state.ready = { sales: false, expenses: false, user: false };

  unsub.push(onSnapshot(salesCol(), (snap) => {
    state.sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    state.ready.sales = true; emit();
  }, (e) => { console.error("sales listener", e); state.ready.sales = true; emit(); }));

  unsub.push(onSnapshot(expensesCol(), (snap) => {
    state.expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    state.ready.expenses = true; emit();
  }, (e) => { console.error("expenses listener", e); state.ready.expenses = true; emit(); }));

  unsub.push(onSnapshot(userDoc(), (snap) => {
    const data = snap.data() || {};
    state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    state.seeded = !!data.seeded;
    state.ready.user = true; emit();
  }, (e) => { console.error("user listener", e); state.ready.user = true; emit(); }));
}
export function detach() {
  unsub.forEach((u) => { try { u(); } catch {} });
  unsub = [];
  state.uid = null; state.sales = []; state.expenses = [];
  state.settings = { ...DEFAULT_SETTINGS }; state.seeded = false;
}

// ---------- CRUD: sales ----------
const cleanSale = (s) => ({
  date: s.date, item: (s.item || "").trim(),
  revenue: Number(s.revenue) || 0, landingCost: Number(s.landingCost) || 0,
  platform: s.platform || "Other", status: s.status || "Delivered",
  printed: !!s.printed, notes: s.notes || "",
});
export const addSale = (s) => addDoc(salesCol(), { ...cleanSale(s), createdAt: serverTimestamp() });
export const updateSale = (id, s) => updateDoc(doc(salesCol(), id), cleanSale(s));
export const deleteSale = (id) => deleteDoc(doc(salesCol(), id));

// ---------- CRUD: expenses ----------
const cleanExpense = (e) => ({
  date: e.date, description: (e.description || "").trim(),
  amount: Number(e.amount) || 0, category: e.category || "Other", notes: e.notes || "",
});
export const addExpense = (e) => addDoc(expensesCol(), { ...cleanExpense(e), createdAt: serverTimestamp() });
export const updateExpense = (id, e) => updateDoc(doc(expensesCol(), id), cleanExpense(e));
export const deleteExpense = (id) => deleteDoc(doc(expensesCol(), id));

// ---------- settings ----------
export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await setDoc(userDoc(), { settings: state.settings }, { merge: true });
}

// ---------- seed import (idempotent: deterministic ids) ----------
export async function importSeed() {
  const writes = [
    ...SEED_SALES.map((s) => ({ ref: doc(salesCol(), s.id), data: stripId(cleanSale(s)) })),
    ...SEED_EXPENSES.map((e) => ({ ref: doc(expensesCol(), e.id), data: stripId(cleanExpense(e)) })),
  ];
  // Firestore batches cap at 500 ops — chunk it.
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db);
    writes.slice(i, i + 450).forEach((w) => batch.set(w.ref, w.data));
    await batch.commit();
  }
  await setDoc(userDoc(), { seeded: true, settings: state.settings }, { merge: true });
}
function stripId(o) { const { id, ...rest } = o; return rest; }

// Wipe all of the user's sales + expenses (danger zone).
export async function clearAllData() {
  const refs = [
    ...state.sales.map((s) => doc(salesCol(), s.id)),
    ...state.expenses.map((e) => doc(expensesCol(), e.id)),
  ];
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  await setDoc(userDoc(), { seeded: false }, { merge: true });
}

// Has the user got any data yet? (used to offer the import prompt)
export async function hasAnyData() {
  const u = await getDoc(userDoc());
  if (u.exists() && u.data().seeded) return true;
  return state.sales.length > 0 || state.expenses.length > 0;
}
