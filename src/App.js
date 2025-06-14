import React from 'react';
import { db,auth, } from './firebase';
import { useState,useEffect,useRef } from 'react';
import { signOut,signInWithPopup,getAuth,GoogleAuthProvider, onAuthStateChanged} from 'firebase/auth';
import { Send, Bot, User, LogOut } from 'lucide-react';
import { addDoc,collection,onSnapshot,orderBy,query,serverTimestamp,where,deleteDoc,doc,getDoc,limit,updateDoc } from 'firebase/firestore';


export default function AISalesAgent() {

    const[messages,setMessages] = useState([])
    const[session,setSession] = useState(null)  
    const[newMessage, setNewMessage] =useState('')
    const[isLoading,setIsLoading]=useState(false);
    const[chatSessions,setChatSessions] =useState([])
    const[currentSessionId,setCurrentSessionId]=useState(null)
    const[isCreatingSession,setIsCreatingSession]=useState(false)

    const messagesEndRef =useRef(null)

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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fixed scroll function
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            });
        }
    };

    useEffect(()=> {
      if(!session?.uid){
        setCurrentSessionId(null)
        setMessages([])
        setChatSessions([])
          return;
      }

      const unsubscribe = loadChatSession();
      return unsubscribe;

    },[session?.uid])

    //listening for messages 
    useEffect(()=> {
    // if no user dont return anything
      if(!session?.uid || !currentSessionId){
        return ;
      }

      const setUpMessageListener =  () => {
        // query for message collection - GET BOTH USER AND AI MESSAGES
         const q = 
         query(collection(db, "messages"),
         // filter message by user ID OR ai-bot
         where("userId", "in", [session.uid, "ai-bot"]),
         where("sessionId", '==', currentSessionId), // Fixed: was userId
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
    },[session?.uid,currentSessionId]) // re-run when user changes !

  // creating a session for new users - FIXED: Added null check
  useEffect(()=> {
  if(session?.uid && chatSessions.length === 0 && !isCreatingSession){
        createNewSession();
  }
},[session?.uid, chatSessions.length, isCreatingSession]) // Fixed: session.uid to session?.uid

    const sendMessage = async(e) => {
      e.preventDefault();
      
      if(!session?.uid || !newMessage.trim() || !currentSessionId) {
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
          sessionId:currentSessionId,
          userId: session.uid,
          userName: session.displayName,
        });

        await updateDoc(doc(db,'chatSessions',currentSessionId),{ // Fixed: chatSession to chatSessions
          lastMessageAt:serverTimestamp(),
          messageCount:messages.length + 1
        })

        const currentSession = chatSessions.find((c)=> c.id === currentSessionId)
         if(currentSession && currentSession.title === 'New Chat' && messages.length === 0) {
          const autoTitle = userMessage.length > 30
          ? userMessage.substring(0, 30) + "..." 
          : userMessage
         await  updateSessionTitle(currentSessionId,autoTitle)
         }

        //  Get AI response
        const aiResponse = await getAIResponse(userMessage);
        
        //  Save AI message
        await addDoc(collection(db, "messages"), {
          text: aiResponse,
          sender: "ai",
          timestamp: serverTimestamp(),
          sessionId:currentSessionId,
          userId: "ai-bot", 
          userName: "AI Sales Agent",
        });

         await updateDoc(doc(db,'chatSessions',currentSessionId),{ // Fixed: chatSession to chatSessions
          lastMessageAt:serverTimestamp(),
          messageCount:messages.length + 2
        })
        
      } catch (error) {
        console.error("Error sending message:", error);
       
      } finally  {
        setIsLoading(false)
      }
    }

    
    const deleteMessage = async (message) => {
      if (!session?.uid) return; 

      // Only allow deletion of own messages
      if (message.userId !== session.uid) {
        console.log("You cannot delete other users messages!")
        return;
      }

      try {
        await deleteDoc(doc(db, 'messages', message.id));
      } catch (error) {
        console.error("There was an error deleting the message:", error) 
      }
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

    const handleKeyPress = (e) =>{
        if(e.key === 'Enter'){
          e.preventDefault()
          sendMessage(e);
        }
    }

    // creating a new chat Session
    const createNewSession = async () => {
      if(!session?.uid) return; 

       setIsCreatingSession(true);
      try{
           const newSession =  {
             userId: session.uid,
             title: 'New Chat',
             createdAt: serverTimestamp(),
             lastMessageAt: serverTimestamp(),
             messageCount: 0
           };

           const docRef = await addDoc(collection(db,'chatSessions'), newSession) // Fixed: chatSession to chatSessions
           setCurrentSessionId(docRef.id);
           setMessages([])

           console.log('New Session Created :', docRef.id)
      } catch(error) {
        console.error("Failed creating new chat!")
      } finally {
        setIsCreatingSession(false)
      }
    };

    const loadChatSession = () =>{
      if(!session?.uid) return;

        const q = 
        query(collection(db, 'chatSessions'), // Fixed: chatSession to chatSessions
        where("userId", '==', session.uid), // Fixed: was "session.uid"
        orderBy("createdAt", "desc") // Fixed: was "timestamp"
      );

      // updating the chat list in real-time
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sessionList = [];
        querySnapshot.forEach((doc) => {
            sessionList.push({
              id: doc.id,
              ...doc.data()
            });
        });
        setChatSessions(sessionList);
        // select first chat if none is selected !
        if(!currentSessionId && sessionList.length > 0){
          setCurrentSessionId(sessionList[0].id); // Fixed: was setChatSessions
        }
      });
      return unsubscribe; 
    };
      
    const deleteSession = async (sessionId) =>{
      if(!session?.uid) return ;

      try{
        await deleteDoc(doc(db,"chatSessions",sessionId)); // Fixed: chatSession to chatSessions

        if(currentSessionId === sessionId) {
          const remainingSessions = chatSessions.filter((c)=> c.id !== sessionId) 
          if(remainingSessions.length > 0 ){
            setCurrentSessionId(remainingSessions[0].id)
          } else {
            createNewSession();
          }
        }

        console.log("Session Deleted:", sessionId)
      }catch(error){
        console.log("Error Deleting Session :", error)
      }
    }
    
    // Switch to a different session
    const switchToSession = (sessionId) =>{
      setCurrentSessionId(sessionId);
    }

    const updateSessionTitle = async (sessionId, newTitle) => { 
     if(!session?.uid) return;

     try{
      await updateDoc(doc(db,"chatSessions", sessionId), { // Fixed: chatSession to chatSessions
        title: newTitle
      });
        console.log(" Chat Title Updated! ", sessionId)
    }
      catch(error){
          console.log("Failed to update title", error)
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
    }

    
    return (
        <div className="min-h-screen bg-white p-6 flex items-center justify-center">
          <div className="w-full max-w-7xl h-[90vh] bg-white rounded-3xl shadow-2xl flex overflow-hidden border">
            
            {/* Sidebar - Chat Sessions */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-200">
                <button
                  onClick={createNewSession}
                  disabled={isCreatingSession}
                  className="w-full bg-black text-white py-3 px-4 rounded-2xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm disabled:opacity-50"
                >
                  {isCreatingSession ? 'Creating...' : '+ New Chat'}
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chatSessions.map((chatSession) => (
                  <div
                    key={chatSession.id}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      currentSessionId === chatSession.id
                        ? 'bg-white shadow-sm border border-gray-200'
                        : 'hover:bg-white hover:shadow-sm'
                    }`}
                    onClick={() => switchToSession(chatSession.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chatSession.title || 'New Chat'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {chatSession.messageCount || 0} messages
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {chatSession.lastMessageAt?.toDate?.()?.toLocaleDateString() || 'Today'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(chatSession.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                
                {chatSessions.length === 0 && !isCreatingSession && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No chat sessions yet.
                    <br />
                    Create your first chat!
                  </div>
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
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
                  <div className="relative group">
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
                    {message.sender === 'user' && message.userId === session.uid && (
                      <button
                        onClick={() => deleteMessage(message)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
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
               <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-8">
              <div className="flex gap-4">
                <textarea
                  onKeyPress={handleKeyPress}
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
        </div>
      );
}