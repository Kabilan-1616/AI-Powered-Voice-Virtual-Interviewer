// InterviewLanding.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const BACKEND = "http://localhost:5000";

export default function InterviewLanding() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [docId, setDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // New Camera Setup State
  const [setupComplete, setSetupComplete] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    async function fetchSession() {
      try {
        const q = query(collection(db, "sessions"), where("sessionId", "==", sessionId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setNotFound(true);
        } else {
          const docSnap = snapshot.docs[0];
          setSession(docSnap.data());
          setDocId(docSnap.id);
          if (docSnap.data().resumeText) setUploaded(true);
        }
      } catch (err) {
        setNotFound(true);
      }
      setLoading(false);
    }
    fetchSession();
  }, [sessionId]);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setUploadError("");
    } else {
      setUploadError("Please upload a PDF file.");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setUploadError("");
    } else {
      setUploadError("Please drop a PDF file.");
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await fetch(`${BACKEND}/parse-resume`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      await updateDoc(doc(db, "sessions", docId), {
        resumeText: data.text,
        status: "in_progress",
        resumeUploadedAt: new Date().toISOString(),
      });
      setUploaded(true);
    } catch (err) {
      setUploadError(err.message || "Something went wrong. Try again.");
    }
    setUploading(false);
  }

  async function enableTestCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(mediaStream);
      setCameraError("");
    } catch (err) {
      setCameraError("Camera/Microphone access denied. Please allow permissions to proceed.");
    }
  }

  function handleStartInterview() {
    if (cameraStream) {
       cameraStream.getTracks().forEach(track => track.stop());
    }
    navigate(`/interview/${sessionId}/start`);
  }

  // Auto-assign stream to video tag
  useEffect(() => {
    const videoObj = document.getElementById("setupVideo");
    if (videoObj && cameraStream) {
      videoObj.srcObject = cameraStream;
    }
  }, [cameraStream, uploaded, setupComplete]);

  // Clean up test stream if component unmounts
  useEffect(() => {
    return () => {
       if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
       }
    };
  }, [cameraStream]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Invalid Session</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This interview link doesn't exist or has expired.
          </p>
          <div className="mt-6">
             <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Time Constraint Logic
  const now = new Date();
  
  if (session?.startTime && now < new Date(session.startTime)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Interview Not Started</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please wait until the scheduled start time to access your interview.
          </p>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg inline-block">
            <p className="font-medium text-blue-800 dark:text-blue-300">
              Starts at: {new Date(session.startTime).toLocaleString()}
            </p>
          </div>
          <div className="mt-6">
             <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (session?.endTime && now > new Date(session.endTime) && session.status !== "completed") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Time Exceeded</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            The allowed time window for this interview has expired.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Expired on: {new Date(session.endTime).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  if (session?.status === "completed") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-green-50 dark:bg-green-900/20 px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Interview Completed</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Thank you for completing your interview
            </p>
          </div>
          
          <div className="px-6 py-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Candidate</span>
                <span className="font-medium text-gray-900 dark:text-white">{session.candidateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Position</span>
                <span className="font-medium text-gray-900 dark:text-white">{session.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Completed</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(session.completedAt).toLocaleDateString("en-US", { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            
            <div className="mt-8 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your results will be shared by the recruiting team shortly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (session?.status === "terminated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-8 text-center border-b border-red-100 dark:border-red-900/30">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/40">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-red-700 dark:text-red-400">Session Terminated</h2>
            <p className="mt-2 text-red-600 dark:text-red-300">
              This interview has been disabled.
            </p>
          </div>
          <div className="px-6 py-6 text-center">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Your interview was automatically terminated due to multiple violations of the anti-cheating policy (navigating away from the interview window).
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you believe this was in error, please contact the recruiting team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">Interview Portal</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Session: {sessionId.substring(0, 8)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Hello, {session.candidateName}!
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            You've been invited to interview for <span className="font-semibold text-blue-600 dark:text-blue-400">{session.role}</span>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
            {[
              { id: 'upload', title: 'Upload Resume', completed: uploaded },
              { id: 'setup', title: 'Device Setup', completed: setupComplete },
              { id: 'interview', title: 'Interview', completed: false },
              { id: 'results', title: 'Results', completed: false }
            ].map((step, index) => {
              // Active state logic
              let isActive = false;
              if (index === 0 && !uploaded) isActive = true;
              if (index === 1 && uploaded && !setupComplete) isActive = true;
              if (index === 2 && uploaded && setupComplete) isActive = true;

              return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full z-10 ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : isActive
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500'
                }`}>
                  {step.completed ? (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={`mt-2 text-sm font-medium ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Areas based on Step */}
        {!uploaded ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Upload Your Resume</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  The AI will personalize questions based on your experience
                </p>
              </div>

              <div className="mt-8">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="space-y-1 text-center">
                    <div className="flex justify-center text-gray-600 dark:text-gray-400">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none"
                      >
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="application/pdf"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF up to 10MB
                    </p>
                  </div>
                </div>
                
                {file && (
                  <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700/30 p-3">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                
                {uploadError && (
                  <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{uploadError}</h3>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/10 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Upload Resume"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : !setupComplete ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <div className="text-center">
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Device & Environment Setup</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Please test your camera and review the interview rules.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Camera Test Box */}
                <div>
                   <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Camera & Mic Check</h3>
                   <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 shadow-inner">
                     {cameraStream ? (
                       <video id="setupVideo" autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                     ) : (
                       <div className="text-center p-4">
                         <svg className="mx-auto h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                         </svg>
                         <button onClick={enableTestCamera} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition">
                           Enable Camera & Mic
                         </button>
                       </div>
                     )}
                   </div>
                   {cameraError && <p className="text-red-500 text-sm mt-2">{cameraError}</p>}
                   {cameraStream && <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Permissions granted successfully.</p>}
                </div>

                {/* Rules Box */}
                <div>
                   <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Important Rules</h3>
                   <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-5">
                      <h4 className="font-bold text-red-800 dark:text-red-300 flex items-center mb-2">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Anti-Cheating Policy
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                         This interview is continuously monitored for academic integrity. 
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-400 space-y-3 list-disc pl-4">
                         <li><strong>Do not leave this tab.</strong> Navigating away from the interview or minimizing the browser will be flagged as a strike.</li>
                         <li><strong>3-Strike Rule:</strong> Upon your third tab-switch violation, the interview will be <strong>permanently terminated</strong> and your session will be discarded.</li>
                         <li>You must test your camera before proceeding to ensure monitoring logic detects you.</li>
                      </ul>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/10 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSetupComplete(true)}
                  disabled={!cameraStream}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  I Understand, Continue
                  <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Ready for Your Interview</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Your environment is set up and working perfectly.
                </p>
              </div>

              <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200">Interview Details</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-300">Position</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">{session.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-300">Experience Level</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100 capitalize">
                      {session.experienceLevel.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Final Reminders</h3>
                <ul className="mt-4 space-y-3">
                  {[
                    "Speak clearly into the microphone.",
                    "Maintain eye contact with the AI interviewer component when possible.",
                    "Do not switch tabs. Good luck!"
                  ].map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="ml-3 text-gray-600 dark:text-gray-400">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/10 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end">
                <button
                  onClick={handleStartInterview}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-xl transition-all"
                >
                  Enter Interview Room
                  <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
