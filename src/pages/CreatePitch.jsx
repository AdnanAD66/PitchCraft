import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { useRef } from "react";

export default function CreatePitch() {
  const [idea, setIdea] = useState("");
  const [output, setOutput] = useState("");
  const [landingPageCode, setLandingPageCode] = useState("");
  const [selectedTab, setSelectedTab] = useState("pitch"); // 'pitch' or 'landing'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stripScripts, setStripScripts] = useState(true);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("english"); // english or urdu
  const [tone, setTone] = useState("professional"); // professional or fun
  const [industry, setIndustry] = useState("");
  const navigate = useNavigate();
  const codeRef = useRef(null);

  // pitchContent is output without any embedded HTML/code blocks (used for Pitch tab)
  const pitchContent = output
    ? output.replace(/```html\s*[\s\S]*?```/gi, "").replace(/<html[\s\S]*<\/html>/gi, "").trim()
    : "";

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

  // Apply syntax highlighting to landingPageCode when it changes
  useEffect(() => {
    if (!landingPageCode || !codeRef.current) return;
    let hljs;
    (async () => {
      try {
        hljs = await import('highlight.js/lib/core');
        const html = await import('highlight.js/lib/languages/xml');
        hljs.registerLanguage('xml', html.default || html);
        // optionally register css/js if needed
        hljs.highlightElement(codeRef.current);
      } catch (e) {
        // ignore if highlight.js not available
        console.warn('highlight.js not available', e);
      }
    })();
    return () => {
      // no cleanup necessary
    };
  }, [landingPageCode]);

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
        You are an expert UX writer and frontend designer. Generate a polished, responsive, modern landing page and a comprehensive startup pitch including:
        
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
        Make the pitch professional and the landing page visually polished, responsive (mobile-first), and suitable for use as a marketing hero section with features and a CTA.

        Additionally, produce a standalone HTML document (including a <style> tag or an embedded <link> to a minimal CSS) for a landing page that uses the generated Startup Name, Tagline, Elevator Pitch, Key Features and a Hero section. Provide the HTML inside a Markdown code block tagged as html. If you also provide CSS separately, include it in a separate markdown code block tagged as css. If you include any JS, keep it minimal and note that it should be optional.

        Startup Idea: ${idea}
      `;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();

      setOutput(text);

      // helper to escape HTML for fallback
      function escapeHtml(unsafe) {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      // Improved parsing: collect code blocks (html/css/js) and prefer a full HTML block
      const codeBlocks = [];
      const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/gi;
      let cbMatch;
      while ((cbMatch = codeBlockRegex.exec(text)) !== null) {
        const lang = cbMatch[1] ? cbMatch[1].toLowerCase() : '';
        const code = cbMatch[2];
        codeBlocks.push({ lang, code: code.trim() });
      }

      // Prefer an html block
      const htmlBlock = codeBlocks.find(b => b.lang === 'html' || /<\/?html/i.test(b.code));
      if (htmlBlock) {
        setLandingPageCode(htmlBlock.code);
      } else {
        // If there's css and some markup, try to build an HTML page
        const cssBlock = codeBlocks.find(b => b.lang === 'css');
        const jsBlock = codeBlocks.find(b => b.lang === 'js' || b.lang === 'javascript');

        // Try to find inline <section> or <div> markup in non-html blocks
        const markupBlock = codeBlocks.find(b => /<div|<section|<header|<main/i.test(b.code));

        if (markupBlock) {
          // Build an html document with provided CSS and JS
          const built = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing - ${escapeHtml(idea.substring(0,40))}</title>${cssBlock ? `<style>${cssBlock.code}</style>` : `<style>body{font-family:Inter,system-ui,Arial,sans-serif;margin:0;padding:0;color:#0f172a;background:#fff} .container{max-width:1100px;margin:0 auto;padding:32px}</style>`}</head><body><div class="container">${markupBlock.code}</div>${jsBlock ? `<script>${jsBlock.code}</script>` : ''}</body></html>`;
          setLandingPageCode(built);
        } else if (cssBlock) {
          // Only CSS provided: inject into a basic template with pitch text
          const built = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing - ${escapeHtml(idea.substring(0,40))}</title><style>${cssBlock.code}</style></head><body><div class="container"><header class="hero"><h1>${escapeHtml(idea)}</h1><p>${escapeHtml(text.substring(0,400))}</p></header></div></body></html>`;
          setLandingPageCode(built);
        } else {
          // Fallback: try to find an <html>...</html> substring in text
          const tagMatch = text.match(/(<html[\s\S]*<\/html>)/i);
          if (tagMatch && tagMatch[1]) {
            setLandingPageCode(tagMatch[1]);
          } else {
            // If not found, generate an enhanced fallback HTML using the pitch text
            const fallbackHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing - ${idea ? escapeHtml(idea.substring(0,40)) : 'Startup'}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,system-ui,Arial,sans-serif;margin:0;color:#0f172a;background:linear-gradient(180deg,#f8fafc, #ffffff);} .container{max-width:1100px;margin:0 auto;padding:48px} .hero{background:white;border-radius:12px;padding:36px;box-shadow:0 6px 30px rgba(2,6,23,0.08)} h1{font-size:32px;margin:0 0 12px;color:#0b1250} p.lead{font-size:18px;color:#374151;margin:0 0 18px} .cta{display:inline-block;padding:12px 18px;background:#4f46e5;color:white;border-radius:8px;text-decoration:none} .features{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px} .feature{flex:1 1 220px;padding:16px;border-radius:8px;background:#fff;box-shadow:0 2px 10px rgba(2,6,23,0.04)}</style></head><body><div class="container"><div class="hero"><h1>${escapeHtml(idea)}</h1><p class="lead">${escapeHtml(text.substring(0,400))}</p><a class="cta" href="#">Get Started</a><div class="features"><div class="feature">Feature A</div><div class="feature">Feature B</div><div class="feature">Feature C</div></div></div></div></body></html>`;
            setLandingPageCode(fallbackHtml);
          }
        }
      }
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

  // Helpers for copy / download / print depending on selected tab
  const handleCopy = (which) => {
    const content = which === 'landing' ? landingPageCode : pitchContent || output;
    if (!content) return;
    navigator.clipboard.writeText(content);
    alert(language === 'english' ? 'Copied to clipboard' : 'کاپی ہوگیا');
  };

  const handleDownloadContent = (which) => {
    const content = which === 'landing' ? landingPageCode : (pitchContent || output);
    if (!content) return;
    const blob = new Blob([content], { type: which === 'landing' ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = which === 'landing' ? 'pitchcraft-landing.html' : 'pitchcraft-pitch.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintContent = (which) => {
    const pitchHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pitch</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:24px;"><pre style="white-space:pre-wrap; font-family: Arial, sans-serif;">${pitchContent || output}</pre></body></html>`;
    const content = which === 'landing' ? landingPageCode : pitchHtml;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
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
        landingHtml: landingPageCode,
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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="w-full mx-auto px-6 lg:px-12">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">PitchCraft — Tumhara AI Startup Partner</h1>
          <p className="mt-3 max-w-3xl text-lg text-gray-600">
            {language === "english" 
              ? "Describe your startup idea and let AI generate a comprehensive pitch with name, tagline, landing page content, and visual concepts"
              : "اپنا اسٹارٹ اپ آئیڈیا بیان کریں اور AI سے نام، ٹیگ لائن، لینڈنگ پیج مواد اور بصری تصورات کے ساتھ مکمل پچ بنائیں"
            }
          </p>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Language / زبان</label>
                <div className="flex space-x-3">
                  <button onClick={() => setLanguage("english")} className={`px-3 py-2 rounded-md text-sm font-medium ${language === "english" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    English
                  </button>
                  <button onClick={() => setLanguage("urdu")} className={`px-3 py-2 rounded-md text-sm font-medium ${language === "urdu" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    English + Roman Urdu
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tone / انداز</label>
                <div className="flex space-x-3">
                  <button onClick={() => setTone("professional")} className={`px-3 py-2 rounded-md text-sm font-medium ${tone === "professional" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    Professional
                  </button>
                  <button onClick={() => setTone("fun")} className={`px-3 py-2 rounded-md text-sm font-medium ${tone === "fun" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    Fun & Creative
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">Industry / صنعت (Optional)</label>
                <select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm">
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

              <div className="mt-6 flex space-x-3">
                <button onClick={handleGenerate} disabled={loading || !idea.trim()} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">
                  {loading ? 'Generating...' : 'Generate Pitch'}
                </button>
                {output && (
                  <button onClick={handleSave} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              <label htmlFor="idea" className="block text-sm font-medium text-gray-700 mb-2">{language === 'english' ? 'Describe Your Startup Idea' : 'اپنا اسٹارٹ اپ آئیڈیا بیان کریں'}</label>
              <textarea id="idea" rows={10} placeholder={language === 'english' ? 'Example: A mobile app that helps students find study groups based on their courses and schedules...' : 'مثال: ایک موبائل ایپ جو طلباء کو ان کے کورسز اور شیڈول کے مطابق اسٹڈی گروپس تلاش کرنے میں مدد کرتی ہے...'} onChange={(e) => setIdea(e.target.value)} value={idea} className="w-full h-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm resize-vertical" />

              <p className="mt-3 text-sm text-gray-500">{language === 'english' ? 'Tip: Be specific about the problem, target users, and any features you imagine.' : 'مشورہ: مسئلے، ہدف صارف اور خصوصیات کی تفصیل دیں۔'}</p>
            </div>
          </div>
        </div>

        {output && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === "english" ? "🎯 Generated" : "🎯 جنریٹڈ"}
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 rounded p-1">
                  <button
                    onClick={() => setSelectedTab('pitch')}
                    className={`px-3 py-1 text-sm ${selectedTab === 'pitch' ? 'bg-white shadow rounded' : 'text-gray-600'}`}
                  >
                    {language === 'english' ? 'Pitch' : 'پچ'}
                  </button>
                  <button
                    onClick={() => setSelectedTab('landing')}
                    className={`px-3 py-1 text-sm ${selectedTab === 'landing' ? 'bg-white shadow rounded' : 'text-gray-600'}`}
                  >
                    {language === 'english' ? 'Landing Page Code' : 'لینڈنگ پیج کوڈ'}
                  </button>
                </div>

                <div className="ml-4 flex items-center space-x-2 text-sm text-gray-600">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={stripScripts} onChange={() => setStripScripts(s => !s)} className="h-4 w-4" />
                    <span>{language === 'english' ? 'Strip scripts in preview' : 'پریویو میں اسکرپٹس ہٹائیں'}</span>
                  </label>
                </div>

                <button
                  onClick={() => handleCopy(selectedTab)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 border border-indigo-600 rounded hover:bg-indigo-50"
                >
                  {language === "english" ? "Copy" : "کاپی"}
                </button>
                <button
                  onClick={() => handleDownloadContent(selectedTab)}
                  className="text-sm text-green-600 hover:text-green-800 font-medium px-3 py-1 border border-green-600 rounded hover:bg-green-50"
                >
                  {language === "english" ? "Download" : "ڈاؤن لوڈ"}
                </button>
                <button
                  onClick={() => handlePrintContent(selectedTab)}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium px-3 py-1 border border-purple-600 rounded hover:bg-purple-50"
                >
                  {language === "english" ? "Print" : "پرنٹ"}
                </button>
              </div>
            </div>

            {selectedTab === 'pitch' ? (
              <div className="prose max-w-none">
                <ReactMarkdown
                  children={pitchContent || output}
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
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'english' ? 'Landing Page Code' : 'لینڈنگ پیج کوڈ'}</label>
                  <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm"><code ref={codeRef} className="hljs xml">{landingPageCode}</code></pre>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'english' ? 'Live Preview' : 'لائیو پریویو'}</label>
                  <div className="border rounded overflow-hidden" style={{ height: 520 }}>
                    <iframe
                      title="landing-preview"
                      srcDoc={landingPageCode}
                      sandbox={stripScripts ? "allow-same-origin" : "allow-scripts allow-same-origin"}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
