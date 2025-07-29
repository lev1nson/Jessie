'use client';

import { useState } from 'react';

export default function TestRAG() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">RAG System Test</h1>
      
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Test Question:
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-3 border rounded-lg resize-vertical min-h-[100px]"
              placeholder="Ask a question to test the RAG system..."
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Send Question'}
          </button>
        </form>

        {response && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {response}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Test Instructions:</h3>
          <ul className="mt-2 text-yellow-700 space-y-1">
            <li>• This page tests RAG functionality without authentication</li>
            <li>• Try asking questions about emails, documents, or general topics</li>
            <li>• Check network tab for API call details</li>
            <li>• Look for vector search and embedding usage in responses</li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800">Sample Test Questions:</h3>
          <ul className="mt-2 text-green-700 space-y-1">
            <li>• "Найди все письма от John Smith"</li>
            <li>• "Что говорилось о проекте X в последних письмах?"</li>
            <li>• "Summarize recent discussions about budget"</li>
            <li>• "Покажи письма с вложениями за последнюю неделю"</li>
          </ul>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800">Current Status:</h3>
          <ul className="mt-2 text-blue-700 space-y-1">
            <li>✅ API endpoint working: /api/chat/messages</li>
            <li>✅ Simulated RAG processing active</li>
            <li>⚠️ Vector database search: Simulated</li>
            <li>⚠️ OpenAI integration: Simulated</li>
          </ul>
        </div>
      </div>
    </div>
  );
}