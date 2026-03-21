import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const RECOMMENDATION_STYLES = {
  "Strongly Recommend": {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30",
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700/40"
  },
  "Recommend": {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30",
    text: "text-blue-700 dark:text-blue-300", 
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700/40"
  },
  "Neutral": {
    container: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700/40"
  },
  "Do Not Recommend": {
    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700/40"
  }
};

function ScoreBar({ label, score }) {
  const percentage = (score / 10) * 100;
  const getColorClass = () => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    if (score >= 4) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreColor = () => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-blue-600 dark:text-blue-400";
    if (score >= 4) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`text-sm font-semibold ${getScoreColor()}`}>{score}/10</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-700 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function SessionReport() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");

  useEffect(() => {
    async function fetchSession() {
      const q = query(collection(db, "sessions"), where("sessionId", "==", sessionId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) setSession(snapshot.docs[0].data());
      setLoading(false);
    }
    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Session Not Found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This interview report could not be found. The session may have been deleted.
          </p>
          <Link 
            to="/admin" 
            className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const report = session.report;
  const recommendationStyle = RECOMMENDATION_STYLES[report?.recommendation] || RECOMMENDATION_STYLES["Neutral"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">Interview Report</span>
              </div>
            </div>
            <Link 
              to="/admin" 
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Candidate Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.candidateName}</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">{session.candidateEmail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                  {session.role}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
                  {session.experienceLevel} Level
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {new Date(session.completedAt).toLocaleDateString("en-US", { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            
            {session.status === "terminated" ? (
              <div className="mt-4 lg:mt-0 lg:text-right">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700/40">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5A6.5 6.5 0 005.5 12a6.5 6.5 0 0013 0 6.5 6.5 0 00-6.5-6.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Terminated
                </div>
              </div>
            ) : report ? (
              <div className="mt-4 lg:mt-0 lg:text-right">
                <div className={`text-4xl font-bold ${recommendationStyle.text}`}>
                  {report.overallScore}
                  <span className="text-xl text-gray-500 dark:text-gray-400">/10</span>
                </div>
                <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${recommendationStyle.badge}`}>
                  {report.recommendation}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'report', name: 'Evaluation Report', icon: '📊' },
              { id: 'transcript', name: 'Full Transcript', icon: '💬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Report Content */}
        {activeTab === "report" && (
          <>
            {session.status === "terminated" ? (
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50 p-8 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/40 rounded-full p-3 mr-4">
                    <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5A6.5 6.5 0 005.5 12a6.5 6.5 0 0013 0 6.5 6.5 0 00-6.5-6.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-800 dark:text-red-300">Interview Terminated</h2>
                    <p className="text-red-600 dark:text-red-400 mt-1">
                      Reason: {session.terminationReason || "Suspicious Activity Detected"}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900/30">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Proctoring Flags</h3>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Policy Violations</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{session.warningsCount || 3} Strikes (Tab Switches)</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600 dark:text-gray-400">Termination Time</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {session.terminatedAt ? new Date(session.terminatedAt).toLocaleString() : "Unknown"}
                    </span>
                  </div>
                  <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                    Because this session was terminated early due to cheating detection, a full AI evaluation report cannot be generated. You can still review the partial transcript of the conversation leading up to the termination.
                  </div>
                </div>
              </div>
            ) : !report ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Generating Report</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  The AI is analyzing the interview. This usually takes 15-30 seconds.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className={`${recommendationStyle.container} rounded-xl p-6 border`}>
                  <div className="flex items-center mb-4">
                    <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Executive Summary</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{report.summary}</p>
                </div>

                {/* Score Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Performance Scores</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ScoreBar label="Technical Knowledge" score={report.technicalScore} />
                    <ScoreBar label="Communication Skills" score={report.communicationScore} />
                    <ScoreBar label="Confidence & Presentation" score={report.confidenceScore} />
                    <ScoreBar label="Overall Assessment" score={report.overallScore} />
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center mb-4">
                      <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Key Strengths</h3>
                    </div>
                    <ul className="space-y-3">
                      {report.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center mb-4">
                      <svg className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Areas for Improvement</h3>
                    </div>
                    <ul className="space-y-3">
                      {report.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-gray-700 dark:text-gray-300">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Topics Covered */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Topics Discussed</h3>
                  <div className="flex flex-wrap gap-2">
                    {report.topicsCovered.map((topic, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detailed Feedback */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Detailed Analysis</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{report.detailedFeedback}</p>
                </div>

                {/* Hiring Notes */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30 p-6">
                  <div className="flex items-center mb-4">
                    <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">Recommendation Notes</h3>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">{report.hiringNotes}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Transcript Tab */}
        {activeTab === "transcript" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Interview Transcript</h3>
            </div>
            <div className="p-6 space-y-6">
              {!session.transcript || session.transcript.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4">No transcript available for this session.</p>
                </div>
              ) : (
                session.transcript.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                    }`}>
                      <div className="text-sm leading-relaxed">{message.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
