import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [expandedPitch, setExpandedPitch] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadPitches(user.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadPitches = async (uid) => {
    try {
      console.log("Loading pitches for user:", uid);
      
      // First try with orderBy createdAt
      let q = query(
        collection(db, "pitches"), 
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      );
      
      let snap;
      try {
        snap = await getDocs(q);
        console.log("Pitches loaded with createdAt order:", snap.docs.length);
      } catch (orderError) {
        console.log("OrderBy createdAt failed, trying without order:", orderError.message);
        // If orderBy fails, try without it
        q = query(
          collection(db, "pitches"), 
          where("uid", "==", uid)
        );
        snap = await getDocs(q);
        console.log("Pitches loaded without order:", snap.docs.length);
      }
      
      const pitchesData = snap.docs.map(doc => {
        const data = doc.data();
        console.log("Pitch data:", { id: doc.id, ...data });
        return { id: doc.id, ...data };
      });
      
      console.log("Final pitches array:", pitchesData);
      setPitches(pitchesData);
    } catch (error) {
      console.error("Error loading pitches:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your pitches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Pitches</h1>
              <p className="mt-2 text-gray-600">Manage and view your generated startup pitches</p>
              {user && (
                <p className="mt-1 text-sm text-gray-500">
                  Logged in as: {user.email} | User ID: {user.uid}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                loadPitches(user.uid);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Pitches:</h3>
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadPitches(user.uid);
              }}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {pitches.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No pitches yet</h3>
            <p className="mt-2 text-gray-500">Get started by creating your first pitch!</p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/create")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Your First Pitch
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pitches.map((pitch) => (
              <div key={pitch.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Startup Idea</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{pitch.idea}</p>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Generated Pitch</h4>
                  <div>
                    {expandedPitch === pitch.id ? (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="bg-white max-w-2xl w-full rounded-lg shadow-2xl p-8 relative overflow-y-auto max-h-[90vh]">
                          <button
                            onClick={() => setExpandedPitch(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-indigo-600 text-xl font-bold focus:outline-none"
                            aria-label="Close full pitch"
                          >
                            &times;
                          </button>
                          <h2 className="text-2xl font-bold mb-4 text-center text-indigo-700">Full Pitch</h2>
                          <div className="prose max-w-none">
                            <ReactMarkdown
                              children={pitch.result}
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-3 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                p: ({node, ...props}) => <p className="mb-2" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                code: ({node, ...props}) => <code className="bg-gray-100 px-1 rounded text-pink-600" {...props} />,
                                pre: ({node, ...props}) => <pre className="bg-gray-100 p-2 rounded overflow-x-auto mb-2" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-300 pl-4 italic text-gray-700 my-2" {...props} />,
                                table: ({node, ...props}) => <table className="table-auto border-collapse w-full my-2" {...props} />,
                                th: ({node, ...props}) => <th className="border px-2 py-1 bg-gray-100" {...props} />,
                                td: ({node, ...props}) => <td className="border px-2 py-1" {...props} />,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          // Find and display Startup Name and Tagline
                          const sections = pitch.result.split('\n\n');
                          let previewContent = [];
                          
                          for (const section of sections) {
                            const cleanSection = section
                              .replace(/\*\*/g, '')
                              .replace(/\*/g, '')
                              .replace(/#/g, '')
                              .replace(/`/g, '')
                              .trim();

                            if (cleanSection.startsWith('Startup Name:')) {
                              previewContent.push(
                                <div key="name" className="font-semibold text-gray-900 mb-2 flex items-center">
                                  <span className="mr-2">🚀</span>
                                  {cleanSection.split(':')[1].trim()}
                                </div>
                              );
                            } else if (cleanSection.startsWith('Tagline:')) {
                              previewContent.push(
                                <div key="tagline" className="text-gray-600 mb-2 italic flex items-center">
                                  <span className="mr-2">✨</span>
                                  "{cleanSection.split(':')[1].trim()}"
                                </div>
                              );
                            }
                          }

                          return (
                            <>
                              {previewContent}
                              <button
                                onClick={() => setExpandedPitch(pitch.id)}
                                className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                              >
                                <span>↓</span> View Full Pitch
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {pitch.language && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {pitch.language === 'english' ? 'English' : 'English + Urdu'}
                      </span>
                    )}
                    {pitch.tone && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        {pitch.tone === 'professional' ? 'Professional' : 'Fun & Creative'}
                      </span>
                    )}
                    {pitch.industry && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        {pitch.industry}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Created: {pitch.createdAt?.toDate?.()?.toLocaleDateString() || pitch.timestamp || 'Recently'}</span>
                  <div className="flex space-x-2">
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this pitch?')) {
                          try {
                            await deleteDoc(doc(collection(db, 'pitches'), pitch.id));
                            setPitches(pitches.filter(p => p.id !== pitch.id));
                          } catch (err) {
                            alert('Failed to delete pitch: ' + err.message);
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
