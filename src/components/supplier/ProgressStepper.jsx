import { Check } from "lucide-react";

export const ProgressStepper = ({ currentStep }) => {
  const steps = [
    { num: 1, label: "Supplier" },
    { num: 2, label: "Items" },
    { num: 3, label: "Payment" }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                currentStep > step.num
                  ? 'bg-green-600 text-white'
                  : currentStep === step.num
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/30'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {currentStep > step.num ? <Check size={14} /> : step.num}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${
                currentStep >= step.num ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < 2 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                currentStep > step.num ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};