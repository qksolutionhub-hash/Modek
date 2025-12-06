import React, { useState, useRef } from 'react';
import { generateVeoVideo, checkApiKey, promptApiKeySelection } from '../services/geminiService';
import { Video, Loader2, Upload, AlertCircle, Play } from 'lucide-react';

const VeoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('Cinematic pan showing the busy workshop environment.');
  const [image, setImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Checking API Key...');

    try {
      const hasKey = await checkApiKey();
      if (!hasKey) {
        promptApiKeySelection();
        setIsLoading(false);
        setStatus('');
        return;
      }

      const url = await generateVeoVideo(prompt, image, aspectRatio, setStatus);
      setVideoUrl(url);
      setStatus('Complete!');
    } catch (err: any) {
      setError(err.message || "Failed to generate video");
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Video className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Veo Video Studio</h2>
            <p className="text-sm text-slate-500">Transform workshop photos into cinematic videos using AI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center"
              >
                {image ? (
                  <div className="relative">
                    <img src={image} alt="Source" className="max-h-48 mx-auto rounded shadow-sm" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImage(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Click to upload photo</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Animation Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24 resize-none"
                placeholder="Describe how the video should look..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    aspectRatio === '16:9' 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  16:9 Landscape
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    aspectRatio === '9:16' 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  9:16 Portrait
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !image}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-white transition-all ${
                isLoading || !image ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Video
                </>
              )}
            </button>
            
            {/* Status Message */}
            {status && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 p-3 rounded border border-indigo-100 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status}
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="bg-slate-900 rounded-lg flex items-center justify-center min-h-[400px] overflow-hidden relative group">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-slate-200 font-medium mb-1">No Video Generated</h3>
                <p className="text-slate-400 text-sm">Upload an image and click generate to see the magic happen.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeoStudio;
