import React, { useState } from 'react';
import { useWhisperTranscription } from '../../hooks/useWhisperTranscription';
import { Mic, MicOff, RotateCcw, Loader2 } from 'lucide-react';

const WhisperTranscriber: React.FC = () => {
    const { 
        isListening, 
        transcript, 
        isTranscribing, 
        error, 
        startListening, 
        stopListening, 
        resetTranscript 
    } = useWhisperTranscription();

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-2xl mx-auto">
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        Live Whisper STT
                        {isTranscribing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetTranscript}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
                            title="Reset Transcript"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Transcript Display */}
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 mb-6 relative">
                    {transcript ? (
                        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic">
                            {transcript}
                            {isTranscribing && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />}
                        </p>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            {isListening ? "Listening... start speaking!" : "Click the microphone to start transcribing."}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={toggleListening}
                        className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                            isListening 
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        } shadow-lg hover:scale-105 active:scale-95`}
                    >
                        {isListening ? (
                            <MicOff className="w-8 h-8 text-white" />
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}
                        
                        {isListening && (
                            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-25" />
                        )}
                    </button>
                    
                    <p className={`text-sm font-medium ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {isListening ? 'RECORDING' : 'IDLE'}
                    </p>
                </div>

                {/* Error Box */}
                {error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>
            
            <div className="text-gray-400 text-xs text-center">
                Supports English, Urdu, and Roman Urdu speech via Groq Whisper v3.
            </div>
        </div>
    );
};

export default WhisperTranscriber;
