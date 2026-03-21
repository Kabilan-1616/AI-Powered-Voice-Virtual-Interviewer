import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SessionCard from "../components/SessionCard";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "sessions"), where("createdBy", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSessions(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const now = new Date();
  
  const getDisplayStatus = (s) => {
    if (s.status === "terminated") return "terminated";
    if (s.status === "completed") return "completed";
    
    // Check if expired
    if (s.endTime && now > new Date(s.endTime)) {
      return "expired";
    }
    return s.status;
  };

  const processedSessions = sessions.map(s => ({ ...s, displayStatus: getDisplayStatus(s) }));

  const stats = {
    total: processedSessions.length,
    pending: processedSessions.filter((s) => s.displayStatus === "pending").length,
    completed: processedSessions.filter((s) => s.displayStatus === "completed").length,
    in_progress: processedSessions.filter((s) => s.displayStatus === "in_progress").length,
    terminated: processedSessions.filter((s) => s.displayStatus === "terminated").length,
    expired: processedSessions.filter((s) => s.displayStatus === "expired").length,
  };

  const filtered = filter === "all" ? sessions : sessions.filter((s) => getDisplayStatus(s) === filter);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Professional Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">Interview Manager</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-sm text-gray-600 dark:text-gray-300">
                {user?.email}
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                Administrator
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Dashboard</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage and monitor all candidate interview sessions
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to="/admin/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Session
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          {[
            { 
              title: "Total Sessions", 
              value: stats.total, 
              icon: (
                <svg className="h-6 w-6 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              change: "+12%",
              changeType: "positive"
            },
            { 
              title: "Pending", 
              value: stats.pending, 
              icon: (
                <svg className="h-6 w-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              change: "+3%",
              changeType: "neutral"
            },
            { 
              title: "In Progress", 
              value: stats.in_progress, 
              icon: (
                <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ),
              change: "+5%",
              changeType: "positive"
            },
            { 
              title: "Completed", 
              value: stats.completed, 
              icon: (
                <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              change: "+8%",
              changeType: "positive"
            },
            { 
              title: "Terminated", 
              value: stats.terminated, 
              icon: (
                <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5A6.5 6.5 0 005.5 12a6.5 6.5 0 0013 0 6.5 6.5 0 00-6.5-6.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              change: "-1%",
              changeType: "neutral"
            },
            { 
              title: "Expired", 
              value: stats.expired, 
              icon: (
                <svg className="h-6 w-6 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              change: "0%",
              changeType: "neutral"
            }
          ].map((item, index) => (
            <div key={index} className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{item.title}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">{item.value}</div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'positive' ? 'text-green-600' : item.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'}`}>
                          {item.changeType !== 'neutral' && (
                            <svg className={`self-center flex-shrink-0 h-4 w-4 ${item.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              {item.changeType === 'positive' ? (
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                          <span className="sr-only">{item.changeType === 'positive' ? 'Increased' : 'Decreased'} by</span>
                          {item.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "all", name: "All Sessions", count: stats.total },
                { id: "pending", name: "Pending", count: stats.pending },
                { id: "in_progress", name: "In Progress", count: stats.in_progress },
                { id: "completed", name: "Completed", count: stats.completed },
                { id: "terminated", name: "Terminated", count: stats.terminated },
                { id: "expired", name: "Expired", count: stats.expired }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {tab.name}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    filter === tab.id
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sessions List */}
        <div>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading sessions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No sessions found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new interview session.
              </p>
              <div className="mt-6">
                <Link
                  to="/admin/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Session
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((session) => (
                <div key={session.id} className="h-full">
                  <SessionCard session={session} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
