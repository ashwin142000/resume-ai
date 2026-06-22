"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { FileText, Loader2 } from "lucide-react";

export default function LoginPage() {
 const [isLogin, setIsLogin] = useState(true);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const handleAuth = async (e: React.FormEvent) => {
   e.preventDefault();
   setLoading(true);
   setError("");
   try {
     if (isLogin) {
       await signInWithEmailAndPassword(auth, email, password);
     } else {
       await createUserWithEmailAndPassword(auth, email, password);
     }
   } catch (err: any) {
     setError(err.message);
   } finally {
     setLoading(false);
   }
 };

 return (
   <div className="min-h-screen flex items-center justify-center p-4">
     <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-200">
       <div className="flex justify-center mb-6">
         <FileText className="text-blue-600 w-12 h-12" />
       </div>
       <h2 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Sign In to ResumeAI' : 'Create an Account'}</h2>
       {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">{error}</div>}
       
       <form onSubmit={handleAuth} className="space-y-4">
         <div>
           <label className="block text-sm font-medium mb-1">Email</label>
           <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full border p-2.5 rounded-md" />
         </div>
         <div>
           <label className="block text-sm font-medium mb-1">Password</label>
           <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full border p-2.5 rounded-md" />
         </div>
         <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-2.5 rounded-md font-medium hover:bg-blue-700 flex justify-center items-center">
           {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
         </button>
       </form>
       
       <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-blue-600">
         {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
       </button>
     </div>
   </div>
 );
}
