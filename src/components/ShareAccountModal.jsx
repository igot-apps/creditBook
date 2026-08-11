import { useState, useEffect } from "react";
import { X, ArrowLeft, Copy, Share2, MessageCircle, Smartphone, Check, Radio, Circle } from "lucide-react";
import { generateAccountShare } from "../utils/accountSharer";
import { openWhatsApp, openSMS } from "../utils/communication";
import useStore from "../store/useStore";

export const ShareAccountModal = ({ 
  isOpen, 
  onClose, 
  contact, 
  transactions = [], 
  store,
  onShared // Callback to log the internal event
}) => {
  const { showToast } = useStore();
  
  // Internal Steps: 'select' (choose scope/channel) -> 'preview' (review message)
  const [step, setStep] = useState('select');
  const [scope, setScope] = useState('last5');
  const [channel, setChannel] = useState(null);
  const [message, setMessage] = useState('');

  // Generate message when moving to preview step
  useEffect(() => {
    if (step === 'preview' && channel) {
      const generated = generateAccountShare({
        channel,
        scope,
        contact,
        transactions,
        store
      });
      setMessage(generated);
    }
  }, [step, channel, scope, contact, transactions, store]);

  const handleContinueToPreview = () => {
    if (!channel) return;
    setStep('preview');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      showToast("✅ Copied to clipboard");
    } catch (err) {
      showToast("❌ Failed to copy");
    }
  };

  const handleShare = () => {
    if (!contact?.phone) {
      showToast("⚠️ This contact has no phone number");
      return;
    }

    // Open native intent
    if (channel === 'whatsapp') {
      openWhatsApp(contact.phone, message);
    } else {
      openSMS(contact.phone, message);
    }

    // Log the internal event for the owner's memory
    if (onShared) {
      onShared({ channel, scope, contact });
    }

    // Reset and close
    setStep('select');
    setChannel(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button onClick={() => setStep('select')} className="p-1.5 -ml-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {step === 'select' ? 'Share Account' : 'Preview Message'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* STEP 1: SELECT SCOPE & CHANNEL */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Scope Selection */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">How much history?</p>
                <div className="space-y-2">
                  {[
                    { id: 'balance', label: 'Balance Only', desc: 'Just the current total' },
                    { id: 'last5', label: 'Last 5 Transactions', desc: 'Quick summary' },
                    { id: 'last10', label: 'Last 10 Transactions', desc: 'Recent history' },
                    { id: 'full', label: 'Full History', desc: 'Complete account record' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setScope(option.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                        scope === option.id 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      {scope === option.id ? <Check size={18} className="text-green-600" /> : <Circle size={18} className="text-gray-400" />}
                      <div>
                        <p className={`font-bold text-sm ${scope === option.id ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{option.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Send via</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setChannel('whatsapp')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                      channel === 'whatsapp' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <MessageCircle size={24} className={channel === 'whatsapp' ? 'text-green-600' : 'text-gray-500'} />
                    <span className={`text-sm font-bold ${channel === 'whatsapp' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setChannel('sms')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                      channel === 'sms' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <Smartphone size={24} className={channel === 'sms' ? 'text-blue-600' : 'text-gray-500'} />
                    <span className={`text-sm font-bold ${channel === 'sms' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>SMS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW MESSAGE */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {message}
                </pre>
              </div>
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                Review the message before sending. You can edit it in your messaging app after tapping Share.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 rounded-b-2xl space-y-2">
          {step === 'select' ? (
            <button 
              onClick={handleContinueToPreview}
              disabled={!channel}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
            >
              Continue
            </button>
          ) : (
            <>
              <button 
                onClick={handleShare}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
              >
                <Share2 size={18} /> Share via {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleCopy}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Copy size={16} /> Copy
                </button>
                <button 
                  onClick={() => setStep('select')}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <ArrowLeft size={16} /> Edit
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};