import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FiCameraOff, FiAlertTriangle } from "react-icons/fi"; // We will install this if not present, but for now we'll use SVG or tailwind if we can't

const BACKEND = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [docId, setDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [mode, setMode] = useState("voice");
  const [textInput, setTextInput] = useState("");
  const [micSupported, setMicSupported] = useState(true);

  // New states for Camera UI and Monitoring
  const [stream, setStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarningToast, setShowWarningToast] = useState(false);

  const bottomRef = useRef(null);
  const videoRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const listeningActiveRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef("");

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    async function fetchSession() {
      const q = query(collection(db, "sessions"), where("sessionId", "==", sessionId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setSession(data);
        setDocId(docSnap.id);
        
        if (data.status === "terminated") setIsTerminated(true);
        if (data.status === "completed") setIsComplete(true);
      }
      setLoading(false);
    }
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) { setMicSupported(false); setMode("text"); }
  }, [browserSupportsSpeechRecognition]);

  // --- Camera & Monitoring Setup ---
  useEffect(() => {
    if (!docId || isTerminated || isComplete) return;
    
    let activeStream = null;
    
    // Start camera
    async function enableCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(mediaStream);
        setCameraEnabled(true);
        activeStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraEnabled(false);
      }
    }

    // Monitoring: Tab Activity (3 Strikes Policy)
    const handleVisibilityChange = async () => {
      if (document.hidden && !isComplete && !isTerminated) {
        setWarnings(w => {
           const newWarnings = w + 1;
           if (newWarnings >= 3) triggerTermination();
           else {
             setShowWarningToast(true);
             setTimeout(() => setShowWarningToast(false), 4000);
           }
           return newWarnings;
        });
      }
    };

    const handleBlur = async () => {
      if (!isComplete && !isTerminated) {
        setWarnings(w => {
           const newWarnings = w + 1;
           if (newWarnings >= 3) triggerTermination();
           else {
             setShowWarningToast(true);
             setTimeout(() => setShowWarningToast(false), 4000);
           }
           return newWarnings;
        });
      }
    };

    async function triggerTermination() {
      setIsTerminated(true);
      setShowWarningToast(false);
      SpeechRecognition.stopListening();
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      try {
        await updateDoc(doc(db, "sessions", docId), { 
           status: "terminated",
           terminatedAt: new Date().toISOString(),
           warningsCount: 3,
           terminationReason: "Cheating Detected (Tab Switches)"
        });
      } catch (err) { console.error("Failed saving termination state", err); }
    }

    enableCamera();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [docId, isTerminated, isComplete]);

  // Auto-assign stream to video tag when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => { if (session && messages.length === 0) askAI([]); }, [session, messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  useEffect(() => {
    if (!listening || !listeningActiveRef.current) return;
    if (transcript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = transcript;
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (transcript.trim() && listeningActiveRef.current) {
        SpeechRecognition.stopListening();
        listeningActiveRef.current = false;
        handleVoiceSend(transcript.trim());
      }
    }, 3000);
  }, [transcript, listening]);

  function speakText(text, onDone) {
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("natural")) || voices.find((v) => v.lang === "en-US") || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); if (onDone) onDone(); };
    utterance.onerror = () => { setIsSpeaking(false); if (onDone) onDone(); };
    synthRef.current.speak(utterance);
  }

  function startListening() {
    resetTranscript();
    lastTranscriptRef.current = "";
    listeningActiveRef.current = true;
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  }

  function stopListening() {
    listeningActiveRef.current = false;
    SpeechRecognition.stopListening();
  }

  async function generateReport(finalMessages) {
    try {
      const response = await fetch(`${BACKEND}/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalMessages, role: session.role, experienceLevel: session.experienceLevel, candidateName: session.candidateName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await updateDoc(doc(db, "sessions", docId), { 
        report: data.report,
        warningsCount: warnings // Save warnings to session
      });
    } catch (err) { console.error("Report generation failed:", err); }
  }

  async function askAI(currentMessages) {
    setThinking(true);
    try {
      const response = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages, resumeText: session.resumeText, role: session.role, experienceLevel: session.experienceLevel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const aiMessage = { role: "assistant", content: data.reply };
      const updatedMessages = [...currentMessages, aiMessage];
      setMessages(updatedMessages);
      setQuestionCount((c) => c + 1);
      if (data.isComplete) {
        setIsComplete(true);
        await updateDoc(doc(db, "sessions", docId), { 
          transcript: updatedMessages, 
          status: "completed", 
          completedAt: new Date().toISOString(),
          warningsCount: warnings // Save warnings to session
        });
        speakText(data.reply, null);
        generateReport(updatedMessages);
      } else {
        if (mode === "voice") speakText(data.reply, () => { if (!isComplete) startListening(); });
        else speakText(data.reply, null);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble connecting. Please refresh and try again." }]);
    }
    setThinking(false);
  }

  async function handleVoiceSend(spokenText) {
    if (!spokenText || thinking || isComplete) return;
    const userMessage = { role: "user", content: spokenText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    resetTranscript();
    await askAI(updatedMessages);
  }

  async function handleTextSend() {
    const trimmed = textInput.trim();
    if (!trimmed || thinking || isComplete) return;
    const updatedMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(updatedMessages);
    setTextInput("");
    await askAI(updatedMessages);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); }
  }

  function handleMicClick() {
    if (listening) stopListening();
    else if (!thinking && !isSpeaking && !isComplete) startListening();
  }

  function getStatusLabel() {
    if (thinking) return { text: "Thinking...", color: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-600 dark:bg-yellow-400" };
    if (isSpeaking) return { text: "Interviewer speaking...", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-600 dark:bg-blue-400" };
    if (listening) return { text: "Listening... speak now", color: "text-green-600 dark:text-green-400", dot: "bg-green-600 dark:bg-green-400" };
    if (isComplete) return { text: "Interview complete", color: "text-green-600 dark:text-green-400", dot: "bg-green-600 dark:bg-green-400" };
    return { text: "Ready", color: "text-gray-500 dark:text-gray-400", dot: "bg-gray-500 dark:bg-gray-600" };
  }

  const status = getStatusLabel();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading interview session...</p>
        </div>
      </div>
    );
  }

  if (isTerminated) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Urgent pulsating background */}
        <div className="absolute inset-0 bg-red-900/10 dark:bg-red-950/20 animate-pulse"></div>
        <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-2 border-red-500/50 p-8 md:p-12 text-center relative z-10">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/30 mb-8 border-4 border-red-500/30">
            <svg className="h-12 w-12 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5A6.5 6.5 0 005.5 12a6.5 6.5 0 0013 0 6.5 6.5 0 00-6.5-6.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-red-700 dark:text-red-500 mb-4 tracking-tight">Interview Terminated</h1>
          <p className="text-xl text-gray-800 dark:text-gray-300 font-medium mb-6">
            Suspicious Activity Detected
          </p>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-6 text-left mb-8 border border-red-100 dark:border-red-900/30">
             <p className="text-red-800 dark:text-red-400 text-sm leading-relaxed">
               This interview has been automatically closed because our proctoring system recorded <strong>3 severe violations</strong> of our anti-cheating policy (navigating away from the interview tab or minimizing the window). 
               <br/><br/>
               The session recording and transcript have been permanently locked and flagged for review by the recruiting team.
             </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="w-full inline-flex justify-center items-center px-6 py-4 border border-transparent text-lg font-bold rounded-xl shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all active:scale-95"
          >
            Return to Dashboard
          </button>
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
            This interview session could not be found. Please check the link or contact support.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans overflow-hidden">
      
      {/* Toast Warning */}
      {showWarningToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 animate-bounce">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5.5A6.5 6.5 0 005.5 12a6.5 6.5 0 0013 0 6.5 6.5 0 00-6.5-6.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col">
            <span className="font-bold">Warning: Tab Switch Detected!</span>
            <span className="text-sm opacity-90">Please do not leave the interview screen.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI Interview</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.role} · {session.candidateName}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {micSupported && (
                <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => { synthRef.current.cancel(); setMode("voice"); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${mode === "voice" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    Voice
                  </button>
                  <button
                    onClick={() => { SpeechRecognition.stopListening(); setMode("text"); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${mode === "text" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    Text
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Question {questionCount}
                </span>
                
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${isComplete ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" : "bg-blue-100/50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50"}`}>
                  <span className={`w-2 h-2 rounded-full ${isComplete ? "" : "animate-pulse"} ${isComplete ? "bg-green-600 dark:bg-green-400" : "bg-blue-500 dark:bg-blue-400"}`}></span>
                  <span>{isComplete ? "Completed" : "Live"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area (Split layout + floating stuff outside) */}
      <div className="flex-1 mt-16 flex flex-col relative overflow-hidden">
        
        {/* Status Bar */}
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 py-2.5 z-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${status.dot} animate-pulse`}></span>
                <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
              </div>
              {mode === "voice" && listening && (
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-6 bg-red-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">Recording...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating User Camera Video */}
        <div className="absolute right-6 top-20 z-30 flex flex-col gap-3 pointer-events-none w-48 sm:w-64 max-h-[calc(100vh-160px)] z-50">
          {/* Main User Video */}
          <div className={`relative w-full h-36 sm:h-48 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-2 ${listening ? 'ring-green-500 shadow-green-500/20' : 'ring-gray-700/50 shadow-black/40'} transition-all duration-300 pointer-events-auto`}>
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900/80 backdrop-blur-sm">
                <FiCameraOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-medium">Camera Disabled</span>
              </div>
            )}
            
            {/* Monitor indicator */}
            <div className="absolute top-3 left-3 flex space-x-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider bg-black/50 backdrop-blur-md`}>
                You
              </span>
              {warnings > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-500/80 backdrop-blur-md animate-pulse">
                  {warnings} Alerts <FiAlertTriangle className="inline w-3 h-3 ml-1 mb-0.5"/>
                </span>
              )}
            </div>
            {/* Recording indicator */}
            {listening && mode === "voice" && (
              <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] text-white font-medium uppercase tracking-wider">Rec</span>
              </div>
            )}
          </div>
          
          {/* AI Avatar Orb visualization */}
          <div className="relative w-full h-24 bg-gray-900 rounded-2xl flex flex-col items-center justify-center shadow-2xl ring-2 ring-gray-700/50 overflow-hidden pointer-events-auto">
             <div className="absolute text-[10px] font-bold text-white/50 top-3 left-3 uppercase tracking-wider w-full">AI Interviewer</div>
             <div className="flex items-center justify-center h-full w-full mt-4">
                {isSpeaking ? (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                    <div className="absolute w-10 h-10 bg-blue-400 rounded-full opacity-40 animate-pulse"></div>
                    <div className="relative w-8 h-8 bg-blue-300 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.8)]"></div>
                  </div>
                ) : thinking ? (
                  <div className="relative flex Items-center justify-center space-x-2 mt-4">
                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2.5 h-2.5 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-600 rounded-full opacity-50 relative top-2"></div>
                )}
             </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto w-full relative z-10 pb-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:pr-72">
            <div className="space-y-6">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="text-center py-12 px-6 bg-white/40 dark:bg-gray-800/40 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg mb-6 shadow-blue-500/30">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Ready to Begin</h2>
                  <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">
                    Your AI interview for <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">{session?.role}</span> is ready to start.
                  </p>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                  <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm backdrop-blur-sm"
                      : "bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 text-gray-800 dark:text-gray-100 rounded-bl-sm backdrop-blur-xl"
                  }`}>
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Transcript */}
              {listening && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-2xl rounded-br-none px-4 py-3 italic shadow-sm">
                    {transcript}...
                  </div>
                </div>
              )}

              {/* Completion Message */}
              {isComplete && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-3xl p-8 text-center shadow-sm">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Interview Complete</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                    Thank you for completing the interview. Your responses have been recorded.
                  </p>
                  <button
                    onClick={() => navigate(`/admin/report/${docId}`)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-md font-bold rounded-xl transition-all shadow-lg shadow-green-500/30"
                  >
                    View Evaluation Report
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Input Area (Floating at bottom for modern feel) */}
        {!isComplete && (
          <div className="absolute bottom-6 left-0 w-full z-20 pointer-events-none">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 md:pr-72">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl p-4 sm:p-6 pointer-events-auto">
                {mode === "voice" ? (
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={handleMicClick}
                      disabled={thinking || isSpeaking}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300 disabled:opacity-40 disabled:scale-95 group ${
                        listening
                          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105"
                      }`}
                    >
                      {listening && (
                        <div className="absolute inset-0 rounded-full border-4 border-rose-400/50 animate-ping"></div>
                      )}
                      <span className="relative z-10">{listening ? "⏹️" : "🎤"}</span>
                    </button>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
                      {listening ? "Speak now... Submits after 3s of silence" : "Tap the microphone to speak"}
                    </p>
                  </div>
                ) : (
                  <div className="flex space-x-3 items-end">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={thinking}
                      placeholder="Type your answer here..."
                      className="flex-1 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white backdrop-blur-xl transition-all"
                      rows={2}
                    />
                    <button
                      onClick={handleTextSend}
                      disabled={!textInput.trim() || thinking}
                      className="h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white text-[15px] font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 ml-1 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
