import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, paymentApi, walletApi } from "../api/client";
import { io } from "socket.io-client";

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("userEmail");
  const currentUser = token ? JSON.parse(atob(token.split(".")[1])) : null;

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Bank Account states
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isPrimaryAccount, setIsPrimaryAccount] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSuccess, setBankSuccess] = useState("");


  const [profile, setProfile] = useState({});
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
    address: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [kycFile, setKycFile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [kycNotification, setKycNotification] = useState("");

  // Cross-Tab Sync: If another tab calls localStorage.clear(), instantly log out this tab too!
  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === "token" && !e.newValue) navigate("/login");
      if (e.key === null) navigate("/login"); // Catches localStorage.clear()
    };

    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, [navigate]);


  const fetchBankAccounts = async () => {
    try {
      const res = await walletApi.get("/wallet/bank-accounts");
      setBankAccounts(res.data.bankAccounts);


    } catch (error) {
      setBankError(error.response?.data?.message || "Failed to load bank accounts");

    }
  };


  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        const [balanceRes, historyRes, beneficirayRes, bankRes, profileRes] = await Promise.all([
          walletApi.get("/wallet/balance"),
          paymentApi.get("/payments/history"),
          paymentApi.get("/payments/beneficiaries"),
          walletApi.get("/wallet/bank-accounts"),
          authApi.get("/auth/profile") // <-- This fetches the profile now!
        ]);

        setBalance(balanceRes.data.balance);
        setTransactions(historyRes.data.transactions);
        setBeneficiaries(beneficirayRes.data.beneficiaries);
        setBankAccounts(bankRes.data.bankAccounts);

        const userData = profileRes.data.user;
        setProfile(userData);
        setProfileForm({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: userData.phone || "",
          dob: userData.dob ? userData.dob.split("T")[0] : "",
          address: userData.address || "",
        });

      } catch (err) {
        setPageError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);


  const handleLinkBankAccount = async (e) => {
    e.preventDefault();
    setBankError("");
    setBankSuccess("");

    if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) {
      setBankError("All bank account details are required");
      return;
    }
    try {
      setBankLoading(true);
      const res = await walletApi.post("/wallet/bank-accounts", {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        accountHolderName: accountHolderName.trim(),
        isPrimary: isPrimaryAccount,
      });
      setBankSuccess(res.data.message || "Bank account linked successfully!");

      //Clear inputs
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setAccountHolderName("");
      setIsPrimaryAccount(false);

      //Refresh list
      await fetchBankAccounts();


    } catch (error) {
      setBankError(error.response?.data?.message || "Failed to link bank account");

    } finally {
      setBankLoading(false);
    }

  };

  const handleDeleteBankAccount = async (id) => {
    setBankError("");
    setBankSuccess("");
    try {
      const res = await walletApi.delete(`/wallet/bank-accounts/${id}`);
      setBankSuccess(res.data.message || "Bank account unlinked successfully!");
      await fetchBankAccounts();
    } catch (err) {
      setBankError(err.response?.data?.message || "Failed to unlink bank account");
    }


  };


  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const successfulTransactions = transactions.filter(
    (txn) => txn.status === "SUCCESS",
  ).length;

  const totalCredits = transactions.filter(
    (txn) => txn.toUserId === currentUser?.userId && txn.status === "SUCCESS",
  ).length;

  const totalDebits = transactions.filter(
    (txn) => txn.fromUserId === currentUser?.userId && txn.status === "SUCCESS",
  ).length;

  const failedTransactions = transactions.filter(
    (txn) => txn.status === "FAILED",
  ).length;

  const recentTransactions = transactions.slice(0, 5);

  const latestNotedTransaction = transactions.find(
    (txn) => txn.note && txn.note.trim() !== "",
  );

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  useEffect(() => {
    if (!currentUser?.userId) return;
    // Connect to the Auth Service WebSocket Server
    const socket = io(import.meta.env.VITE_AUTH_API_URL);

    socket.on("connect", () => {
      console.log("Connected to WebSockets!");
      console.log("Sending User ID to backend:", currentUser?.userId);
      // Join our private room to listen for our own KYC updates
      socket.emit("join", currentUser.userId);
    });
    // Listen for the magic event from the Admin!
    socket.on("kyc_approved", (data) => {
      // 1. Show the awesome live notification!
      setKycNotification(data.message);

      // 2. Instantly update the UI state so it says "VERIFIED" without a page refresh!
      setProfile((prev) => ({
        ...prev,
        kycStatus: "VERIFIED"
      }));
      // Hide the notification after 5 seconds
      setTimeout(() => setKycNotification(""), 5000);
    });
    return () => socket.disconnect();
  }, [currentUser?.userId]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setProfileLoading(true);
      const res = await authApi.put("/auth/profile", profileForm);
      setProfile(res.data.user);
      alert("Profile updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) return alert("Please select an image first");
    try {
      setProfileLoading(true);
      const formData = new FormData();
      formData.append("file", avatarFile);
      const res = await authApi.post("/auth/profile/upload-avatar", formData);
      setProfile(res.data.user);
      setAvatarFile(null);
      alert("Avatar uploaded!");
    } catch (err) {
      alert("Upload failed");
    } finally {
      setProfileLoading(false);
    }
  };
  const handleUploadKyc = async (e) => {
    e.preventDefault();
    if (!kycFile) return alert("Please select a document first");
    try {
      setProfileLoading(true);
      const formData = new FormData();
      formData.append("file", kycFile);
      const res = await authApi.post("/auth/kyc/upload", formData);
      setProfile(res.data.user);
      setKycFile(null);
      alert("KYC Document submitted for review!");
    } catch (err) {
      alert("Upload failed");
    } finally {
      setProfileLoading(false);
    }
  };




  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>NovaPay</span>
        </div>

        <button className="nav-link" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button className="nav-link active">Profile</button>
        <button className="nav-link" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1 className="page-title">Profile</h1>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="muted">Account Holder</div>
              <h2 style={{ marginTop: 6 }}>{userEmail || "User"}</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Manage your NovaPay account, wallet activity, and saved
                beneficiaries.
              </p>
            </div>

            <div
              style={{
                minWidth: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 12,
              }}
            >
              <div style={{ textAlign: "right", marginBottom: 4 }}>
                <div className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Session Role</div>
                <span className="badge ok" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
                  {currentUser?.role || "USER"}
                </span>
              </div>

              <button
                className="btn ghost"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={handleThemeToggle}
              >
                Switch to {theme === "dark" ? "Light" : "Dark"} Theme
              </button>
            </div>
          </div>
        </div>

        {pageError ? <p className="error">{pageError}</p> : null}

        {/* --- 1. LIVE NOTIFICATION BANNER --- */}
        {kycNotification && (
          <div style={{ background: "#27e0b3", color: "#111", padding: 16, borderRadius: 8, fontWeight: "bold", marginBottom: 16 }}>
            🎉 {kycNotification}
          </div>
        )}

        {/* --- 2. THE AWESOME PROFILE EDITOR --- */}
        <div className="grid two" style={{ marginBottom: 16 }}>

          {/* LEFT COLUMN: Profile Settings */}
          <div className="card">
            <h3>Personal Information</h3>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{
                width: 80, minWidth: 80, height: 80, borderRadius: "50%", background: "#333",
                backgroundImage: profile.profilePictureUrl ? `url(${import.meta.env.VITE_AUTH_API_URL}${profile.profilePictureUrl})` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                flexShrink: 0, border: "2px solid var(--line)", position: "relative"
              }}>
                <label style={{
                  position: "absolute", bottom: -5, right: -5, background: "var(--accent)", color: "#000",
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                }}>
                  <input key={avatarFile ? "has-file" : "no-file"} type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} style={{ display: "none" }} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </label>
              </div>

              <form onSubmit={handleUploadAvatar} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {avatarFile && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text)", background: "rgba(0,0,0,0.2)", padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line)" }}>
                    {avatarFile.name}
                  </div>
                )}
                <button type="submit" className="btn ghost" disabled={profileLoading || !avatarFile}>Save Avatar</button>
              </form>
            </div>

            <form className="form" onSubmit={handleUpdateProfile}>
              <div className="grid two">
                <input className="input" placeholder="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                <input className="input" placeholder="Last Name" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
              </div>
              <input className="input" placeholder="Phone Number" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              <input className="input" type="date" value={profileForm.dob} onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })} />
              <textarea className="input" placeholder="Full Address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
              <button type="submit" className="btn primary" style={{ marginTop: 12 }} disabled={profileLoading}>Save Profile</button>
            </form>
          </div>

          {/* RIGHT COLUMN: KYC Verification */}
          <div className="card">
            <h3>KYC Verification</h3>
            <div style={{ marginTop: 16 }}>
              Status: <span className={`badge ${profile.kycStatus === 'VERIFIED' ? 'ok' : profile.kycStatus === 'PENDING' ? 'warn' : 'err'}`}>
                {profile.kycStatus || "NOT_SUBMITTED"}
              </span>
            </div>

            {profile.kycStatus !== 'VERIFIED' && (
              <form onSubmit={handleUploadKyc} style={{ marginTop: 24 }}>
                <label style={{ display: "block", border: "2px dashed var(--line)", padding: 32, borderRadius: 8, textAlign: "center", marginBottom: 16, cursor: "pointer", background: "rgba(255,255,255,0.02)", transition: "all 0.2s" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p className="muted" style={{ margin: 0, fontWeight: 600 }}>Click to Select Document (PDF, JPG)</p>
                  {kycFile && <p style={{ color: "var(--accent)", marginTop: 8, fontWeight: 700, fontSize: "0.95rem" }}>📄 {kycFile.name}</p>}
                  <input key={kycFile ? "has-file" : "no-file"} type="file" onChange={(e) => setKycFile(e.target.files[0])} style={{ display: "none" }} />
                </label>
                <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={profileLoading}>
                  Submit for Verification
                </button>
              </form>
            )}

            {profile.kycDocumentUrl && (
              <div style={{ marginTop: 16 }}>
                <a href={`${import.meta.env.VITE_AUTH_API_URL}${profile.kycDocumentUrl}`} target="_blank" rel="noreferrer" style={{ color: "#27e0b3" }}>
                  View Submitted Document
                </a>
              </div>
            )}
          </div>
        </div>


        <div className="grid two">
          <div className="card">
            <h3>Account Details</h3>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Email</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {userEmail || "-"}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted">Role</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {currentUser?.role || "USER"}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted">User ID</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {currentUser?.userId
                  ? `${String(currentUser.userId).slice(0, 8)}...${String(currentUser.userId).slice(-4)}`
                  : "-"}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Account Summary</h3>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Wallet Balance</div>
              <div className="kpi-value">
                {loading ? "Loading..." : `Rs. ${balance}`}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted">Successful Transactions</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {loading ? "Loading..." : successfulTransactions}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted">Saved Beneficiaries</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {loading ? "Loading..." : beneficiaries.length}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted">Latest Transfer Note</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {loading
                  ? "Loading..."
                  : latestNotedTransaction?.note || "No notes yet"}
              </div>
            </div>
          </div>
        </div>
        <div className="grid kpi" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="kpi-label">Credits</div>
            <div className="kpi-value">
              {loading ? "Loading..." : totalCredits}
            </div>
            <div className="kpi-trend">Successful incoming transactions</div>
          </div>

          <div className="card">
            <div className="kpi-label">Debits</div>
            <div className="kpi-value">
              {loading ? "Loading..." : totalDebits}
            </div>
            <div className="kpi-trend">Successful outgoing transactions</div>
          </div>

          <div className="card">
            <div className="kpi-label">Failed Attempts</div>
            <div className="kpi-value">
              {loading ? "Loading..." : failedTransactions}
            </div>
            <div className="kpi-trend">Unsuccessful payment attempts</div>
          </div>
        </div>
        <div className="grid two" style={{ marginTop: 16 }}>
          {/* Card 1: Link a Bank Account Form */}
          <div className="card">
            <h3>Link a Bank Account</h3>
            <form className="form" onSubmit={handleLinkBankAccount} style={{ marginTop: 12 }}>
              <input
                className="input"
                type="text"
                placeholder="Bank Name (e.g. HDFC)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <input
                className="input"
                type="text"
                placeholder="Account Holder Name"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
              <input
                className="input"
                type="text"
                placeholder="Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <input
                className="input"
                type="text"
                placeholder="IFSC Code"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isPrimaryAccount}
                  onChange={(e) => setIsPrimaryAccount(e.target.checked)}
                />
                Set as Primary Account
              </label>
              <button
                className="btn primary"
                type="submit"
                disabled={bankLoading}
                style={{ marginTop: 12 }}
              >
                {bankLoading ? "Linking..." : "Link Bank Account"}
              </button>
            </form>
            {bankSuccess ? <p className="success" style={{ marginTop: 8 }}>{bankSuccess}</p> : null}
            {bankError ? <p className="error" style={{ marginTop: 8 }}>{bankError}</p> : null}
          </div>

          {/* Card 2: Linked Bank Accounts List */}
          <div className="card">
            <h3>Linked Bank Accounts</h3>
            {loading ? (
              <p className="muted" style={{ marginTop: 12 }}>Loading bank accounts...</p>
            ) : bankAccounts.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>No bank accounts linked yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                {bankAccounts.map((acc) => (
                  <div
                    key={acc._id}
                    className="card"
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: acc.isPrimary ? "1px solid #27e0b3" : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        {acc.bankName}
                        {acc.isPrimary ? (
                          <span className="badge ok" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            Primary
                          </span>
                        ) : null}
                      </div>
                      <div className="muted" style={{ marginTop: 4, fontSize: "0.85rem" }}>
                        Acc: {acc.accountNumber.slice(0, 4) + "••••" + acc.accountNumber.slice(-4)} | IFSC: {acc.ifscCode}
                      </div>
                      <div className="muted" style={{ marginTop: 2, fontSize: "0.8rem" }}>
                        Holder: {acc.accountHolderName}
                      </div>
                    </div>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleDeleteBankAccount(acc._id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Recent Activity</h3>

          {loading ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Loading activity...
            </p>
          ) : recentTransactions.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              No recent activity available.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((txn) => {
                    const isCredit = txn.toUserId === currentUser?.userId;
                    const isFailed = txn.status === "FAILED";

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
                        <td>{new Date(txn.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
