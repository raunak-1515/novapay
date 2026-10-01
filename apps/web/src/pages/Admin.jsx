import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// We use the same env variable your other frontend components use
const AUTH_URL = import.meta.env.VITE_AUTH_API_URL;


export default function Admin() {
    const navigate = useNavigate();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    // Cross-Tab Sync: If another tab calls localStorage.clear(), instantly log out this tab too!
    useEffect(() => {
        const syncLogout = (e) => {
            if (e.key === "token" && !e.newValue) navigate("/login");
            if (e.key === null) navigate("/login"); // Catches localStorage.clear()
        };

        window.addEventListener("storage", syncLogout);
        return () => window.removeEventListener("storage", syncLogout);
    }, [navigate]);


    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const fetchPendingKyc = async () => {
        try {
            const res = await axios.get(`${AUTH_URL}/auth/admin/pending-kyc`);
            setPendingUsers(res.data.users);
        } catch (error) {
            console.error("Failed to fetch pending KYC", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingKyc();
    }, []);

    const handleApprove = async (userId) => {
        try {
            await axios.post(`${AUTH_URL}/auth/admin/verify-kyc`, { userId });
            setPendingUsers(pendingUsers.filter((u) => u._id !== userId));
            alert("KYC Approved successfully! WebSocket notification sent to user.");
        } catch (error) {
            console.error("Failed to approve KYC", error);
            alert("Failed to approve KYC");
        }
    };

    if (loading) return <div style={{ marginTop: '50px', textAlign: 'center' }}>Loading pending requests...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontWeight: 700, margin: 0, color: 'var(--text, #fff)' }}>
                    Admin Dashboard
                </h2>
                <button
                    onClick={handleLogout}
                    style={{ padding: '10px 20px', backgroundColor: '#ff5d7a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Logout
                </button>
            </div>

            {pendingUsers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: "center", borderRadius: '15px', border: '1px solid #555' }}>
                    <h3>All caught up!</h3>
                    <p>There are no pending KYC requests at this time.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pendingUsers.map((user) => (
                        <div key={user._id} style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                            {user.profilePictureUrl ? (
                                <img src={`http://127.0.0.1:4001${user.profilePictureUrl}`} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '20px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '20px', backgroundColor: '#ddd' }}></div>
                            )}

                            <div style={{ flexGrow: 1 }}>
                                <h4 style={{ margin: '0 0 5px 0' }}>{user.firstName} {user.lastName}</h4>
                                <p style={{ margin: '0 0 5px 0', color: '#666' }}>{user.email} • {user.phone}</p>
                                {user.kycDocumentUrl && (
                                    <a href={`http://127.0.0.1:4001${user.kycDocumentUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>
                                        View KYC Document
                                    </a>
                                )}
                            </div>
                            <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '5px 10px', borderRadius: '5px', marginRight: '20px', fontWeight: 'bold', fontSize: '12px' }}>
                                Pending
                            </span>
                            <button
                                onClick={() => handleApprove(user._id)}
                                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Approve KYC
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

