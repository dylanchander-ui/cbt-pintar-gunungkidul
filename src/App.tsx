import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  BookOpen, User, Play, CheckCircle, Plus, ArrowRight, ArrowLeft, 
  LogOut, Award, ShieldCheck, ListChecks, Wifi, Settings,
  Layers, BrainCircuit, Sparkles, Loader2, Download, Key, Timer, Image as ImageIcon, Trash2, Pencil, FileSpreadsheet, Edit3, Upload, CheckSquare, AlertTriangle, RefreshCw
} from 'lucide-react';

let firebaseConfig;
try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
  } else {
    throw new Error("Sandbox env");
  }
} catch (error) {
  firebaseConfig = {
    VITE_FIREBASE_API_KEY=AIzaSyDVlypKQ68GsrORecfUGf3MtOvYKQ6EeUE
VITE_FIREBASE_AUTH_DOMAIN=cbt-sekolah-2b11c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cbt-sekolah-2b11c
VITE_FIREBASE_STORAGE_BUCKET=cbt-sekolah-2b11c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=947076059698
VITE_FIREBASE_APP_ID=1:947076059698:web:b52bcb7605b0d3884b222b
VITE_FIREBASE_MEASUREMENT_ID=G-4D6SJ4E0FB
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cbt-sd-public';

function MainApp() {
  const [hasError, setHasError] = useState(false);
  const [userAuth, setUserAuth] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [teacherAccounts, setTeacherAccounts] = useState([]); 
  const [loadingDb, setLoadingDb] = useState(true);
  
  const [view, setView] = useState('home'); 
  const [currentUser, setCurrentUser] = useState(null); 
  
  const [teacherLoginMode, setTeacherLoginMode] = useState('login'); 
  const [inputToken, setInputToken] = useState('');
  const [inputPin, setInputPin] = useState('');

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [finalScore, setFinalScore] = useState({ score: 0, hasEssay: false });
  const [timeLeft, setTimeLeft] = useState(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [forceSubmitState, setForceSubmitState] = useState(false);

  const [quizMeta, setQuizMeta] = useState({
    sekolah: '', kelas: 'Kelas 1 SD/MI', semester: 'Ganjil', jenisUjian: 'ASAT', jenisUjianManual: '', namaBab: '', tanggal: '', mapel: 'Matematika', 
    mapelManual: '', kognitif: 'Campuran', tipeSoal: 'Campuran', jumlahSoal: 5, jumlahSoalBergambar: 0, durasi: 60,
    kopSekolah: '', kisiKisiManual: '', kurikulum: 'Kurikulum Merdeka', kurikulumManual: '', kelasManual: ''
  });
  
  const defaultQuestion = { 
    type: 'pg', text: '', options: ['', '', '', ''], correct: 0, correctKompleks: [], pairs: [{left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}], 
    benarSalahAnswer: 0, imageUrl: '', imagePrompt: '', essayAnswer: '', indikator: '', kognitif: 'C3' 
  };
  
  const [newQuizQuestions, setNewQuizQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false); 

  const [gradingResult, setGradingResult] = useState(null);
  const [inputEssayScores, setInputEssayScores] = useState({});
  const [toast, setToast] = useState(null);
  const [filterQuizId, setFilterQuizId] = useState('ALL');

  const playWarningSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Menggunakan gelombang 'square' untuk efek alarm/peringatan yang mengganggu
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nada tinggi
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3); // Menurun
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context tidak didukung atau diblokir browser.", e);
    }
  };

  useEffect(() => {
    const handleError = (error) => {
      console.error("Aplikasi menangkap error:", error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUserAuth);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userAuth) return;
    const quizzesRef = collection(db, 'artifacts', appId, 'public', 'data', 'quizzes');
    const unsubQ = onSnapshot(quizzesRef, (snapshot) => {
      const q = []; snapshot.forEach(doc => q.push({ id: doc.id, ...doc.data() }));
      q.sort((a, b) => b.createdAt - a.createdAt); setQuizzes(q); setLoadingDb(false);
    });
    const resultsRef = collection(db, 'artifacts', appId, 'public', 'data', 'results');
    const unsubR = onSnapshot(resultsRef, (snapshot) => {
      const r = []; snapshot.forEach(doc => r.push({ id: doc.id, ...doc.data() }));
      r.sort((a, b) => b.timestamp - a.timestamp); setResults(r);
    });
    const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'teachers');
    const unsubA = onSnapshot(accountsRef, (snapshot) => {
      const a = []; snapshot.forEach(doc => a.push({ id: doc.id, ...doc.data() }));
      setTeacherAccounts(a);
    });
    return () => { unsubQ(); unsubR(); unsubA(); };
  }, [userAuth]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (view === 'student_test' && document.hidden) {
        // Bunyikan suara peringatan saat siswa keluar tab
        playWarningSound();
        
        setCheatWarnings(prev => {
          const newWarn = prev + 1;
          if (newWarn >= 3) {
             setForceSubmitState(true);
          } else {
             // Mengganti alert browser dengan custom pop-up toast agar tidak nge-block
             showToast(`⚠️ PERINGATAN KECURANGAN (${newWarn}/3): Terdeteksi keluar dari layar ujian!`, 'error');
          }
          return newWarn;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [view]);

  useEffect(() => {
    let timerId;
    if (view === 'student_test' && timeLeft !== null && timeLeft > 0 && !forceSubmitState) {
      timerId = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (view === 'student_test' && (timeLeft === 0 || forceSubmitState)) {
      if (forceSubmitState) { 
          showToast("Batas Pelanggaran Terlampaui! Ujian dikumpulkan paksa.", "error"); 
          setForceSubmitState(false); 
      } else { 
          showToast("Waktu Habis!", "error"); 
      }
      submitQuiz(); setTimeLeft(null);
    }
    return () => clearInterval(timerId);
  }, [view, timeLeft, forceSubmitState]);

  // Anti-Cheat Encrypted LocalStorage
  useEffect(() => {
    if (view === 'student_test' && activeQuiz && currentUser) {
      const payload = JSON.stringify({
        studentName: currentUser.name, roomCode: currentUser.roomCode, cheatWarnings,
        activeQuiz, answers: studentAnswers, currentIndex: currentQuestionIndex, timeLeft
      });
      localStorage.setItem('cbt_ongoing_exam_v2', btoa(encodeURIComponent(payload)));
    }
  }, [view, activeQuiz, currentUser, studentAnswers, currentQuestionIndex, timeLeft, cheatWarnings]);

  const handleLogout = () => { setCurrentUser(null); setActiveQuiz(null); setView('home'); };

  const handleTeacherAuth = async (e) => {
    e.preventDefault();
    const cleanToken = inputToken.trim().toUpperCase();
    const cleanPin = inputPin.trim();

    if (!cleanToken || !cleanPin) {
      showToast("Token dan PIN wajib diisi!", "error"); return;
    }

    if (teacherLoginMode === 'login') {
      const foundAccount = teacherAccounts.find(acc => acc.token === cleanToken && acc.pin === cleanPin);
      if (foundAccount) {
        setCurrentUser({ role: 'teacher', name: 'Guru Kelas', roomCode: cleanToken });
        setView('teacher_dashboard'); showToast("Berhasil Masuk!", "success");
      } else showToast("Token atau PIN salah!", "error");
    } else {
      const isExist = teacherAccounts.find(acc => acc.token === cleanToken);
      if (isExist) { showToast("Token ini sudah terpakai. Coba angka lain.", "error"); return; }
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'teachers'), { token: cleanToken, pin: cleanPin, createdAt: Date.now() });
        setCurrentUser({ role: 'teacher', name: 'Guru Kelas', roomCode: cleanToken });
        setView('teacher_dashboard'); showToast("Ruang Baru Berhasil Dibuat!", "success");
      } catch (err) { showToast("Gagal mendaftar. Periksa koneksi.", "error"); }
    }
  };

  const requestFullscreen = () => { try { const docEl = document.documentElement; if (docEl.requestFullscreen) docEl.requestFullscreen().catch(e=>e); } catch(e){} };
  const exitFullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen().catch(e=>e); } catch(e){} };

  const startQuiz = (quiz) => {
    try {
      const savedRaw = localStorage.getItem('cbt_ongoing_exam_v2');
      if (savedRaw) {
        const saved = JSON.parse(decodeURIComponent(atob(savedRaw)));
        if (saved && saved.studentName === currentUser.name && saved.activeQuiz.id === quiz.id) {
          setActiveQuiz(saved.activeQuiz); setCurrentQuestionIndex(saved.currentIndex || 0);
          setStudentAnswers(saved.answers || {}); setTimeLeft(saved.timeLeft); setCheatWarnings(saved.cheatWarnings || 0);
          setView('student_test'); showToast("Melanjutkan ujian...", "success"); requestFullscreen(); return;
        }
      }
    } catch(err) {}

    // Keamanan: Buang Kunci Jawaban dari state browser siswa
    const shuffledQuestions = quiz.questions.map(q => {
      const { correct, correctKompleks, benarSalahAnswer, essayAnswer, ...safeQ } = q;
      if (safeQ.type === 'menjodohkan' && safeQ.pairs) {
         const shuffledRights = safeQ.pairs.map(p => p.right).sort(() => Math.random() - 0.5);
         const safePairs = safeQ.pairs.map(p => ({ left: p.left, right: '' })); 
         return { ...safeQ, pairs: safePairs, shuffledRights };
      }
      return safeQ;
    }).sort(() => Math.random() - 0.5);
    
    setActiveQuiz({ ...quiz, questions: shuffledQuestions });
    setCurrentQuestionIndex(0); setStudentAnswers({}); setCheatWarnings(0);
    setTimeLeft(quiz.meta.durasi ? quiz.meta.durasi * 60 : 3600);
    setIsSubmitting(false); setView('student_test'); requestFullscreen();
  };

  const handleKopUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement('canvas'); let {width, height} = img;
        if (width > height && width > 800) { height *= 800/width; width = 800; } 
        else if (height > 250) { width *= 250/height; height = 250; }
        cvs.width = width; cvs.height = height; const ctx = cvs.getContext('2d');
        ctx.drawImage(img,0,0,width,height);
        setQuizMeta(p => ({ ...p, kopSekolah: cvs.toDataURL('image/jpeg', 0.5) }));
      };
      img.src = evt.target.result;
    }; reader.readAsDataURL(file);
  };

  const exportToDocx = async (quiz) => {
    try {
      showToast("Merakit file DOCX tulen... Mohon tunggu sebentar.", "success");
      if (!window.docx) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error("Gagal memuat pustaka pembangun DOCX."));
          document.head.appendChild(script);
        });
      }

      const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType, TabStopType } = window.docx;

      const finalKurikulum = quiz.meta.kurikulum === 'Lainnya' ? (quiz.meta.kurikulumManual || '-') : quiz.meta.kurikulum;
      const finalKelas = quiz.meta.kelas === 'Lainnya' ? (quiz.meta.kelasManual || '-') : quiz.meta.kelas;
      const mapel = quiz.meta.mapel === 'Lainnya' ? (quiz.meta.mapelManual || '-') : quiz.meta.mapel;
      const jenisUjian = quiz.meta.jenisUjian === 'Lainnya' ? (quiz.meta.jenisUjianManual || '-') : quiz.meta.jenisUjian;
      const docChildren = [];

      const base64ToArrayBuffer = (dataURL) => {
          if (!dataURL || !dataURL.includes(',')) return new ArrayBuffer(0);
          const base64 = dataURL.split(',')[1];
          const binaryString = window.atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          return bytes.buffer;
      };

      const fetchImageAsArrayBuffer = async (url) => {
          if (url.startsWith('data:image')) return base64ToArrayBuffer(url);
          try {
              const res = await fetch(url);
              if (!res.ok) return null;
              return await res.arrayBuffer();
          } catch(e) { return null; }
      };

      const getImageDims = (dataURL) => new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
              let w = img.width; let h = img.height;
              if (w > 400) { h = (h * 400) / w; w = 400; }
              resolve({ width: w, height: h });
          };
          img.onerror = () => resolve({ width: 200, height: 150 });
          img.src = dataURL;
      });

      if (quiz.meta.kopSekolah) {
          try {
              const dims = await getImageDims(quiz.meta.kopSekolah);
              const arrBuf = await fetchImageAsArrayBuffer(quiz.meta.kopSekolah);
              if (arrBuf) {
                  docChildren.push(new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new ImageRun({ data: arrBuf, transformation: { width: dims.width, height: dims.height } })]
                  }));
                  docChildren.push(new Paragraph({ text: "" }));
              }
          } catch (e) {}
      }

      docChildren.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: quiz.meta.sekolah || 'Nama Sekolah', bold: true, size: 28 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${jenisUjian} - SEMESTER ${quiz.meta.semester?.toUpperCase() || 'GANJIL'}`, bold: true, size: 24 })] })
      );
      
      docChildren.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Mata Pelajaran: ${mapel} | Kelas: ${finalKelas}`, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Kurikulum: ${finalKurikulum || 'Kurikulum Merdeka'}`, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tanggal: ${quiz.meta.tanggal || '-'}`, size: 20 })] }),
          new Paragraph({ text: "" })
      );

      docChildren.push(new Paragraph({ text: "================================================================" }));
      docChildren.push(new Paragraph({ text: "" }));

      // 1. BAGIAN SOAL
      docChildren.push(new Paragraph({ children: [new TextRun({ text: "SOAL UJIAN:", bold: true, size: 24 })] }));
      docChildren.push(new Paragraph({ text: "" }));

      for (let idx = 0; idx < quiz.questions.length; idx++) {
          const q = quiz.questions[idx];
          docChildren.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${q.text || ''}`, bold: true })] }));

          if (q.imageUrl) {
              try {
                  const dims = await getImageDims(q.imageUrl);
                  const arrBuf = await fetchImageAsArrayBuffer(q.imageUrl);
                  if (arrBuf) {
                      docChildren.push(new Paragraph({ children: [new ImageRun({ data: arrBuf, transformation: { width: dims.width, height: dims.height } })] }));
                  }
              } catch(e) {}
          }

          if (q.type === 'pg') {
              if (q.options && q.options.length >= 4) {
                  docChildren.push(new Paragraph({
                      tabStops: [{ type: TabStopType.LEFT, position: 4500 }],
                      children: [
                          new TextRun({ text: `   A. ${q.options[0]}` }),
                          new TextRun({ text: `\tC. ${q.options[2]}` })
                      ]
                  }));
                  docChildren.push(new Paragraph({
                      tabStops: [{ type: TabStopType.LEFT, position: 4500 }],
                      children: [
                          new TextRun({ text: `   B. ${q.options[1]}` }),
                          new TextRun({ text: `\tD. ${q.options[3]}` })
                      ]
                  }));
              } else {
                  (q.options || []).forEach((opt, oIdx) => { docChildren.push(new Paragraph({ text: `   ${String.fromCharCode(65 + oIdx)}. ${opt}` })); });
              }
          } else if (q.type === 'pg_kompleks') {
              (q.options || []).forEach((opt) => { docChildren.push(new Paragraph({ text: `   [   ] ${opt}` })); });
          } else if (q.type === 'benar_salah') {
              docChildren.push(new Paragraph({ text: `   (   ) Benar    (   ) Salah` }));
          } else if (q.type === 'menjodohkan') {
              const shuffledRight = [...(q.pairs||[])].sort(() => Math.random() - 0.5);
              (q.pairs||[]).forEach((p, pIdx) => { docChildren.push(new Paragraph({ text: `   ${pIdx+1}. ${p.left}    .......    ${String.fromCharCode(65+pIdx)}. ${shuffledRight[pIdx]?.right || ''}` })); });
          } else if (q.type === 'isian') {
              docChildren.push(new Paragraph({ text: `   ...................................................................................................` }));
          } else {
              docChildren.push(new Paragraph({ text: "" }));
          }
          docChildren.push(new Paragraph({ text: "" }));
      }

      // 2. BAGIAN KUNCI JAWABAN
      docChildren.push(new Paragraph({ text: "================================================================" }));
      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ children: [new TextRun({ text: "KUNCI JAWABAN & PEDOMAN:", bold: true, size: 24 })] }));
      docChildren.push(new Paragraph({ text: "" }));

      quiz.questions.forEach((q, idx) => {
          let answerText = "";
          if (q.type === 'pg') answerText = String.fromCharCode(65 + (q.correct || 0));
          else if (q.type === 'pg_kompleks') answerText = `(PG Kompleks) ${(q.correctKompleks || []).map(i => q.options[i]).join(', ')}`;
          else if (q.type === 'benar_salah') answerText = `(Benar/Salah) ${q.benarSalahAnswer === 0 ? 'Benar' : 'Salah'}`;
          else if (q.type === 'menjodohkan') answerText = `(Menjodohkan) \n` + (q.pairs||[]).map(p => `      - ${p.left} == ${p.right}`).join('\n');
          else if (q.type === 'isian') answerText = `(Isian Singkat) ${q.essayAnswer || '-'}`;
          else answerText = `(Esai) Referensi: ${q.essayAnswer || 'Koreksi Mandiri'}`;

          const lines = answerText.split('\n');
          lines.forEach((line, lIdx) => {
              if (lIdx === 0) docChildren.push(new Paragraph({ text: `${idx + 1}. ${line}` }));
              else docChildren.push(new Paragraph({ text: line }));
          });
      });

      // 3. BAGIAN KISI-KISI (BENTUK TABEL RAPI)
      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ text: "================================================================" }));
      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ children: [new TextRun({ text: "KISI-KISI & INDIKATOR SOAL:", bold: true, size: 24 })] }));
      docChildren.push(new Paragraph({ text: "" }));

      const createCell = (text, isHeader = false, widthPercent = null, align = AlignmentType.LEFT) => {
          const cellOpts = {
              children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: isHeader })], alignment: align })],
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              verticalAlign: window.docx.VerticalAlign ? window.docx.VerticalAlign.CENTER : "center"
          };
          if (widthPercent) cellOpts.width = { size: widthPercent, type: WidthType.PERCENTAGE };
          return new TableCell(cellOpts);
      };

      if (quiz.meta.kisiKisiManual) {
          const lines = quiz.meta.kisiKisiManual.split('\n').filter(l => l.trim() !== '');
          const manualRows = lines.map((line, idx) => {
              if (line.includes('|')) {
                  const cols = line.split('|').map(c => c.trim());
                  return new TableRow({ children: cols.map(c => createCell(c, idx === 0, null, idx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT)) });
              } else {
                  return new TableRow({ children: [createCell(line, false, 100)] });
              }
          });
          docChildren.push(new Table({ rows: manualRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      } else {
          const tableRows = [];
          tableRows.push(new TableRow({
              tableHeader: true,
              children: [
                  createCell("No", true, 5, AlignmentType.CENTER),
                  createCell("Indikator Soal", true, 60, AlignmentType.CENTER),
                  createCell("Level Kognitif", true, 15, AlignmentType.CENTER),
                  createCell("Bentuk Soal", true, 20, AlignmentType.CENTER),
              ]
          }));

          quiz.questions.forEach((q, idx) => {
              tableRows.push(new TableRow({
                  children: [
                      createCell(`${idx + 1}`, false, 5, AlignmentType.CENTER),
                      createCell(q.indikator || 'Peserta didik dapat memahami materi dengan baik.', false, 60, AlignmentType.LEFT),
                      createCell(q.kognitif || 'C3', false, 15, AlignmentType.CENTER),
                      createCell(q.type.replace('_', ' ').toUpperCase(), false, 20, AlignmentType.CENTER),
                  ]
              }));
          });
          docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      }

      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⭐ DEVELOPED BY ANDRI-GURU-DISDIK-GUNUNGKIDUL ⭐", bold: true, size: 20, color: "FF0000" })] }));

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = url;
      a.download = `Soal_${mapel.replace(/\s+/g, '_')}_${finalKelas.replace(/\s+/g, '_')}.docx`;
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("File DOCX Asli berhasil dibuat dan di-download!", "success");
    } catch (err) {
      console.error("Docx export error:", err); showToast("Gagal merakit file DOCX: Pastikan format gambar sesuai.", "error");
    }
  };

  const exportStudentResultToDocx = async (res, quiz) => {
    if (!quiz) { showToast("Data soal kuis asli tidak ditemukan!", "error"); return; }
    try {
      showToast("Mengekspor lembar jawaban siswa...", "success");
      if (!window.docx) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error("Gagal memuat docx."));
          document.head.appendChild(script);
        });
      }
      const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = window.docx;

      const docChildren = [];
      
      docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LEMBAR HASIL PEKERJAAN SISWA", bold: true, size: 28 })] }));
      docChildren.push(new Paragraph({ text: "" }));
      
      const displayTotal = res.hasEssay && !res.isGraded ? "Menunggu" : (res.totalScore !== undefined ? res.totalScore : res.score);
      
      docChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
              top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
              new TableRow({
                  children: [
                      new TableCell({
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          children: [
                              new Paragraph({ children: [new TextRun({ text: `Nama Siswa     : ${res.studentName}`, bold: true })] }),
                              new Paragraph({ children: [new TextRun(`Mata Pelajaran : ${res.quizTitle}`)] }),
                              new Paragraph({ children: [new TextRun(`Waktu Ujian    : ${res.date}`)] }),
                          ],
                      }),
                      new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          borders: {
                              top: { style: BorderStyle.THICK, size: 24, color: "FF0000" },
                              bottom: { style: BorderStyle.THICK, size: 24, color: "FF0000" },
                              left: { style: BorderStyle.THICK, size: 24, color: "FF0000" },
                              right: { style: BorderStyle.THICK, size: 24, color: "FF0000" },
                          },
                          children: [
                              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NILAI", bold: true, size: 24, color: "FF0000" })] }),
                              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${displayTotal}`, bold: true, size: 72, color: "FF0000" })] }),
                          ],
                      }),
                  ],
              }),
          ],
      }));

      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ text: "================================================================" }));
      docChildren.push(new Paragraph({ text: "" }));

      quiz.questions.forEach((q, idx) => {
          docChildren.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${q.text || ''}`, bold: true })] }));
          
          const ans = res.answers ? res.answers[q.id] : undefined;
          let ansText = "Tidak dijawab"; let correctText = ""; let status = "Salah";

          if (q.type === 'pg') {
             ansText = ans !== undefined ? `${String.fromCharCode(65 + ans)}. ${q.options[ans]}` : "Tidak dijawab";
             correctText = `${String.fromCharCode(65 + (q.correct || 0))}. ${q.options[q.correct || 0]}`;
             status = ans === q.correct ? "Benar" : "Salah";
          } else if (q.type === 'pg_kompleks') {
             ansText = ans && ans.length > 0 ? ans.map(i => q.options[i]).join(', ') : "Tidak dijawab";
             correctText = (q.correctKompleks || []).map(i => q.options[i]).join(', ');
             status = JSON.stringify([...(ans||[])].sort()) === JSON.stringify([...(q.correctKompleks||[])].sort()) ? "Benar" : "Salah";
          } else if (q.type === 'benar_salah') {
             ansText = ans === 0 ? 'Benar' : (ans === 1 ? 'Salah' : "Tidak dijawab");
             correctText = q.benarSalahAnswer === 0 ? 'Benar' : 'Salah';
             status = ans === q.benarSalahAnswer ? "Benar" : "Salah";
          } else if (q.type === 'menjodohkan') {
             ansText = ans ? Object.keys(ans).map(k => `${k} == ${ans[k]}`).join('\n      ') : "Tidak dijawab";
             correctText = (q.pairs||[]).map(p => `${p.left} == ${p.right}`).join('\n      ');
             let isAllMatch = true; (q.pairs||[]).forEach(p => { if(String((ans||{})[p.left] || '').trim() !== String(p.right || '').trim()) isAllMatch = false; });
             if (isAllMatch && Object.keys(ans||{}).filter(k => (ans||{})[k] !== "").length === (q.pairs||[]).length) status = "Benar"; else status = "Salah";
          } else if (q.type === 'isian' || q.type === 'esai') {
             ansText = ans || "Tidak dijawab";
             correctText = q.essayAnswer || "Koreksi Manual";
             const eScore = (res.essayScoresMap && res.essayScoresMap[q.id] !== undefined) ? res.essayScoresMap[q.id] : '-';
             status = `Dinilai Manual (Poin: ${eScore})`;
          }

          if (q.type === 'menjodohkan') {
             docChildren.push(new Paragraph({ children: [new TextRun({ text: `   Jawaban Siswa:`, color: "0000FF" })] }));
             ansText.split('\n').forEach(line => docChildren.push(new Paragraph({ text: line })));
             docChildren.push(new Paragraph({ children: [new TextRun({ text: `   Kunci Jawaban:`, color: "008000" })] }));
             correctText.split('\n').forEach(line => docChildren.push(new Paragraph({ text: line })));
          } else {
             docChildren.push(new Paragraph({ children: [new TextRun({ text: `   Jawaban Siswa: ${ansText}`, color: "0000FF" })] }));
             docChildren.push(new Paragraph({ children: [new TextRun({ text: `   Kunci Jawaban: ${correctText}`, color: "008000" })] }));
          }
          
          docChildren.push(new Paragraph({ children: [new TextRun({ text: `   Status: [ ${status} ]`, bold: true, color: status === "Benar" ? "008000" : (status === "Salah" ? "FF0000" : "800080") })] }));
          docChildren.push(new Paragraph({ text: "" }));
      });

      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ text: "" }));
      docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⭐ DEVELOPED BY ANDRI-GURU-DISDIK-GUNUNGKIDUL ⭐", bold: true, size: 20, color: "FF0000" })] }));

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = url;
      a.download = `Lembar_Jawaban_${res.studentName.replace(/\s+/g, '_')}_${res.quizTitle.replace(/\s+/g, '_')}.docx`;
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err); showToast("Gagal merakit lembar jawaban.", "error");
    }
  };

  const exportToExcel = () => {
    let filteredResults = results.filter(r => r.roomCode === currentUser.roomCode);
    if (filterQuizId !== 'ALL') {
        filteredResults = filteredResults.filter(r => r.quizId === filterQuizId);
    }
    if(filteredResults.length === 0) { showToast("Belum ada data nilai!", "error"); return; }
    
    let maxAutoQuestions = 0; let maxManualQuestions = 0;
    const resultsWithAnalysis = filteredResults.map(r => {
      const quiz = quizzes.find(q => q.id === r.quizId) || quizzes.find(q => q.title.includes(r.quizTitle));
      let analysis = []; let essayAnalysis = [];
      if (quiz) {
        const autoQs = quiz.questions.filter(q => ['pg','pg_kompleks','benar_salah','menjodohkan'].includes(q.type));
        if (autoQs.length > maxAutoQuestions) maxAutoQuestions = autoQs.length;
        
        autoQs.forEach(q => {
           const ans = r.answers ? r.answers[q.id] : undefined; let isCorrect = false;
           if(ans !== undefined) {
             if(q.type === 'pg') isCorrect = ans === q.correct;
             if(q.type === 'benar_salah') isCorrect = ans === q.benarSalahAnswer;
             if(q.type === 'pg_kompleks') isCorrect = JSON.stringify([...(ans||[])].sort()) === JSON.stringify([...(q.correctKompleks||[])].sort());
             if(q.type === 'menjodohkan') {
                isCorrect = true; q.pairs.forEach(p => { if(String((ans||{})[p.left] || '').trim() !== String(p.right || '').trim()) isCorrect = false; });
                if(Object.keys(ans||{}).filter(k => (ans||{})[k] !== "").length !== q.pairs.length) isCorrect = false;
             }
           }
           analysis.push(isCorrect ? 'B(1)' : 'S(0)');
        });

        const manualQs = quiz.questions.filter(q => ['esai','isian'].includes(q.type));
        if (manualQs.length > maxManualQuestions) maxManualQuestions = manualQs.length;
        manualQs.forEach(q => essayAnalysis.push((r.essayScoresMap && r.essayScoresMap[q.id] !== undefined) ? r.essayScoresMap[q.id] : '-'));
      }
      return { ...r, analysis, essayAnalysis };
    });

    let html = "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='utf-8'></head><body><table border='1'><tr style='background-color: #f3f4f6;'><th>Nama Siswa</th><th>Mata Pelajaran</th><th>Waktu Mengerjakan</th><th>Nilai Sistem</th><th>Nilai Manual</th><th>Total Akhir</th><th>Pelanggaran</th><th>Status</th>";
    for (let i = 1; i <= maxAutoQuestions; i++) html += `<th>Auto ${i}</th>`;
    for (let i = 1; i <= maxManualQuestions; i++) html += `<th>Manual ${i}</th>`;
    html += `</tr>`;
    
    resultsWithAnalysis.forEach(r => {
      const status = r.hasEssay ? (r.isGraded ? 'Dikoreksi' : 'Menunggu Koreksi') : 'Selesai';
      const total = r.hasEssay && !r.isGraded ? 'Menunggu' : (r.totalScore !== undefined ? r.totalScore : r.score);
      html += `<tr><td>${r.studentName}</td><td>${r.quizTitle}</td><td>${r.date}</td><td>${r.score}</td><td>${r.essayScore || 0}</td><td style="font-weight: bold;">${total}</td><td style="color: red;">${r.cheatWarnings || 0}x</td><td>${status}</td>`;
      for (let i = 0; i < maxAutoQuestions; i++) {
        const cell = r.analysis[i] || '-'; const bg = cell.includes('(1)') ? '#dcfce7' : (cell.includes('(0)') ? '#fee2e2' : '#ffffff');
        html += `<td style="background-color: ${bg}; text-align: center;">${cell}</td>`;
      }
      for (let i = 0; i < maxManualQuestions; i++) html += `<td style="text-align: center; background-color: #fef9c3;">${r.essayAnalysis[i] !== undefined ? r.essayAnalysis[i] : '-'}</td>`;
      html += `</tr>`;
    });
    
    html += `<tr><td colspan="${8 + maxAutoQuestions + maxManualQuestions}" style="text-align: center; font-weight: bold; font-size: 18px; color: #ffffff; background-color: #ff0000; padding: 15px; letter-spacing: 2px;">⭐ DEVELOPED BY ANDRI-GURU-DISDIK-GUNUNGKIDUL ⭐</td></tr>`;
    html += "</table></body></html>";

    // Dinamis nama file
    let fileName = `Rekap_Nilai_${currentUser.roomCode}.xls`;
    if (filterQuizId !== 'ALL') {
        const selectedQuiz = quizzes.find(q => q.id === filterQuizId);
        if (selectedQuiz) {
            const mapelName = selectedQuiz.meta?.mapel === 'Lainnya' ? (selectedQuiz.meta?.mapelManual || 'Mapel') : (selectedQuiz.meta?.mapel || 'Mapel');
            const examDate = selectedQuiz.meta?.tanggal || 'TanpaTanggal';
            fileName = `Rekap_Nilai_${mapelName.replace(/[^a-zA-Z0-9]/g, '_')}_${examDate}.xls`;
        }
    } else {
        const currentDate = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
        fileName = `Rekap_Nilai_Semua_Mapel_${currentDate}.xls`;
    }

    const fileDownload = document.createElement("a");
    fileDownload.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }));
    fileDownload.download = fileName;
    fileDownload.click();
  };

  const submitQuiz = async () => {
    if (isSubmitting) return; setIsSubmitting(true); exitFullscreen();
    let correctCount = 0; let autoCount = 0; let essayCount = 0; let hasEssay = false;
    const essayDetails = []; const cleanAnswers = {};
    Object.keys(studentAnswers).forEach(key => { if (studentAnswers[key] !== undefined) cleanAnswers[key] = studentAnswers[key]; });

    const originalMasterQuiz = quizzes.find(q => q.id === activeQuiz.id);
    if(!originalMasterQuiz) { showToast("Error: Data soal master tidak ditemukan!", "error"); setIsSubmitting(false); return; }

    originalMasterQuiz.questions.forEach(q => {
      const ans = cleanAnswers[q.id];
      if (['pg', 'pg_kompleks', 'benar_salah', 'menjodohkan'].includes(q.type)) {
        autoCount++;
        if (ans !== undefined) {
          if (q.type === 'pg' && ans === q.correct) correctCount++;
          else if (q.type === 'benar_salah' && ans === q.benarSalahAnswer) correctCount++;
          else if (q.type === 'pg_kompleks') { if(JSON.stringify([...(ans||[])].sort()) === JSON.stringify([...(q.correctKompleks||[])].sort())) correctCount++; }
          else if (q.type === 'menjodohkan') {
             let isAllMatch = true; (q.pairs||[]).forEach(p => { if(String((ans||{})[p.left] || '').trim() !== String(p.right || '').trim()) isAllMatch = false; });
             if (isAllMatch && Object.keys(ans||{}).filter(k => (ans||{})[k] !== "").length === (q.pairs||[]).length) correctCount++;
          }
        }
      } else if (['esai', 'isian'].includes(q.type)) {
        hasEssay = true; essayCount++;
        essayDetails.push({ id: q.id, questionText: q.text, answer: ans || '(Kosong)', essayAnswer: q.essayAnswer || '', type: q.type });
      }
    });
    
    const autoScore = autoCount > 0 ? Math.round((correctCount / autoCount) * 100) : 0;
    const totalQs = autoCount + essayCount;
    const partialTotalScore = Math.round((correctCount / totalQs) * 100);
    setFinalScore({ score: autoScore, hasEssay });
    
    try {
      if (auth.currentUser) {
        const finalJenisUjian = activeQuiz.meta?.jenisUjian === 'Lainnya' ? (activeQuiz.meta?.jenisUjianManual || 'Ujian') : (activeQuiz.meta?.jenisUjian || '-');
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedFullDate = new Date().toLocaleDateString('id-ID', dateOptions) + ' WIB';

        const newResult = {
          quizId: activeQuiz.id || Date.now().toString(), studentName: currentUser?.name || 'Anonim',
          quizTitle: activeQuiz.meta?.mapel === 'Lainnya' ? (activeQuiz.meta?.mapelManual || 'Mapel') : (activeQuiz.meta?.mapel || activeQuiz.title),
          jenisUjian: finalJenisUjian, score: autoScore, essayScore: 0, totalScore: partialTotalScore, hasEssay, isGraded: !hasEssay, 
          correctCount, autoCount, essayCount, essayDetails, essayScoresMap: {}, answers: cleanAnswers, roomCode: currentUser?.roomCode || '-', cheatWarnings: cheatWarnings || 0,
          date: formattedFullDate, timestamp: Date.now()
        };
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'results'), newResult);
        localStorage.removeItem('cbt_ongoing_exam_v2'); setView('student_result');
      } else { showToast("Koneksi terputus.", "error"); setIsSubmitting(false); }
    } catch (error) { showToast("Gagal terkirim.", "error"); setIsSubmitting(false); }
  };

  const handleResetStudentSession = async (resultId) => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'results', resultId));
        showToast("Sesi berhasil direset!", "success");
      } catch (err) { showToast("Gagal mereset sesi.", "error"); }
  };

  const handleSaveEssayGrade = async () => {
    try {
      const totalEssayPointsInput = Object.values(inputEssayScores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
      let finalTotalScore = 0;
      if (gradingResult.autoCount !== undefined) {
          const cCount = gradingResult.correctCount || 0;
          const totalQs = gradingResult.autoCount + gradingResult.essayCount;
          const earnedPoints = cCount + (totalEssayPointsInput / 100);
          finalTotalScore = Math.round((earnedPoints / totalQs) * 100);
      } else {
          finalTotalScore = gradingResult.score + totalEssayPointsInput;
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'results', gradingResult.id), {
        essayScore: totalEssayPointsInput, essayScoresMap: inputEssayScores, totalScore: finalTotalScore, isGraded: true
      });
      showToast("Tersimpan!", "success"); setView('teacher_dashboard');
    } catch (err) { showToast("Gagal menyimpan.", "error"); }
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'quizzes', quizId));
      showToast("Ujian berhasil dihapus!", "success"); setFilterQuizId('ALL');
    } catch (err) { showToast("Gagal menghapus ujian.", "error"); }
  };

  const updateDraftQuestion = (id, updatedFields) => {
      setNewQuizQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updatedFields } : q));
  };
  const removeDraftQuestion = (idToRemove) => { setNewQuizQuestions(newQuizQuestions.filter(q => q.id !== idToRemove)); };
  const handleAddBlankQuestion = () => { setNewQuizQuestions([...newQuizQuestions, { ...defaultQuestion, id: Date.now() }]); };

  const handleSaveNewQuiz = async () => {
    if (newQuizQuestions.length === 0) { showToast("Minimal 1 soal!"); return; }
    const finalMapel = quizMeta.mapel === 'Lainnya' ? (quizMeta.mapelManual || 'Mapel') : (quizMeta.mapel || 'Mapel');
    const finalJenisUjian = quizMeta.jenisUjian === 'Lainnya' ? (quizMeta.jenisUjianManual || 'Ujian') : (quizMeta.jenisUjian || 'Ujian');
    
    if (!finalMapel.trim()) { showToast("Isi nama mapel!"); return; }
    if (isPublishing) return; setIsPublishing(true);

    try {
      if (userAuth) {
        const finalMeta = JSON.parse(JSON.stringify(quizMeta));
        finalMeta.mapel = finalMapel; finalMeta.jenisUjian = finalJenisUjian;
        if (finalMeta.kurikulum === 'Lainnya') finalMeta.kurikulum = finalMeta.kurikulumManual;
        if (finalMeta.kelas === 'Lainnya') finalMeta.kelas = finalMeta.kelasManual;

        const payload = {
          title: `${finalMapel} - ${finalJenisUjian} (${finalMeta.kelas || 'Umum'})`, meta: finalMeta,
          questions: JSON.parse(JSON.stringify(newQuizQuestions)), roomCode: currentUser.roomCode, createdAt: Date.now()
        };
        if (JSON.stringify(payload).length > 950000) { showToast("Ukuran terlalu besar!", "error"); setIsPublishing(false); return; }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'quizzes'), payload);
        showToast("Diterbitkan!", "success"); setView('teacher_dashboard'); setNewQuizQuestions([]);
      }
    } catch (error) { showToast("Gagal menerbitkan.", "error"); } finally { setIsPublishing(false); }
  };

  const handleGenerateSoal = async () => {
    const finalMapel = quizMeta.mapel === 'Lainnya' ? (quizMeta.mapelManual || 'Mapel') : (quizMeta.mapel || 'Mapel');
    const finalKelas = quizMeta.kelas === 'Lainnya' ? (quizMeta.kelasManual || 'Kelas') : (quizMeta.kelas || 'Kelas');
    const finalKurikulum = quizMeta.kurikulum === 'Lainnya' ? (quizMeta.kurikulumManual || 'Kurikulum Merdeka') : quizMeta.kurikulum;
    
    if (!finalMapel.trim()) { showToast("Isi mata pelajaran!"); return; }
    const isCustomKisi = quizMeta.kisiKisiManual && quizMeta.kisiKisiManual.trim() !== '';
    let numOfQuestions = parseInt(quizMeta.jumlahSoal) || 5;
    const numOfImages = parseInt(quizMeta.jumlahSoalBergambar) || 0;
    if (!isCustomKisi && numOfQuestions < 1) { showToast("Minimal 1 soal!"); return; }

    setIsGenerating(true); setGenerateStatus('Menganalisis & Meracik Soal...');
    const apiKey = typeof __gemini_api_key !== 'undefined' ? __gemini_api_key : ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    let strictTypeInstruction = "";
    if (quizMeta.tipeSoal !== 'Campuran') {
        const typeMap = {
            'Pilihan Ganda': 'pg', 'PG Kompleks': 'pg_kompleks', 'Menjodohkan': 'menjodohkan', 
            'Benar Salah': 'benar_salah', 'Isian Singkat': 'isian', 'Esai': 'esai'
        };
        const mappedType = typeMap[quizMeta.tipeSoal] || 'pg';
        strictTypeInstruction = `ATURAN SANGAT KETAT: Kamu WAJIB 100% menghasilkan soal dengan tipe "${mappedType}". DILARANG keras menggunakan tipe soal lain.`;
    }

    const promptText = isCustomKisi ? 
      `TUGAS: Buatkan soal ujian untuk siswa ${finalKelas}. Mapel: ${finalMapel}. Kurikulum: ${finalKurikulum}. KISI-KISI KUSTOM:\n${quizMeta.kisiKisiManual}\nBuat soal TEPAT sejumlah baris kisi-kisi. ${strictTypeInstruction}` : 
      `TUGAS: Buatkan ${numOfQuestions} soal ujian untuk siswa ${finalKelas}. Mapel: ${finalMapel}. Kurikulum: ${finalKurikulum}. TEPAT ${numOfImages} soal WAJIB butuh gambar. ${strictTypeInstruction}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { 
        parts: [{ text: `Kamu adalah Ahli pembuat soal ujian CBT.
ATURAN WAJIB JSON:
- 'type': "pg", "pg_kompleks", "menjodohkan", "benar_salah", "isian", atau "esai".
- 'options': Wajib 4 opsi untuk 'pg' dan 'pg_kompleks'.
- 'correct': Untuk 'pg' isi index jawaban benar (0-3).
- 'benarSalahAnswer': KHUSUS 'benar_salah', isi 0 (Benar) atau 1 (Salah).
- 'correctKompleks': Array index jawaban benar.
- 'pairs': Array of object [{left: "A", right: "B"}].
- 'essayAnswer': Kunci jawaban teks.
- 'imagePrompt': JIKA SOAL BUTUH GAMBAR, JANGAN BUAT LINK URL! Tuliskan saja DESKRIPSI SARAN GAMBAR yang detail di field ini. Kosongkan field 'imageUrl'.
- 'indikator': kalimat "Peserta didik dapat..."
- 'kognitif': C1-C6.` }] 
      },
      generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING", enum: ["pg", "pg_kompleks", "menjodohkan", "benar_salah", "isian", "esai"] }, text: { type: "STRING" }, imagePrompt: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, correct: { type: "INTEGER" }, benarSalahAnswer: { type: "INTEGER" }, correctKompleks: { type: "ARRAY", items: { type: "INTEGER" } }, pairs: { type: "ARRAY", items: { type: "OBJECT", properties: { left: {type: "STRING"}, right: {type: "STRING"} } } }, essayAnswer: { type: "STRING" }, indikator: { type: "STRING" }, kognitif: { type: "STRING" } }, required: ["type", "text", "indikator", "kognitif"] } } } } }
    };

    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        const parsed = JSON.parse(textResponse);
        const processedQuestions = parsed.questions.map(q => ({ ...defaultQuestion, ...q, id: Date.now() + Math.random(), benarSalahAnswer: q.benarSalahAnswer !== undefined ? q.benarSalahAnswer : 0 }));
        setNewQuizQuestions(prev => [...prev, ...processedQuestions]); showToast("Sukses meracik soal!", 'success');
      } else throw new Error("Format respons tak valid.");
    } catch (error) { showToast("Gagal generate. Cek koneksi API.", "error"); }
    finally { setIsGenerating(false); setGenerateStatus(''); }
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-red-50">
        <AlertTriangle className="w-20 h-20 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-red-600 mb-4">Sistem Terhenti</h1>
        <p className="text-gray-700 mb-6">Terdapat kendala koneksi atau memori. Silakan muat ulang halaman ini.</p>
        <button onClick={() => window.location.reload()} className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-600">Muat Ulang Aplikasi</button>
      </div>
    );
  }

  if (loadingDb) return (<div className="min-h-screen bg-sky-100 flex flex-col items-center justify-center font-sans"><Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" /><p className="text-xl font-bold text-blue-800">Menghubungkan Database...</p></div>);

  if (view === 'home') return (
    <div className="min-h-screen bg-sky-100 flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="absolute top-4 right-4 flex items-center bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-bold shadow"><span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-ping"></span> Terhubung</div>
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-white border-b-sky-200 mb-12">
        <img src="https://desanglanggeran.gunungkidulkab.go.id/assets/files/artikel/sedang_1565886041logo-kabupaten-gunung-kidul-download-logo-arti-makna-logo-pemkab-gunung-kidul.jpg" alt="Logo Gunungkidul" className="w-24 h-24 mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-extrabold text-blue-600 mb-2">CBT Pintar</h1>
        <p className="text-gray-500 mb-8 font-medium">Semua Jenjang (Umum & Madrasah)</p>
        <div className="space-y-4">
          <button onClick={() => setView('student_login')} className="w-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-4 px-6 rounded-2xl shadow-lg transform transition flex items-center justify-center"><User className="w-8 h-8 mr-3" /> Masuk Siswa</button>
          <button onClick={() => { setInputToken(''); setInputPin(''); setTeacherLoginMode('login'); setView('teacher_login'); }} className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold py-4 px-6 rounded-2xl shadow-lg transform transition flex items-center justify-center"><ShieldCheck className="w-8 h-8 mr-3" /> Masuk Guru</button>
        </div>
      </div>
    </div>
  );

  if (view === 'student_login') return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center mb-12">
        <img src="https://desanglanggeran.gunungkidulkab.go.id/assets/files/artikel/sedang_1565886041logo-kabupaten-gunung-kidul-download-logo-arti-makna-logo-pemkab-gunung-kidul.jpg" alt="Logo Gunungkidul" className="w-20 h-20 mx-auto mb-4 object-contain" />
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Identitas Siswa</h2>
        <form onSubmit={(e) => {
          e.preventDefault(); const name = e.target.studentName.value.trim(); const roomCode = e.target.roomCode.value.trim().toUpperCase();
          if(name && roomCode) {
            setCurrentUser({ role: 'student', name, roomCode });
            try {
              const savedRaw = localStorage.getItem('cbt_ongoing_exam_v2');
              if (savedRaw) {
                  const saved = JSON.parse(decodeURIComponent(atob(savedRaw)));
                  if (saved && saved.studentName === name && saved.roomCode === roomCode) {
                    setActiveQuiz(saved.activeQuiz); setCurrentQuestionIndex(saved.currentIndex || 0); setStudentAnswers(saved.answers || {}); setTimeLeft(saved.timeLeft); setCheatWarnings(saved.cheatWarnings || 0); setView('student_test'); requestFullscreen(); return; 
                  }
              }
            } catch(err) {}
            setView('student_dashboard');
          }
        }}>
          <input type="text" name="studentName" placeholder="Nama Lengkap" required className="w-full text-lg p-4 border-2 border-green-200 rounded-xl mb-4 focus:outline-none focus:border-green-500 text-center font-bold text-gray-700" />
          <input type="text" name="roomCode" placeholder="Token Guru" required className="w-full text-2xl tracking-widest p-4 border-2 border-green-200 rounded-xl mb-6 focus:outline-none focus:border-green-500 text-center font-bold text-gray-700 uppercase" />
          <div className="flex gap-2"><button type="button" onClick={() => setView('home')} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300">Kembali</button><button type="submit" className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-600">Mulai</button></div>
        </form>
      </div>
    </div>
  );

  if (view === 'teacher_login') return (
    <div className="min-h-screen bg-purple-50 flex flex-col items-center justify-center p-4">
      {toast && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 text-white font-bold transition-all animate-bounce ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.message}</div>}
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center mb-12">
        <img src="https://desanglanggeran.gunungkidulkab.go.id/assets/files/artikel/sedang_1565886041logo-kabupaten-gunung-kidul-download-logo-arti-makna-logo-pemkab-gunung-kidul.jpg" alt="Logo Gunungkidul" className="w-20 h-20 mx-auto mb-4 object-contain" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{teacherLoginMode === 'login' ? "Masuk Ruang Guru" : "Buat Akun / Ruang Baru"}</h2>
        <p className="text-sm text-gray-500 mb-6">{teacherLoginMode === 'login' ? "Gunakan Token & PIN Anda sebelumnya." : "Sistem akan menyimpan PIN ini di Database."}</p>
        <form onSubmit={handleTeacherAuth}>
          <div className="bg-purple-100 border-2 border-purple-200 p-4 rounded-xl mb-4 mt-4 relative">
            <p className="text-sm font-bold text-purple-600 uppercase mb-2">Token Anda</p>
            <input type="text" value={inputToken || ''} onChange={(e) => setInputToken(e.target.value.toUpperCase())} placeholder="Contoh: 89A2B" required className="w-full text-center text-3xl font-black text-purple-800 tracking-widest bg-white border-2 border-purple-300 rounded-xl py-3 focus:outline-none focus:border-purple-500 shadow-inner uppercase" />
            {teacherLoginMode === 'register' && (
               <button type="button" onClick={() => setInputToken(Math.floor(10000 + Math.random() * 90000).toString())} className="absolute top-2 right-2 text-xs bg-purple-500 text-white px-2 py-1 rounded shadow hover:bg-purple-600">Acak</button>
            )}
          </div>
          <input type="password" value={inputPin || ''} onChange={(e) => setInputPin(e.target.value)} placeholder={teacherLoginMode === 'login' ? "Masukkan PIN Rahasia" : "Buat PIN Baru (Bebas)"} required className="w-full text-center text-xl tracking-widest p-4 border-2 border-purple-200 rounded-xl mb-6 focus:outline-none focus:border-purple-500 font-bold text-gray-700" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setView('home')} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300">Batal</button>
            <button type="submit" className="flex-1 bg-purple-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-purple-600">Masuk</button>
          </div>
        </form>
        <div className="mt-6 border-t border-gray-100 pt-4">
          <button type="button" onClick={() => { setTeacherLoginMode(teacherLoginMode === 'login' ? 'register' : 'login'); setInputToken(''); setInputPin(''); }} className="text-sm text-purple-600 hover:text-purple-800 font-bold underline">
            {teacherLoginMode === 'login' ? "Belum punya Token? Buat Baru" : "Sudah punya Token? Masuk di sini"}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'student_dashboard') {
    const completedQuizIds = results.filter(r => r.studentName === currentUser.name && r.roomCode === currentUser.roomCode).map(r => r.quizId);
    const filteredQuizzes = quizzes.filter(q => q.roomCode === currentUser.roomCode && !completedQuizIds.includes(q.id));

    return (
      <div className="min-h-screen bg-sky-50 p-6 flex flex-col mb-12">
        <div className="max-w-4xl mx-auto w-full flex-1">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 border border-sky-100">
            <div className="flex flex-wrap items-center text-blue-600 font-bold text-lg gap-2"><User className="mr-2" /> Hai, {currentUser.name}!<span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg border border-green-200 flex items-center shadow-sm"><Key className="w-4 h-4 mr-1" /> Token: {currentUser.roomCode}</span></div>
            <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg font-bold flex"><LogOut className="w-5 h-5" /></button>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center"><Wifi className="mr-2 text-green-500" /> Daftar Ujian Tersedia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white p-6 rounded-3xl shadow-md border-b-4 border-blue-400 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3></div>
                <p className="text-sm text-gray-600 mb-1">{quiz.meta.sekolah || '-'}</p>
                <p className="text-xs text-gray-500 mb-6 font-medium flex items-center">{quiz.questions.length} Soal • <Timer className="w-3 h-3 mx-1 text-orange-500" /> {quiz.meta.durasi || 60} Mnt</p>
                <button onClick={() => startQuiz(quiz)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow flex justify-center items-center"><Play className="w-5 h-5 mr-2" /> Kerjakan Sekarang</button>
              </div>
            ))}
            {filteredQuizzes.length === 0 && (<div className="col-span-full text-center py-10 bg-white rounded-3xl shadow-sm text-gray-500 border-2 border-dashed border-gray-300">Belum ada ujian baru di Token {currentUser.roomCode}.</div>)}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'student_test' && activeQuiz) {
    const question = activeQuiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1;
    
    let hasAnsweredCurrent = false;
    if (question.type === 'pg_kompleks') hasAnsweredCurrent = (studentAnswers[question.id] || []).length > 0;
    else if (question.type === 'menjodohkan') hasAnsweredCurrent = Object.keys(studentAnswers[question.id] || {}).filter(k => (studentAnswers[question.id]||{})[k] !== "").length === (question.pairs||[]).length;
    else hasAnsweredCurrent = studentAnswers[question.id] !== undefined && studentAnswers[question.id] !== '';

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex flex-col select-none mb-12" onContextMenu={e=>e.preventDefault()} onCopy={e=>e.preventDefault()} onPaste={e=>e.preventDefault()}>
        {toast && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 text-white font-bold transition-all animate-bounce ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.message}</div>}
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col relative">
          
          {cheatWarnings > 0 && (
            <div className="absolute -top-4 left-0 right-0 bg-red-500 text-white text-xs font-bold py-1 px-4 rounded-b-xl flex items-center justify-center animate-pulse z-10 shadow">
              <AlertTriangle className="w-4 h-4 mr-2" /> PERINGATAN KELUAR APLIKASI: {cheatWarnings}/3
            </div>
          )}

          <div className="flex justify-between items-center mb-2 px-2 mt-4">
            <span className="px-3 py-1.5 rounded-xl font-bold text-sm flex items-center bg-blue-100 text-blue-800 shadow-sm">Soal {currentQuestionIndex + 1} / {activeQuiz.questions.length}</span>
            <span className={`px-3 py-1.5 rounded-xl font-bold text-sm flex items-center shadow-sm ${timeLeft !== null && timeLeft <= 60 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-orange-100 text-orange-800'}`}><Timer className="w-4 h-4 mr-1" /> {timeLeft !== null ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` : '00:00'}</span>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md mb-6 flex-1 border-t-8 border-blue-500 overflow-hidden">
            <div className="flex justify-between items-start mb-6"><h3 className="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed">{question.text}</h3><span className="ml-4 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase whitespace-nowrap shadow-sm">{question.type.replace('_', ' ')}</span></div>

            {question.imageUrl && (<div className="mb-6 flex justify-center"><img src={question.imageUrl} alt="Ilustrasi Soal" className="max-w-full max-h-64 rounded-xl shadow-sm border border-gray-200 pointer-events-none"/></div>)}
            
            {question.type === 'pg' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(question.options || []).map((opt, idx) => (
                  <button key={idx} onClick={() => setStudentAnswers({...studentAnswers, [question.id]: idx})} className={`p-4 rounded-2xl text-left text-lg font-semibold border-4 transition-all duration-200 ${studentAnswers[question.id] === idx ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-inner' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-300'}`}>
                    <div className="flex items-center"><span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white font-bold shadow text-sm ${studentAnswers[question.id] === idx ? 'bg-blue-500' : 'bg-gray-300'}`}>{String.fromCharCode(65 + idx)}</span>{opt}</div>
                  </button>
                ))}
              </div>
            )}

            {question.type === 'pg_kompleks' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="col-span-full text-sm font-bold text-orange-500 mb-2">*Pilih semua jawaban yang benar</p>
                {(question.options || []).map((opt, idx) => {
                  const isSelected = (studentAnswers[question.id] || []).includes(idx);
                  return (
                    <button key={idx} onClick={() => {
                        let currentArr = studentAnswers[question.id] || [];
                        if (isSelected) currentArr = currentArr.filter(i => i !== idx); else currentArr = [...currentArr, idx];
                        setStudentAnswers({...studentAnswers, [question.id]: currentArr});
                      }} 
                      className={`p-4 rounded-2xl text-left text-lg font-semibold border-4 transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-100 bg-gray-50 text-gray-700'}`}>
                      <div className="flex items-center">
                        <div className={`w-6 h-6 border-2 rounded mr-3 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                          {isSelected && <CheckSquare className="w-5 h-5 text-white" />}
                        </div>{opt}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === 'benar_salah' && (
              <div className="flex gap-4 justify-center mt-8">
                {['Benar', 'Salah'].map((opt, idx) => (
                  <button key={idx} onClick={() => setStudentAnswers({...studentAnswers, [question.id]: idx})} className={`w-40 py-6 rounded-2xl text-2xl font-black border-4 transition-all duration-200 ${studentAnswers[question.id] === idx ? (idx === 0 ? 'border-green-500 bg-green-100 text-green-800' : 'border-red-500 bg-red-100 text-red-800') : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {question.type === 'menjodohkan' && (
              <div className="flex flex-col gap-3">
                 <p className="text-sm font-bold text-blue-600 mb-2">*Pasangkan pernyataan di kiri dengan jawaban di kanan</p>
                {(question.pairs || []).map((pair, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                    <span className="w-1/2 font-bold text-gray-700">{idx+1}. {pair.left}</span>
                    <select 
                      value={(studentAnswers[question.id] || {})[pair.left] || ''}
                      onChange={(e) => {
                        const currentAns = studentAnswers[question.id] || {};
                        setStudentAnswers({...studentAnswers, [question.id]: { ...currentAns, [pair.left]: e.target.value }});
                      }}
                      className="w-1/2 p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none font-semibold text-gray-800 bg-white"
                    >
                      <option value="">-- Pilih Pasangan --</option>
                      {(question.shuffledRights || []).map((r, i) => (
                         <option key={i} value={r}>{String.fromCharCode(65+i)}. {r}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            
            {question.type === 'isian' && (
              <input type="text" value={studentAnswers[question.id] || ''} onChange={(e) => setStudentAnswers({...studentAnswers, [question.id]: e.target.value})} placeholder="Ketik jawaban singkat di sini..." className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-xl font-bold text-gray-800 bg-gray-50" />
            )}
            {question.type === 'esai' && (
              <textarea value={studentAnswers[question.id] || ''} onChange={(e) => setStudentAnswers({...studentAnswers, [question.id]: e.target.value})} placeholder="Ketik uraian jawaban di sini..." className="w-full p-4 border-2 border-gray-200 rounded-2xl h-48 focus:border-blue-500 focus:outline-none text-lg font-medium text-gray-800 bg-gray-50" />
            )}
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold flex items-center disabled:opacity-50 hover:bg-gray-300"><ArrowLeft className="mr-2" /> Sebelumnya</button>
            {!isLastQuestion ? (
              <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} disabled={!hasAnsweredCurrent} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center shadow-lg hover:bg-blue-600 disabled:opacity-50">Selanjutnya <ArrowRight className="ml-2" /></button>
            ) : (
              <button onClick={submitQuiz} disabled={!hasAnsweredCurrent || isSubmitting} className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center shadow-lg hover:bg-green-600 disabled:opacity-50 text-lg">{isSubmitting ? 'Mengirim...' : 'Kumpulkan'} <CheckCircle className="ml-2" /></button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'student_result') return (
    <div className="min-h-screen bg-sky-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-8 border-green-500 mb-12">
        <CheckCircle className="w-24 h-24 mx-auto mb-6 text-green-500" /><h2 className="text-3xl font-extrabold text-gray-800 mb-2">Ujian Selesai!</h2>
        <div className="bg-blue-50 text-blue-800 p-5 rounded-2xl mb-8 border border-blue-200 shadow-inner">
          <p className="font-bold text-lg mb-1">Jawaban Berhasil Terkirim 🚀</p>
          <p className="text-sm font-medium">Nilai disimpan aman. Silakan tunggu instruksi Guru.</p>
        </div>
        <button onClick={() => setView('student_dashboard')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center"><ListChecks className="mr-2" /> Kembali ke Daftar Ujian</button>
      </div>
    </div>
  );

  if (view === 'teacher_dashboard') {
    const filteredQuizzes = quizzes.filter(q => q.roomCode === currentUser.roomCode);
    const filteredResults = results.filter(r => r.roomCode === currentUser.roomCode);
    const displayedResults = filterQuizId === 'ALL' ? filteredResults : filteredResults.filter(r => r.quizId === filterQuizId);

    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col mb-12">
        {toast && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 text-white font-bold transition-all animate-bounce ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.message}</div>}
        <div className="max-w-7xl mx-auto w-full flex-1">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-8 border border-gray-200">
            <div className="flex flex-wrap items-center text-purple-600 font-bold text-lg gap-2"><ShieldCheck className="mr-2" /> Ruang Guru <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-lg border border-purple-200 flex items-center"><Key className="w-4 h-4 mr-1" /> Token: {currentUser.roomCode}</span></div>
            <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center font-bold"><LogOut className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end"><h2 className="text-2xl font-bold text-gray-800 flex items-center"><BrainCircuit className="w-6 h-6 mr-2 text-purple-500" /> Mesin Soal Terbit</h2><button onClick={() => setView('teacher_create')} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-bold shadow flex items-center"><Plus className="w-5 h-5 mr-1" /> Buat Baru</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredQuizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1 leading-tight">{quiz.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{quiz.questions.length} Soal • Tgl: {quiz.meta.tanggal || '-'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => exportToDocx(quiz)} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center border border-indigo-200"><Download className="w-4 h-4 mr-2" /> DOCX</button>
                      <button onClick={() => handleDeleteQuiz(quiz.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 rounded-xl border border-red-200 flex items-center justify-center" title="Hapus Ujian"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center"><Award className="w-6 h-6 mr-2 text-yellow-500" /> Laporan Nilai </h2>
                <button onClick={exportToExcel} className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg font-bold flex items-center" title="Download Excel Sesuai Filter"><FileSpreadsheet className="w-5 h-5" /></button>
              </div>

              <div className="mb-4">
                 <select value={filterQuizId} onChange={(e) => setFilterQuizId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-yellow-500">
                    <option value="ALL">-- Tampilkan Semua Ujian / Mapel --</option>
                    {filteredQuizzes.map(q => (
                       <option key={q.id} value={q.id}>{q.title} ({q.meta.tanggal || '-'})</option>
                    ))}
                 </select>
              </div>

              <p className="text-xs text-green-600 font-semibold mb-4 animate-pulse">Menunggu Live Data dari kelas...</p>
              <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                {displayedResults.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 text-sm font-medium border-2 border-dashed border-gray-200 rounded-xl">Belum ada data nilai di ujian ini.</div>
                ) : displayedResults.map((res, idx) => (
                  <div key={idx} className={`flex flex-col p-4 rounded-xl border ${res.hasEssay && !res.isGraded ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-800 text-lg flex items-center">
                          {res.studentName} 
                          {res.cheatWarnings > 0 && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">Cheat {res.cheatWarnings}x</span>}
                        </p>
                        <p className="text-xs text-gray-500">{res.quizTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Nilai</p>
                        {res.hasEssay && !res.isGraded ? (
                          <div className="font-black text-xl text-yellow-600 bg-yellow-100 px-2 py-1 rounded shadow-sm border border-yellow-200">Menunggu</div>
                        ) : (
                          <div className={`font-black text-2xl ${res.totalScore >= 70 ? 'text-green-500' : 'text-red-500'}`}>{res.totalScore !== undefined ? res.totalScore : res.score}</div>
                        )}
                      </div>
                    </div>

                    {!res.hasEssay && (
                      <div className="mt-2 pt-2 border-t border-gray-200 border-dashed flex justify-between items-center">
                         <button onClick={() => handleResetStudentSession(res.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-3 rounded-lg flex items-center border border-red-200" title="Hapus Nilai agar Siswa bisa ujian lagi"><RefreshCw className="w-3 h-3 mr-1" /> Reset Sesi</button>
                         <button onClick={() => exportStudentResultToDocx(res, quizzes.find(q => q.id === res.quizId))} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg flex items-center border border-indigo-200"><Download className="w-3 h-3 mr-1" /> Lembar Jawaban</button>
                      </div>
                    )}
                    
                    {res.hasEssay && (
                      <div className="mt-2 pt-3 border-t border-gray-200 border-dashed">
                        {res.isGraded ? (
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-green-600 font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Dikoreksi</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 font-bold">Auto: {res.score} + Manual: {res.essayScore}</span>
                              <button onClick={() => { setGradingResult(res); setInputEssayScores(res.essayScoresMap || {}); setView('teacher_grade'); }} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 hover:bg-blue-100 rounded-md" title="Edit Nilai Manual"><Edit3 className="w-4 h-4"/></button>
                              <button onClick={() => exportStudentResultToDocx(res, quizzes.find(q => q.id === res.quizId))} className="text-green-500 hover:text-green-700 p-1 bg-green-50 hover:bg-green-100 rounded-md" title="Download Pekerjaan Siswa (.docx)"><Download className="w-4 h-4"/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 mb-2">
                            <button onClick={() => { setGradingResult(res); setInputEssayScores(res.essayScoresMap || {}); setView('teacher_grade'); }} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 rounded-lg text-sm shadow flex items-center justify-center"><Pencil className="w-4 h-4 mr-2" /> Koreksi Isian/Esai</button>
                            <button onClick={() => exportStudentResultToDocx(res, quizzes.find(q => q.id === res.quizId))} className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 shadow flex items-center justify-center" title="Download Pekerjaan Siswa (.docx)"><Download className="w-5 h-5"/></button>
                          </div>
                        )}
                        <div className="flex justify-end pt-2">
                            <button onClick={() => handleResetStudentSession(res.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-3 rounded-lg flex items-center border border-red-200" title="Hapus Nilai agar Siswa bisa ujian lagi"><RefreshCw className="w-3 h-3 mr-1" /> Reset Sesi</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'teacher_grade' && gradingResult) {
    return (
      <div className="min-h-screen bg-yellow-50 p-6 flex flex-col mb-12">
        <div className="max-w-4xl mx-auto w-full flex-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-6">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div><p className="text-sm text-gray-500 font-bold uppercase">Nama Siswa</p><p className="text-2xl font-bold text-gray-800">{gradingResult.studentName}</p></div>
              <div className="text-right bg-blue-50 p-3 rounded-xl border border-blue-100"><p className="text-xs text-blue-600 font-bold uppercase">Nilai Auto (PG dll)</p><p className="text-3xl font-black text-blue-700">{gradingResult.score}</p></div>
            </div>
            <div className="space-y-6 mb-8">
              {gradingResult.essayDetails.map((essay, idx) => (
                <div key={essay.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-3"><span className="text-yellow-600 font-bold text-lg">Q{idx + 1}.</span><span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold uppercase">{essay.type}</span></div>
                  <p className="font-semibold text-gray-800 mb-3 text-sm">{essay.questionText}</p>
                  <div className="bg-white p-4 rounded-xl border border-yellow-300 text-gray-700 whitespace-pre-wrap font-medium mb-3"><span className="text-xs font-bold text-yellow-600 block mb-1">Jawaban Siswa:</span>{essay.answer}</div>
                  {essay.essayAnswer && (<div className="bg-green-50 p-3 rounded-xl border border-green-200 text-green-800 text-sm whitespace-pre-wrap mb-3"><span className="font-bold block mb-1">Referensi Kunci:</span>{essay.essayAnswer}</div>)}
                  <div className="flex items-center justify-end border-t border-gray-200 pt-3 mt-2"><label className="text-sm font-bold text-gray-600 mr-3 uppercase">Poin Jawaban (0-100):</label><input type="number" min="0" max="100" value={inputEssayScores[essay.id] === undefined ? '' : inputEssayScores[essay.id]} onChange={(e) => setInputEssayScores({...inputEssayScores, [essay.id]: e.target.value === '' ? '' : Number(e.target.value)})} className="w-20 text-center text-lg font-black p-2 rounded-lg border-2 border-yellow-400 focus:outline-none focus:border-yellow-600" /></div>
                </div>
              ))}
            </div>
            
            {(() => {
              const totalEssay = Object.values(inputEssayScores).reduce((a, b) => a + (Number(b) || 0), 0);
              let finalEstScore = 0;
              if (gradingResult.autoCount !== undefined) {
                 const cCount = gradingResult.correctCount || 0;
                 const totalQs = gradingResult.autoCount + gradingResult.essayCount;
                 const earnedPoints = cCount + (totalEssay / 100);
                 finalEstScore = totalQs > 0 ? Math.round((earnedPoints / totalQs) * 100) : 0;
              } else {
                 finalEstScore = gradingResult.score + totalEssay;
              }
              
              return (
                <div className="bg-yellow-100 p-6 rounded-2xl border-2 border-yellow-300 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-yellow-800 text-lg">Total Penilaian Akhir (Skala 100)</p>
                    <p className="text-sm text-yellow-700">Kalkulasi proporsional: Pilihan Ganda + Uraian</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-3xl text-yellow-900 bg-yellow-300 px-4 py-1 rounded-xl shadow-inner">{finalEstScore}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setView('teacher_dashboard')} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-xl font-bold">Batal</button>
                      <button onClick={handleSaveEssayGrade} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl shadow flex items-center"><CheckCircle className="mr-2" /> Simpan</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'teacher_create') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 mb-12">
        {toast && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 text-white font-bold transition-all animate-bounce ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.message}</div>}
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-200">
            <h2 className="text-2xl font-extrabold text-purple-700 flex items-center"><BrainCircuit className="mr-3 w-8 h-8" /> Studio Mesin Soal</h2>
            <button onClick={() => setView('teacher_dashboard')} className="text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-lg font-bold">Kembali</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PENGATURAN GLOBAL */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><Settings className="w-5 h-5 mr-2 text-blue-500" /> Pengaturan Global</h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Kop Surat (Opsional)</label>
                    <input type="file" accept="image/*" onChange={handleKopUpload} className="text-xs" />
                    {quizMeta.kopSekolah && <img src={quizMeta.kopSekolah} alt="Kop" className="h-16 object-contain border p-1 rounded bg-white" />}
                  </div>
                  <input type="text" value={quizMeta.sekolah || ''} onChange={e => setQuizMeta({...quizMeta, sekolah: e.target.value})} placeholder="Nama Lembaga / Sekolah" className="w-full p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold" />
                  
                  <div className="grid grid-cols-1 gap-2">
                    <select value={quizMeta.kurikulum} onChange={e => setQuizMeta({...quizMeta, kurikulum: e.target.value})} className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-800">
                       <option>Kurikulum Merdeka</option><option>Kurikulum 2013 (K13)</option><option>Lainnya</option>
                    </select>
                    {quizMeta.kurikulum === 'Lainnya' && <input type="text" value={quizMeta.kurikulumManual || ''} onChange={e => setQuizMeta({...quizMeta, kurikulumManual: e.target.value})} placeholder="Ketik nama kurikulum..." className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold" />}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select value={quizMeta.kelas} onChange={e => setQuizMeta({...quizMeta, kelas: e.target.value})} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold">
                      <optgroup label="SD / MI"><option>Kelas 1 SD/MI</option><option>Kelas 2 SD/MI</option><option>Kelas 3 SD/MI</option><option>Kelas 4 SD/MI</option><option>Kelas 5 SD/MI</option><option>Kelas 6 SD/MI</option></optgroup>
                      <optgroup label="SMP / MTs"><option>Kelas 7 SMP/MTs</option><option>Kelas 8 SMP/MTs</option><option>Kelas 9 SMP/MTs</option></optgroup>
                      <optgroup label="SMA / MA / SMK"><option>Kelas 10 SMA/MA/SMK</option><option>Kelas 11 SMA/MA/SMK</option><option>Kelas 12 SMA/MA/SMK</option></optgroup>
                      <optgroup label="Lainnya"><option value="Lainnya">Lainnya (Ketik Manual)</option></optgroup>
                    </select>
                    <select value={quizMeta.semester || 'Ganjil'} onChange={e => setQuizMeta({...quizMeta, semester: e.target.value})} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold"><option>Ganjil</option><option>Genap</option></select>
                  </div>
                  {quizMeta.kelas === 'Lainnya' && <input type="text" value={quizMeta.kelasManual || ''} onChange={e => setQuizMeta({...quizMeta, kelasManual: e.target.value})} placeholder="Misal: CPNS, Ujian Masuk, Kelas Khusus..." className="w-full p-2.5 bg-purple-50 border rounded-xl text-sm font-semibold" />}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select value={quizMeta.jenisUjian || 'Ulangan Harian'} onChange={e => setQuizMeta({...quizMeta, jenisUjian: e.target.value})} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold">
                      <option>Ulangan Harian</option><option>UTS / PTS</option><option>ASAT</option><option>OSN</option><option>Simulasi / Tryout</option><option>Lainnya</option>
                    </select>
                    <input type="date" value={quizMeta.tanggal || ''} onChange={e => setQuizMeta({...quizMeta, tanggal: e.target.value})} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold" />
                  </div>
                  {quizMeta.jenisUjian === 'Lainnya' && <input type="text" value={quizMeta.jenisUjianManual || ''} onChange={e => setQuizMeta({...quizMeta, jenisUjianManual: e.target.value})} placeholder="Ketik jenis ujian..." className="w-full p-2.5 bg-purple-50 border rounded-xl text-sm font-semibold" />}
                  
                  <div className="grid grid-cols-2 gap-2">
                     <select value={quizMeta.mapel || 'Matematika'} onChange={e => setQuizMeta({...quizMeta, mapel: e.target.value})} className="w-full p-2.5 bg-gray-50 border rounded-xl text-sm font-semibold"><option>Matematika</option><option>Bahasa Indonesia</option><option>Bahasa Inggris</option><option>IPAS</option><option>IPA</option><option>IPS</option><option>Pendidikan Pancasila</option><option>Pend. Agama Islam</option><option>Lainnya</option></select>
                     <div className="bg-orange-50 p-2 rounded-xl border border-orange-200 flex items-center justify-between"><label className="text-[10px] font-bold text-orange-700 uppercase leading-tight">Durasi Ujian<br/>(Menit)</label><input type="number" min="1" value={quizMeta.durasi || 60} onChange={e => setQuizMeta({...quizMeta, durasi: parseInt(e.target.value) || 0})} className="w-16 p-1 text-center bg-white border border-orange-300 rounded focus:outline-none font-black text-orange-800" /></div>
                  </div>
                  {quizMeta.mapel === 'Lainnya' && <input type="text" value={quizMeta.mapelManual || ''} onChange={e => setQuizMeta({...quizMeta, mapelManual: e.target.value})} placeholder="Ketik nama mapel..." className="w-full p-2.5 bg-purple-50 border rounded-xl text-sm font-semibold" />}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-purple-50 p-2 rounded-xl border border-purple-200 text-center"><label className="block text-[10px] font-bold text-purple-700 uppercase">Jumlah Soal AI</label><input type="number" min="1" value={quizMeta.jumlahSoal || ''} onChange={e => setQuizMeta({...quizMeta, jumlahSoal: parseInt(e.target.value) || ''})} className="w-full p-1 text-center bg-transparent focus:outline-none font-black text-purple-800" /></div>
                    <div className="bg-blue-50 p-2 rounded-xl border border-blue-200 text-center"><label className="block text-[10px] font-bold text-blue-700 uppercase">Butuh Gambar?</label><input type="number" min="0" value={quizMeta.jumlahSoalBergambar !== undefined ? quizMeta.jumlahSoalBergambar : 0} onChange={e => setQuizMeta({...quizMeta, jumlahSoalBergambar: parseInt(e.target.value) || 0})} className="w-full p-1 text-center bg-transparent focus:outline-none font-black text-blue-800" /></div>
                  </div>
                  
                  <select value={quizMeta.tipeSoal || 'Campuran'} onChange={e => setQuizMeta({...quizMeta, tipeSoal: e.target.value})} className="w-full p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-sm font-bold text-purple-800"><option>Pilihan Ganda</option><option>PG Kompleks</option><option>Menjodohkan</option><option>Benar Salah</option><option>Isian Singkat</option><option>Esai</option><option>Campuran</option></select>
                </div>
              </div>
            </div>

            {/* AREA GENERATE & INLINE EDITING */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-3xl shadow-sm text-white">
                <h3 className="font-bold text-xl mb-4"><BrainCircuit className="w-6 h-6 mr-2 inline" /> Auto-Generate Soal AI</h3>
                <textarea value={quizMeta.kisiKisiManual || ''} onChange={e => setQuizMeta({...quizMeta, kisiKisiManual: e.target.value})} placeholder="Ketik/Paste kisi-kisi (Opsional, gunakan pemisah | untuk tabel otomatis)..." className="w-full p-3 rounded-xl text-gray-800 text-sm h-24 mb-3" />
                <button onClick={handleGenerateSoal} disabled={isGenerating} className="w-full bg-white text-purple-700 font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 flex justify-center items-center">{isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Meracik...</> : 'Generate Soal'}</button>
              </div>

              {/* DAFTAR SOAL INLINE EDITING */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Soal Terkumpul ({newQuizQuestions.length})</h3>
                    {newQuizQuestions.length > 0 && <button onClick={() => setNewQuizQuestions([])} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">Kosongkan</button>}
                </div>
                
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {newQuizQuestions.map((q, i) => (
                    <div key={q.id} className="p-5 rounded-2xl border flex flex-col gap-3 relative bg-gray-50 border-gray-200 shadow-sm transition hover:border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-xs">SOAL {i + 1}</span>
                        <div className="flex gap-2">
                          <select value={q.type} onChange={e => updateDraftQuestion(q.id, {type: e.target.value})} className="text-xs p-1 border rounded bg-white font-bold text-gray-700"><option value="pg">Pilihan Ganda</option><option value="pg_kompleks">PG Kompleks</option><option value="benar_salah">Benar Salah</option><option value="menjodohkan">Menjodohkan</option><option value="isian">Isian</option><option value="esai">Esai</option></select>
                          <button onClick={() => removeDraftQuestion(q.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      <textarea value={q.text || ''} onChange={e => updateDraftQuestion(q.id, {text: e.target.value})} className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-400 font-semibold" rows="2" placeholder="Teks soal..."/>
                      
                      {q.imagePrompt && (
                        <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-200"><strong>Saran Gambar AI:</strong> {q.imagePrompt}</div>
                      )}

                      {q.type === 'pg' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || ['', '', '', '']).map((opt, oIdx) => (
                            <div key={oIdx} className={`flex items-center p-2 border rounded-xl bg-white ${q.correct === oIdx ? 'border-green-400 bg-green-50' : ''}`}>
                              <input type="radio" checked={q.correct === oIdx} onChange={() => updateDraftQuestion(q.id, {correct: oIdx})} className="w-4 h-4 cursor-pointer text-green-500" />
                              <input type="text" value={opt || ''} onChange={(e) => { const newOpts=[...q.options]; newOpts[oIdx]=e.target.value; updateDraftQuestion(q.id, {options: newOpts}); }} className="flex-1 ml-2 text-sm bg-transparent focus:outline-none" placeholder={`Opsi ${String.fromCharCode(65+oIdx)}`} />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.type === 'pg_kompleks' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || ['', '', '', '']).map((opt, oIdx) => (
                            <div key={oIdx} className={`flex items-center p-2 border rounded-xl bg-white ${(q.correctKompleks || []).includes(oIdx) ? 'border-green-400 bg-green-50' : ''}`}>
                              <input type="checkbox" checked={(q.correctKompleks || []).includes(oIdx)} onChange={(e) => {
                                  let arr = [...(q.correctKompleks || [])];
                                  if(e.target.checked) arr.push(oIdx); else arr = arr.filter(idx => idx !== oIdx);
                                  updateDraftQuestion(q.id, {correctKompleks: arr});
                              }} className="w-4 h-4 cursor-pointer text-green-500" />
                              <input type="text" value={opt || ''} onChange={(e) => { const newOpts=[...q.options]; newOpts[oIdx]=e.target.value; updateDraftQuestion(q.id, {options: newOpts}); }} className="flex-1 ml-2 text-sm bg-transparent focus:outline-none" placeholder={`Opsi ${oIdx+1}`} />
                            </div>
                          ))}
                        </div>
                      )}

                      {(q.type === 'isian' || q.type === 'esai') && (
                         <input type="text" value={q.essayAnswer || ''} onChange={(e) => updateDraftQuestion(q.id, {essayAnswer: e.target.value})} placeholder="Kunci/Referensi Jawaban..." className="w-full p-3 border rounded-xl text-sm bg-green-50 text-green-800 font-bold" />
                      )}
                      
                      {q.type === 'benar_salah' && (
                          <div className="flex gap-2">
                             <button onClick={() => updateDraftQuestion(q.id, {benarSalahAnswer: 0})} className={`flex-1 py-2 text-sm rounded font-bold border ${q.benarSalahAnswer === 0 ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'}`}>Kunci: BENAR</button>
                             <button onClick={() => updateDraftQuestion(q.id, {benarSalahAnswer: 1})} className={`flex-1 py-2 text-sm rounded font-bold border ${q.benarSalahAnswer === 1 ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-300'}`}>Kunci: SALAH</button>
                          </div>
                      )}
                    </div>
                  ))}
                  
                  <button onClick={handleAddBlankQuestion} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-2xl font-bold hover:bg-gray-50">+ Tambah Soal Manual</button>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button onClick={() => exportToDocx({ meta: quizMeta, questions: newQuizQuestions })} className="flex-1 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold py-3 rounded-xl"><Download className="inline w-5 h-5 mr-2" /> Download DOCX</button>
                  <button onClick={handleSaveNewQuiz} disabled={isPublishing} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl disabled:opacity-50">{isPublishing ? 'Menerbitkan...' : 'Terbitkan Ujian'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <div className="relative min-h-screen bg-gray-50 font-sans">
      <MainApp />
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-700 via-purple-700 to-blue-700 text-white text-center py-3 font-black text-xs sm:text-sm md:text-lg tracking-[0.15em] shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-[9999] uppercase border-t-4 border-yellow-400">
        🚀 Developed by Andri-Guru-Disdik-Gunungkidul 🚀
      </div>
    </div>
  );
}