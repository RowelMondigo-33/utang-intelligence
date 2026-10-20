"use client";

import { useState, useEffect } from "react";

// Types
type InvoiceStatus = "Overdue" | "Due today" | "Upcoming" | "Partial" | "Paid";
type UserRole = "Admin" | "Agent";

type UserAccount = {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  initials: string;
  email: string;
  target?: number;
};

type Account = {
  id: string;
  customer: string;
  invoice: string;
  dueDate: string;
  totalAmount: number;
  balance: number;
  status: InvoiceStatus;
  assignedAgent: string;
  daysOverdue?: number;
};

type Payment = {
  id: string;
  customer: string;
  invoice: string;
  amount: number;
  date: string;
  method: string;
  collectedBy: string;
};

type AuditLog = {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
  timestamp: string;
};

// Registered Users Database
const initialUsers: UserAccount[] = [
  { id: "u1", username: "admin", passwordHash: "admin123", name: "Alex Santos", role: "Admin", initials: "AS", email: "admin@collectwise.ph" },
  { id: "u2", username: "juan", passwordHash: "agent123", name: "Juan Dela Cruz", role: "Agent", initials: "JC", email: "juan@collectwise.ph", target: 150000 },
  { id: "u3", username: "maria", passwordHash: "agent123", name: "Maria Clara", role: "Agent", initials: "MC", email: "maria@collectwise.ph", target: 150000 },
];

// Initial Mock CRM Database
const initialAccounts: Account[] = [
  { id: "1", customer: "ABC Trading", invoice: "INV-2026-001", dueDate: "Oct 12, 2026", totalAmount: 45000, balance: 45000, status: "Overdue", assignedAgent: "Juan Dela Cruz", daysOverdue: 15 },
  { id: "2", customer: "Santos Construction", invoice: "INV-2026-002", dueDate: "Oct 20, 2026", totalAmount: 32500, balance: 32500, status: "Due today", assignedAgent: "Maria Clara", daysOverdue: 0 },
  { id: "3", customer: "Metro Supplies", invoice: "INV-2026-003", dueDate: "Oct 25, 2026", totalAmount: 25000, balance: 18500, status: "Partial", assignedAgent: "Juan Dela Cruz", daysOverdue: 0 },
  { id: "4", customer: "Dela Cruz Hardware", invoice: "INV-2026-004", dueDate: "Aug 10, 2026", totalAmount: 27000, balance: 27000, status: "Overdue", assignedAgent: "Maria Clara", daysOverdue: 71 },
  { id: "5", customer: "Rizal Commercial Corp", invoice: "INV-2026-000", dueDate: "Oct 05, 2026", totalAmount: 50000, balance: 0, status: "Paid", assignedAgent: "Juan Dela Cruz", daysOverdue: 0 },
];

const initialPayments: Payment[] = [
  { id: "p1", customer: "Rizal Commercial Corp", invoice: "INV-2026-000", amount: 50000, date: "Oct 05, 2026", method: "Bank Transfer", collectedBy: "Juan Dela Cruz" },
  { id: "p2", customer: "Metro Supplies", invoice: "INV-2026-003", amount: 6500, date: "Oct 18, 2026", method: "GCash", collectedBy: "Juan Dela Cruz" },
];

const initialLogs: AuditLog[] = [
  { id: "l1", user: "Juan Dela Cruz", role: "Agent", action: "Collected Payment", details: "₱50,000 from Rizal Commercial Corp", timestamp: "Oct 05, 2026 10:30 AM" },
  { id: "l2", user: "Juan Dela Cruz", role: "Agent", action: "Collected Payment", details: "₱6,500 from Metro Supplies", timestamp: "Oct 18, 2026 02:15 PM" },
];

// Formatting Helper
const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

