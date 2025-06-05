import React from 'react';
import { db,auth,provider } from './firebase';
import { useState,useEffect } from 'react';
import { signOut,signInWithPopup } from 'firebase/auth';
import { Send, Bot, User } from 'lucide-react';
import { addDoc,collection,onSnapshot,orderBy,query,serverTimestamp } from 'firebase/firestore';

export default function AISalesAgent() {

    const[messages,setMessages] = useState([])
    const[session,setSession] = useState([])
    const[newMessage, setNewMessage] =useState('')


    console.log(session)

    const signUserIn = async () => {
        const signInWithGoogle = await signInWithPopup(auth,provider);
    }

    const signUserOut = async () => {
       await signOut(auth);
    }
useEffect(()=> {

  const setUpMessageListener = async () => {
    // query for message collection
     const q = query(collection(db, "messages"),
     orderBy("timestamp", "asc"));
  
// real-time listener
const unsubscribe = onSnapshot(q, (querySnapshot) => {
  const messageList = [];
  querySnapshot.forEach((doc) => {
      messageList.push({
        id: doc.id,
        ...doc.data()
  });
  });
  setMessages(messageList)

});
// cleanup
 return unsubscribe();
}
setUpMessageListener
},[])

const sendMessage = async(e) => {
  e.preventDefault();
    
  await addDoc(collection(db, "messages"), {

    text: newMessage,
    sender: "user",
    timestamp:serverTimestamp(),
    userId:session?.uid,
    userName:session?.displayName,


  });

setNewMessage('');
  
}

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bot size={24} />
          AI Sales Agent
        </h1>
        <p className="text-blue-100 text-sm">Your intelligent sales assistant</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Message */}
        <div className="flex justify-start">
          <div className="bg-white text-gray-800 border max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow">
            <div className="flex items-start gap-2">
              <Bot size={16} className="mt-1 text-blue-500" />
              <div>
                <p className="text-sm">Hello! I'm your AI sales assistant. How can I help you today?</p>
                <p className="text-xs mt-1 text-gray-500">2:30 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className="flex justify-end">
          <div className="bg-blue-500 text-white max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow">
            <div className="flex items-start gap-2">
              <User size={16} className="mt-1" />
              <div>
                <p className="text-sm">Hi, I need help with finding the right product for my business.</p>
                <p className="text-xs mt-1 text-blue-100">2:31 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Another AI Message */}
        <div className="flex justify-start">
          <div className="bg-white text-gray-800 border max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow">
            <div className="flex items-start gap-2">
              <Bot size={16} className="mt-1 text-blue-500" />
              <div>
                <p className="text-sm">I'd be happy to help you find the perfect solution! Can you tell me more about your business and what specific challenges you're facing?</p>
                <p className="text-xs mt-1 text-gray-500">2:31 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Typing indicator (static) */}
        <div className="flex justify-start">
          <div className="bg-white text-gray-800 border max-w-xs px-4 py-2 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-blue-500" />
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <textarea
            placeholder="Type your message here..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            rows={1}
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

