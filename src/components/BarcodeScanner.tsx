import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const BarcodeScanner = ({ onScan, isOpen, onClose }: BarcodeScannerProps) => {
    const [error, setError] = useState<string>('');
    const [status, setStatus] = useState<string>('Aguardando...');
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (codeReader.current) {
                codeReader.current.reset();
                codeReader.current = null;
            }
            return;
        }

        let selectedDeviceId: string;
        const reader = new BrowserMultiFormatReader();
        codeReader.current = reader;

        const startCamera = async () => {
            setStatus('Solicitando permissão...');
            try {
                // First, just ask for permission to list devices
                await navigator.mediaDevices.getUserMedia({ video: true });

                const videoInputDevices = await reader.listVideoInputDevices();
                setStatus(`Câmeras encontradas: ${videoInputDevices.length}`);

                if (videoInputDevices.length === 0) {
                    throw new Error('Nenhuma câmera encontrada.');
                }

                // Prefer back camera
                const backCamera = videoInputDevices.find(device =>
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('traseira') ||
                    device.label.toLowerCase().includes('environment')
                ) || videoInputDevices[videoInputDevices.length - 1];

                selectedDeviceId = backCamera.deviceId;
                setStatus(`Iniciando câmera: ${backCamera.label || 'Padrão'}`);

                await reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current!, (result, err) => {
                    if (result) {
                        setStatus('Código lido com sucesso!');
                        onScan(result.getText());
                        onClose();
                    }
                    if (err && !(err.name === 'NotFoundException')) {
                        // Ignore frequent "not found" errors while scanning frames
                        // console.error(err);
                    }
                });

                setStatus('Escaneando...');

            } catch (err: any) {
                console.error("Camera Init Error:", err);
                setStatus(`Erro fatal: ${err.message}`);

                if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
                    setError('Acesso à câmera foi negado. Por favor, permita o acesso nas configurações do navegador.');
                } else if (err.name === 'NotFoundError') {
                    setError('Nenhum dispositivo de vídeo encontrado.');
                } else {
                    setError(`Erro ao acessar câmera: ${err.message}`);
                }
            }
        };

        startCamera();

        return () => {
            reader.reset();
        };

    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        Escanear Código (ZXing Native)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 min-h-[300px] bg-black rounded-lg overflow-hidden relative">
                    {error ? (
                        <div className="text-center text-red-500 p-4">
                            <CameraOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="font-bold">Erro</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover rounded-md"
                                autoPlay
                                playsInline
                                muted
                            />
                            <div className="absolute inset-0 border-2 border-emerald-500/50 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-32 border-2 border-red-500 rounded animate-pulse"></div>
                            </div>

                            <p className="absolute top-2 left-2 text-xs text-green-400 font-mono bg-black/80 px-2 rounded max-w-[90%] break-words">
                                Status: {status}
                            </p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
