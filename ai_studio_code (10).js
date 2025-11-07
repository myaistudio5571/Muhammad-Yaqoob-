import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Select, SelectOption, SelectOptionGroup } from './components/Select';
import { Button } from './components/Button';
import { AudioPlayer } from './components/AudioPlayer';
import { Spinner } from './components/Spinner';
import { generateSpeech } from './services/geminiService';
import { Voice, Emotion, Language } from './types';
import { decode, decodeAudioData } from './utils/audioUtils';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [voice, setVoice] = useState<Voice>(Voice.AdultFemaleFormal);
  const [emotion, setEmotion] = useState<Emotion>(Emotion.Calm);
  const [language, setLanguage] = useState<Language>(Language.English);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<Voice | null>(null);
  
  const previewAudioContextRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);


  const languageOptions: SelectOption[] = Object.entries(Language).map(
    ([key, value]) => ({ value, label: key })
  );

  const voiceOptions: (SelectOption | SelectOptionGroup)[] = [
    {
      label: 'Standard Voices',
      options: [
        { value: Voice.AdultFemaleFormal, label: 'Female (Formal)' },
        { value: Voice.AdultMaleFormal, label: 'Male (Formal)' },
        { value: Voice.AdultFemaleFriendly, label: 'Female (Friendly)' },
        { value: Voice.AdultMaleFriendly, label: 'Male (Friendly)' },
        { value: Voice.Neutral, label: 'Neutral' },
      ],
    },
    {
      label: 'Character Voices',
      options: [
        { value: Voice.Deep, label: 'Deep' },
        { value: Voice.Whisper, label: 'Whisper' },
      ],
    },
  ];

  const emotionOptions: SelectOption[] = [
    { value: Emotion.Calm, label: 'Calm' },
    { value: Emotion.Happy, label: 'Happy' },
    { value: Emotion.Sad, label: 'Sad' },
    { value: Emotion.Serious, label: 'Serious' },
  ];

  const stopCurrentPreview = () => {
    if (previewSourceRef.current) {
      previewSourceRef.current.stop();
      previewSourceRef.current.disconnect();
      previewSourceRef.current = null;
    }
  };

  const handlePreviewVoice = useCallback(async (voiceToPreview: Voice) => {
    stopCurrentPreview();

    if (previewingVoice === voiceToPreview) {
      setPreviewingVoice(null);
      return;
    }
    
    setPreviewingVoice(voiceToPreview);
    
    if (!previewAudioContextRef.current) {
      previewAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    try {
      const previewText = "Hello, you can hear my voice now.";
      const generatedAudio = await generateSpeech(previewText, voiceToPreview, Emotion.Calm);
      
      const audioContext = previewAudioContextRef.current;
      const decodedPcm = decode(generatedAudio);
      const audioBuffer = await decodeAudioData(decodedPcm, audioContext, 24000, 1);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (previewingVoice === voiceToPreview) {
          setPreviewingVoice(null);
        }
        previewSourceRef.current = null;
      };
      source.start();
      previewSourceRef.current = source;

    } catch (err) {
      console.error("Failed to generate preview audio", err);
      setError("Could not play voice preview.");
      setPreviewingVoice(null);
    }
  }, [previewingVoice]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate voice.');
      return;
    }
    stopCurrentPreview();
    setPreviewingVoice(null);
    setLoadingMessage('Generating audio...');
    setError(null);
    setAudioData(null);

    try {
      const generatedAudio = await generateSpeech(text, voice, emotion);
      setAudioData(generatedAudio);
    } catch (err) {
      console.error(err);
      setError(
        'Failed to generate audio. Please check your API key and try again.'
      );
    } finally {
      setLoadingMessage('');
    }
  }, [text, voice, emotion]);

  const handleAudioDownload = async () => {
    if (!audioData) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedPcm = decode(audioData);
      const audioBuffer = await decodeAudioData(decodedPcm, audioContext, 24000, 1);
      
      const wavBlob = createWavBlob(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'myaistudio_audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch(e) {
      console.error("Failed to process and download audio:", e);
      setError("Could not prepare the audio for download.");
    }
  };

  const createWavBlob = (audioBuffer: AudioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    setUint32(0x46464952); 
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (i = 0; i < numOfChan; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto">
        <Header />
        <main className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="space-y-6">
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here..."
                className="w-full h-40 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-y placeholder-gray-500"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">
                No word limit. Generation time may vary with text length.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Language"
                value={language}
                onChangeValue={(value) => setLanguage(value as Language)}
                options={languageOptions}
              />
              <Select
                label="Voice"
                value={voice}
                onChangeValue={(value) => setVoice(value as Voice)}
                options={voiceOptions}
                onPreview={handlePreviewVoice as (value: string) => void}
                previewingValue={previewingVoice}
              />
              <Select
                label="Emotion"
                value={emotion}
                onChangeValue={(value) => setEmotion(value as Emotion)}
                options={emotionOptions}
              />
            </div>

            <Button onClick={handleGenerate} disabled={!!loadingMessage || !text}>
              {loadingMessage ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>{loadingMessage}</span>
                </div>
              ) : (
                '🎤 Generate Voice'
              )}
            </Button>

            {error && <p className="text-red-400 text-center">{error}</p>}

            {audioData && !loadingMessage && (
              <AudioPlayer 
                audioData={audioData} 
                onDownload={handleAudioDownload}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;