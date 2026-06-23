"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Save, Loader2, Key, FileText, Wand2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid, "settings", "config")).then(d => {
        if (d.exists()) {
          // Fallback to 'customApiKey' just in case you already saved a Gemini key earlier
          setGeminiKey(d.data().geminiApiKey || d.data().customApiKey || "");
          setGroqKey(d.data().groqApiKey || "");
        }
        setLoading(false);
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      await setDoc(doc(db, "users", user!.uid, "settings", "config"), {
        geminiApiKey: geminiKey.trim(),
        groqApiKey: groqKey.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSavedMsg("Keys saved successfully!");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (error) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Configuration</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your AI providers for reading PDFs and writing resumes.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-8">
        
        {/* Gemini API Key Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Google Gemini API Key</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Used exclusively for the <strong>Master Resumes</strong> page to read and extract text from uploaded PDF files. <br/>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Get a free key from Google AI Studio</a>.
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key size={16} className="text-gray-400" />
            </div>
            <input 
              type="password" 
              value={geminiKey} 
              onChange={e => setGeminiKey(e.target.value)} 
              placeholder="AIzaSy..." 
              className="w-full pl-10 border p-2.5 rounded-md bg-gray-50 focus:bg-white"
            />
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Groq API Key Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="text-orange-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Groq API Key (Llama 3.3)</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Used exclusively for the <strong>Tailor Resume</strong> page. Groq runs Llama 3.3 insanely fast to write your tailored resume. <br/>
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Get a free key from Groq Console</a>.
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key size={16} className="text-gray-400" />
            </div>
            <input 
              type="password" 
              value={groqKey} 
              onChange={e => setGroqKey(e.target.value)} 
              placeholder="gsk_..." 
              className="w-full pl-10 border p-2.5 rounded-md bg-gray-50 focus:bg-white"
            />
          </div>
        </section>

        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
          <p className="text-sm text-green-600 font-medium">{savedMsg}</p>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
