import { useState } from 'react';
import { useZxing } from 'react-zxing';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const BarcodeScanner = ({ onScan, isOpen, onClose }: BarcodeScannerProps) => {
    const [error, setError] = useState<string>('');

    const { ref } = useZxing({
        onDecodeResult(result) {
            onScan(result.getText());
            onClose();
        },
        onError(err) {
            // Ignore minor errors, looking for camera permission issues mainly
            console.log("Scanner loop error:", err);
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        Escanear Código de Barras
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 min-h-[300px] bg-black rounded-lg overflow-hidden relative">
                    <video ref={ref} className="w-full h-full object-cover rounded-md" />

                    {/* Viewfinder overlay */}
                    <div className="absolute inset-0 border-2 border-emerald-500/50 flex grid grid-cols-1 grid-rows-1 pointer-events-none">
                        <div className="w-64 h-32 border-2 border-red-500 rounded m-auto animate-pulse"></div>
                    </div>

                    <p className="absolute bottom-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
                        Aponte a câmera para o código EAN
                    </p>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
