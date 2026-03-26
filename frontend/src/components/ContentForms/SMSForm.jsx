import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiMessageSquare } from 'react-icons/fi';

const SMSForm = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const content = watch('content');

  return (
    <div className="space-y-[1vw]">
      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          <FiMessageSquare className="inline mr-2" />
          Phone Number
        </label>
        <input
          {...register('content.phone', {
            required: 'Phone number is required',
            pattern: {
              value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
              message: 'Invalid phone number',
            },
          })}
          type="tel"
          placeholder="+1 (555) 123-4567"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
        {errors.content?.phone && (
          <p className="text-red-500 text-[0.8vw] mt-[0.25vw]">{errors.content.phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Message (Optional)
        </label>
        <textarea
          {...register('content.message')}
          placeholder="SMS message"
          rows="4"
          maxLength="160"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw] resize-none"
        />
        <p className="text-[0.8vw] text-slate-500 mt-[0.25vw]">
          {(content?.message?.length || 0)}/160 characters
        </p>
      </div>

      {typeof content?.phone === 'string' && content.phone && (
        <div className="p-[1vw] bg-green-50 border border-green-200 rounded-[0.5vw]">
          <p className="text-[0.85vw] text-green-700">
            <strong>Preview:</strong> When scanned, this QR code will open SMS to "{content.phone}"
          </p>
        </div>
      )}
    </div>
  );
};

export default SMSForm;
