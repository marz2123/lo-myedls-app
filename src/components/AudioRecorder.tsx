import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing: boolean;
}

export const AudioRecorder = ({ onAudioRecorded, isProcessing }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const { t } = useLanguage();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        onAudioRecorded(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={isProcessing}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Mic className="w-5 h-5 mr-2" />
          {t('cancel') === 'Annuler' ? 'Enregistrer un message vocal' : 'Record voice message'}
        </Button>
      ) : (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-center gap-3 p-4 bg-destructive/10 rounded-lg border-2 border-destructive">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-lg font-semibold text-destructive">{formatTime(recordingTime)}</span>
          </div>
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            <Square className="w-5 h-5 mr-2" />
            {t('cancel') === 'Annuler' ? 'Arrêter l\'enregistrement' : 'Stop recording'}
          </Button>
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('cancel') === 'Annuler' ? 'Transcription et extraction en cours...' : 'Transcribing and extracting...'}
        </div>
      )}
    </div>
  );
};