import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiMail } from 'react-icons/fi';

const EmailForm = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const content = watch('content') || {};
  const currentEmail = (typeof content.address === 'string' ? content.address : '') || content.email || content.to || '';

  return (
    <div className="space-y-[1vw]">
      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          <FiMail className="inline mr-2" />
          Email Address
        </label>
        <input
          {...register('content.address', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
          type="email"
          placeholder="recipient@example.com"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
        {typeof errors.content?.address?.message === 'string' && (
          <p className="text-red-500 text-[0.8vw] mt-[0.25vw]">{errors.content.address.message}</p>
        )}
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Subject (Optional)
        </label>
        <input
          {...register('content.subject')}
          type="text"
          placeholder="Email subject"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Message (Optional)
        </label>
        <textarea
          {...register('content.body')}
          placeholder="Email body/message"
          rows="4"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw] resize-none"
        />
      </div>

      {typeof currentEmail === 'string' && currentEmail && (
        <div className="p-[1vw] bg-blue-50 border border-blue-200 rounded-[0.5vw]">
          <p className="text-[0.85vw] text-blue-700">
            <strong>Preview:</strong> When scanned, this QR code will open the email client with recipient "{currentEmail}"
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailForm;
