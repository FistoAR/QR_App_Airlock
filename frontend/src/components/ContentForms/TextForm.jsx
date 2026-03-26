import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiFileText, FiInfo } from 'react-icons/fi';

const TextForm = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const textContent = watch('content.content') || '';
  const charCount = textContent.length;
  const maxChars = 2000;

  return (
    <div className="space-y-[1vw]">
      <div>
        <label className="flex items-center gap-[0.4vw] text-[0.85vw] font-medium text-slate-700 mb-[0.4vw]">
          <FiFileText className="text-[1vw]" />
          Text Content *
        </label>
        <textarea
          {...register('content.content', {
            required: 'Text content is required',
            maxLength: {
              value: maxChars,
              message: `Text cannot exceed ${maxChars} characters`
            }
          })}
          rows={8}
          placeholder="Enter your text content here..."
          className="w-full px-[0.75vw] py-[0.65vw] text-[0.85vw] border border-slate-200 rounded-[0.4vw] focus:outline-none focus:border-transparent resize-none"
          style={{ '--tw-ring-color': '#2563eb' }}
        />
        
        <div className="flex items-center justify-between mt-[0.3vw]">
          {errors.content?.content ? (
            <p className="text-red-500 text-[0.7vw] flex items-center gap-[0.25vw]">
              <FiInfo className="text-[0.8vw]" />
              {errors.content.content.message}
            </p>
          ) : (
            <p className="text-slate-500 text-[0.7vw]">
              This text will be encoded directly into the QR code
            </p>
          )}
          <p className={`text-[0.7vw] ${charCount > maxChars ? 'text-red-500' : 'text-slate-400'}`}>
            {charCount}/{maxChars}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-[0.75vw] bg-blue-50 rounded-[0.4vw] border border-blue-200">
        <h5 className="text-[0.8vw] font-semibold text-blue-800 mb-[0.25vw]">
          About Text QR Codes
        </h5>
        <ul className="text-[0.7vw] text-blue-700 space-y-[0.15vw]">
          <li>• Text is encoded directly into the QR code (no internet needed)</li>
          <li>• Longer text creates more complex QR codes</li>
          <li>• Keep text concise for better scannability</li>
          <li>• Perfect for short messages, notes, or instructions</li>
        </ul>
      </div>

      {/* Character Limit Warning */}
      {charCount > maxChars * 0.8 && (
        <div className="p-[0.75vw] bg-amber-50 rounded-[0.4vw] border border-amber-200">
          <p className="text-[0.75vw] text-amber-700">
            <strong>Warning:</strong> Long text will result in a dense QR code that may be harder to scan.
            Consider using a URL QR code for large amounts of content.
          </p>
        </div>
      )}
    </div>
  );
};

export default TextForm;