import React from 'react';
import { db,auth,provider } from './firebase';
import { useState,useEffect } from 'react';
import { signOut,signInWithPopup,getAuth,GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Send, Bot, User } from 'lucide-react';
import { addDoc,collection,onSnapshot,orderBy,query,serverTimestamp } from 'firebase/firestore';

export default function AISalesAgent() {

    const[messages,setMessages] = useState([])
    const[session,setSession] = useState([])
    const[newMessage, setNewMessage] =useState('')
    const[isLoading,setIsLoading]=useState(false);

// auth state listener
useEffect(()=> {
   const unsubscribe = onAuthStateChanged( auth ,(user)=>  {
  setSession(user)   
})

return unsubscribe;m
},[])

       const signUserIn = async () => {
      const provider = new GoogleAuthProvider();
        const signInWithGoogle = await signInWithPopup(auth,provider);
    }

    const signUserOut = async () => {
       await signOut(auth);
    }


    console.log(session)
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
 return unsubscribe;
}
setUpMessageListener()
},[])

const sendMessage = async(e) => {
  e.preventDefault();
  
  if(!session?.uid || !newMessage.trim()) {
    console.log("user not signed in or empty message");
    return;
  }

  const userMessage = newMessage; 
  setNewMessage(''); 
  setIsLoading(true);
  
  try {
    
    await addDoc(collection(db, "messages"), {
      text: userMessage,
      sender: "user",
      timestamp: serverTimestamp(),
      userId: session.uid,
      userName: session.displayName,
    });

    //  Get AI response
    const aiResponse = await getAIResponse(userMessage);
    
    //  Save AI message
    await addDoc(collection(db, "messages"), {
      text: aiResponse,
      sender: "ai",
      timestamp: serverTimestamp(),
      userId: "ai-bot", 
      userName: "AI Sales Agent",
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
   
  } finally  {
    setIsLoading(false)
  }
}

const getAIResponse = async() => {
  
}

if(!session?.uid) {
  return (
    <div className="w-full flex h-screen justify-center items-center">
      <button
      className="bg-blue-200 text-white p-4"
      onClick={signUserIn}>
        Sign in with Google to chat
        </button>
    </div>
  )
} else {

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
       {/* Replace all your hardcoded message divs with this: */}
{messages.map((message) => (
  <div key={message.id} className={message.sender === 'user' ? "flex justify-end" : "flex justify-start"}>
    <div className={message.sender === 'user' 
      ? "bg-blue-500 text-white max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow"
      : "bg-white text-gray-800 border max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow"
    }>
      <div className="flex items-start gap-2">
        {message.sender === 'user' ? (
          <User size={16} className="mt-1" />
        ) : (
          <Bot size={16} className="mt-1 text-blue-500" />
        )}
        <div>
          <p className="text-sm">{message.text}</p>
          <p className={message.sender === 'user' 
            ? "text-xs mt-1 text-blue-100" 
            : "text-xs mt-1 text-gray-500"
          }>
            {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
          </p>
        </div>
      </div>
    </div>
  </div>
))}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e)=> setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            rows={1}
          />
          <button 
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
}
