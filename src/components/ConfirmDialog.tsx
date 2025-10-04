'use client';

import { FiAlertCircle, FiAlertTriangle, FiInfo, FiCheckCircle, FiX } from 'react-icons/fi';

export type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  details?: Array<{ label: string; value: string | React.ReactNode }>;
}

const typeConfig = {
  danger: {
    icon: FiAlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    alertBg: 'bg-red-50 border-red-200',
    alertText: 'text-red-800',
  },
  warning: {
    icon: FiAlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    alertBg: 'bg-yellow-50 border-yellow-200',
    alertText: 'text-yellow-800',
  },
  info: {
    icon: FiInfo,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    alertBg: 'bg-blue-50 border-blue-200',
    alertText: 'text-blue-800',
  },
  success: {
    icon: FiCheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmBg: 'bg-green-600 hover:bg-green-700',
    alertBg: 'bg-green-50 border-green-200',
    alertText: 'text-green-800',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  details,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl animate-slideUp">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>

        {/* Details */}
        {details && details.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">{detail.label}:</span>
                <span className="font-semibold text-gray-900">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warning/Info Box (optional for danger type) */}
        {type === 'danger' && (
          <div className={`${config.alertBg} border rounded-lg p-3 mb-6`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
              <p className={`text-sm ${config.alertText}`}>
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 ${config.confirmBg} text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
