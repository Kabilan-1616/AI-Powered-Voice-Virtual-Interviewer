import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  pending: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-700/40",
    dot: "bg-amber-500"
  },
  in_progress: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300", 
    border: "border-blue-200 dark:border-blue-700/40",
    dot: "bg-blue-500"
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    border: "border-green-200 dark:border-green-700/40",
    dot: "bg-green-500"
  },
  terminated: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-200 dark:border-red-700/40",
    dot: "bg-red-500"
  },
  expired: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-300 dark:border-gray-600",
    dot: "bg-gray-400"
  }
};

const LEVEL_LABEL = {
  fresher: "Fresher",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
};

export default function SessionCard({ session }) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const interviewLink = `${window.location.origin}/interview/${session.sessionId}`;

  function copyLink() {
    navigator.clipboard.writeText(interviewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete the session for ${session.candidateName}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "sessions", session.id));
    } catch (err) {
      alert("Failed to delete session. Please try again.");
      setDeleting(false);
    }
  }

  const date = new Date(session.createdAt).toLocaleDateString("en-US", {
    day: "numeric", 
    month: "short", 
    year: "numeric"
  });

  const now = new Date();
  const isExpired = session.endTime && now > new Date(session.endTime) && session.status !== "completed";

  // If a session was terminated, keep it as terminated. Otherwise, show expired if time has passed.
  let displayStatus = session.status;
  if (isExpired && session.status !== "terminated") {
    displayStatus = "expired";
  }

  const statusStyle = STATUS_STYLES[displayStatus] || STATUS_STYLES.pending;
  
  let statusText = session.status.charAt(0).toUpperCase() + session.status.slice(1);
  if (displayStatus === "in_progress") statusText = "In Progress";
  if (displayStatus === "expired") statusText = "Expired (Not Attended)";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {session.candidateName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {session.candidateEmail}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusStyle.dot}`}></span>
            {statusText}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
            </svg>
            {session.role}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {LEVEL_LABEL[session.experienceLevel] || session.experienceLevel}
          </span>
        </div>

        <div className="flex flex-col gap-1 mb-4 mt-2">
          {session.startTime && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Time: {new Date(session.startTime).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
              })} - {new Date(session.endTime).toLocaleString("en-US", {
                hour: "numeric", minute: "2-digit"
              })}
            </div>
          )}
          {!session.startTime && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Created: {date}
            </div>
          )}
        </div>

        {session.completedAt && session.status === "completed" && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
            <div className="flex items-center text-sm text-green-800 dark:text-green-300">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Completed on {new Date(session.completedAt).toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric",
                year: "numeric"
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {!isExpired && (session.status === "pending" || session.status === "in_progress") && (
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          )}
          
          {(session.status === "completed" || session.status === "terminated") && (
            <Link
              to={`/admin/report/${session.sessionId}`}
              className={`flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                session.status === "completed" 
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500" 
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Report
            </Link>
          )}
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
            title="Delete session"
          >
            {deleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
