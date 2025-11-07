import React, { useState, useEffect, useRef } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { PlayIcon, PauseIcon, DownloadIcon } from './Icons';

interface AudioPlayerProps {
  audioData: string;
  onDownload: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Ensure AudioContext is only created once and is browser-compatible.
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    // Cleanup function to stop audio and disconnect source when component unmounts or audioData changes
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
        setIsPlaying(false);
      }
    };
  }, [audioData]);

  const togglePlay = async () => {
    if (!audioContextRef.current) return;

    if (isPlaying && sourceRef.current) {
      sourceRef.current.stop();
      setIsPlaying(false);
      sourceRef.current = null;
    } else {
      try {
        const decodedPcm = decode(audioData);
        const audioBuffer = await decodeAudioData(decodedPcm, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          setIsPlaying(false);
          sourceRef.current = null;
        };
        source.start();
        sourceRef.current = source;
        setIsPlaying(true);
      } catch(e) {
        console.error("Error playing audio:", e);
      }
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-900 rounded-lg border-2 border-gray-700 flex items-center justify-between">
      <button
        onClick={togglePlay}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
      >
        <DownloadIcon />
        <span>Download WAV</span>
      </button>
    </div>
  );
};