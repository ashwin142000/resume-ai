"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Settings() {
 const { user } = useAuth();
 const [apiKey, setApiKey] = useState("");
 const [saved, setSaved] = useState(false);

 useEffect(() => {
   if (!user) return;
   getDoc(doc(db, "users", user.uid, "settings", "config")).then(d => {
     if(d.exists()) setApiKey(d.data().customApiKey || "");
   });
 }, [user]);

 const saveKey = async () => {
   await setDoc(doc(db, "users", user!.uid, "settings", "config"), { customApiKey: apiKey }, {merge: true});
   setSaved(true); setTimeout(() => setSaved(false), 2000);
 };

 return (
   <div className="space-y-6 max-w-lg">
     <h1 className="text-2xl font-bold">Settings</h1>
     <div className="bg-white p-6 rounded-xl border">
       <label className="block font-medium mb-2">Gemini API Key</label>
       <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} className="w-full border p-2 rounded mb-4" />
       <button onClick={saveKey} className="bg-blue-600 text-white px-4 py-2 rounded">{saved ? 'Saved!' : 'Save Config'}</button>
     </div>
   </div>
 );
}