import React from 'react';
import { db,auth, } from './firebase';
import { useState,useEffect,useRef } from 'react';
import { signOut,signInWithPopup,getAuth,GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Send, Bot, User, LogOut } from 'lucide-react';
import { addDoc,collection,onSnapshot,orderBy,query,serverTimestamp } from 'firebase/firestore';


export default function AISalesAgent() {

    const[messages,setMessages] = useState([])
    const[session,setSession] = useState(null)  
    const[newMessage, setNewMessage] =useState('')
    const[isLoading,setIsLoading]=useState(false);


    const scrollToText =useRef(null)

// auth state listener
useEffect(()=> {
   const unsubscribe = onAuthStateChanged( auth ,(user)=>  {
  setSession(user)   
})

return unsubscribe;
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

  const setUpMessageListener =  () => {
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

 const unsubscribe = setUpMessageListener()
  return unsubscribe;
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

function handleScrollToText() {

  scrollToText.current.scrollIntoView({
    behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
  })



}
 

const getAIResponse = async(userMessage) => {
try {


console.log("API Key:", process.env.REACT_APP_OPENAI_API_KEY ? "Present" : "Missing");
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method:'POST', 
  headers: {
    'Content-type': 'application/json',
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model:'gpt-3.5-turbo',
    messages: [
      {
        role:'system',
        content:"you are a helpful AI sales assistant. Help customers find the right products and answer their questions in a friendly, professional manner."
      },
      {
        role:'user',
        content:userMessage
      }

    ],
    max_tokens: 150,
    temperature: 0.7
  })
});
  const data = await response.json();

  if(!response.ok) {
    throw new Error(data.error?.message || 'Failed to get AI response')
  }
  return data.choices[0].message.content
} catch(error) {
  console.error('Error getting AI response')
  return 'Sorry, im having trouble responding right now. Please try again!'

}
}

if(!session?.uid) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-12 shadow-2xl max-w-md w-full text-center border">
        <div className="mb-8">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-light text-black mb-3">AI Sales Agent</h1>
          <p className="text-gray-600 font-light">Your intelligent sales assistant</p>
        </div>
        <button
          className="w-full bg-black text-white py-4 px-8 rounded-2xl hover:bg-gray-800 transition-all duration-300 font-medium text-lg"
          onClick={signUserIn}>
          Sign in with Google
        </button>
      </div>
    </div>
  )
} else {

  return (
    <div className="min-h-screen bg-black p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-black">AI Sales Agent</h1>
                <p className="text-gray-500 text-sm font-light">Your intelligent sales assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 text-sm font-light">Welcome, {session.displayName}</span>
              <button
                onClick={signUserOut}
                className="text-gray-400 hover:text-black transition-colors p-3 rounded-xl hover:bg-gray-50"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50">
          {messages.map((message) => (
            <div key={message.id} className={message.sender === 'user' ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-sm lg:max-w-lg px-6 py-4 rounded-3xl shadow-sm ${
                message.sender === 'user' 
                  ? "bg-black text-white" 
                  : "bg-white text-gray-900 border border-gray-200"
              }`}>
                <div className="flex items-start gap-4">
                  {message.sender === 'user' ? (
                    <User size={18} className="mt-1 opacity-80" />
                  ) : (
                    <Bot size={18} className="mt-1 text-gray-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed font-light">{message.text}</p>
                    <p className={`text-xs mt-3 font-light ${
                      message.sender === 'user' 
                        ? "text-gray-300" 
                        : "text-gray-400"
                    }`}>
                      {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 max-w-xs px-6 py-4 rounded-3xl shadow-sm">
                <div className="flex items-center gap-4">
                  <Bot size={18} className="text-gray-600" />
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div ref={scrollToText}
        className="bg-white border-t border-gray-200 p-8">
          <div className="flex gap-4">
            <textarea
              value={newMessage}
              onChange={(e)=> setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white resize-none transition-all duration-200 font-light"
              rows={1}
            />
            <button 
              onClick={sendMessage}

              className="bg-black text-white px-8 py-4 rounded-2xl hover:bg-gray-800 transition-all duration-200 shadow-sm">
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
}