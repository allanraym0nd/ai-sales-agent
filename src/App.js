import React from 'react';
import { db, auth } from './firebase';
import { useState, useEffect, useRef } from 'react';
import { signOut, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Send, Bot, User, LogOut, Settings, Paperclip, X } from 'lucide-react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, deleteDoc, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function AISalesAgent() {
    const [messages, setMessages] = useState([])
    const [session, setSession] = useState(null)  
    const [newMessage, setNewMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false);
    const [chatSessions, setChatSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [isCreatingSession, setIsCreatingSession] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [uploadedFile, setUploadedFile] = useState(null)
    const [isUploadingFile, setIsUploadingFile] = useState(false)
    const [userProfile, setUserProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        interests: [],
        budgetRange: '',
        communicationStyle: 'Professional'
    });

    const messagesEndRef = useRef(null)

    const interestOptions = [
        "Software Solutions",
        "Hardware",
        "Consulting",
        "Training",
        "Support Services",
        "Custom Development"
    ]

    const budgetOptions = [
        "Under $10k",
        "$10k - $50k", 
        "$50k - $100k",
        "$100k+"
    ] 

    const ProfileModal = () => {
        if (!showProfileModal) return null;

        const handleInterestChange = (interest) => {
            setUserProfile(prev => ({
                ...prev,
                interests: prev.interests.includes(interest)
                    ? prev.interests.filter(i => i !== interest) 
                    : [...prev.interests, interest] 
            }));
        };

        const handleInputChange = (field, value) => {
            setUserProfile(prev => ({
                ...prev,
                [field]: value
            }));
        };

        const handleSaveProfile = async (e) => {
            e.preventDefault();
            try {
                const existingProfile = await loadUserProfile();
                
                if (existingProfile) {
                    await updateUserProfile(userProfile);
                    console.log('Profile updated successfully!');
                } else {
                    await createUserProfile(userProfile);
                    console.log('User profile Created!');
                }
                setShowProfileModal(false);
                alert("Profile saved successfully!");

            } catch (error) {
                console.error("Error saving profile:", error);
                alert("Failed to save profile. Please try again.");
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-light text-black">User Profile</h2>
                        <button
                            onClick={() => setShowProfileModal(false)}
                            className="text-gray-400 hover:text-black transition-colors text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        {/* Basic Information Section */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                            
                            {/* Full Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={userProfile.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {/* Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={userProfile.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                    placeholder="Enter your email"
                                />
                            </div>

                            {/* Phone */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={userProfile.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            {/* Company */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                                <input
                                    type="text"
                                    value={userProfile.company}
                                    onChange={(e) => handleInputChange('company', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                    placeholder="Enter your company name"
                                />
                            </div>

                            {/* Job Title */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                <input
                                    type="text"
                                    value={userProfile.jobTitle}
                                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                    placeholder="Enter your job title"
                                />
                            </div>
                        </div>

                        {/* Preferences Section */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
                            
                            {/* Interests */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Interested In:</label>
                                <div className="space-y-2">
                                    {interestOptions.map((interest) => (
                                        <label key={interest} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={userProfile.interests.includes(interest)}
                                                onChange={() => handleInterestChange(interest)}
                                                className="rounded border-gray-300 text-black focus:ring-black mr-3"
                                            />
                                            <span className="text-sm text-gray-700">{interest}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Budget Range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Budget Range:</label>
                                <div className="space-y-2">
                                    {budgetOptions.map((budget) => (
                                        <label key={budget} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="budgetRange"
                                                value={budget}
                                                checked={userProfile.budgetRange === budget}
                                                onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                                                className="text-black focus:ring-black mr-3"
                                            />
                                            <span className="text-sm text-gray-700">{budget}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Communication Style */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Communication Style:</label>
                                <div className="space-y-2">
                                    {['Professional', 'Casual'].map((style) => (
                                        <label key={style} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="communicationStyle"
                                                value={style}
                                                checked={userProfile.communicationStyle === style}
                                                onChange={(e) => handleInputChange('communicationStyle', e.target.value)}
                                                className="text-black focus:ring-black mr-3"
                                            />
                                            <span className="text-sm text-gray-700">{style}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowProfileModal(false)}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-black text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-all font-medium"
                            >
                                Save Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setSession(user)   
        })

        return unsubscribe;
    }, [])

    const signUserIn = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
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

    const loadChatSession = () => {
        if (!session?.uid) return;

        const q = 
            query(collection(db, 'chatSessions'),
            where("userId", '==', session.uid),
            orderBy("createdAt", "desc")
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
            if (!currentSessionId && sessionList.length > 0) {
                setCurrentSessionId(sessionList[0].id);
            }
        });
        return unsubscribe; 
    };

    useEffect(() => {
        if (!session?.uid) {
            setCurrentSessionId(null)
            setMessages([])
            setChatSessions([])
            return;
        }

        const unsubscribe = loadChatSession();
        return unsubscribe;

    }, [session?.uid])

    //listening for messages 
    useEffect(() => {
        // if no user dont return anything
        if (!session?.uid || !currentSessionId) {
            return;
        }

        const setUpMessageListener = () => {
            // query for message collection - GET BOTH USER AND AI MESSAGES
            const q = 
                query(collection(db, "messages"),
                // filter message by user ID OR ai-bot
                where("userId", "in", [session.uid, "ai-bot"]),
                where("sessionId", '==', currentSessionId),
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
    }, [session?.uid, currentSessionId]) // re-run when user changes !

    // creating a session for new users - FIXED: Added null check
    const createNewSession = async () => {
        if (!session?.uid) return; 

        setIsCreatingSession(true);
        try {
            const newSession = {
                userId: session.uid,
                title: 'New Chat',
                createdAt: serverTimestamp(),
                lastMessageAt: serverTimestamp(),
                messageCount: 0
            };

            const docRef = await addDoc(collection(db, 'chatSessions'), newSession)
            setCurrentSessionId(docRef.id);
            setMessages([])

            console.log('New Session Created :', docRef.id)
        } catch (error) {
            console.error("Failed creating new chat!")
        } finally {
            setIsCreatingSession(false)
        }
    };

    useEffect(() => {
        if (session?.uid && chatSessions.length === 0 && !isCreatingSession) {
            createNewSession();
        }
    }, [session?.uid, chatSessions.length, isCreatingSession])

    const sendMessage = async (e) => {
        e.preventDefault();
        
        if (!session?.uid || !newMessage.trim() || !currentSessionId) {
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
                sessionId: currentSessionId,
                userId: session.uid,
                userName: session.displayName,
            });

            await updateDoc(doc(db, 'chatSessions', currentSessionId), {
                lastMessageAt: serverTimestamp(),
                messageCount: messages.length + 1
            })

            const currentSession = chatSessions.find((c) => c.id === currentSessionId)
            if (currentSession && currentSession.title === 'New Chat' && messages.length === 0) {
                const autoTitle = userMessage.length > 30
                    ? userMessage.substring(0, 30) + "..." 
                    : userMessage
                await updateSessionTitle(currentSessionId, autoTitle)
            }

            //  Get AI response
            const aiResponse = await getAIResponse(userMessage, userProfile);
            
            //  Save AI message
            await addDoc(collection(db, "messages"), {
                text: aiResponse,
                sender: "ai",
                timestamp: serverTimestamp(),
                sessionId: currentSessionId,
                userId: "ai-bot", 
                userName: "AI Sales Agent",
            });

            await updateDoc(doc(db, 'chatSessions', currentSessionId), {
                lastMessageAt: serverTimestamp(),
                messageCount: messages.length + 2
            })
            
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
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

    const getAIResponse = async (userMessage, userProfile) => {
        try {

            console.log("Gemini API Key", process.env.REACT_APP_GEMINI_API_KEY ? "Present" : "Missing");

            let salesPrompt = `You are a helpful AI sales assistant for ${userProfile.name|| 'Our beloved Customer'} ${userProfile.company ? `from ${userProfile.company}` : ''}
            
                Customer Profile: 
                -Name: ${userProfile.fullName || 'Not Provided'}
                -Company: ${userProfile.company || 'Not Provided'}
                -Job Title: ${userProfile.jobTitle || 'Not Provided'}
                -Interests: ${userProfile.interests.length > 0 ? userProfile.interests.join(', ' ) :  'Not Provided'}
                -Budget Range: ${userProfile.budgetRange || 'Not Provided'}
                -Communication Style: ${userProfile.communicationStyle || 'Professional'}

                    Based on this information : 
                    -Tailor your responses to their interests: ${userProfile.interests.join(', ')}
                    -Keep their budget range in mind: ${userProfile.budgetRange}
                    -Use a ${userProfile.communicationStyle.toLowerCase()} tone
                    -${userProfile.budgetRange === 'under $10k' ? 'Provide cost-effective solutions.' : ''}  
                    -Make relevant product recommendations`

                    if(uploadedFile && uploadedFile.type === 'pdf'){
                        salesPrompt += `\n\nThe customer has shared a document: "${uploadedFile.name}"\nDocument content:\n${uploadedFile.data}\n\nPlease analyze this document and incorporate insights into your response.`
                    }
                    if(uploadedFile && uploadedFile.type === 'image'){
                        salesPrompt += `\n\nThe customer has shared an image: "${uploadedFile.name}". Please analyze the image and provide relevant insights.`;
                    }
            
             salesPrompt += `\n\nCustomer Message: ${userMessage}`

             const requestBody = {
                contents: [{
                    parts: [{
                        text: salesPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 150,
                    topP: 0.8,
                    topK: 40
                }
             };

             if(uploadedFile && uploadedFile.type === 'image') {
                requestBody.contents[0].parts.push({
                    inline_data: {
                        mime_type: uploadedFile.mimeType, // Tells the API what kind of image it is
                        data: uploadedFile.data.split(',')[1]
                    }
                })
             }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
                method: 'POST', 
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to get AI response')
            }
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error getting AI response', error)
            return 'Sorry, im having trouble responding right now. Please try again!'

        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            sendMessage(e);
        }
    }
      
    const deleteSession = async (sessionId) => {
        if (!session?.uid) return;

        try {
            await deleteDoc(doc(db, "chatSessions", sessionId));

            if (currentSessionId === sessionId) {
                const remainingSessions = chatSessions.filter((c) => c.id !== sessionId) 
                if (remainingSessions.length > 0) {
                    setCurrentSessionId(remainingSessions[0].id)
                } else {
                    createNewSession();
                }
            }

            console.log("Session Deleted:", sessionId)
        } catch (error) {
            console.log("Error Deleting Session :", error)
        }
    }
    
    // Switch to a different session
    const switchToSession = (sessionId) => {
        setCurrentSessionId(sessionId);
    }

    const updateSessionTitle = async (sessionId, newTitle) => { 
        if (!session?.uid) return;

        try {
            await updateDoc(doc(db, "chatSessions", sessionId), {
                title: newTitle
            });
            console.log(" Chat Title Updated! ", sessionId)
        }
        catch (error) {
            console.log("Failed to update title", error)
        }
    }

    /**
     * @param {Object} profileData - The profile data to save
     * @returns {Promise} - Resolves when profile is created
     */
    const createUserProfile = async (profileData) => {
        if (!session?.uid) {
            throw new Error('User not authenticated')
        }

        try {
            await setDoc(doc(db, "userProfiles", session.uid), {
                userId: session.uid,
                ...profileData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })

            console.log('User Profile Created Successfully')
        } catch (error) {
            console.error("Failed to create user profile", error)
            throw error; 
        }
    }

    /**
     * Updates user profile in Firestore
     * @param {Object} profileData - The profile data to save
     * @returns {Promise} - Resolves when profile is updated
     */
    const updateUserProfile = async (profileData) => {
        if (!session?.uid) {
            throw new Error("User not authenticated")
        }

        try {
            await updateDoc(doc(db, 'userProfiles', session.uid), {
                ...profileData, 
                updatedAt: serverTimestamp()
            })

            console.log("Successfully updated user profile")
        } catch (error) {
            console.error("Failed to update user profile", error)
            throw error
        }
    }

    /**
     * Loads user profile from Firestore
     * @returns {Promise<Object|null>} - Returns profile data or null if not found
     */
    const loadUserProfile = async () => {
        if (!session?.uid) 
            return null; 

        try {
            const profileDoc = await getDoc(doc(db, 'userProfiles', session.uid))

            if (profileDoc.exists()) { 
                console.log("User profile exists")
                return ({ id: profileDoc.id, ...profileDoc.data() })
            } else {
                console.log("User profile not found!")
                return null;
            } 

        } catch (error) {
            console.error("Could not fetch user profile", error)
            return null; 
        }
    }

    // Load user profile when user signs in
    useEffect(() => {
        if (session?.uid) {
            loadUserProfile().then(profile => {
                if (profile) {
                    setUserProfile({
                        fullName: profile.fullName || '',
                        email: profile.email || session.email || '',
                        phone: profile.phone || '',
                        company: profile.company || '',
                        jobTitle: profile.jobTitle || '',
                        interests: profile.interests || [],
                        budgetRange: profile.budgetRange || '',
                        communicationStyle: profile.communicationStyle || 'Professional'
                    });
                    console.log('Profile loaded successfully')
                } else {
                    setUserProfile({
                        fullName: session.displayName || '',
                        email: session.email || '',
                        phone: '',
                        company: '',
                        jobTitle: '',
                        interests: [],
                        budgetRange: '',
                        communicationStyle: 'Professional'
                    })
                    console.log('No profile found, using default values')
                }
            }).catch(error => {
                console.error('Failed to load user profile', error)

                setUserProfile({
                    fullName: session.displayName || '',
                    email: session.email || '',
                    phone: '',
                    company: '',
                    jobTitle: '',
                    interests: [],
                    budgetRange: '',
                    communicationStyle: 'Professional'
                })
            })
        }
    }, [session?.uid]);

    const handleFileUpload = async(e) => {
        const file = e.target.files[0]
        if(!file) return ; 

        if(file.size > 5 * 1024* 1024) {
            alert('Maximum file size is 5MB')
            return ; 
        } 

        setIsUploadingFile(true); 

        try {
             if(file.type.startsWith('image/')) {
                const base64 = await convertToBase64(file);
                setUploadedFile({
                    name: file.name,
                    type: 'image',
                    data: base64,
                    mimeType: file.type
                })
             } else if(file.type === "application/pdf"){
                // For PDF, we'll just store the file info for now
                // In a real app, you'd need a backend to process PDFs
                setUploadedFile({
                    name: file.name,
                    type: 'pdf',
                    data: 'PDF content would be extracted here',
                    mimeType: file.type
                })
                alert('PDF upload is ready. Note: PDF text extraction requires backend processing.')
             } else {
                alert('Please upload an image (JPG, PNG) or PDF file')
             }
        } catch (error) {
            console.error("Could not upload selected file", error)
            alert('Error processing file. Please try again.')
        }finally {
            setIsUploadingFile(false)
        }
    };

    const convertToBase64 = (file) =>{
        return new Promise((resolve,reject) => {
            const fileReader = new FileReader()
            fileReader.readAsDataURL(file);
            fileReader.onload = () => resolve(fileReader.result)
            fileReader.onerror = (error) => reject(error)
        });
    }

    const removeFileUpload = ()=> {
        setUploadedFile(null);
    }

    if (!session?.uid) {
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
        <div className="min-h-screen bg-black p-6 flex items-center justify-center">
            <ProfileModal />
            <div className="w-full max-w-7xl h-[90vh] bg-white rounded-3xl shadow-2xl flex overflow-hidden border">
                
                {/* Sidebar - Chat Sessions */}
                <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-gray-200">
                        <button
                            onClick={createNewSession}
                            disabled={isCreatingSession}
                            className="w-full bg-black text-white py-3 px-4 rounded-2xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm disabled:opacity-50 mb-3"
                        >
                            {isCreatingSession ? 'Creating...' : '+ New Chat'}
                        </button>
                        <button
                            onClick={() => setShowProfileModal(true)}
                            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-2xl hover:bg-gray-200 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <Settings size={16} />
                            Profile Settings
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
                            <div key={message.id} className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.sender === 'ai' && (
                                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                )}
                                
                                <div className={`max-w-[70%] rounded-2xl p-4 ${
                                    message.sender === 'user'
                                        ? 'bg-black text-white'
                                        : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                }`}>
                                    <p className="text-sm leading-relaxed">{message.text}</p>
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 border-opacity-20">
                                        <span className={`text-xs ${
                                            message.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                            {message.sender === 'user' ? 'You' : 'AI Sales Agent'}
                                        </span>
                                        {message.sender === 'user' && (
                                            <button
                                                onClick={() => deleteMessage(message)}
                                                className="text-xs text-gray-300 hover:text-white transition-colors opacity-70 hover:opacity-100"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {message.sender === 'user' && (
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User size={16} className="text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-4 justify-start">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div className="max-w-[70%] rounded-2xl p-4 bg-white text-gray-900 shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Welcome message for new sessions */}
                        {messages.length === 0 && !isLoading && (
                            <div className="flex gap-4 justify-start">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div className="max-w-[70%] rounded-2xl p-4 bg-white text-gray-900 shadow-sm border border-gray-200">
                                    <p className="text-sm leading-relaxed">
                                        Hello! I'm your AI Sales Agent. I'm here to help you find the perfect products and services for your needs. 
                                        How can I assist you today?
                                    </p>
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                                        <span className="text-xs text-gray-500">AI Sales Agent</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
<div className="bg-white border-t border-gray-200 p-6">
    {/* File Upload Section */}
    {uploadedFile && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {uploadedFile.type === 'image' ? '🖼️' : '📄'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                            {uploadedFile.type === 'image' ? 'Image uploaded' : 'PDF text extracted'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={removeFileUpload}
                    className="text-gray-400 hover:text-red-500 text-sm"
                >
                    Remove
                </button>
            </div>
        </div>
    )}
    
    <form onSubmit={sendMessage} className="flex gap-4">
        {/* File Upload Button */}
        <div className="flex items-end">
            <label className="cursor-pointer">
                <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingFile}
                />
                <div className="bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-colors">
                    {isUploadingFile ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="text-xl">📄</span>
                    )}
                </div>
            </label>
        </div>
        
        <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white transition-all text-sm"
            disabled={isLoading}
        />
        
        <button
            type="submit"
            disabled={!newMessage.trim()} 
            // || isLoading}
            className="bg-black text-white px-6 py-4 rounded-2xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            <Send size={18} />
        </button>
    </form>
</div>
                </div>
            </div>
        </div>
    );
}