const statusStyles: Record<InvoiceStatus, string> = {
  Overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  "Due today": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Upcoming: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Partial: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export default function Home() {
  const [userList, setUserList] = useState<UserAccount[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Portal Login View Selection
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>("Agent");

  // Login Form Inputs
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Sign Up / Create User Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("Agent");
  const [regTarget, setRegTarget] = useState("150000");

  // Interface Layout
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [greeting, setGreeting] = useState("Good day");
  const [searchQuery, setSearchQuery] = useState("");

  // CRM Live Database
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialLogs);

  // Modals & Action Forms
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [invCustomer, setInvCustomer] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invTotalAmount, setInvTotalAmount] = useState("");
  const [invAgent, setInvAgent] = useState("Juan Dela Cruz");

  const [payCustomer, setPayCustomer] = useState("");
  const [payInvoice, setPayInvoice] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");

  // Load Active Session Separately per Role Portal
  useEffect(() => {
    const adminSession = localStorage.getItem("collectwise_admin_session");
    const agentSession = localStorage.getItem("collectwise_agent_session");

    if (adminSession && selectedLoginRole === "Admin") {
      try { setCurrentUser(JSON.parse(adminSession)); } catch (e) { console.error(e); }
    } else if (agentSession && selectedLoginRole === "Agent") {
      try { setCurrentUser(JSON.parse(agentSession)); } catch (e) { console.error(e); }
    } else {
      const session = adminSession || agentSession;
      if (session) {
        try { setCurrentUser(JSON.parse(session)); } catch (e) { console.error(e); }
      }
    }

    setIsAuthChecking(false);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, [selectedLoginRole]);

  // System Activity Audit Logger
  const logActivity = (action: string, details: string, actingUser?: UserAccount) => {
    const user = actingUser || currentUser;
    if (!user) return;
    const newLog: AuditLog = {
      id: "l" + Date.now(),
      user: user.name,
      role: user.role,
      action,
      details,
      timestamp: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const user = userList.find(
      (u) => u.username.toLowerCase() === loginUsername.trim().toLowerCase()
    );

    if (!user) {
      setLoginError("❌ Hindi mahanap ang username na ito.");
      return;
    }

    if (user.passwordHash !== loginPassword) {
      setLoginError("❌ Mali ang iyong password.");
      return;
    }

    if (user.role !== selectedLoginRole) {
      setLoginError(`❌ Ang account na ito ay para sa ${user.role} Portal.`);
      return;
    }

    setCurrentUser(user);
    const storageKey = user.role === "Admin" ? "collectwise_admin_session" : "collectwise_agent_session";
    localStorage.setItem(storageKey, JSON.stringify(user));

    setLoginUsername("");
    setLoginPassword("");
    logActivity("User Sign In", `Logged into ${user.role} Portal`, user);
  };

  // Logout Handler
  const handleSignOut = () => {
    if (currentUser) {
      logActivity("User Sign Out", "Logged out of system");
      const storageKey = currentUser.role === "Admin" ? "collectwise_admin_session" : "collectwise_agent_session";
      localStorage.removeItem(storageKey);
    }
    setCurrentUser(null);
  };

  // Register Account
  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regName) return;

    if (userList.some((u) => u.username.toLowerCase() === regUsername.trim().toLowerCase())) {
      alert("⚠️ Ang username na ito ay gamit na. Pumili ng iba.");
      return;
    }

    const newUser: UserAccount = {
      id: "u" + Date.now(),
      username: regUsername.trim().toLowerCase(),
      passwordHash: regPassword,
      name: regName,
      role: regRole,
      initials: regName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(),
      email: regEmail || `${regUsername}@collectwise.ph`,
      target: parseFloat(regTarget) || 150000,
    };

    setUserList([...userList, newUser]);
    if (currentUser) {
      logActivity("Created Account", `Admin created user account for ${newUser.name} (${newUser.role})`);
    }

    alert(`✅ Matagumpay na naisaayos ang account para kay ${newUser.name}!`);
    setIsRegisterModalOpen(false);
    setRegName("");
    setRegUsername("");
    setRegEmail("");
    setRegPassword("");
  };

  // Export to CSV Function
  const exportToCSV = (filename: string, rows: object[]) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [keys.join(","), ...rows.map((row: any) => keys.map((k) => `"${row[k] || ""}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics Calculations
  const activeAccounts = accounts.filter((a) => a.status !== "Paid");
  const totalReceivables = activeAccounts.reduce((acc, curr) => acc + curr.balance, 0);
  const overdueBalance = accounts.filter((a) => a.status === "Overdue").reduce((acc, curr) => acc + curr.balance, 0);
  const collectedTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);

  // Aging Analysis
  const aging1to30 = accounts.filter(a => a.status === "Overdue" && (a.daysOverdue || 0) <= 30).reduce((acc, c) => acc + c.balance, 0);
  const aging31to60 = accounts.filter(a => a.status === "Overdue" && (a.daysOverdue || 0) > 30 && (a.daysOverdue || 0) <= 60).reduce((acc, c) => acc + c.balance, 0);
  const aging60Plus = accounts.filter(a => a.status === "Overdue" && (a.daysOverdue || 0) > 60).reduce((acc, c) => acc + c.balance, 0);

  // Agent Specific Metrics
  const agentPayments = payments.filter((p) => p.collectedBy === currentUser?.name);
  const agentCollectedTotal = agentPayments.reduce((acc, p) => acc + p.amount, 0);
  const agentAccounts = accounts.filter((a) => a.assignedAgent === currentUser?.name);
  const agentActiveAccounts = agentAccounts.filter((a) => a.status !== "Paid");
  const agentOverdueBalance = agentAccounts.filter((a) => a.status === "Overdue").reduce((acc, curr) => acc + curr.balance, 0);

  const agentLeaderboard = userList.filter((u) => u.role === "Agent").map((agent) => {
    const agentPays = payments.filter((p) => p.collectedBy === agent.name);
    const totalColl = agentPays.reduce((acc, p) => acc + p.amount, 0);
    const countPaid = accounts.filter((a) => a.assignedAgent === agent.name && a.status === "Paid").length;
    return { name: agent.name, totalColl, countPaid, target: agent.target || 150000 };
  });

  // Action Handlers
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer || !payAmount || !currentUser) return;

    const paymentVal = parseFloat(payAmount) || 0;

    setAccounts(accounts.map((acc) => {
      if (acc.invoice === payInvoice || acc.customer.toLowerCase() === payCustomer.toLowerCase()) {
        const newBal = Math.max(0, acc.balance - paymentVal);
        const newStatus: InvoiceStatus = newBal === 0 ? "Paid" : "Partial";
        return { ...acc, balance: newBal, status: newStatus };
      }
      return acc;
    }));

    const newPay: Payment = {
      id: "p" + Date.now(),
      customer: payCustomer,
      invoice: payInvoice || "N/A",
      amount: paymentVal,
      date: "Today",
      method: payMethod,
      collectedBy: currentUser.name,
    };

    setPayments([newPay, ...payments]);
    logActivity("Collected Payment", `Collected ${formatMoney(paymentVal)} from ${payCustomer} via ${payMethod}`);
    setIsPaymentModalOpen(false);
    setPayCustomer("");
    setPayInvoice("");
    setPayAmount("");
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCustomer || !invNumber) return;

    const totalAmt = parseFloat(invTotalAmount) || 0;
    const newAcc: Account = {
      id: Date.now().toString(),
      customer: invCustomer,
      invoice: invNumber,
      dueDate: "Oct 30, 2026",
      totalAmount: totalAmt,
      balance: totalAmt,
      status: "Upcoming",
      assignedAgent: currentUser?.role === "Admin" ? invAgent : currentUser?.name || "Unassigned",
    };

    setAccounts([newAcc, ...accounts]);
    logActivity("Created Invoice", `Created ${invNumber} (${formatMoney(totalAmt)}) assigned to ${newAcc.assignedAgent}`);
    setIsInvoiceModalOpen(false);
    setInvCustomer("");
    setInvNumber("");
    setInvTotalAmount("");
  };

  if (isAuthChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white text-sm">Loading CollectWise Portal...</div>;
  }

  // ==================== 1. LOGIN SCREEN ====================
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/30">
              C
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">CollectWise Portal</h1>
            <p className="mt-1 text-xs text-slate-400">Secure Access for Agents and Administrators</p>
          </div>

          <div className="mt-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Access Portal</label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1.5">
              <button
                type="button"
                onClick={() => { setSelectedLoginRole("Agent"); setLoginError(""); }}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${selectedLoginRole === "Agent" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                🎧 Agent Portal
              </button>
              <button
                type="button"
                onClick={() => { setSelectedLoginRole("Admin"); setLoginError(""); }}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${selectedLoginRole === "Admin" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                👔 Admin Portal
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {loginError && (
              <div className="rounded-xl bg-red-950/80 border border-red-800 p-3 text-xs font-semibold text-red-300">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={selectedLoginRole === "Admin" ? "e.g. admin" : "e.g. juan or maria"}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500 text-white"
              />
            </div>

            <button
              type="submit"
              className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition ${selectedLoginRole === "Admin" ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"}`}
            >
              Sign In to {selectedLoginRole} Portal →
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <p className="text-xs font-bold text-slate-300">🔑 Demo Credentials ({selectedLoginRole} Portal):</p>
            <div className="mt-2 space-y-1 text-xs text-slate-400">
              {selectedLoginRole === "Admin" ? (
                <p>• <strong className="text-purple-400">Admin:</strong> User: <code className="text-white">admin</code> | Pass: <code className="text-white">admin123</code></p>
              ) : (
                <>
                  <p>• <strong className="text-blue-400">Agent Juan:</strong> User: <code className="text-white">juan</code> | Pass: <code className="text-white">agent123</code></p>
                  <p>• <strong className="text-blue-400">Agent Maria:</strong> User: <code className="text-white">maria</code> | Pass: <code className="text-white">agent123</code></p>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="text-xs font-semibold text-blue-400 hover:underline"
            >
              + Create New User Account
            </button>
          </div>
        </div>

        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl text-white">
              <h3 className="text-lg font-bold">Create New User Account</h3>
              <form onSubmit={handleRegisterAccount} className="mt-4 space-y-3">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full Name (e.g. Pedro Penduko)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                />
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Username (e.g. pedro)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                    >
                      <option value="Agent">Agent</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  {regRole === "Agent" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target (₱)</label>
                      <input
                        type="number"
                        value={regTarget}
                        onChange={(e) => setRegTarget(e.target.value)}
                        placeholder="150000"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-800 py-2.5 text-sm font-semibold hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 2. MAIN SYSTEM DASHBOARD ====================
  const navItems =
    currentUser.role === "Admin"
      ? [["Dashboard", "▦"], ["Agents CRM", "👥"], ["Invoices", "▤"], ["Payments", "₱"], ["Audit Trail", "📋"]]
      : [["Dashboard", "▦"], ["Invoices", "▤"], ["My Payments", "₱"]];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 md:flex">
        <a href="#" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">
            C
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">CollectWise</span>
            <span className="block text-xs text-slate-400">Collection Intelligence</span>
          </span>
        </a>

        <div className="mt-10">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {currentUser.role === "Admin" ? "Management Workspace" : "Agent Workspace"}
          </p>
          <nav className="space-y-1">
            {navItems.map(([label, icon]) => (
              <button
                key={label}
                type="button"
                onClick={() => { setActiveTab(label); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition text-left ${
                  activeTab === label
                    ? currentUser.role === "Admin"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="w-5 text-center">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl p-4 border border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase">Signed In As</p>
          <p className="font-bold text-sm mt-1">{currentUser.name}</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${currentUser.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
            {currentUser.role} Account
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{currentUser.role} PORTAL · {activeTab}</p>
            <h1 className="text-xl font-bold">{activeTab}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              🚪 Sign Out
            </button>
          </div>
        </header>

        <div className="p-5 md:p-8">
          {/* ==================== ADMIN DASHBOARD ==================== */}
          {currentUser.role === "Admin" && activeTab === "Dashboard" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">ADMINISTRATOR OVERVIEW</p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">{greeting}, {currentUser.name}!</h2>
                  <p className="text-sm text-slate-400 mt-1">Real-time company-wide collection metrics and agent performance monitor.</p>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20"
                >
                  + Add New Agent User
                </button>
              </div>

              {/* Company Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Total Company Receivables</p>
                  <p className="mt-3 text-3xl font-bold text-blue-600">{formatMoney(totalReceivables)}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Combined balance across all agents</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Total Overdue Balances</p>
                  <p className="mt-3 text-3xl font-bold text-red-600">{formatMoney(overdueBalance)}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Requires priority collection</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Total Company Collections</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-600">{formatMoney(collectedTotal)}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Recorded settlements YTD</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                  <h3 className="font-bold text-lg">📊 Collection Agent CRM Leaderboard</h3>
                  <p className="text-xs text-slate-400 mt-1">Monitor individual agent performance and target completion.</p>

                  <div className="mt-6 space-y-4">
                    {agentLeaderboard.map((agent) => {
                      const percent = Math.min(100, Math.round((agent.totalColl / agent.target) * 100));
                      return (
                        <div key={agent.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm">{agent.name}</p>
                              <p className="text-xs text-slate-400">{agent.countPaid} Fully Resolved Invoices</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">{formatMoney(agent.totalColl)}</p>
                              <p className="text-[10px] text-slate-400">Target: {formatMoney(agent.target)} ({percent}%)</p>
                            </div>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-base">Overdue Aging Breakdown</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Company-wide risk analysis</p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-amber-600">1 - 30 Days</span>
                          <span>{formatMoney(aging1to30)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${overdueBalance ? (aging1to30 / overdueBalance) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-orange-600">31 - 60 Days</span>
                          <span>{formatMoney(aging31to60)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${overdueBalance ? (aging31to60 / overdueBalance) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-red-600">60+ Days (High Risk)</span>
                          <span>{formatMoney(aging60Plus)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-600" style={{ width: `${overdueBalance ? (aging60Plus / overdueBalance) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base">Recent System Logs</h3>
                      <button onClick={() => setActiveTab("Audit Trail")} className="text-xs font-semibold text-purple-600 hover:underline">View All →</button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {auditLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="text-xs border-b border-slate-100 pb-2">
                          <p className="font-bold text-blue-600">{log.user} <span className="font-normal text-slate-400">({log.action})</span></p>
                          <p className="text-slate-500">{log.details}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== AGENT DASHBOARD ==================== */}
          {currentUser.role === "Agent" && activeTab === "Dashboard" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">COLLECTION AGENT CRM</p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">{greeting}, {currentUser.name}!</h2>
                  <p className="text-sm text-slate-400 mt-1">Here is your personal collection target and assigned customer tasks.</p>
                </div>
                <button type="button" onClick={() => setIsPaymentModalOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20">
                  + Record Payment
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">My Active Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-blue-600">{agentActiveAccounts.length} Clients</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">My Overdue Balances</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{formatMoney(agentOverdueBalance)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">My Total Collected</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{formatMoney(agentCollectedTotal)}</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-base">My Monthly Collection Target Progress</h3>
                        <p className="text-xs text-slate-400 mt-1">Goal: {formatMoney(currentUser.target || 150000)} / Month</p>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {Math.round((agentCollectedTotal / (currentUser.target || 150000)) * 100)}%
                      </span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, (agentCollectedTotal / (currentUser.target || 150000)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-bold">My Assigned Accounts Needing Follow-up</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                            <th className="pb-3">Customer</th>
                            <th className="pb-3">Due Date</th>
                            <th className="pb-3 text-right">Balance</th>
                            <th className="pb-3 pl-4">Status</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {agentActiveAccounts.length === 0 ? (
                            <tr><td colSpan={5} className="py-4 text-center text-slate-400">No pending accounts assigned! 🎉</td></tr>
                          ) : (
                            agentActiveAccounts.map((acc) => (
                              <tr key={acc.id}>
                                <td className="py-3 font-semibold">{acc.customer}<p className="text-xs font-mono text-slate-400">{acc.invoice}</p></td>
                                <td className="py-3 text-slate-400">{acc.dueDate}</td>
                                <td className="py-3 text-right font-bold">{formatMoney(acc.balance)}</td>
                                <td className="py-3 pl-4">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[acc.status]}`}>{acc.status}</span>
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setPayCustomer(acc.customer);
                                      setPayInvoice(acc.invoice);
                                      setPayAmount(acc.balance.toString());
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                                  >
                                    Collect ₱
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
                  <h3 className="font-bold text-base">Today&apos;s Follow-up Checklist</h3>
                  <p className="text-xs text-slate-400 mt-1">Recommended collection actions</p>

                  <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                      <p className="text-xs font-bold text-amber-700">📞 Phone Call Follow-up</p>
                      <p className="text-xs font-semibold mt-1">ABC Trading</p>
                      <p className="text-[10px] text-slate-500">Overdue: ₱45,000.00 (15 Days)</p>
                    </div>

                    <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                      <p className="text-xs font-bold text-blue-700">📩 Send Statement of Account</p>
                      <p className="text-xs font-semibold mt-1">Metro Supplies</p>
                      <p className="text-[10px] text-slate-500">Partial Balance: ₱18,500.00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== AUDIT TRAIL VIEW (Admin Only) ==================== */}
          {activeTab === "Audit Trail" && currentUser.role === "Admin" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">System Activity & Agent Audit Logs</h2>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Agent / User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-4 text-xs font-mono text-slate-400">{log.timestamp}</td>
                        <td className="p-4 font-bold text-blue-600">{log.user}</td>
                        <td className="p-4"><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${log.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{log.role}</span></td>
                        <td className="p-4 font-semibold">{log.action}</td>
                        <td className="p-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== INVOICES VIEW (With Search & Export) ==================== */}
          {activeTab === "Invoices" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-xl font-bold">Invoices Ledger</h2>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search customer..."
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => exportToCSV("collectwise_invoices.csv", accounts)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    📥 Export Excel
                  </button>
                  <button type="button" onClick={() => setIsInvoiceModalOpen(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    + Add Invoice
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Assigned Agent</th>
                      <th className="p-4 text-right">Balance</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts
                      .filter((acc) => acc.customer.toLowerCase().includes(searchQuery.toLowerCase()) || acc.invoice.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((acc) => (
                        <tr key={acc.id}>
                          <td className="p-4 font-mono font-medium text-blue-600">{acc.invoice}</td>
                          <td className="p-4 font-semibold">{acc.customer}</td>
                          <td className="p-4 font-medium text-slate-500">{acc.assignedAgent}</td>
                          <td className="p-4 text-right font-bold">{formatMoney(acc.balance)}</td>
                          <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[acc.status]}`}>{acc.status}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== PAYMENTS VIEW (With Search & Export) ==================== */}
          {(activeTab === "Payments" || activeTab === "My Payments") && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-xl font-bold">{currentUser.role === "Admin" ? "All Payment Transactions" : "My Recorded Collections"}</h2>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search payment..."
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => exportToCSV("collectwise_payments.csv", currentUser.role === "Admin" ? payments : agentPayments)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    📥 Export Excel
                  </button>
                  <button type="button" onClick={() => setIsPaymentModalOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    + Record Payment
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Invoice Ref</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Collected By</th>
                      <th className="p-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentUser.role === "Admin" ? payments : agentPayments)
                      .filter((p) => p.customer.toLowerCase().includes(searchQuery.toLowerCase()) || p.invoice.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="p-4 text-slate-400">{p.date}</td>
                          <td className="p-4 font-semibold">{p.customer}</td>
                          <td className="p-4 font-mono text-slate-400">{p.invoice}</td>
                          <td className="p-4"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{p.method}</span></td>
                          <td className="p-4 font-bold text-blue-600">{p.collectedBy}</td>
                          <td className="p-4 text-right font-bold text-emerald-600">+{formatMoney(p.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <footer className="mt-12 text-center text-xs text-slate-400">
            CollectWise · Production-Ready Multi-User CRM System
          </footer>
        </div>
      </section>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Record Payment (Collector: {currentUser.name})</h3>
            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <input type="text" required value={payCustomer} onChange={(e) => setPayCustomer(e.target.value)} placeholder="Customer Name" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              <input type="text" value={payInvoice} onChange={(e) => setPayInvoice(e.target.value)} placeholder="Invoice Ref (e.g. INV-2026-001)" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              <input type="number" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount Paid (₱)" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none">
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Add New Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-4">
              <input type="text" required value={invCustomer} onChange={(e) => setInvCustomer(e.target.value)} placeholder="Customer Name" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              <input type="text" required value={invNumber} onChange={(e) => setInvNumber(e.target.value)} placeholder="Invoice Number" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              <input type="number" required value={invTotalAmount} onChange={(e) => setInvTotalAmount(e.target.value)} placeholder="Total Amount (₱)" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none" />
              {currentUser.role === "Admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assign to Agent</label>
                  <select value={invAgent} onChange={(e) => setInvAgent(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none">
                    {userList.filter(u => u.role === "Agent").map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white">Save Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}