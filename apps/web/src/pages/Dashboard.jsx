import { useNavigate } from "react-router-dom";
import { paymentApi, walletApi } from "../api/client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Dashboard() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [topupMessage, setTopupMessage] = useState("");
  const [topupError, setTopupError] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [pageError, setPageError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");


  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiaryEmailInput, setBeneficiaryEmailInput] = useState("");
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("");
  const [beneficiaryMessage, setBeneficiaryMessage] = useState("");
  const [beneficiaryError, setBeneficiaryError] = useState("");
  const [isBeneficiaryLoading, setIsBeneficiaryLoading] = useState(false);
  const [isBeneficiariesLoading, setIsBeneficiariesLoading] = useState(true);

  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("userEmail");
  const currentUser = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const currentUserId = currentUser?.userId;

  const loadBalance = async () => {
    try {
      setIsBalanceLoading(true);
      const res = await walletApi.get("/wallet/balance");
      setBalance(res.data.balance);
    } catch (err) {
      setPageError(err.response?.data?.message || "Failed to load balance");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await paymentApi.get("/payments/history");
      setTransactions(res.data.transactions);
    } catch (error) {
      setPageError(
        error.response?.data?.message || "Failed to load transactions",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      setIsBeneficiariesLoading(true);
      const res = await paymentApi.get("/payments/beneficiaries");
      setBeneficiaries(res.data.beneficiaries);
    } catch (error) {
      setBeneficiaryError(
        error.response?.data?.message || "Failed to load beneficiaries",
      );
    } finally {
      setIsBeneficiariesLoading(false);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const res = await walletApi.get("/wallet/bank-accounts");
      setBankAccounts(res.data.bankAccounts);

      // Auto-select the primary bank account if it exists
      const primary = res.data.bankAccounts.find((acc) => acc.isPrimary);
      if (primary) {
        setSelectedBankAccountId(primary._id);

      } else if (res.data.bankAccounts.length > 0) {
        setSelectedBankAccountId(res.data.bankAccounts[0]._id);
      }


    } catch (error) {
      console.error("Failed to load bank accounts", error);

    }
  }



  useEffect(() => {
    loadBalance();
    loadTransactions();
    loadBeneficiaries();
    loadBankAccounts();
  }, []);

  const handleTopup = async (e) => {
    e.preventDefault();
    setTopupError("");
    setTopupMessage("");

    if (!topupAmount || Number(topupAmount) <= 0) {
      setTopupError("Enter a valid top up amount");
      return;
    }

    if (!selectedBankAccountId) {
      setTopupError("Please select a linked bank account to top up");
      return;
    }

    try {
      setIsTopupLoading(true);
      const res = await walletApi.post("/wallet/topup", {
        amount: Number(topupAmount),
        bankAccountId: selectedBankAccountId,
      });
      setTopupMessage(res.data.message);
      setTopupAmount("");
      await loadBalance();
    } catch (err) {
      setTopupError(err.response?.data?.message || "Top up failed");
    } finally {
      setIsTopupLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError("");
    setTransferMessage("");

    if (!recipientEmail || !transferAmount || Number(transferAmount) <= 0) {
      setTransferError("Enter a valid Email ID and amount");
      return;
    }

    try {
      setIsTransferLoading(true);
      await paymentApi.post("/payments/transfer", {
        recipientEmail,
        amount: Number(transferAmount),
        note: transferNote.trim(),
      });
      setTransferMessage("Transfer successful");
      setRecipientEmail("");
      setTransferAmount("");
      setTransferNote("");
      await loadBalance();
      await loadTransactions();
    } catch (err) {
      setTransferError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Transfer failed",
      );
    } finally {
      setIsTransferLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const successfulTransactions = transactions.filter(
    (txn) => txn.status === "SUCCESS",
  ).length;
  const totalCredits = transactions.filter(
    (txn) => txn.toUserId === currentUserId && txn.status === "SUCCESS",
  ).length;

  const totalDebits = transactions.filter(
    (txn) => txn.fromUserId === currentUserId && txn.status === "SUCCESS",
  ).length;

  const filteredTransactions = transactions.filter((txn) => {
    const matchesFilter =
      historyFilter === "all" ||
      (historyFilter === "failed" && txn.status === "FAILED") ||
      (historyFilter === "credits" &&
        txn.toUserId === currentUserId &&
        txn.status === "SUCCESS") ||
      (historyFilter === "debits" &&
        txn.fromUserId === currentUserId &&
        txn.status === "SUCCESS");

    if (!matchesFilter) return false;
    const searchValue = historySearch.trim().toLowerCase();
    if (!searchValue) return true;

    const searchableText = [
      txn.note || "",
      txn.status || "",
      txn.fromUserId || "",
      txn.toUserId || "",
      String(txn.amount || ""),
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(searchValue);
  });

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setBeneficiaryError("");
    setBeneficiaryMessage("");
    if (!beneficiaryEmailInput.trim()) {
      setBeneficiaryError("Enter a valid email address");
      return;
    }

    try {
      setIsBeneficiaryLoading(true);
      await paymentApi.post("/payments/beneficiaries", {
        beneficiaryEmail: beneficiaryEmailInput.trim(),
        nickname: beneficiaryNickname.trim(),
      });

      setBeneficiaryMessage("Beneficiary added successfully");
      setBeneficiaryEmailInput("");
      setBeneficiaryNickname("");
      await loadBeneficiaries();
    } catch (err) {
      setBeneficiaryError(
        err.response?.data?.message || "Failed to add beneficiary",
      );
    } finally {
      setIsBeneficiaryLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (id) => {
    try {
      setBeneficiaryError("");
      setBeneficiaryMessage("");
      await paymentApi.delete(`/payments/beneficiaries/${id}`);
      setBeneficiaryMessage("Beneficiary deleted successfully");
      await loadBeneficiaries();
    } catch (error) {
      setBeneficiaryError(
        error.response?.data?.message || "Failed to delete beneficiary",
      );
    }
  };

  const creditsVsDebitsData = [
    { name: "Credits", value: totalCredits },
    { name: "Debits", value: totalDebits },
  ];

  const chartColors = ["#27e0b3", "#ff5d7a"];

  const transactionsByDayMap = transactions.reduce((acc, txn) => {
    const day = new Date(txn.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const transactionsByDayData = Object.entries(transactionsByDayMap).map(
    ([day, count]) => ({
      day,
      count,
    }),
  );

  const failedTransactionsCount = transactions.filter(
    (txn) => txn.status === "FAILED",
  ).length;

  const handleDownloadStatement = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("NovaPay Statement", 14, 20);

    doc.setFontSize(11);
    doc.text(`User: ${userEmail || "Unknown User"}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    doc.text(`Wallet Balance: Rs. ${balance}`, 14, 44);
    doc.text(`Transactions: ${filteredTransactions.length}`, 14, 51);
    doc.text(`Credits: ${totalCredits}`, 14, 58);
    doc.text(`Debits: ${totalDebits}`, 14, 65);
    doc.text(`Failed Transfers: ${failedTransactionsCount}`, 14, 72);

    const tableRows = filteredTransactions.map((txn) => {
      const isCredit = txn.toUserId === currentUserId;
      const isFailed = txn.status === "FAILED";

      return [
        isFailed ? "Failed" : isCredit ? "Credit" : "Debit",
        isFailed
          ? `Rs. ${txn.amount}`
          : `${isCredit ? "+" : "-"}Rs. ${txn.amount}`,
        txn.status,
        txn.note || "-",
        new Date(txn.createdAt).toLocaleString(),
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [["Type", "Amount", "Status", "Note", "Date"]],
      body: tableRows,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [39, 224, 179],
        textColor: [7, 19, 31],
      },
    });

    doc.save("novapay-statement.pdf");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>NovaPay</span>
        </div>

        <button className="nav-link active">Dashboard</button>
        <button className="nav-link" onClick={() => navigate("/profile")}>
          Profile
        </button>
        <button className="nav-link" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1 className="page-title">Dashboard</h1>
          <div className="card" style={{ padding: "10px 14px" }}>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              Signed in as
            </div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              {userEmail || "User"}
            </div>
          </div>
        </div>

        <div className="grid kpi">
          <div className="card">
            <div className="kpi-label">Wallet Balance</div>
            <div className="kpi-value">
              {isBalanceLoading ? "Loading..." : `Rs. ${balance}`}
            </div>
            <div className="kpi-trend">Live wallet snapshot</div>
          </div>

          <div className="card">
            <div className="kpi-label">Successful Transactions</div>
            <div className="kpi-value">
              {isHistoryLoading ? "Loading..." : successfulTransactions}
            </div>
            <div className="kpi-trend">Completed payment actions</div>
          </div>

          <div className="card">
            <div className="kpi-label">Credits/Debits</div>
            <div className="kpi-value">
              {isHistoryLoading
                ? "Loading..."
                : `${totalCredits} / ${totalDebits}`}
            </div>
            <div className="kpi-trend">Incoming vs outgoing activity</div>
          </div>
        </div>
        <div className="grid two" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Transaction Volume</h3>
            <div style={{ height: 260, marginTop: 12 }}>
              {isHistoryLoading ? (
                <p className="muted">Loading chart...</p>
              ) : transactionsByDayData.length === 0 ? (
                <p className="muted">No transaction data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transactionsByDayData}>
                    <XAxis dataKey="day" stroke="#8ea0bf" />
                    <YAxis stroke="#8ea0bf" allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#27e0b3"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Credits vs Debits</h3>
            <div style={{ height: 260, marginTop: 12 }}>
              {isHistoryLoading ? (
                <p className="muted">Loading chart...</p>
              ) : creditsVsDebitsData.every((item) => item.value === 0) ? (
                <p className="muted">No credit/debit data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={creditsVsDebitsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {creditsVsDebitsData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        <div className="grid kpi" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="kpi-label">Failed Transfers</div>
            <div className="kpi-value">
              {isHistoryLoading ? "Loading..." : failedTransactionsCount}
            </div>
            <div className="kpi-trend">Unsuccessful payment attempts</div>
          </div>

          <div className="card">
            <div className="kpi-label">Saved Beneficiaries</div>
            <div className="kpi-value">
              {isBeneficiariesLoading ? "Loading..." : beneficiaries.length}
            </div>
            <div className="kpi-trend">Ready for quick transfers</div>
          </div>

          <div className="card">
            <div className="kpi-label">Recent Notes</div>
            <div className="kpi-value">
              {transactions.filter((txn) => txn.note && txn.note.trim()).length}
            </div>
            <div className="kpi-trend">Transactions with attached notes</div>
          </div>
        </div>

        <div className="grid two" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Top Up Wallet</h3>
            <form className="form" onSubmit={handleTopup}>
              {bankAccounts.length === 0 ? (
                <div className="muted" style={{ marginBottom: 12, fontSize: "0.9rem" }}>
                  No linked bank accounts found. Please link a bank account in your Profile first.
                </div>
              ) : (
                <select
                  className="input"
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  style={{
                    marginBottom: 12,
                    width: "100%",
                    background: "#0c1524",
                    color: "#fff",
                    border: "1px solid #233554",
                    padding: "10px",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.bankName} (•••• {acc.accountNumber.slice(-4)}) {acc.isPrimary ? "[Primary]" : ""}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="input"
                type="number"
                placeholder="Enter amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                disabled={bankAccounts.length === 0}
              />
              <button
                className="btn primary"
                type="submit"
                disabled={isTopupLoading || bankAccounts.length === 0}
              >
                {isTopupLoading ? "Adding..." : "Add Funds"}
              </button>
            </form>

            {topupMessage ? <p className="success">{topupMessage}</p> : null}
            {topupError ? <p className="error">{topupError}</p> : null}
          </div>

          <div className="card">
            <h3>Transfer Money</h3>
            <form className="form" onSubmit={handleTransfer}>
              <input
                className="input"
                type="email"
                placeholder="Recipient Email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <input
                className="input"
                type="text"
                placeholder="Add a note (optional)"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="Amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <button
                className="btn primary"
                type="submit"
                disabled={isTransferLoading}
              >
                {isTransferLoading ? "Sending..." : "Send Payment"}
              </button>
            </form>
            {transferMessage ? (
              <p className="success">{transferMessage}</p>
            ) : null}
            {transferError ? <p className="error">{transferError}</p> : null}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Saved Beneficiaries</h3>

          <form
            className="form"
            onSubmit={handleAddBeneficiary}
            style={{ marginTop: 12 }}
          >
            <input
              className="input"
              type="email"
              placeholder="Beneficiary Email"
              value={beneficiaryEmailInput}
              onChange={(e) => setBeneficiaryEmailInput(e.target.value)}
            />
            <input
              className="input"
              type="text"
              placeholder="Nickname (optional)"
              value={beneficiaryNickname}
              onChange={(e) => setBeneficiaryNickname(e.target.value)}
            />
            <button
              className="btn primary"
              type="submit"
              disabled={isBeneficiaryLoading}
            >
              {isBeneficiaryLoading ? "Adding..." : "Add Beneficiary"}
            </button>
          </form>
          {beneficiaryMessage ? (
            <p className="success">{beneficiaryMessage}</p>
          ) : null}
          {beneficiaryError ? (
            <p className="error">{beneficiaryError}</p>
          ) : null}
          {isBeneficiariesLoading ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Loading beneficiaries...
            </p>
          ) : beneficiaries.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              No saved beneficiaries yet.
            </p>
          ) : (
            <div className="grid" style={{ marginTop: 12 }}>
              {beneficiaries.map((beneficiary) => (
                <div
                  key={beneficiary._id}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {beneficiary.nickname || "Saved Beneficiary"}
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {beneficiary.beneficiaryEmail}
                    </div>
                  </div>

                  <div className="row">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setRecipientEmail(beneficiary.beneficiaryEmail);
                        setTransferError("");
                        setTransferMessage("");

                        if (beneficiary.nickname) {
                          setTransferNote(beneficiary.nickname);
                        }
                      }}
                    >
                      Use
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleDeleteBeneficiary(beneficiary._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3>Recent Transactions</h3>
            <button
              className="btn ghost"
              type="button"
              onClick={handleDownloadStatement}
            >
              Download Statement
            </button>
          </div>

          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setHistoryFilter("all")}
            >
              All
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setHistoryFilter("credits")}
            >
              Credits
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setHistoryFilter("debits")}
            >
              Debits
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setHistoryFilter("failed")}
            >
              Failed
            </button>
            <input
              className="input"
              type="text"
              placeholder="Search by note, amount, status, or ID"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ marginTop: 12 }}
            />
          </div>

          {isHistoryLoading ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Loading transactions...
            </p>
          ) : filteredTransactions.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              No transactions yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Counterparty</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => {
                    const isCredit = txn.toUserId === currentUserId;
                    const isFailed = txn.status === "FAILED";
                    const rawCounterparty = isCredit
                      ? txn.fromUserId
                      : txn.toUserId;
                    const counterparty =
                      rawCounterparty === currentUserId
                        ? "You"
                        : `${String(rawCounterparty).slice(0, 6)}...${String(rawCounterparty).slice(-4)}`;

                    return (
                      <tr
                        key={txn._id}
                        style={isFailed ? { opacity: 0.72 } : undefined}
                      >
                        <td>
                          <span
                            className={`badge ${isFailed ? "warn" : isCredit ? "ok" : "err"
                              }`}
                          >
                            {isFailed
                              ? "Failed"
                              : isCredit
                                ? "Credit"
                                : "Debit"}
                          </span>
                        </td>
                        <td>{counterparty}</td>
                        <td>
                          {isFailed ? (
                            <span className="amount-failed">
                              Rs. {txn.amount}
                            </span>
                          ) : isCredit ? (
                            <span className="amount-credit">
                              +Rs. {txn.amount}
                            </span>
                          ) : (
                            <span className="amount-debit">
                              -Rs. {txn.amount}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${txn.status === "SUCCESS"
                              ? "ok"
                              : txn.status === "FAILED"
                                ? "warn"
                                : "err"
                              }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td>{txn.note ? txn.note : "-"}</td>
                        <td>{new Date(txn.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pageError ? <p className="error">{pageError}</p> : null}
      </main>
    </div>
  );
}
