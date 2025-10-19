import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

export default function CreatePitch() {
  const [idea, setIdea] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("english"); // english or urdu
  const [tone, setTone] = useState("professional"); // professional or fun
  const [industry, setIndustry] = useState("");
  const navigate = useNavigate();

  // Initialize Gemini (ensure .env has VITE_GEMINI_API_KEY)
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setOutput("⚠️ Please enter your startup idea first.");
      return;
    }

    // Check if API key is configured
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setOutput(`❌ Gemini API key not configured!

To fix this:
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Create a .env file in your project root
4. Add: VITE_GEMINI_API_KEY=your_actual_api_key_here
5. Restart the development server

See SETUP.md for detailed instructions.`);
      return;
    }

    // Debug: Show that API key is detected (remove this after testing)
    console.log('API Key detected:', apiKey ? 'Yes' : 'No');

    setLoading(true);
    setOutput("");

    try {
      // Try different model names in order of preference
      const modelNames = ["gemini-2.5-flash"];
      let model = null;
      let lastError = null;

      for (const modelName of modelNames) {
        try {
          model = genAI.getGenerativeModel({ model: modelName });
          console.log(`Using model: ${modelName}`);
          break;
        } catch (err) {
          console.log(`Model ${modelName} not available:`, err.message);
          lastError = err;
        }
      }

      if (!model) {
        throw new Error(`No available models found. Last error: ${lastError?.message}`);
      }

      const prompt = `
        You are an AI startup pitch assistant. Generate a comprehensive startup pitch including:
        
        1. **Startup Name**: A catchy, memorable name
        2. **Tagline**: A compelling one-liner
        3. **Elevator Pitch**: A 2-3 sentence description
        4. **Problem Statement**: What problem does this solve?
        5. **Solution**: How does your idea solve this problem?
        6. **Target Audience**: Who would use this (detailed persona)
        7. **Key Features**: 3-4 main features
        8. **Value Proposition**: What makes it unique
        9. **Landing Page Hero**: Compelling hero section copy
        10. **Color Palette**: 3-4 colors that represent the brand
        11. **Logo Concept**: Creative logo ideas and concepts
        
        Tone: ${tone === 'professional' ? 'Professional and business-focused' : 'Fun, creative, and engaging'}
        Industry: ${industry || 'General'}
        Language: ${language === 'english' ? 'English only' : 'Mix of English and Roman Urdu (use Roman Urdu for key phrases and emotional expressions)'}
        
        Format everything clearly with headings and bullet points.
        Make it professional and engaging.
        
        Startup Idea: ${idea}
      `;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();

      setOutput(text);
    } catch (err) {
      console.error(err);
      if (err.message.includes('API_KEY_INVALID')) {
        setOutput(`❌ Invalid API Key!

Your Gemini API key is invalid. Please:
1. Check your API key at https://makersuite.google.com/app/apikey
2. Make sure it's correctly set in your .env file
3. Restart the development server`);
      } else if (err.message.includes('QUOTA_EXCEEDED')) {
        setOutput(`❌ API Quota Exceeded!

You've exceeded your Gemini API quota. Please:
1. Check your usage at https://makersuite.google.com/app/apikey
2. Wait for quota reset or upgrade your plan`);
      } else {
        setOutput(`❌ Something went wrong!

Error: ${err.message}

Please check:
- Your internet connection
- Your API key is valid
- Gemini API service is available`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!output.trim()) {
      alert("Please generate a pitch first before saving.");
      return;
    }

    if (!user) {
      alert("You must be logged in to save pitches.");
      return;
    }

    setSaving(true);
    try {
      const pitchData = {
        idea: idea,
        result: output,
        uid: user.uid,
        createdAt: serverTimestamp(),
        language: language,
        tone: tone,
        industry: industry,
        timestamp: new Date().toISOString()
      };

      console.log("Saving pitch with data:", pitchData);
      
      const docRef = await addDoc(collection(db, "pitches"), pitchData);
      console.log("Pitch saved with ID:", docRef.id);
      
      alert("Pitch saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving pitch:", error);
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        alert(`❌ Permission Denied!

This error usually means:
1. You're not properly logged in
2. Firebase Firestore rules are blocking the write
3. The database needs to be configured

Please:
1. Make sure you're logged in
2. Check Firebase Console → Firestore → Rules
3. Ensure rules allow authenticated users to write`);
      } else if (error.code === 'unavailable') {
        alert(`❌ Service Unavailable!

Firebase service is currently unavailable.
Please try again in a few minutes.`);
      } else {
        alert(`❌ Failed to save pitch!

Error: ${error.message}

Please check:
- Your internet connection
- You're logged in properly
- Firebase service is available`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
          <p className="mt-2 text-sm text-gray-500">
            If this takes too long, please check your Firebase configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900"> PitchCraft - Tumhara AI Startup Partner</h1>
          <p className="mt-2 text-gray-600">
            {language === "english" 
              ? "Describe your startup idea and let AI generate a comprehensive pitch with name, tagline, landing page content, and visual concepts"
              : "اپنا اسٹارٹ اپ آئیڈیا بیان کریں اور AI سے نام، ٹیگ لائن، لینڈنگ پیج مواد اور بصری تصورات کے ساتھ مکمل پچ بنائیں"
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Language Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language / زبان
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setLanguage("english")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  language === "english"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("urdu")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  language === "urdu"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                English + Roman Urdu
              </button>
            </div>
          </div>

          {/* Tone Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tone / انداز
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setTone("professional")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  tone === "professional"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Professional / پیشہ ورانہ
              </button>
              <button
                onClick={() => setTone("fun")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  tone === "fun"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Fun & Creative / تفریحی اور تخلیقی
              </button>
            </div>
          </div>

          {/* Industry Selector */}
          <div className="mb-6">
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              Industry / صنعت (Optional)
            </label>
            <select
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">Select Industry / صنعت منتخب کریں</option>
              <option value="Technology">Technology / ٹیکنالوجی</option>
              <option value="Healthcare">Healthcare / صحت</option>
              <option value="Education">Education / تعلیم</option>
              <option value="Finance">Finance / مالیات</option>
              <option value="E-commerce">E-commerce / الیکٹرانک کامرس</option>
              <option value="Food & Beverage">Food & Beverage / کھانا پینا</option>
              <option value="Transportation">Transportation / نقل و حمل</option>
              <option value="Entertainment">Entertainment / تفریح</option>
              <option value="Real Estate">Real Estate / جائیداد</option>
              <option value="Other">Other / دیگر</option>
            </select>
          </div>

          {/* Startup Idea Input */}
          <div className="mb-6">
            <label htmlFor="idea" className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Startup Idea / اپنا اسٹارٹ اپ آئیڈیا بیان کریں
            </label>
            <textarea
              id="idea"
              rows="6"
              placeholder={language === "english" 
                ? "Example: A mobile app that helps students find study groups based on their courses and schedules..."
                : "مثال: ایک موبائل ایپ جو طلباء کو ان کے کورسز اور شیڈول کے مطابق اسٹڈی گروپس تلاش کرنے میں مدد کرتی ہے..."
              }
              onChange={(e) => setIdea(e.target.value)}
              value={idea}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleGenerate}
              disabled={loading || !idea.trim()}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate Pitch"
              )}
            </button>
            
            {output && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? "Saving..." : "Save Pitch"}
              </button>
            )}
          </div>
        </div>

        {output && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === "english" ? "🎯 Generated Pitch" : "🎯 جنریٹڈ پچ"}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 border border-indigo-600 rounded hover:bg-indigo-50"
                >
                  {language === "english" ? "Copy" : "کاپی"}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([output], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'pitchcraft-pitch.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-green-600 hover:text-green-800 font-medium px-3 py-1 border border-green-600 rounded hover:bg-green-50"
                >
                  {language === "english" ? "Download" : "ڈاؤن لوڈ"}
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head><title>PitchCraft - Generated Pitch</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                          <h1> PitchCraft - Generated Pitch</h1>
                          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${output}</pre>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium px-3 py-1 border border-purple-600 rounded hover:bg-purple-50"
                >
                  {language === "english" ? "Print" : "پرنٹ"}
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              <ReactMarkdown
                children={output}
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
        )}
      </div>
    </div>
  );
}
